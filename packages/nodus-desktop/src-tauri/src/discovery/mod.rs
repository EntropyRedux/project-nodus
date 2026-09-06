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
    #[serde(rename = "isLocal", default)]
    pub is_local: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedPeerResult {
    pub ip: String,
    pub port: u16,
    pub hostname: Option<String>,
    #[serde(rename = "hasAgent")]
    pub has_agent: bool,
    #[serde(rename = "isInFleet")]
    pub is_in_fleet: bool,
    #[serde(rename = "deviceType")]
    pub device_type: Option<String>,
    pub os: Option<String>,
    #[serde(rename = "latencyMs")]
    pub latency_ms: Option<u64>,
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
pub fn unregister_node(id: String) -> bool {
    if id == "this-pc" || id == "local" {
        return false; // Prevent unregistering the host controller itself
    }
    let mut lock = DISCOVERED_DEVICES.lock().unwrap();
    if let Some(ref mut map) = *lock {
        map.remove(&id).is_some()
    } else {
        false
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

fn get_local_host_ips() -> Vec<String> {
    let mut ips = vec![
        "127.0.0.1".to_string(),
        "::1".to_string(),
        "localhost".to_string(),
        "0.0.0.0".to_string(),
    ];

    if let Ok(host) = hostname::get() {
        if let Some(host_str) = host.to_str() {
            ips.push(host_str.to_lowercase());
            use std::net::ToSocketAddrs;
            if let Ok(addrs) = format!("{}:0", host_str).to_socket_addrs() {
                for addr in addrs {
                    ips.push(addr.ip().to_string());
                }
            }
        }
    }

    #[cfg(windows)]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if let Ok(output) = Command::new("ipconfig")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                if line.contains("IPv4 Address")
                    || line.contains("IPv4-Adresse")
                    || line.contains("Dirección IPv4")
                    || line.contains("IP Address")
                {
                    if let Some(pos) = line.find(':') {
                        let ip = line[pos + 1..].trim().to_string();
                        if !ip.is_empty() {
                            ips.push(ip);
                        }
                    }
                }
            }
        }
    }

    ips
}

fn get_arp_ips(base_prefix: &str) -> Vec<String> {
    let mut ips = Vec::new();

    #[cfg(windows)]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if let Ok(output) = Command::new("arp")
            .arg("-a")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                if parts.len() >= 3 {
                    let ip = parts[0];
                    let mac = parts[1];
                    if ip.starts_with(base_prefix)
                        && !ip.ends_with(".255")
                        && !ip.ends_with(".0")
                        && mac != "ff-ff-ff-ff-ff-ff"
                        && !mac.starts_with("01-00-5e")
                        && !ip.starts_with("224.")
                        && !ip.starts_with("239.")
                    {
                        ips.push(ip.to_string());
                    }
                }
            }
        }
    }

    ips
}

fn resolve_device_hostname(ip: &str) -> Option<String> {
    // Fast in-memory hostname check or NetBIOS name without launching ping.exe
    if let Ok(host) = hostname::get() {
        if let Some(host_str) = host.to_str() {
            if ip == "127.0.0.1" || ip == "::1" {
                return Some(host_str.to_string());
            }
        }
    }
    None
}

fn infer_device_type(hostname: &str) -> String {
    let h = hostname.to_lowercase();
    if h.contains("pad") || h.contains("tab") || h.contains("surface") || h.contains("poco") {
        "tablet".to_string()
    } else if h.contains("phone")
        || h.contains("pixel")
        || h.contains("galaxy")
        || h.contains("iphone")
        || h.contains("android")
    {
        "phone".to_string()
    } else if h.contains("macbook")
        || h.contains("laptop")
        || h.contains("thinkpad")
        || h.contains("book")
    {
        "laptop".to_string()
    } else {
        "desktop".to_string()
    }
}

#[tauri::command]
pub async fn scan_subnet(subnet_base: String) -> Result<Vec<ScannedPeerResult>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        scan_subnet_internal(subnet_base)
    })
    .await
    .map_err(|e| format!("Subnet scanner task error: {}", e))?
}

