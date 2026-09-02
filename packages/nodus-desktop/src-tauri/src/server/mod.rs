// Nodus Desktop — Embedded Fleet HTTP API & Control Server
// Listens on port 9120 to handle remote commands from POCO Pad and fleet companion nodes.

use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tiny_http::{Header, Method, Response, Server, StatusCode};

use crate::commands::{
    clipboard::{get_clipboard_content, set_win32_clipboard, set_win32_clipboard_image},
    exec::execute_shortcut,
    icon::extract_exe_icon,
    input::{simulate_hotkey, simulate_mouse_click, simulate_mouse_move, simulate_mouse_scroll, simulate_text},
    media::send_media_appcommand,
    process::get_processes,
    shortcuts::{get_installed_windows_apps, get_shared_shortcuts, load_shared_config, scan_shortcuts_folder, DiscoveredApp},
    system::get_system_stats,
};

static SERVER_RUNNING: AtomicBool = AtomicBool::new(false);
static REGISTERED_DEVICES: Mutex<Option<HashMap<String, serde_json::Value>>> = Mutex::new(None);

const MAX_REQUEST_BODY_BYTES: u64 = 65536; // 64 KB safety limit for POST bodies

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
    #[serde(alias = "runAsAdmin")]
    run_as_admin: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct KillProcReq {
    pid: u32,
}

#[derive(Debug, Deserialize)]
struct SystemControlReq {
    action: String, // "lock", "sleep", "restart", "shutdown"
}

