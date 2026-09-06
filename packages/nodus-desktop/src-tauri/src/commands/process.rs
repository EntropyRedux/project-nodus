// Nodus Desktop — Windows Process Management Commands
// Lists running processes with real memory, CPU metrics, and parent process hierarchy.

use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

static PROCESS_CPU_HISTORY: Mutex<Option<HashMap<u32, (Instant, u64)>>> = Mutex::new(None);

#[derive(Debug, Clone, Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub parent_name: Option<String>,
    pub name: String,
    pub memory_kb: u64,
    pub category: String,
    pub user: String,
    pub cpu: f32,
}

fn get_logical_cores() -> usize {
    std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
}

/// List all running processes on Windows
#[tauri::command]
pub async fn get_processes() -> Result<Vec<ProcessInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        get_processes_internal()
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

pub fn get_processes_internal() -> Result<Vec<ProcessInfo>, String> {
    #[cfg(windows)]
    {
        get_processes_windows()
    }
    #[cfg(not(windows))]
    {
        Ok(vec![])
    }
}

#[cfg(windows)]
fn get_processes_windows() -> Result<Vec<ProcessInfo>, String> {
    use windows::Win32::Foundation::{CloseHandle, FILETIME};
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32First, Process32Next, PROCESSENTRY32, TH32CS_SNAPPROCESS,
    };
    use windows::Win32::System::ProcessStatus::{K32GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS};
    use windows::Win32::System::Threading::{GetProcessTimes, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};

    let now = Instant::now();
    let num_cores = get_logical_cores() as f32;

    let prev_history = {
        let mut lock = PROCESS_CPU_HISTORY.lock().unwrap();
        lock.take().unwrap_or_default()
    };
    let mut next_history = HashMap::with_capacity(prev_history.len().max(64));

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
            .map_err(|e| format!("Failed to create snapshot: {}", e))?;

        let mut entry = PROCESSENTRY32 {
            dwSize: std::mem::size_of::<PROCESSENTRY32>() as u32,
            ..Default::default()
        };

        let mut raw_entries = Vec::new();
        let mut pid_to_name: HashMap<u32, String> = HashMap::new();

        // 1. First Pass: Collect all PIDs and names for parent hierarchy resolution
        if Process32First(snapshot, &mut entry).is_ok() {
            loop {
                let name_bytes: Vec<u8> = entry
                    .szExeFile
                    .iter()
                    .take_while(|&&c| c != 0)
                    .map(|&c| c as u8)
                    .collect();
                let name = String::from_utf8_lossy(&name_bytes).to_string();
                let pid = entry.th32ProcessID;
                let parent_pid = entry.th32ParentProcessID;

                if pid > 4 && !name.is_empty() {
                    pid_to_name.insert(pid, name.clone());
                    raw_entries.push((pid, parent_pid, name));
                }

                if Process32Next(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }

        let _ = CloseHandle(snapshot);

        let mut processes = Vec::with_capacity(raw_entries.len());

        // 2. Second Pass: Inspect memory, CPU delta, and resolve parent relationship
        for (pid, parent_pid, name) in raw_entries {
            let mut mem_kb: u64 = 0;
            let mut cpu_percent = 0.0f32;

            if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                // Working Set Memory
                let mut pmc = PROCESS_MEMORY_COUNTERS::default();
                pmc.cb = std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
                if K32GetProcessMemoryInfo(handle, &mut pmc, pmc.cb).as_bool() {
                    mem_kb = (pmc.WorkingSetSize / 1024) as u64;
                }

                // CPU Usage Calculation via Process Times
                let mut creation = FILETIME::default();
                let mut exit = FILETIME::default();
                let mut kernel = FILETIME::default();
                let mut user = FILETIME::default();

                if GetProcessTimes(handle, &mut creation, &mut exit, &mut kernel, &mut user).is_ok() {
                    let kernel_100ns = ((kernel.dwHighDateTime as u64) << 32) | (kernel.dwLowDateTime as u64);
                    let user_100ns = ((user.dwHighDateTime as u64) << 32) | (user.dwLowDateTime as u64);
                    let total_cpu_100ns = kernel_100ns + user_100ns;

                    if let Some(&(prev_time, prev_cpu)) = prev_history.get(&pid) {
                        let elapsed = now.duration_since(prev_time).as_secs_f32();
                        if elapsed > 0.1 && total_cpu_100ns >= prev_cpu {
                            let delta_cpu_secs = (total_cpu_100ns - prev_cpu) as f32 / 10_000_000.0;
                            let raw_pct = (delta_cpu_secs / (elapsed * num_cores)) * 100.0;
                            cpu_percent = (raw_pct.clamp(0.0, 100.0) * 10.0).round() / 10.0;
                        }
                    }

                    next_history.insert(pid, (now, total_cpu_100ns));
                }

                let _ = CloseHandle(handle);
            }

            let parent_name = if parent_pid > 4 {
                pid_to_name.get(&parent_pid).cloned()
            } else {
                None
            };

            let lower_name = name.to_lowercase();
            let (category, user) = if lower_name.contains("webview2") {
                ("system".to_string(), "WebView2 Host".to_string())
            } else if lower_name.ends_with("service.exe")
                || lower_name.starts_with("svchost")
                || lower_name == "services.exe"
                || lower_name == "lsass.exe"
                || lower_name == "wininit.exe"
                || lower_name == "csrss.exe"
                || lower_name == "smss.exe"
            {
                ("system".to_string(), "SYSTEM".to_string())
            } else if lower_name == "msedge.exe"
                || lower_name.contains("chrome")
                || lower_name.contains("firefox")
                || lower_name.contains("brave")
            {
                ("browser".to_string(), "User".to_string())
            } else if lower_name.contains("code")
                || lower_name.contains("node")
                || lower_name.contains("git")
                || lower_name.contains("cargo")
                || lower_name.contains("rust")
                || lower_name.contains("terminal")
            {
                ("dev".to_string(), "User".to_string())
            } else if lower_name.contains("spotify")
                || lower_name.contains("vlc")
                || lower_name.contains("media")
            {
                ("media".to_string(), "User".to_string())
            } else if lower_name.contains("daemon")
                || lower_name.contains("helper")
                || lower_name.contains("broker")
                || lower_name.contains("server")
                || lower_name == "runtimebroker.exe"
                || lower_name == "sihost.exe"
                || lower_name == "taskhostw.exe"
            {
                ("system".to_string(), "LOCAL SERVICE".to_string())
            } else {
                ("user".to_string(), "User".to_string())
            };

            processes.push(ProcessInfo {
                pid,
                parent_pid: if parent_pid > 0 { Some(parent_pid) } else { None },
                parent_name,
                name,
                memory_kb: mem_kb,
                category,
                user,
                cpu: cpu_percent,
            });
        }

        // Save updated CPU history
        {
            let mut lock = PROCESS_CPU_HISTORY.lock().unwrap();
            *lock = Some(next_history);
        }

        // Sort processes by memory usage descending by default
        processes.sort_by(|a, b| b.memory_kb.cmp(&a.memory_kb));
        Ok(processes)
    }
}

