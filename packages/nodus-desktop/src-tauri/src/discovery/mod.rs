// Nodus Desktop — UDP Subnet Discovery & Beacon Engine
// Listens for discovery probes from POCO Pad and broadcasts periodic heartbeats across LAN.

use serde_json::json;
use std::net::{SocketAddr, UdpSocket};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use crate::commands::system::get_system_stats;

const DISCOVERY_PORT: u16 = 8765;
const HTTP_PORT: u16 = 9120;
const BEACON_INTERVAL: Duration = Duration::from_secs(5);

static DISCOVERY_RUNNING: AtomicBool = AtomicBool::new(false);

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
                "type": "desktop",
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

fn handle_probe(socket: &UdpSocket, src: SocketAddr, _msg: &str, http_port: u16) {
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
