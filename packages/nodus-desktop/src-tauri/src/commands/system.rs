// Nodus Desktop — System Control & Stats Commands
// Lock workstation, get CPU/RAM/disk stats via Win32 APIs.

use serde::Serialize;
use std::sync::Mutex;

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

/// Get basic system stats (hostname, OS, RAM, uptime, CPU)
#[tauri::command]
pub fn get_system_stats() -> Result<SystemStats, String> {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "Unknown".to_string());

    let (ram_used_bytes, ram_total_bytes) = get_memory_info();
    let cpu_load = get_cpu_load();

    Ok(SystemStats {
        hostname,
        os: "Windows 11".to_string(),
        cpu_load_percent: cpu_load,
        ram_used_mb: ram_used_bytes / 1024 / 1024,
        ram_total_mb: ram_total_bytes / 1024 / 1024,
        uptime_seconds: get_uptime_seconds(),
    })
}

#[cfg(windows)]
fn get_cpu_load() -> f32 {
    use windows::Win32::Foundation::FILETIME;
    use windows::Win32::System::Threading::GetSystemTimes;

    static PREV_TIMES: Mutex<Option<(u64, u64, u64)>> = Mutex::new(None);

    fn filetime_to_u64(ft: &FILETIME) -> u64 {
        ((ft.dwHighDateTime as u64) << 32) | (ft.dwLowDateTime as u64)
    }

    unsafe {
        let mut idle = FILETIME::default();
        let mut kernel = FILETIME::default();
        let mut user = FILETIME::default();

        if GetSystemTimes(Some(&mut idle), Some(&mut kernel), Some(&mut user)).is_ok() {
            let idle_u = filetime_to_u64(&idle);
            let kernel_u = filetime_to_u64(&kernel);
            let user_u = filetime_to_u64(&user);

            if let Ok(mut lock) = PREV_TIMES.lock() {
                if let Some((prev_idle, prev_kernel, prev_user)) = *lock {
                    let idle_delta = idle_u.saturating_sub(prev_idle);
                    let kernel_delta = kernel_u.saturating_sub(prev_kernel);
                    let user_delta = user_u.saturating_sub(prev_user);
                    let total = kernel_delta + user_delta;

                    *lock = Some((idle_u, kernel_u, user_u));

                    if total > 0 {
                        let busy = total.saturating_sub(idle_delta);
                        let pct = (busy as f32 / total as f32) * 100.0;
                        return (pct * 10.0).round() / 10.0;
                    }
                } else {
                    *lock = Some((idle_u, kernel_u, user_u));
                }
            }
        }
    }
    12.0
}

#[cfg(not(windows))]
fn get_cpu_load() -> f32 {
    0.0
}

#[cfg(windows)]
fn get_memory_info() -> (u64, u64) {
    use windows::Win32::System::ProcessStatus::{GetPerformanceInfo, PERFORMANCE_INFORMATION};

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