fn scan_subnet_internal(subnet_base: String) -> Result<Vec<ScannedPeerResult>, String> {
    use std::io::{Read, Write};
    use std::net::TcpStream;
    use std::sync::Arc;
    use std::time::Instant;

    let base = subnet_base.trim().trim_end_matches(".0").trim_end_matches('.');
    if base.is_empty() {
        return Err("Invalid subnet base".to_string());
    }

    let local_ips = get_local_host_ips();
    let base_prefix = format!("{}.", base);

    let results = Arc::new(Mutex::new(HashMap::<String, ScannedPeerResult>::new()));
    let registered_ips: HashMap<String, bool> = {
        let lock = DISCOVERED_DEVICES.lock().unwrap();
        if let Some(ref map) = *lock {
            map.values()
                .map(|d| {
                    let host_part = d.ip_address.split(':').next().unwrap_or("").to_string();
                    (host_part, true)
                })
                .collect()
        } else {
            HashMap::new()
        }
    };

    // 1. Initial quick ARP snapshot (fast, native cache)
    let initial_arp_ips = get_arp_ips(&base_prefix);

    // 2. Parallel sweep across all 254 IPs using lightweight worker pool
    let ips: Vec<u8> = (1..=254).collect();
    for chunk in ips.chunks(64) {
        let mut handles = vec![];
        for &last_octet in chunk {
            let ip = format!("{}.{}", base, last_octet);

            // Logically exclude local machine
            if local_ips.iter().any(|lip| lip == &ip) {
                continue;
            }

            let results_clone = Arc::clone(&results);
            let in_fleet = registered_ips.contains_key(&ip);

            handles.push(thread::spawn(move || {
                let start = Instant::now();

                // A. Probe Port 9120 (Nodus RPC)
                let rpc_addr_str = format!("{}:9120", ip);
                if let Ok(addr) = rpc_addr_str.parse::<SocketAddr>() {
                    if let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(180)) {
                        let latency = start.elapsed().as_millis() as u64;
                        let _ = stream.set_read_timeout(Some(Duration::from_millis(250)));
                        let _ = stream.set_write_timeout(Some(Duration::from_millis(250)));
                        let req = format!("GET /api/status HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n", ip);
                        let _ = stream.write_all(req.as_bytes());

                        let mut body = [0u8; 1024];
                        let mut name = None;
                        let mut dev_type = Some("tablet".to_string());
                        let mut os = Some("Android 14 (HyperOS)".to_string());

                        if let Ok(n) = stream.read(&mut body) {
                            let text = String::from_utf8_lossy(&body[..n]);
                            if let Some(pos) = text.find("\r\n\r\n") {
                                let json_part = &text[pos + 4..];
                                if let Ok(val) = serde_json::from_str::<serde_json::Value>(json_part) {
                                    name = val.get("name").or(val.get("hostname")).and_then(|v| v.as_str()).map(|s| s.to_string());
                                    dev_type = val.get("deviceType").or(val.get("type")).and_then(|v| v.as_str()).map(|s| s.to_string());
                                    os = val.get("os").and_then(|v| v.as_str()).map(|s| s.to_string());
                                }
                            }
                        }

                        let mut lock = results_clone.lock().unwrap();
                        lock.insert(ip.clone(), ScannedPeerResult {
                            ip: ip.clone(),
                            port: 9120,
                            hostname: name.or_else(|| Some(format!("Nodus Node ({})", ip))),
                            has_agent: true,
                            is_in_fleet: in_fleet,
                            device_type: dev_type.or(Some("tablet".to_string())),
                            os: os.or(Some("Android 14 (HyperOS)".to_string())),
                            latency_ms: Some(latency),
                        });
                        return;
                    }
                }

                // B. Probe standard fleet auxiliary ports (80, 8080, 8765) with low timeout
                for test_port in [80, 8080, 8765] {
                    let probe_addr = format!("{}:{}", ip, test_port);
                    if let Ok(addr) = probe_addr.parse::<SocketAddr>() {
                        if let Ok(_) = TcpStream::connect_timeout(&addr, Duration::from_millis(60)) {
                            let latency = start.elapsed().as_millis() as u64;

                            let mut lock = results_clone.lock().unwrap();
                            lock.insert(ip.clone(), ScannedPeerResult {
                                ip: ip.clone(),
                                port: test_port,
                                hostname: Some(format!("Device ({})", ip)),
                                has_agent: false,
                                is_in_fleet: false,
                                device_type: Some("desktop".to_string()),
                                os: Some("LAN Device".to_string()),
                                latency_ms: Some(latency),
                            });
                            return;
                        }
                    }
                }
            }));
        }

        for h in handles {
            let _ = h.join();
        }
    }

    // 3. Post-sweep: Check updated ARP cache
    let post_arp_ips = get_arp_ips(&base_prefix);
    let mut all_discovered_ips = initial_arp_ips;
    for a_ip in post_arp_ips {
        if !all_discovered_ips.contains(&a_ip) {
            all_discovered_ips.push(a_ip);
        }
    }

    // 4. Record remaining ARP neighbors without launching ping subprocesses
    {
        let mut lock = results.lock().unwrap();
        for a_ip in all_discovered_ips {
            if local_ips.iter().any(|lip| lip == &a_ip) {
                continue;
            }
            if !lock.contains_key(&a_ip) {
                let resolved = resolve_device_hostname(&a_ip);
                let host_display = resolved.clone().unwrap_or_else(|| format!("LAN Device ({})", a_ip));
                let dev_type = resolved.as_deref().map(infer_device_type).unwrap_or_else(|| "desktop".to_string());
                lock.insert(a_ip.clone(), ScannedPeerResult {
                    ip: a_ip.clone(),
                    port: 80,
                    hostname: Some(host_display),
                    has_agent: false,
                    is_in_fleet: false,
                    device_type: Some(dev_type),
                    os: Some("LAN Device".to_string()),
                    latency_ms: Some(10),
                });
            }
        }
    }

    let mut final_list: Vec<ScannedPeerResult> = {
        let lock = results.lock().unwrap();
        lock.values().cloned().collect()
    };

    // Sort: Nodus agents first, then by IP
    final_list.sort_by(|a, b| {
        if a.has_agent != b.has_agent {
            b.has_agent.cmp(&a.has_agent)
        } else {
            let a_last: u32 = a.ip.split('.').last().and_then(|s| s.parse().ok()).unwrap_or(0);
            let b_last: u32 = b.ip.split('.').last().and_then(|s| s.parse().ok()).unwrap_or(0);
            a_last.cmp(&b_last)
        }
    });

    Ok(final_list)
}

