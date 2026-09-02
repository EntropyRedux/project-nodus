// Nodus Desktop — UDP Subnet Discovery & Beacon Engine
// Listens for discovery probes from POCO Pad and broadcasts periodic heartbeats across LAN.

use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::net::{SocketAddr, UdpSocket};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::commands::system::get_system_stats;

const DISCOVERY_PORT: u16 = 8765;
const HTTP_PORT: u16 = 9120;
const BEACON_INTERVAL: Duration = Duration::from_secs(4);

static DISCOVERY_RUNNING: AtomicBool = AtomicBool::new(false);
static DISCOVERED_DEVICES: Mutex<Option<HashMap<String, DiscoveredDeviceNode>>> = Mutex::new(None);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredDeviceNode {
    pub id: String,
    pub name: String,
    #[serde(rename = "deviceType")]
    pub device_type: String,
    pub os: String,
    #[serde(rename = "ipAddress")]
    pub ip_address: String,
    #[serde(rename = "httpPort")]
    pub http_port: u16,
    pub status: String,
    pub battery: Option<u8>,
    #[serde(rename = "cpuLoad")]
    pub cpu_load: Option<u8>,
    #[serde(rename = "ramUsage")]
    pub ram_usage: Option<String>,
    #[serde(rename = "lastSeen")]
    pub last_seen: u64,
}

pub fn register_node(device: DiscoveredDeviceNode) {
    let mut lock = DISCOVERED_DEVICES.lock().unwrap();
    if lock.is_none() {
        *lock = Some(HashMap::new());
    }
    if let Some(ref mut map) = *lock {
        map.insert(device.id.clone(), device);
    }
}

#[tauri::command]
pub fn get_discovered_devices() -> Vec<DiscoveredDeviceNode> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    let mut lock = DISCOVERED_DEVICES.lock().unwrap();
    if let Some(ref mut map) = *lock {
        for dev in map.values_mut() {
            if now.saturating_sub(dev.last_seen) > 45 {
                dev.status = "offline".to_string();
            } else {
                dev.status = "online".to_string();
            }
        }
        map.values().cloned().collect()
    } else {
        vec![]
    }
}

pub fn start_discovery(server_port: u16) {
    if DISCOVERY_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }

    let port = if server_port > 0 { server_port } else { HTTP_PORT };

    // 1. Start UDP Listener Thread
    thread::spawn(move || {
        let socket = match UdpSocket::bind(format!("0.0.0.0:{}", DISCOVERY_PORT)) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[NodusDiscovery] Could not bind to port {}: {}. Trying wildcard port...", DISCOVERY_PORT, e);
                match UdpSocket::bind("0.0.0.0:0") {
                    Ok(s) => s,
                    Err(e2) => {
                        eprintln!("[NodusDiscovery] Failed to create UDP socket: {}", e2);
                        return;
                    }
                }
            }
        };

        let _ = socket.set_broadcast(true);
        println!("[NodusDiscovery] UDP Beacon Listener active on {}", socket.local_addr().map(|a| a.to_string()).unwrap_or_default());

        let mut buf = [0u8; 4096];
        while DISCOVERY_RUNNING.load(Ordering::Relaxed) {
            match socket.recv_from(&mut buf) {
                Ok((len, src)) => {
                    let msg = String::from_utf8_lossy(&buf[..len]).trim().to_string();
                    if msg.starts_with('{') && msg.ends_with('}') {
                        handle_probe(&socket, src, &msg, port);
                    }
                }
                Err(_) => {
                    thread::sleep(Duration::from_millis(50));
                }
            }
        }
    });

    // 2. Start Periodic UDP Beacon Sender Thread
    thread::spawn(move || {
        let send_socket = match UdpSocket::bind("0.0.0.0:0") {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[NodusDiscovery] Failed to create broadcast socket: {}", e);
                return;
            }
        };
        let _ = send_socket.set_broadcast(true);

        while DISCOVERY_RUNNING.load(Ordering::Relaxed) {
            let stats = get_system_stats().ok();
            let hostname = stats.as_ref().map(|s| s.hostname.clone()).unwrap_or_else(|| "Workstation (PC)".to_string());
            let ram_used = stats.as_ref().map(|s| s.ram_used_mb).unwrap_or(0);
            let ram_total = stats.as_ref().map(|s| s.ram_total_mb).unwrap_or(0);

            let beacon_payload = json!({
                "type": "NODUS_BEACON",
                "client": "com.nodus.desktop",
                "name": format!("{} (PC)", hostname),
                "hostname": hostname,
                "role": "desktop",
                "deviceType": "desktop",
                "os": "windows",
                "status": "online",
                "port": port,
                "httpPort": port,
                "battery": 100,
                "cpuLoad": 8,
                "ramUsage": format!("{:.1} / {:.1} GB", ram_used as f64 / 1024.0, ram_total as f64 / 1024.0),
            }).to_string();

            let bytes = beacon_payload.as_bytes();
            let broadcast_addrs = [
                format!("255.255.255.255:{}", DISCOVERY_PORT),
                format!("255.255.255.255:8080"),
            ];

            for target in broadcast_addrs {
                let _ = send_socket.send_to(bytes, &target);
            }

            thread::sleep(BEACON_INTERVAL);
        }
    });
}