/// Kill a process by PID
#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        kill_process_internal(pid)
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

pub fn kill_process_internal(pid: u32) -> Result<bool, String> {
    #[cfg(windows)]
    {
        kill_process_windows(pid)
    }
    #[cfg(not(windows))]
    {
        Err("Not implemented on this platform".to_string())
    }
}

#[cfg(windows)]
fn kill_process_windows(pid: u32) -> Result<bool, String> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};

    // Prevent killing critical system PIDs
    if pid <= 4 {
        return Err(format!("Cannot terminate protected system PID {}", pid));
    }

    unsafe {
        if let Ok(handle) = OpenProcess(PROCESS_TERMINATE, false, pid) {
            let res = TerminateProcess(handle, 1);
            let _ = CloseHandle(handle);
            if res.is_ok() {
                return Ok(true);
            }
        }
    }

    // Fallback: taskkill /PID <pid> /F
    let output = std::process::Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/F"])
        .output();

    match output {
        Ok(out) if out.status.success() => Ok(true),
        Ok(out) => {
            let err_msg = String::from_utf8_lossy(&out.stderr).to_string();
            Err(if err_msg.trim().is_empty() {
                format!("Failed to kill PID {}", pid)
            } else {
                err_msg
            })
        }
        Err(e) => Err(format!("taskkill execution error: {}", e)),
    }
}