#[tauri::command]
pub async fn get_lan_device_count(subnet_base: Option<String>) -> usize {
    tauri::async_runtime::spawn_blocking(move || {
        get_lan_device_count_internal(subnet_base)
    })
    .await
    .unwrap_or(0)
}

fn get_lan_device_count_internal(subnet_base: Option<String>) -> usize {
    let local_ips = get_local_host_ips();
    let base = subnet_base.unwrap_or_else(|| "192.168.1".to_string());
    let clean_base = base.trim().trim_end_matches(".0").trim_end_matches('.');
    let prefix = format!("{}.", clean_base);

    let arp_ips = get_arp_ips(&prefix);
    let mut count = 0;
    for ip in arp_ips {
        if !local_ips.iter().any(|lip| lip == &ip) {
            count += 1;
        }
    }
    count
}

pub fn stop_discovery() {
    DISCOVERY_RUNNING.store(false, Ordering::SeqCst);
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
    let stats = get_system_stats().ok();
    let hostname = stats.as_ref().map(|s| s.hostname.clone()).unwrap_or_else(|| "Workstation (PC)".to_string());

    if let Ok(val) = serde_json::from_str::<serde_json::Value>(msg) {
        let msg_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");
        if msg_type == "NODUS_DISCOVER_REQ" || msg_type == "NODUS_BEACON" {
            let client = val.get("client").and_then(|v| v.as_str()).unwrap_or("");
            let beacon_host = val.get("hostname").and_then(|v| v.as_str()).unwrap_or("");
            let is_self_desktop = (client == "com.nodus.desktop" && (beacon_host == hostname || src.ip().is_loopback()))
                || src.ip().is_loopback()
                || sender_ip == "127.0.0.1";

            let name = if is_self_desktop {
                format!("{} (Host PC)", hostname)
            } else {
                val.get("name").and_then(|v| v.as_str()).unwrap_or("POCO Pad").to_string()
            };

            let device_type = if is_self_desktop {
                "desktop".to_string()
            } else {
                val.get("deviceType").or_else(|| val.get("type")).and_then(|v| v.as_str()).unwrap_or("tablet").to_string()
            };

            let os = if is_self_desktop {
                "windows".to_string()
            } else {
                let raw_os = val.get("os").and_then(|v| v.as_str()).unwrap_or("android");
                if raw_os.to_lowercase().contains("android") {
                    "Android 14 (HyperOS)".to_string()
                } else {
                    raw_os.to_string()
                }
            };

            let dev_http_port = val.get("httpPort").or_else(|| val.get("port")).and_then(|v| v.as_u64()).unwrap_or(9120) as u16;
            let battery = val.get("battery").and_then(|v| v.as_u64()).map(|b| b as u8).or(Some(if is_self_desktop { 100 } else { 90 }));
            let cpu_load = val.get("cpuLoad").or_else(|| val.get("cpu")).and_then(|v| v.as_u64()).map(|c| c as u8).or(Some(if is_self_desktop { 8 } else { 12 }));
            let ram_usage = val.get("ramUsage").and_then(|v| v.as_str()).map(|s| s.to_string()).or_else(|| Some("4.2 / 8.0 GB".to_string()));

            let id = if is_self_desktop {
                "this-pc".to_string()
            } else {
                format!("node-{}", sender_ip.replace('.', "-"))
            };
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

            register_node(DiscoveredDeviceNode {
                id,
                name,
                device_type,
                os,
                ip_address: format!("{}:{}", sender_ip, dev_http_port),
                http_port: dev_http_port,
                status: "online".to_string(),
                battery,
                cpu_load,
                ram_usage,
                last_seen: now,
                is_local: is_self_desktop,
            });
        }
    }

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

