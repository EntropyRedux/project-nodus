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
    icon::extract_exe_icon,
    media::send_media_appcommand,
    process::get_processes,
    shortcuts::{get_installed_windows_apps, get_shared_shortcuts, load_shared_config, save_shared_config, scan_shortcuts_folder, DiscoveredApp},
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
    #[serde(alias = "commandOrPath")]
    command_or_path: Option<String>,
    args: Option<String>,
    #[serde(alias = "workingDir")]
    working_dir: Option<String>,
}

#[derive(Debug, Deserialize)]
struct KillProcReq {
    pid: u32,
}

#[derive(Debug, Deserialize)]
struct ClipboardReq {
    text: Option<String>,
    #[serde(alias = "imageData")]
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

#[derive(Debug, Deserialize)]
struct IconExtractReq {
    path: String,
}

#[derive(Debug, Deserialize)]
struct FolderScanReq {
    path: String,
}

#[derive(Debug, Deserialize)]
struct PairRequest {
    #[serde(alias = "deviceId")]
    device_id: Option<String>,
    name: Option<String>,
    #[serde(alias = "publicKey")]
    public_key: Option<String>,
}

static TRUSTED_TOKENS: Mutex<Option<std::collections::HashSet<String>>> = Mutex::new(None);

pub fn add_trusted_token(token: String) {
    let mut lock = TRUSTED_TOKENS.lock().unwrap();
    if lock.is_none() {
        *lock = Some(std::collections::HashSet::new());
    }
    if let Some(ref mut set) = *lock {
        set.insert(token);
    }
}

fn is_authorized(request: &tiny_http::Request) -> bool {
    let lock = TRUSTED_TOKENS.lock().unwrap();
    let tokens = match *lock {
        Some(ref set) if !set.is_empty() => set,
        _ => return true, // Dev mode bypass if no tokens explicitly configured
    };

    request.headers().iter().any(|h| {
        let field = h.field.as_str().as_str().to_ascii_lowercase();
        if field == "authorization" {
            let val = h.value.as_str();
            tokens.contains(val.strip_prefix("Bearer ").unwrap_or(val))
        } else if field == "x-nodus-auth-token" {
            tokens.contains(h.value.as_str())
        } else {
            false
        }
    })
}

fn cors_headers_for(origin: Option<&str>) -> Vec<Header> {
    let allowed_origin = match origin {
        Some(o) if o.starts_with("tauri://")
                || o.starts_with("http://localhost")
                || o.starts_with("http://127.0.0.1")
                || o == "https://appassets.androidplatform.net" => o,
        _ => "https://appassets.androidplatform.net",
    };

    vec![
        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], allowed_origin.as_bytes()).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, Authorization, X-Nodus-Auth-Token, X-Requested-With"[..]).unwrap(),
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