fn handle_probe(socket: &UdpSocket, src: SocketAddr, msg: &str, http_port: u16) {
    let sender_ip = src.ip().to_string();
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(msg) {
        let msg_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");
        if msg_type == "NODUS_DISCOVER_REQ" || msg_type == "NODUS_BEACON" {
            let name = val.get("name").and_then(|v| v.as_str()).unwrap_or("POCO Pad");
            let device_type = val.get("deviceType").or_else(|| val.get("type")).and_then(|v| v.as_str()).unwrap_or("tablet");
            let os = val.get("os").and_then(|v| v.as_str()).unwrap_or("android");
            let dev_http_port = val.get("httpPort").or_else(|| val.get("port")).and_then(|v| v.as_u64()).unwrap_or(9120) as u16;
            let battery = val.get("battery").and_then(|v| v.as_u64()).map(|b| b as u8).or(Some(90));
            let cpu_load = val.get("cpuLoad").or_else(|| val.get("cpu")).and_then(|v| v.as_u64()).map(|c| c as u8).or(Some(12));
            let ram_usage = val.get("ramUsage").and_then(|v| v.as_str()).map(|s| s.to_string()).or_else(|| Some("4.2 / 8.0 GB".to_string()));

            let id = format!("node-{}", sender_ip.replace('.', "-"));
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

            register_node(DiscoveredDeviceNode {
                id,
                name: name.to_string(),
                device_type: device_type.to_string(),
                os: if os.to_lowercase().contains("android") { "Android 14 (HyperOS)".to_string() } else { os.to_string() },
                ip_address: format!("{}:{}", sender_ip, dev_http_port),
                http_port: dev_http_port,
                status: "online".to_string(),
                battery,
                cpu_load,
                ram_usage,
                last_seen: now,
            });
        }
    }

    let stats = get_system_stats().ok();
    let hostname = stats.as_ref().map(|s| s.hostname.clone()).unwrap_or_else(|| "Workstation (PC)".to_string());
    let ram_used = stats.as_ref().map(|s| s.ram_used_mb).unwrap_or(0);
    let ram_total = stats.as_ref().map(|s| s.ram_total_mb).unwrap_or(0);

    let response = json!({
        "type": "NODUS_DISCOVER_RESP",
        "name": format!("{} (PC)", hostname),
        "hostname": hostname,
        "role": "desktop",
        "deviceType": "desktop",
        "type": "desktop",
        "os": "windows",
        "status": "online",
        "port": http_port,
        "httpPort": http_port,
        "battery": 100,
        "cpuLoad": 8,
        "ramUsage": format!("{:.1} / {:.1} GB", ram_used as f64 / 1024.0, ram_total as f64 / 1024.0),
    }).to_string();

    let _ = socket.send_to(response.as_bytes(), src);
}

