// Nodus Desktop — Embedded Fleet HTTP API & Control Server
// Listens on port 9120 to handle remote commands from POCO Pad and fleet companion nodes.

use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use tiny_http::{Header, Method, Response, Server, StatusCode};

use crate::commands::{
    clipboard::{get_clipboard_content, set_win32_clipboard, set_win32_clipboard_image},
    exec::execute_shortcut,
    media::send_media_appcommand,
    process::get_processes,
    system::get_system_stats,
};

static SERVER_RUNNING: AtomicBool = AtomicBool::new(false);
static REGISTERED_DEVICES: Mutex<Option<HashMap<String, serde_json::Value>>> = Mutex::new(None);

#[derive(Debug, Deserialize)]
struct MediaControlReq {
    action: String,
}

#[derive(Debug, Deserialize)]
struct ExecReq {
    command: Option<String>,
    command_or_path: Option<String>,
    args: Option<String>,
    #[serde(rename = "workingDir")]
    working_dir: Option<String>,
}

#[derive(Debug, Deserialize)]
struct KillProcReq {
    pid: u32,
}

#[derive(Debug, Deserialize)]
struct ClipboardReq {
    text: Option<String>,
    image_data: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MouseMoveHttpReq {
    dx: i32,
    dy: i32,
}

#[derive(Debug, Deserialize)]
struct MouseClickHttpReq {
    button: String,
}

#[derive(Debug, Deserialize)]
struct MouseScrollHttpReq {
    dx: Option<i32>,
    dy: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct HotkeyHttpReq {
    keys: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct TextHttpReq {
    text: String,
}

fn cors_headers() -> Vec<Header> {
    vec![
        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, Authorization, X-Requested-With"[..]).unwrap(),
        Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap(),
    ]
}

pub fn start_server(port: u16) {
    if SERVER_RUNNING.swap(true, Ordering::SeqCst) {
        return; // Already running
    }

    thread::spawn(move || {
        let addr = format!("0.0.0.0:{}", port);
        let server = match Server::http(&addr) {
            Ok(s) => {
                println!("[NodusFleetServer] HTTP Control Bridge listening on http://{}", addr);
                s
            }
            Err(e) => {
                eprintln!("[NodusFleetServer] Failed to bind on {}: {}. Trying port 8080...", addr, e);
                match Server::http("0.0.0.0:8080") {
                    Ok(s) => {
                        println!("[NodusFleetServer] HTTP Control Bridge listening on http://0.0.0.0:8080");
                        s
                    }
                    Err(e2) => {
                        eprintln!("[NodusFleetServer] Fatal: Could not start HTTP server: {}", e2);
                        SERVER_RUNNING.store(false, Ordering::SeqCst);
                        return;
                    }
                }
            }
        };

        for mut request in server.incoming_requests() {
            let url = request.url().to_string();
            let method = request.method().clone();

            // Handle CORS Preflight
            if method == Method::Options {
                let mut response = Response::empty(StatusCode(204));
                for h in cors_headers() {
                    response.add_header(h);
                }
                let _ = request.respond(response);
                continue;
            }

            let path = url.split('?').next().unwrap_or(&url);

            let (status_code, json_body) = match (method, path) {
                // Status / Health check
                (Method::Get, "/api/status") | (Method::Get, "/api/health") | (Method::Get, "/") => {
                    let stats = get_system_stats().ok();
                    let hostname = stats.as_ref().map(|s| s.hostname.clone()).unwrap_or_else(|| "Workstation (PC)".to_string());
                    let ram_used = stats.as_ref().map(|s| s.ram_used_mb).unwrap_or(0);
                    let ram_total = stats.as_ref().map(|s| s.ram_total_mb).unwrap_or(0);
                    let cpu_load = stats.as_ref().map(|s| s.cpu_load_percent).unwrap_or(0.0);

                    (
                        200,
                        json!({
                            "status": "online",
                            "name": format!("{} (PC)", hostname),
                            "hostname": hostname,
                            "type": "desktop",
                            "role": "desktop",
                            "os": "windows",
                            "port": port,
                            "cpuLoad": cpu_load,
                            "ramUsage": format!("{:.1} / {:.1} GB", ram_used as f64 / 1024.0, ram_total as f64 / 1024.0),
                            "uptime": stats.as_ref().map(|s| s.uptime_seconds).unwrap_or(0),
                        }),
                    )
                }

                // Media & Volume Controls
                (Method::Post, "/api/media/control") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<MediaControlReq>(&body_str) {
                        match send_media_appcommand(&req.action) {
                            Ok(_) => (200, json!({ "status": "success", "action": req.action })),
                            Err(e) => (500, json!({ "status": "error", "message": e })),
                        }
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid media control payload" }))
                    }
                }

                // Lock Workstation
                (Method::Post, "/api/lock") => {
                    match crate::commands::system::lock_workstation() {
                        Ok(_) => (200, json!({ "status": "success", "message": "Workstation locked" })),
                        Err(e) => (500, json!({ "status": "error", "message": e })),
                    }
                }

                // Running Processes
                (Method::Get, "/api/processes") => {
                    match get_processes() {
                        Ok(procs) => (200, json!({ "status": "success", "processes": procs })),
                        Err(e) => (500, json!({ "status": "error", "message": e })),
                    }
                }

                // Kill Process
                (Method::Post, "/api/process/kill") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<KillProcReq>(&body_str) {
                        match crate::commands::process::kill_process(req.pid) {
                            Ok(_) => (200, json!({ "status": "success", "killedPid": req.pid })),
                            Err(e) => (500, json!({ "status": "error", "message": e })),
                        }
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid kill payload" }))
                    }
                }

                // Remote Command / Shortcut Execution
                (Method::Post, "/api/exec") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<ExecReq>(&body_str) {
                        let cmd = req.command_or_path.or(req.command).unwrap_or_default();
                        if cmd.is_empty() {
                            (400, json!({ "status": "error", "message": "Missing command string" }))
                        } else {
                            match execute_shortcut(&cmd, req.args.as_deref(), req.working_dir.as_deref()) {
                                Ok(_) => (200, json!({ "status": "success", "command": cmd })),
                                Err(e) => (500, json!({ "status": "error", "message": e })),
                            }
                        }
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid exec payload" }))
                    }
                }

                // Clipboard Get
                (Method::Get, "/api/clipboard") => {
                    match get_clipboard_content() {
                        Ok(payload) => (200, json!({
                            "status": "success",
                            "type": payload.content_type,
                            "text": payload.text.unwrap_or_default(),
                            "imageData": payload.image_data,
                        })),
                        Err(e) => (500, json!({ "status": "error", "message": e })),
                    }
                }

                // Clipboard Set
                (Method::Post, "/api/clipboard") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<ClipboardReq>(&body_str) {
                        if let Some(img_data) = req.image_data {
                            if !img_data.trim().is_empty() {
                                match set_win32_clipboard_image(&img_data) {
                                    Ok(_) => (200, json!({ "status": "success", "updated": true, "type": "image" })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Empty image payload" }))
                            }
                        } else if let Some(txt) = req.text {
                            match set_win32_clipboard(&txt) {
                                Ok(_) => (200, json!({ "status": "success", "updated": true, "type": "text" })),
                                Err(e) => (500, json!({ "status": "error", "message": e })),
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Missing text or image payload" }))
                        }
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid clipboard payload" }))
                    }
                }

                // Virtual Mouse: Move
                (Method::Post, "/api/input/mouse/move") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<MouseMoveHttpReq>(&body_str) {
                        #[cfg(windows)]
                        {
                            match crate::commands::input::send_mouse_relative(req.dx, req.dy) {
                                Ok(_) => (200, json!({ "status": "success" })),
                                Err(e) => (500, json!({ "status": "error", "message": e })),
                            }
                        }
                        #[cfg(not(windows))]
                        (200, json!({ "status": "success" }))
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid mouse move payload" }))
                    }
                }

                // Virtual Mouse: Click
                (Method::Post, "/api/input/mouse/click") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<MouseClickHttpReq>(&body_str) {
                        #[cfg(windows)]
                        {
                            match crate::commands::input::send_mouse_click(&req.button) {
                                Ok(_) => (200, json!({ "status": "success", "button": req.button })),
                                Err(e) => (500, json!({ "status": "error", "message": e })),
                            }
                        }
                        #[cfg(not(windows))]
                        (200, json!({ "status": "success" }))
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid mouse click payload" }))
                    }
                }

                // Virtual Mouse: Scroll
                (Method::Post, "/api/input/mouse/scroll") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<MouseScrollHttpReq>(&body_str) {
                        #[cfg(windows)]
                        {
                            match crate::commands::input::send_mouse_scroll(req.dx.unwrap_or(0), req.dy.unwrap_or(0)) {
                                Ok(_) => (200, json!({ "status": "success" })),
                                Err(e) => (500, json!({ "status": "error", "message": e })),
                            }
                        }
                        #[cfg(not(windows))]
                        (200, json!({ "status": "success" }))
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid mouse scroll payload" }))
                    }
                }

                // Virtual Keyboard: Hotkey
                (Method::Post, "/api/input/keyboard/hotkey") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<HotkeyHttpReq>(&body_str) {
                        #[cfg(windows)]
                        {
                            match crate::commands::input::send_hotkey(&req.keys) {
                                Ok(_) => (200, json!({ "status": "success", "keys": req.keys })),
                                Err(e) => (500, json!({ "status": "error", "message": e })),
                            }
                        }
                        #[cfg(not(windows))]
                        (200, json!({ "status": "success" }))
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid hotkey payload" }))
                    }
                }

                // Virtual Keyboard: Text Typing
                (Method::Post, "/api/input/keyboard/text") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<TextHttpReq>(&body_str) {
                        #[cfg(windows)]
                        {
                            match crate::commands::input::send_unicode_text(&req.text) {
                                Ok(_) => (200, json!({ "status": "success" })),
                                Err(e) => (500, json!({ "status": "error", "message": e })),
                            }
                        }
                        #[cfg(not(windows))]
                        (200, json!({ "status": "success" }))
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid text payload" }))
                    }
                }