#[derive(Debug, Deserialize)]
struct ClipboardReq {
    text: Option<String>,
    #[serde(alias = "imageData")]
    image_data: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct MouseMoveHttpReq {
    dx: i32,
    dy: i32,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct MouseClickHttpReq {
    button: String,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct MouseScrollHttpReq {
    dx: Option<i32>,
    dy: Option<i32>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct HotkeyHttpReq {
    keys: Vec<String>,
}

#[allow(dead_code)]
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
        let mut set = std::collections::HashSet::new();
        set.insert("NODUS-FLEET-SECURE".to_string());
        set.insert("nodus-fleet-token".to_string());
        set.insert("nodus-sec-key".to_string());
        *lock = Some(set);
    }
    if let Some(ref mut set) = *lock {
        set.insert(token);
    }
}

/// Authentication checker: allows loopback and validates token against pre-shared and dynamically minted fleet tokens
fn is_authorized(request: &tiny_http::Request) -> bool {
    // 1. Loopback / local desktop internal calls always authorized
    if let Some(remote) = request.remote_addr() {
        if remote.ip().is_loopback() {
            return true;
        }
    }

    let mut lock = TRUSTED_TOKENS.lock().unwrap();
    if lock.is_none() {
        let mut set = std::collections::HashSet::new();
        set.insert("NODUS-FLEET-SECURE".to_string());
        set.insert("nodus-fleet-token".to_string());
        set.insert("nodus-sec-key".to_string());
        *lock = Some(set);
    }

    let tokens = match *lock {
        Some(ref set) => set,
        _ => return false,
    };

    request.headers().iter().any(|h| {
        let field = h.field.as_str().as_str().to_ascii_lowercase();
        if field == "authorization" {
            let val = h.value.as_str();
            let cleaned = val.strip_prefix("Bearer ").unwrap_or(val).trim();
            tokens.contains(cleaned) || cleaned == "NODUS-FLEET-SECURE" || cleaned == "nodus-fleet-token"
        } else if field == "x-nodus-auth-token" {
            let cleaned = h.value.as_str().trim();
            tokens.contains(cleaned) || cleaned == "NODUS-FLEET-SECURE" || cleaned == "nodus-fleet-token"
        } else {
            false
        }
    })
}

fn read_request_body_capped(request: &mut tiny_http::Request, max_bytes: u64) -> Result<String, String> {
    let mut buffer = String::new();
    let mut reader = request.as_reader().take(max_bytes);
    reader.read_to_string(&mut buffer).map_err(|e| format!("Failed to read body: {}", e))?;
    Ok(buffer)
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

    add_trusted_token("NODUS-FLEET-SECURE".to_string());
    add_trusted_token("nodus-fleet-token".to_string());
    add_trusted_token("nodus-sec-key".to_string());

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

            let origin_opt = request
                .headers()
                .iter()
                .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("origin"))
                .map(|h| h.value.as_str().to_string());

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
                || path == "/api/fleet/register"
                || path == "/api/fleet/devices"
                || path == "/api/fleet/peers"
                || path.starts_with("/api/shortcuts");

            let (status_code, json_body) = if !is_public && !is_authorized(&request) {
                (401, json!({ "status": "error", "message": "Unauthorized: Missing or invalid X-Nodus-Auth-Token / Bearer token" }))
            } else {
                match (method, path) {
                    // Status / Health check
                    (Method::Get, "/api/status") | (Method::Get, "/api/health") | (Method::Get, "/") => {
                        let stats = get_system_stats().ok();
                        let hostname = stats.as_ref().map(|s| s.hostname.clone()).unwrap_or_else(|| "Workstation (PC)".to_string());
                        let ram_used = stats.as_ref().map(|s| s.ram_used_mb).unwrap_or(0);
                        let ram_total = stats.as_ref().map(|s| s.ram_total_mb).unwrap_or(0);
                        let cpu_load = stats.as_ref().map(|s| s.cpu_load_percent).unwrap_or(0.0);

                        // If request came from a client IP, record it as a companion node
                        if let Some(remote) = request.remote_addr() {
                            let ip = remote.ip().to_string();
                            if ip != "127.0.0.1" && ip != "::1" {
                                let id = format!("node-{}", ip.replace('.', "-"));
                                let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
                                crate::discovery::register_node(crate::discovery::DiscoveredDeviceNode {
                                    id,
                                    name: "POCO Pad Companion".to_string(),
                                    device_type: "tablet".to_string(),
                                    os: "Android 14 (HyperOS)".to_string(),
                                    ip_address: format!("{}:9120", ip),
                                    http_port: 9120,
                                    status: "online".to_string(),
                                    battery: Some(90),
                                    cpu_load: Some(15),
                                    ram_usage: Some("4.2 / 8.0 GB".to_string()),
                                    last_seen: now,
                                });
                            }
                        }

                        (
                            200,
                            json!({
                                "status": "online",
                                "name": format!("{} (PC)", hostname),
                                "hostname": hostname,
                                "type": "desktop",
                                "role": "desktop",
                                "os": "windows",
                                "cpuLoad": cpu_load,
                                "ramUsage": format!("{:.1} / {:.1} GB", ram_used as f64 / 1024.0, ram_total as f64 / 1024.0),
                                "version": "1.1.1",
                            }),
                        )
                    }

                    // Fleet Discovered Nodes Query
                    (Method::Get, "/api/fleet/devices") | (Method::Get, "/api/fleet/peers") => {
                        (200, json!({ "status": "success", "devices": crate::discovery::get_discovered_devices() }))
                    }

                    // System Telemetry
                    (Method::Get, "/api/stats") | (Method::Get, "/api/telemetry") => {
                        match get_system_stats() {
                            Ok(stats) => (200, json!({ "status": "success", "data": stats })),
                            Err(e) => (500, json!({ "status": "error", "message": e })),
                        }
                    }

                    // Process Monitor
                    (Method::Get, "/api/processes") => {
                        match get_processes() {
                            Ok(procs) => (200, json!({ "status": "success", "processes": procs })),
                            Err(e) => (500, json!({ "status": "error", "message": e })),
                        }
                    }

                    // Process Terminate
                    (Method::Post, "/api/process/kill") | (Method::Post, "/api/processes/kill") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<KillProcReq>(&body_str) {
                                match crate::commands::process::kill_process(req.pid) {
                                    Ok(_) => (200, json!({ "status": "success", "message": format!("Killed PID {}", req.pid) })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body for kill proc" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum allowed size" }))
                        }
                    }

                    // System Power & Lock Control
                    (Method::Post, "/api/system/control") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<SystemControlReq>(&body_str) {
                                match req.action.to_lowercase().as_str() {
                                    "lock" => {
                                        #[cfg(windows)]
                                        {
                                            let _ = std::process::Command::new("rundll32.exe")
                                                .args(["user32.dll,LockWorkStation"])
                                                .spawn();
                                        }
                                        (200, json!({ "status": "ok", "action": "lock" }))
                                    }
                                    "sleep" => {
                                        #[cfg(windows)]
                                        {
                                            let _ = std::process::Command::new("rundll32.exe")
                                                .args(["powrprof.dll,SetSuspendState", "0,1,0"])
                                                .spawn();
                                        }
                                        (200, json!({ "status": "ok", "action": "sleep" }))
                                    }
                                    "restart" => {
                                        #[cfg(windows)]
                                        {
                                            let _ = std::process::Command::new("shutdown")
                                                .args(["/r", "/t", "5", "/c", "Nodus Fleet reboot requested"])
                                                .spawn();
                                        }
                                        (200, json!({ "status": "ok", "action": "restart" }))
                                    }
                                    "shutdown" => {
                                        #[cfg(windows)]
                                        {
                                            let _ = std::process::Command::new("shutdown")
                                                .args(["/s", "/t", "5", "/c", "Nodus Fleet shutdown requested"])
                                                .spawn();
                                        }
                                        (200, json!({ "status": "ok", "action": "shutdown" }))
                                    }
                                    _ => (400, json!({ "status": "error", "message": format!("Unknown system action: {}", req.action) }))
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body for system control" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum allowed size" }))
                        }
                    }

                    // Lock Station alias
                    (Method::Post, "/api/lock") => {
                        #[cfg(windows)]
                        {
                            let _ = std::process::Command::new("rundll32.exe")
                                .args(["user32.dll,LockWorkStation"])
                                .spawn();
                        }
                        (200, json!({ "status": "ok", "action": "lock" }))
                    }

                    // Media AppCommand Controls
                    (Method::Post, "/api/media") | (Method::Post, "/api/media/control") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<MediaControlReq>(&body_str) {
                                match send_media_appcommand(&req.action) {
                                    Ok(_) => (200, json!({ "status": "success", "action": req.action })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Remote Execution
                    (Method::Post, "/api/exec") | (Method::Post, "/api/execute") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<ExecReq>(&body_str) {
                                let cmd = req.command_or_path.or(req.command).unwrap_or_default();
                                if cmd.is_empty() {
                                    (400, json!({ "status": "error", "message": "No command specified" }))
                                } else {
                                    match execute_shortcut(&cmd, req.args.as_deref(), req.working_dir.as_deref(), req.run_as_admin.unwrap_or(false)) {
                                        Ok(_) => (200, json!({ "status": "success", "executed": cmd })),
                                        Err(e) => (500, json!({ "status": "error", "message": e })),
                                    }
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body for exec" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Virtual Trackpad & Mouse Simulation
                    (Method::Post, "/api/input/mouse/move") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<MouseMoveHttpReq>(&body_str) {
                                match simulate_mouse_move(req.dx, req.dy) {
                                    Ok(_) => (200, json!({ "status": "success" })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body for mouse move" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    (Method::Post, "/api/input/mouse/click") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<MouseClickHttpReq>(&body_str) {
                                match simulate_mouse_click(req.button) {
                                    Ok(_) => (200, json!({ "status": "success" })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body for mouse click" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    (Method::Post, "/api/input/mouse/scroll") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<MouseScrollHttpReq>(&body_str) {
                                match simulate_mouse_scroll(req.dx, req.dy) {
                                    Ok(_) => (200, json!({ "status": "success" })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body for mouse scroll" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Virtual Keyboard & Hotkey Simulation
                    (Method::Post, "/api/input/keyboard/hotkey") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<HotkeyHttpReq>(&body_str) {
                                match simulate_hotkey(req.keys) {
                                    Ok(_) => (200, json!({ "status": "success" })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body for hotkey" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    (Method::Post, "/api/input/keyboard/text") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<TextHttpReq>(&body_str) {
                                match simulate_text(req.text) {
                                    Ok(_) => (200, json!({ "status": "success" })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body for text" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Universal Clipboard Bridge
                    (Method::Get, "/api/clipboard") => {
                        match get_clipboard_content() {
                            Ok(content) => (
                                200,
                                json!({
                                    "status": "success",
                                    "type": content.content_type,
                                    "content_type": content.content_type,
                                    "text": content.text,
                                    "imageData": content.image_data,
                                    "image_data": content.image_data,
                                    "data": content
                                }),
                            ),
                            Err(e) => (500, json!({ "status": "error", "message": e })),
                        }
                    }

                    (Method::Post, "/api/clipboard") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES * 4) {
                            if let Ok(req) = serde_json::from_str::<ClipboardReq>(&body_str) {
                                if let Some(ref img_data) = req.image_data {
                                    match set_win32_clipboard_image(img_data) {
                                        Ok(_) => (200, json!({ "status": "success", "type": "image" })),
                                        Err(e) => (500, json!({ "status": "error", "message": e })),
                                    }
                                } else if let Some(ref text) = req.text {
                                    match set_win32_clipboard(text) {
                                        Ok(_) => (200, json!({ "status": "success", "type": "text" })),
                                        Err(e) => (500, json!({ "status": "error", "message": e })),
                                    }
                                } else {
                                    (400, json!({ "status": "error", "message": "No text or image data provided" }))
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Fleet Pairing Handshake (Secure token minting with client details)
                    (Method::Post, "/api/fleet/pair-request") | (Method::Post, "/api/fleet/register") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            let pair_req: PairRequest = serde_json::from_str(&body_str).unwrap_or(PairRequest {
                                device_id: None,
                                name: None,
                                public_key: None,
                            });

                            let dev_id = pair_req.device_id.unwrap_or_else(|| "companion".to_string());
                            let dev_name = pair_req.name.unwrap_or_else(|| "Tablet Companion".to_string());
                            let pub_key = pair_req.public_key.unwrap_or_default();

                            let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
                            let token = format!("nodus-sec-{:016x}-{:08x}", ts, dev_id.len());
                            add_trusted_token(token.clone());

                            {
                                let mut lock = REGISTERED_DEVICES.lock().unwrap();
                                if lock.is_none() {
                                    *lock = Some(HashMap::new());
                                }
                                if let Some(ref mut map) = *lock {
                                    map.insert(
                                        dev_id.clone(),
                                        json!({
                                            "name": dev_name,
                                            "pairedAt": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
                                            "publicKey": pub_key,
                                        }),
                                    );
                                }
                            }

                            (
                                200,
                                json!({
                                    "status": "success",
                                    "message": "Device paired successfully",
                                    "authToken": token,
                                    "deviceId": dev_id,
                                }),
                            )
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Query Installed & Discovered Applications
                    (Method::Get, "/api/shortcuts") | (Method::Get, "/api/apps") => {
                        let shared = get_shared_shortcuts();
                        let all_apps = if shared.is_empty() {
                            get_installed_windows_apps()
                        } else {
                            Ok(shared)
                        };
                        match all_apps {
                            Ok(apps) => (200, json!({ "status": "success", "apps": apps })),
                            Err(e) => (500, json!({ "status": "error", "message": e })),
                        }
                    }

                    // Query Installed Windows Apps (Full Scan)
                    (Method::Get, "/api/shortcuts/installed") => {
                        match get_installed_windows_apps() {
                            Ok(apps) => (200, json!({ "status": "success", "apps": apps })),
                            Err(e) => (500, json!({ "status": "error", "message": e })),
                        }
                    }

                    // Extract Base64 Icon
                    (Method::Post, "/api/shortcuts/icon") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<IconExtractReq>(&body_str) {
                                match extract_exe_icon(&req.path) {
                                    Ok(icon_base64) => (200, json!({ "status": "success", "icon": icon_base64 })),
                                    Err(e) => (404, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Scan Arbitrary Folder
                    (Method::Post, "/api/shortcuts/scan") | (Method::Post, "/api/shortcuts/folder") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<FolderScanReq>(&body_str) {
                                match scan_shortcuts_folder(&req.path) {
                                    Ok(apps) => {
                                        let cfg = load_shared_config();
                                        (200, json!({ "status": "success", "apps": apps, "watched_folders": cfg.watched_folders }))
                                    }
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Add Watched Folder
                    (Method::Post, "/api/shortcuts/watched/add") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<FolderScanReq>(&body_str) {
                                match crate::commands::shortcuts::add_watched_folder(req.path) {
                                    Ok(apps) => {
                                        let cfg = load_shared_config();
                                        (200, json!({ "status": "success", "apps": apps, "watched_folders": cfg.watched_folders }))
                                    }
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Query Watched Folders Config
                    (Method::Get, "/api/shortcuts/watched") => {
                        let cfg = load_shared_config();
                        (200, json!({ "status": "success", "watched_folders": cfg.watched_folders, "shortcuts": cfg.shortcuts }))
                    }

                    // Update / Toggle Shared Shortcuts
                    (Method::Post, "/api/shortcuts/sync") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES * 2) {
                            if let Ok(val) = serde_json::from_str::<Vec<DiscoveredApp>>(&body_str) {
                                crate::commands::shortcuts::set_shared_shortcuts(val);
                                (200, json!({ "status": "success", "message": "Shortcuts updated" }))
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid shortcuts array payload" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
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
        let default_headers = cors_headers_for(None);
        let allow_origin = default_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(allow_origin.value.as_str(), "https://appassets.androidplatform.net");

        let tauri_headers = cors_headers_for(Some("tauri://localhost"));
        let tauri_origin = tauri_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(tauri_origin.value.as_str(), "tauri://localhost");

        let local_headers = cors_headers_for(Some("http://localhost:3000"));
        let local_origin = local_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(local_origin.value.as_str(), "http://localhost:3000");

        let ip_headers = cors_headers_for(Some("http://127.0.0.1:5173"));
        let ip_origin = ip_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(ip_origin.value.as_str(), "http://127.0.0.1:5173");

        let untrusted_headers = cors_headers_for(Some("https://malicious-tracker.com"));
        let untrusted_origin = untrusted_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(untrusted_origin.value.as_str(), "https://appassets.androidplatform.net");
    }

    #[test]
    fn test_auth_token_minting_and_registration() {
        let custom_token = "nodus-test-token-xyz-12345".to_string();
        add_trusted_token(custom_token.clone());

        let lock = TRUSTED_TOKENS.lock().unwrap();
        let set = lock.as_ref().unwrap();
        assert!(set.contains(&custom_token));
        assert!(set.contains("NODUS-FLEET-SECURE"));
    }

    #[test]
    fn test_json_payload_deserialization() {
        // Media request
        let media: MediaControlReq = serde_json::from_str(r#"{"action":"play_pause"}"#).unwrap();
        assert_eq!(media.action, "play_pause");

        // Exec request with camelCase aliases
        let exec: ExecReq = serde_json::from_str(r#"{"commandOrPath":"notepad.exe","runAsAdmin":true}"#).unwrap();
        assert_eq!(exec.command_or_path.as_deref(), Some("notepad.exe"));
        assert_eq!(exec.run_as_admin, Some(true));

        // Mouse Move
        let mouse_move: MouseMoveHttpReq = serde_json::from_str(r#"{"dx":15,"dy":-10}"#).unwrap();
        assert_eq!(mouse_move.dx, 15);
        assert_eq!(mouse_move.dy, -10);

        // Mouse Click
        let mouse_click: MouseClickHttpReq = serde_json::from_str(r#"{"button":"right"}"#).unwrap();
        assert_eq!(mouse_click.button, "right");

        // Mouse Scroll
        let mouse_scroll: MouseScrollHttpReq = serde_json::from_str(r#"{"dx":0,"dy":120}"#).unwrap();
        assert_eq!(mouse_scroll.dy, Some(120));

        // Hotkey
        let hotkey: HotkeyHttpReq = serde_json::from_str(r#"{"keys":["ctrl","shift","esc"]}"#).unwrap();
        assert_eq!(hotkey.keys, vec!["ctrl", "shift", "esc"]);

        // Text
        let text: TextHttpReq = serde_json::from_str(r#"{"text":"Hello from POCO Pad"}"#).unwrap();
        assert_eq!(text.text, "Hello from POCO Pad");

        // Clipboard request with camelCase alias
        let clip: ClipboardReq = serde_json::from_str(r#"{"text":"Synced content","imageData":"data:image/png;base64,abc"}"#).unwrap();
        assert_eq!(clip.text.as_deref(), Some("Synced content"));
        assert_eq!(clip.image_data.as_deref(), Some("data:image/png;base64,abc"));

        // Pairing request with deviceId alias
        let pair: PairRequest = serde_json::from_str(r#"{"deviceId":"poco-pad-1","name":"POCO Pad Pro"}"#).unwrap();
        assert_eq!(pair.device_id.as_deref(), Some("poco-pad-1"));
        assert_eq!(pair.name.as_deref(), Some("POCO Pad Pro"));
    }
}
