// Nodus Desktop — System Control & Stats Commands
// Lock workstation, get CPU/RAM/disk stats via Win32 APIs.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct SystemStats {
    pub hostname: String,
    pub os: String,
    pub cpu_load_percent: f32,
    pub ram_used_mb: u64,
    pub ram_total_mb: u64,
    pub uptime_seconds: u64,
}

/// Lock the Windows workstation
#[tauri::command]
pub fn lock_workstation() -> Result<bool, String> {
    #[cfg(windows)]
    {
        lock_workstation_windows()
    }
    #[cfg(not(windows))]
    {
        Err("Not implemented on this platform".to_string())
    }
}

#[cfg(windows)]
fn lock_workstation_windows() -> Result<bool, String> {
    use windows::Win32::System::Shutdown::LockWorkStation;
    unsafe {
        LockWorkStation()
            .map(|_| true)
            .map_err(|e| format!("Failed to lock workstation: {}", e))
    }
}

/// Get basic system stats (hostname, OS, RAM, uptime)
#[tauri::command]
pub fn get_system_stats() -> Result<SystemStats, String> {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "Unknown".to_string());

    // RAM info via sysinfo-style approach (simplified for now)
    let (ram_used, ram_total) = get_memory_info();

    Ok(SystemStats {
        hostname,
        os: std::env::consts::OS.to_string(),
        cpu_load_percent: 0.0, // TODO: implement with PDH or periodic sampling
        ram_used_mb: ram_used / 1024 / 1024,
        ram_total_mb: ram_total / 1024 / 1024,
        uptime_seconds: get_uptime_seconds(),
    })
}

#[cfg(windows)]
fn get_memory_info() -> (u64, u64) {
    use windows::Win32::System::ProcessStatus::{
        GetPerformanceInfo, PERFORMANCE_INFORMATION,
    };

    unsafe {
        let mut info = PERFORMANCE_INFORMATION::default();
        info.cb = std::mem::size_of::<PERFORMANCE_INFORMATION>() as u32;
        if GetPerformanceInfo(&mut info, info.cb).is_ok() {
            let page_size = info.PageSize as u64;
            let total = info.PhysicalTotal as u64 * page_size;
            let available = info.PhysicalAvailable as u64 * page_size;
            let used = total.saturating_sub(available);
            (used, total)
        } else {
            (0, 0)
        }
    }
}

#[cfg(not(windows))]
fn get_memory_info() -> (u64, u64) {
    (0, 0)
}

#[cfg(windows)]
fn get_uptime_seconds() -> u64 {
    use windows::Win32::System::SystemInformation::GetTickCount64;
    unsafe { GetTickCount64() / 1000 }
}

#[cfg(not(windows))]
fn get_uptime_seconds() -> u64 {
    0
}