                // Register Remote Peer (e.g. POCO Pad connecting)
                (Method::Post, "/api/fleet/register") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&body_str) {
                        let id = val.get("id").and_then(|v| v.as_str()).unwrap_or("poco-pad").to_string();
                        if let Ok(mut lock) = REGISTERED_DEVICES.lock() {
                            let map: &mut HashMap<String, serde_json::Value> = lock.get_or_insert_with(HashMap::new);
                            map.insert(id.clone(), val.clone());
                        }
                        (200, json!({ "status": "success", "registered": id }))
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid registration payload" }))
                    }
                }

                // Query Registered Devices on PC
                (Method::Get, "/api/fleet/devices") => {
                    let devices: Vec<serde_json::Value> = if let Ok(lock) = REGISTERED_DEVICES.lock() {
                        lock.as_ref().map(|m: &HashMap<String, serde_json::Value>| m.values().cloned().collect()).unwrap_or_default()
                    } else {
                        vec![]
                    };
                    (200, json!({ "status": "success", "devices": devices }))
                }

                _ => (404, json!({ "status": "not_found", "path": path })),
            };

            let response_bytes = json_body.to_string().into_bytes();
            let mut response = Response::from_data(response_bytes).with_status_code(StatusCode(status_code));
            for h in cors_headers() {
                response.add_header(h);
            }
            let _ = request.respond(response);
        }
    });
}