            // Extract Origin header for CORS as owned String to release immutable borrow
            let origin_opt = request
                .headers()
                .iter()
                .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("origin"))
                .map(|h| h.value.as_str().to_string());

            // Handle CORS Preflight
            if method == Method::Options {
                let mut response = Response::empty(StatusCode(204));
                for h in cors_headers_for(origin_opt.as_deref()) {
                    response.add_header(h);
                }
                let _ = request.respond(response);
                continue;
            }

            let path = url.split('?').next().unwrap_or(&url);

            // Public endpoints that do not require auth token
            let is_public = path == "/api/status" 
                || path == "/api/health" 
                || path == "/" 
                || path == "/api/fleet/pair-request" 
                || path == "/api/fleet/register";

            let (status_code, json_body) = if !is_public && !is_authorized(&request) {
                (401, json!({ "status": "error", "message": "Unauthorized: Missing or invalid X-Nodus-Auth-Token" }))
            } else {
                match (method, path) {
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

                // Peer Pairing Request (KDE Connect / LocalSend Zero-Trust style)
                (Method::Post, "/api/fleet/pair-request") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<PairRequest>(&body_str) {
                        let dev_id = req.device_id.unwrap_or_else(|| "poco-pad".to_string());
                        let dev_name = req.name.unwrap_or_else(|| "Remote Tablet".to_string());
                        let token = format!("nodus-session-{}-{}", dev_id, std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs());
                        add_trusted_token(token.clone());

                        if let Ok(mut lock) = REGISTERED_DEVICES.lock() {
                            let map: &mut HashMap<String, serde_json::Value> = lock.get_or_insert_with(HashMap::new);
                            map.insert(dev_id.clone(), json!({
                                "id": dev_id,
                                "name": dev_name,
                                "type": "tablet",
                                "paired": true,
                                "token": token
                            }));
                        }

                        (200, json!({
                            "status": "success",
                            "paired": true,
                            "token": token,
                            "message": format!("Device {} paired successfully", dev_name)
                        }))
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid pairing payload" }))
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

                // Extract Icon from Executable Path
                (Method::Post, "/api/shortcuts/icon") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<IconExtractReq>(&body_str) {
                        match extract_exe_icon(&req.path) {
                            Ok(data_uri) => (200, json!({ "status": "success", "icon": data_uri })),
                            Err(e) => (200, json!({ "status": "fallback", "icon": null, "message": e })),
                        }
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid icon extract payload. Expected { \"path\": \"C:\\\\...\\\\app.exe\" }" }))
                    }
                }

                // Query Shared Shortcuts (for POCO Pad & Companion nodes)
                (Method::Get, "/api/shortcuts") => {
                    let shortcuts = get_shared_shortcuts();
                    (200, json!({ "status": "success", "shortcuts": shortcuts }))
                }

                // Query All Discovered Windows Apps (Start Menu & PWAs)
                (Method::Get, "/api/shortcuts/installed") => {
                    match get_installed_windows_apps() {
                        Ok(apps) => (200, json!({ "status": "success", "apps": apps })),
                        Err(e) => (500, json!({ "status": "error", "message": e })),
                    }
                }

                // Scan Directory / Watched Folder for Shortcuts (.lnk, .url, .exe, .bat, etc.)
                (Method::Post, "/api/shortcuts/folder") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(req) = serde_json::from_str::<FolderScanReq>(&body_str) {
                        let path_str = req.path.trim();
                        match scan_shortcuts_folder(path_str) {
                            Ok(apps) => {
                                let mut cfg = load_shared_config();
                                if !path_str.is_empty() && !cfg.watched_folders.contains(&path_str.to_string()) {
                                    cfg.watched_folders.push(path_str.to_string());
                                    save_shared_config(&cfg);
                                }
                                (200, json!({ "status": "success", "apps": apps, "watched_folders": cfg.watched_folders }))
                            }
                            Err(e) => (400, json!({ "status": "error", "message": e })),
                        }
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid folder scan payload. Expected { \"path\": \"C:\\\\...\" }" }))
                    }
                }

                // Query Watched Folders Config
                (Method::Get, "/api/shortcuts/watched") => {
                    let cfg = load_shared_config();
                    (200, json!({ "status": "success", "watched_folders": cfg.watched_folders, "shortcuts": cfg.shortcuts }))
                }

                // Update / Toggle Shared Shortcuts
                (Method::Post, "/api/shortcuts/sync") => {
                    let mut body_str = String::new();
                    let _ = request.as_reader().read_to_string(&mut body_str);
                    if let Ok(val) = serde_json::from_str::<Vec<DiscoveredApp>>(&body_str) {
                        crate::commands::shortcuts::set_shared_shortcuts(val);
                        (200, json!({ "status": "success", "message": "Shortcuts updated" }))
                    } else {
                        (400, json!({ "status": "error", "message": "Invalid shortcuts array payload" }))
                    }
                }

                _ => (404, json!({ "status": "not_found", "path": path })),
            }
        };

            let response_bytes = json_body.to_string().into_bytes();
            let mut response = Response::from_data(response_bytes).with_status_code(StatusCode(status_code));
            for h in cors_headers_for(origin_opt.as_deref()) {
                response.add_header(h);
            }
            let _ = request.respond(response);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cors_headers_origin_matching() {
        // Null origin defaults to Android platform asset loader
        let default_headers = cors_headers_for(None);
        let allow_origin = default_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(allow_origin.value.as_str(), "https://appassets.androidplatform.net");

        // Tauri origin is allowed
        let tauri_headers = cors_headers_for(Some("tauri://localhost"));
        let tauri_origin = tauri_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(tauri_origin.value.as_str(), "tauri://localhost");

        // Localhost web origin is allowed
        let local_headers = cors_headers_for(Some("http://localhost:3000"));
        let local_origin = local_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(local_origin.value.as_str(), "http://localhost:3000");

        // Loopback IP origin is allowed
        let ip_headers = cors_headers_for(Some("http://127.0.0.1:5173"));
        let ip_origin = ip_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(ip_origin.value.as_str(), "http://127.0.0.1:5173");

        // Untrusted origin is rejected and sanitized to safe platform origin
        let untrusted_headers = cors_headers_for(Some("https://malicious-tracker.com"));
        let untrusted_origin = untrusted_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(untrusted_origin.value.as_str(), "https://appassets.androidplatform.net");
    }

    #[test]
    fn test_trusted_token_management() {
        let test_token = "nodus-test-token-12345".to_string();
        add_trusted_token(test_token.clone());

        let lock = TRUSTED_TOKENS.lock().unwrap();
        assert!(lock.is_some());
        assert!(lock.as_ref().unwrap().contains(&test_token));
    }

    #[test]
    fn test_request_payload_deserialization() {
        // Test ClipboardReq with camelCase imageData and text
        let clip_json = r#"{"text":"Hello Nodus","imageData":"data:image/png;base64,iVBORw0KGgo"}"#;
        let clip_req: ClipboardReq = serde_json::from_str(clip_json).unwrap();
        assert_eq!(clip_req.text.as_deref(), Some("Hello Nodus"));
        assert_eq!(clip_req.image_data.as_deref(), Some("data:image/png;base64,iVBORw0KGgo"));

        // Test PairRequest with camelCase deviceId
        let pair_json = r#"{"deviceId":"tablet-poco-pad","name":"POCO Pad"}"#;
        let pair_req: PairRequest = serde_json::from_str(pair_json).unwrap();
        assert_eq!(pair_req.device_id.as_deref(), Some("tablet-poco-pad"));
        assert_eq!(pair_req.name.as_deref(), Some("POCO Pad"));

        // Test ExecReq with camelCase workingDir and commandOrPath
        let exec_json = r#"{"commandOrPath":"code .","workingDir":"C:\\Projects"}"#;
        let exec_req: ExecReq = serde_json::from_str(exec_json).unwrap();
        assert_eq!(exec_req.command_or_path.as_deref(), Some("code ."));
        assert_eq!(exec_req.working_dir.as_deref(), Some("C:\\Projects"));
    }
}
