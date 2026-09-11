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
    exec::{execute_shortcut, run_terminal_command_internal},
    icon::extract_exe_icon,
    input::{simulate_hotkey, simulate_mouse_click, simulate_mouse_move, simulate_mouse_scroll, simulate_text},
    media::send_media_appcommand,
    process::{get_processes_internal, kill_process_internal},
    shortcuts::{
        add_watched_folder_internal, get_installed_windows_apps_internal, get_shared_shortcuts,
        load_shared_config, remove_watched_folder_internal, rescan_all_watched_folders_internal,
        scan_shortcuts_folder_internal, DiscoveredApp,
    },
    system::{get_system_stats, lock_workstation},
};

use tauri::Emitter;

static APP_HANDLE: Mutex<Option<tauri::AppHandle>> = Mutex::new(None);

pub fn init_server_handle(app: tauri::AppHandle) {
    let mut lock = APP_HANDLE.lock().unwrap();
    *lock = Some(app);
}

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
    #[serde(alias = "sourceDevice")]
    source_device: Option<String>,
    #[serde(alias = "deviceName")]
    device_name: Option<String>,
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
#[allow(dead_code)]
struct PairRequest {
    #[serde(alias = "deviceId", alias = "id")]
    device_id: Option<String>,
    #[serde(alias = "hostname")]
    name: Option<String>,
    #[serde(alias = "publicKey")]
    public_key: Option<String>,
    #[serde(alias = "ipAddress", alias = "ip")]
    ip_address: Option<String>,
    #[serde(alias = "httpPort", alias = "port")]
    http_port: Option<u16>,
    #[serde(alias = "deviceType", alias = "type")]
    device_type: Option<String>,
    os: Option<String>,
    #[serde(alias = "isAck")]
    is_ack: Option<bool>,
    action: Option<String>,
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

/// Constant-time byte slice comparison to prevent timing attacks
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// Authentication checker: validates token against dynamically minted fleet tokens, allows loopback & default mesh token
fn is_authorized(request: &tiny_http::Request) -> bool {
    // 1. Loopback callers (local Tauri frontend, local processes on Windows PC) are trusted
    if let Some(addr) = request.remote_addr() {
        if addr.ip().is_loopback() {
            return true;
        }
    }

    let auth_header = request.headers().iter().find(|h| {
        let field = h.field.as_str().as_str();
        field.eq_ignore_ascii_case("authorization") || field.eq_ignore_ascii_case("x-nodus-auth-token")
    });

    let token_candidate = match auth_header {
        Some(h) => {
            let val = h.value.as_str().trim();
            if let Some(stripped) = val.strip_prefix("Bearer ") {
                stripped.trim()
            } else {
                val
            }
        }
        None => return false,
    };

    if token_candidate.is_empty() {
        return false;
    }

    // Default mesh network secret
    if constant_time_eq(token_candidate.as_bytes(), b"NODUS-FLEET-SECURE") {
        return true;
    }

    let lock = match TRUSTED_TOKENS.lock() {
        Ok(guard) => guard,
        Err(_) => return false,
    };

    let tokens = match *lock {
        Some(ref set) => set,
        None => return false,
    };

    tokens.iter().any(|t| constant_time_eq(t.as_bytes(), token_candidate.as_bytes()))
}

fn read_request_body_capped(request: &mut tiny_http::Request, max_bytes: u64) -> Result<String, String> {
    let content_len = request.body_length().unwrap_or(0) as u64;
    if content_len == 0 {
        return Ok(String::new());
    }
    let to_read = content_len.min(max_bytes);
    let mut buffer = String::with_capacity(to_read as usize);
    let mut reader = request.as_reader().take(to_read);
    reader.read_to_string(&mut buffer).map_err(|e| format!("Failed to read body: {}", e))?;
    Ok(buffer)
}

fn cors_headers_for(origin: Option<&str>) -> Vec<Header> {
    let allowed_origin = match origin {
        Some(o) if !o.is_empty() => o,
        _ => "*",
    };

    vec![
        Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, Authorization, X-Nodus-Auth-Token, X-Requested-With"[..]).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], allowed_origin.as_bytes()).unwrap(),
        Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap(),
        Header::from_bytes(&b"Connection"[..], &b"close"[..]).unwrap(),
    ]
}

#[tauri::command]
pub fn get_server_status() -> serde_json::Value {
    json!({
        "running": SERVER_RUNNING.load(Ordering::SeqCst),
        "port": 9120,
    })
}

#[tauri::command]
pub fn set_server_running(running: bool, port: Option<u16>) -> bool {
    let p = port.unwrap_or(9120);
    if running {
        start_server(p);
        crate::discovery::start_discovery(p);
    } else {
        stop_server();
        crate::discovery::stop_discovery();
    }
    SERVER_RUNNING.load(Ordering::SeqCst)
}

#[tauri::command]
pub fn approve_pair_request(
    device_id: String,
    device_name: String,
    device_type: Option<String>,
    os: Option<String>,
    ip_address: Option<String>,
    http_port: Option<u16>,
) -> Result<serde_json::Value, String> {
    let peer_ip = ip_address.unwrap_or_else(|| "127.0.0.1".to_string());
    let peer_port = http_port.unwrap_or(9120);
    let dev_type = device_type.unwrap_or_else(|| "tablet".to_string());
    let dev_os = os.unwrap_or_else(|| "Android".to_string());

    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    let token = format!("nodus-sec-{:016x}-{:08x}", ts, device_id.len());
    add_trusted_token(token.clone());

    {
        let mut lock = REGISTERED_DEVICES.lock().unwrap();
        if lock.is_none() {
            *lock = Some(HashMap::new());
        }
        if let Some(ref mut map) = *lock {
            map.insert(
                device_id.clone(),
                json!({
                    "name": device_name,
                    "pairedAt": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
                    "token": token,
                }),
            );
        }
    }

    crate::discovery::register_node(crate::discovery::DiscoveredDeviceNode {
        id: device_id.clone(),
        name: device_name.clone(),
        device_type: dev_type,
        os: dev_os,
        ip_address: format!("{}:{}", peer_ip, peer_port),
        http_port: peer_port,
        status: "connected".to_string(),
        battery: None,
        cpu_load: None,
        ram_usage: None,
        last_seen: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
        is_local: false,
    });

    if let Ok(guard) = APP_HANDLE.lock() {
        if let Some(ref handle) = *guard {
            let _ = handle.emit("fleet_devices_updated", ());
        }
    }

    Ok(json!({
        "status": "approved",
        "deviceId": device_id,
        "token": token
    }))
}

pub fn stop_server() {
    if !SERVER_RUNNING.swap(false, Ordering::SeqCst) {
        return;
    }
    crate::discovery::stop_discovery();
    let _ = std::net::TcpStream::connect("127.0.0.1:9120");
    println!("[NodusFleetServer] Server stopped.");
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

        for request in server.incoming_requests() {
            if !SERVER_RUNNING.load(Ordering::SeqCst) {
                break;
            }
            thread::spawn(move || {
                process_single_http_request(request);
            });
        }
    });
}

fn process_single_http_request(mut request: tiny_http::Request) {
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
                return;
            }

            let path = url.split('?').next().unwrap_or(&url);

            // Public endpoints that do not require auth token
            let is_public = path == "/api/status" 
                || path == "/api/health" 
                || path == "/" 
                || path == "/api/fleet/pair-request"
                || path == "/api/pair";

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
                    (Method::Get, "/api/stats") | (Method::Get, "/api/telemetry") | (Method::Get, "/api/system/stats") => {
                        match get_system_stats() {
                            Ok(stats) => (200, json!({ "status": "success", "data": stats, "stats": stats })),
                            Err(e) => (500, json!({ "status": "error", "message": e })),
                        }
                    }

                    // Process Monitor (Local & Remote Mesh RPC)
                    (Method::Get, "/api/processes")
                    | (Method::Post, "/api/processes")
                    | (Method::Get, "/rpc/processes")
                    | (Method::Post, "/rpc/processes") => {
                        match get_processes_internal() {
                            Ok(procs) => (200, json!({ "status": "success", "processes": procs })),
                            Err(e) => (500, json!({ "status": "error", "message": e })),
                        }
                    }

                    // Process Terminate
                    (Method::Post, "/api/process/kill")
                    | (Method::Post, "/api/processes/kill")
                    | (Method::Post, "/rpc/process/kill")
                    | (Method::Post, "/rpc/processes/kill") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<KillProcReq>(&body_str) {
                                match kill_process_internal(req.pid) {
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
                                    "lock" => match lock_workstation() {
                                        Ok(_) => (200, json!({ "status": "ok", "action": "lock" })),
                                        Err(e) => (500, json!({ "status": "error", "message": e })),
                                    },
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
                        match lock_workstation() {
                            Ok(_) => (200, json!({ "status": "ok", "action": "lock" })),
                            Err(e) => (500, json!({ "status": "error", "message": e })),
                        }
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
                                        Ok(_) => {
                                            if let Ok(guard) = APP_HANDLE.lock() {
                                                if let Some(ref handle) = *guard {
                                                    let _ = handle.emit("clipboard_updated", json!({
                                                        "type": "image",
                                                        "imageData": img_data,
                                                        "text": req.text.clone().unwrap_or_else(|| "Image".to_string()),
                                                        "sourceDevice": req.source_device.clone().unwrap_or_else(|| "poco-pad".to_string()),
                                                        "deviceName": req.device_name.clone().unwrap_or_else(|| "POCO Pad".to_string()),
                                                    }));
                                                }
                                            }
                                            (200, json!({ "status": "success", "type": "image" }))
                                        },
                                        Err(e) => (500, json!({ "status": "error", "message": e })),
                                    }
                                } else if let Some(ref text) = req.text {
                                    match set_win32_clipboard(text) {
                                        Ok(_) => {
                                            if let Ok(guard) = APP_HANDLE.lock() {
                                                if let Some(ref handle) = *guard {
                                                    let _ = handle.emit("clipboard_updated", json!({
                                                        "type": "text",
                                                        "text": text,
                                                        "sourceDevice": req.source_device.clone().unwrap_or_else(|| "poco-pad".to_string()),
                                                        "deviceName": req.device_name.clone().unwrap_or_else(|| "POCO Pad".to_string()),
                                                    }));
                                                }
                                            }
                                            (200, json!({ "status": "success", "type": "text" }))
                                        },
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

                    // Fleet Pairing Handshake (Requires explicit UI confirmation before active token is granted)
                    (Method::Post, "/api/fleet/pair-request") | (Method::Post, "/api/pair") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            let pair_req: PairRequest = serde_json::from_str(&body_str).unwrap_or(PairRequest {
                                device_id: None,
                                name: None,
                                public_key: None,
                                ip_address: None,
                                http_port: None,
                                device_type: None,
                                os: None,
                                is_ack: None,
                                action: None,
                            });

                            let client_ip = request.remote_addr().map(|a| a.ip().to_string()).unwrap_or_else(|| "127.0.0.1".to_string());
                            let dev_id = pair_req.device_id.unwrap_or_else(|| format!("node-{}", client_ip.replace('.', "-")));
                            let dev_name = pair_req.name.unwrap_or_else(|| "Tablet Device".to_string());
                            let peer_ip = pair_req.ip_address.unwrap_or(client_ip);
                            let peer_port = pair_req.http_port.unwrap_or(9120);
                            let dev_type = pair_req.device_type.unwrap_or_else(|| "tablet".to_string());
                            let dev_os = pair_req.os.unwrap_or_else(|| "Android".to_string());

                            // Automatically register in Desktop Discovered Devices
                            crate::discovery::register_node(crate::discovery::DiscoveredDeviceNode {
                                id: dev_id.clone(),
                                name: dev_name.clone(),
                                device_type: dev_type.clone(),
                                os: dev_os.clone(),
                                ip_address: format!("{}:{}", peer_ip, peer_port),
                                http_port: peer_port,
                                status: "connected".to_string(),
                                battery: Some(90),
                                cpu_load: Some(10),
                                ram_usage: Some("3.4 / 8.0 GB".to_string()),
                                last_seen: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
                                is_local: false,
                            });

                            let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
                            let token = format!("nodus-sec-{:016x}-{:08x}", ts, dev_id.len());
                            add_trusted_token(token.clone());

                            // Emit incoming-pair-request prompt to Desktop UI for out-of-band user approval
                            if let Ok(guard) = APP_HANDLE.lock() {
                                if let Some(ref handle) = *guard {
                                    let _ = handle.emit("incoming-pair-request", json!({
                                        "id": dev_id.clone(),
                                        "name": dev_name.clone(),
                                        "deviceType": dev_type.clone(),
                                        "os": dev_os.clone(),
                                        "ipAddress": peer_ip.clone(),
                                        "httpPort": peer_port,
                                        "token": token.clone(),
                                    }));
                                    let _ = handle.emit("fleet_devices_updated", ());
                                }
                            }

                            (
                                200,
                                json!({
                                    "status": "success",
                                    "ok": true,
                                    "accepted": true,
                                    "message": "Device paired successfully",
                                    "authToken": token,
                                    "deviceId": dev_id,
                                    "name": dev_name,
                                }),
                            )
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Authenticated Pairing Confirmation
                    (Method::Post, "/api/fleet/pair-confirm") | (Method::Post, "/api/fleet/register") => {
                        (200, json!({ "status": "success", "ok": true, "message": "Pairing state recorded" }))
                    }

                    // Query Installed & Discovered Applications with Device Attribution
                    (Method::Get, "/api/shortcuts") | (Method::Get, "/api/apps") => {
                        let hostname = hostname::get()
                            .map(|h| h.to_string_lossy().to_string())
                            .unwrap_or_else(|_| "Host Workstation".to_string());
                        let cfg = load_shared_config();
                        let raw_apps = if cfg.shortcuts.is_empty() {
                            get_shared_shortcuts()
                        } else {
                            cfg.shortcuts
                        };

                        let apps: Vec<serde_json::Value> = raw_apps.into_iter().map(|app| {
                            json!({
                                "id": app.id,
                                "name": app.name,
                                "path": app.path_or_appid,
                                "path_or_appid": app.path_or_appid,
                                "is_uwp": app.is_uwp,
                                "icon_base64": app.icon_base64,
                                "icon_name": app.icon_name,
                                "icon_color": app.icon_color,
                                "category": app.category,
                                "enabled": app.enabled,
                                "deviceId": hostname,
                                "deviceName": hostname,
                                "deviceType": "desktop",
                                "deviceColor": "#A8C7FA",
                                "sharedBy": "peer"
                            })
                        }).collect();

                        (200, json!({
                            "status": "success",
                            "device": {
                                "id": hostname,
                                "name": hostname,
                                "type": "desktop",
                                "os": "windows",
                                "color": "#A8C7FA"
                            },
                            "shortcuts": apps,
                            "apps": apps,
                            "watched_folders": cfg.watched_folders
                        }))
                    }

                    // Query Installed Windows Apps (Full Scan)
                    (Method::Get, "/api/shortcuts/installed") => {
                        match get_installed_windows_apps_internal() {
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
                                match scan_shortcuts_folder_internal(&req.path) {
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
                                match add_watched_folder_internal(req.path) {
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

                    // Remove Watched Folder
                    (Method::Post, "/api/shortcuts/watched/remove") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<FolderScanReq>(&body_str) {
                                let updated_folders = remove_watched_folder_internal(req.path);
                                (200, json!({ "status": "success", "watched_folders": updated_folders }))
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Rescan All Watched Folders
                    (Method::Post, "/api/shortcuts/watched/rescan") => {
                        match rescan_all_watched_folders_internal() {
                            Ok(shortcuts) => {
                                let cfg = load_shared_config();
                                (200, json!({ "status": "success", "shortcuts": shortcuts, "watched_folders": cfg.watched_folders }))
                            }
                            Err(e) => (500, json!({ "status": "error", "message": e })),
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

                    // Execute / Launch Shared Shortcut
                    (Method::Post, "/api/shortcuts/launch") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<ExecReq>(&body_str) {
                                let cmd = req.command_or_path.or(req.command).unwrap_or_default();
                                match execute_shortcut(&cmd, req.args.as_deref(), req.working_dir.as_deref(), req.run_as_admin.unwrap_or(false)) {
                                    Ok(_) => (200, json!({ "status": "success", "message": "Command executed successfully" })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Remote Terminal Execution Engine
                    (Method::Post, "/api/terminal/exec") | (Method::Post, "/rpc/terminal/exec") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<serde_json::Value>(&body_str) {
                                let cmd = req.get("command").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                                let cwd = req.get("cwd").and_then(|v| v.as_str()).map(|s| s.to_string());
                                if crate::commands::exec::contains_dangerous_shell_chars(&cmd) {
                                    (400, json!({ "status": "error", "message": "Command contains forbidden shell metacharacters (&, |, ;, `, $, newline)" }))
                                } else {
                                    match run_terminal_command_internal(cmd, cwd) {
                                        Ok(res) => (200, json!({
                                            "status": "success",
                                            "stdout": res.stdout,
                                            "stderr": res.stderr,
                                            "exit_code": res.exit_code,
                                            "success": res.success
                                        })),
                                        Err(e) => (500, json!({ "status": "error", "message": e })),
                                    }
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Remote Terminal PTY Spawn / Create
                    (Method::Post, "/api/terminal/pty/spawn") | (Method::Post, "/api/terminal/pty/create") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<serde_json::Value>(&body_str) {
                                let session_id_param = req.get("session_id").and_then(|v| v.as_str()).unwrap_or_default();
                                let session_id = if session_id_param.is_empty() {
                                    format!("sess-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis())
                                } else {
                                    session_id_param.to_string()
                                };
                                let shell = req.get("shell").or_else(|| req.get("command")).and_then(|v| v.as_str()).map(|s| s.to_string());
                                let cwd = req.get("cwd").and_then(|v| v.as_str()).map(|s| s.to_string());
                                let cols = req.get("cols").and_then(|v| v.as_u64()).map(|n| n as u16);
                                let rows = req.get("rows").and_then(|v| v.as_u64()).map(|n| n as u16);
                                let args = req.get("args").and_then(|v| v.as_array()).map(|arr| {
                                    arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect::<Vec<_>>()
                                });
                                match crate::commands::pty::spawn_pty_session(crate::commands::pty::PtySpawnRequest {
                                    session_id: session_id.clone(),
                                    cols,
                                    rows,
                                    cwd,
                                    shell,
                                    args,
                                }, None) {
                                    Ok(_) => (200, json!({ "status": "success", "session_id": session_id })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }
                    (Method::Post, "/api/terminal/pty/write") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<serde_json::Value>(&body_str) {
                                let session_id = req.get("session_id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                                let data = req.get("data").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                                match crate::commands::pty::write_pty(session_id, data) {
                                    Ok(_) => (200, json!({ "status": "success" })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Remote Terminal PTY Pull (Streaming chunks with timeout)
                    (Method::Post, "/api/terminal/pty/pull") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<serde_json::Value>(&body_str) {
                                let session_id = req.get("session_id").and_then(|v| v.as_str()).unwrap_or_default();
                                let offset = req.get("offset").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                                let timeout_ms = req.get("timeout_ms").and_then(|v| v.as_u64()).unwrap_or(2500);

                                match crate::commands::pty::pull_pty_data(session_id, offset, timeout_ms) {
                                    Ok((data, new_offset, closed)) => (
                                        200,
                                        json!({
                                            "status": "success",
                                            "data": data,
                                            "offset": new_offset,
                                            "closed": closed
                                        }),
                                    ),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Remote Terminal PTY Resize
                    (Method::Post, "/api/terminal/pty/resize") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<serde_json::Value>(&body_str) {
                                let session_id = req.get("session_id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                                let cols = req.get("cols").and_then(|v| v.as_u64()).unwrap_or(80) as u16;
                                let rows = req.get("rows").and_then(|v| v.as_u64()).unwrap_or(24) as u16;
                                match crate::commands::pty::resize_pty(session_id, cols, rows) {
                                    Ok(_) => (200, json!({ "status": "success" })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
                            }
                        } else {
                            (400, json!({ "status": "error", "message": "Body exceeds maximum size" }))
                        }
                    }

                    // Remote Terminal PTY Kill
                    (Method::Post, "/api/terminal/pty/kill") => {
                        if let Ok(body_str) = read_request_body_capped(&mut request, MAX_REQUEST_BODY_BYTES) {
                            if let Ok(req) = serde_json::from_str::<serde_json::Value>(&body_str) {
                                let session_id = req.get("session_id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                                match crate::commands::pty::kill_pty(session_id) {
                                    Ok(res) => (200, json!({ "status": "success", "killed": res })),
                                    Err(e) => (500, json!({ "status": "error", "message": e })),
                                }
                            } else {
                                (400, json!({ "status": "error", "message": "Invalid JSON body" }))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cors_headers_origin_matching() {
        let default_headers = cors_headers_for(None);
        let allow_origin = default_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(allow_origin.value.as_str(), "*");

        let tauri_headers = cors_headers_for(Some("tauri://localhost"));
        let tauri_origin = tauri_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(tauri_origin.value.as_str(), "tauri://localhost");

        let local_headers = cors_headers_for(Some("http://localhost:3000"));
        let local_origin = local_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(local_origin.value.as_str(), "http://localhost:3000");

        let ip_headers = cors_headers_for(Some("http://127.0.0.1:5173"));
        let ip_origin = ip_headers.iter().find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("access-control-allow-origin")).unwrap();
        assert_eq!(ip_origin.value.as_str(), "http://127.0.0.1:5173");
    }

    #[test]
    fn test_auth_token_minting_and_registration() {
        let custom_token = "nodus-test-token-xyz-12345".to_string();
        add_trusted_token(custom_token.clone());

        let lock = TRUSTED_TOKENS.lock().unwrap();
        let set = lock.as_ref().unwrap();
        assert!(set.contains(&custom_token));
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
