// Nodus Desktop — Windows Process Management Commands
// Lists running processes with real memory metrics and allows termination via Win32 API.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub memory_kb: u64,
    pub category: String,
    pub user: String,
    pub cpu: f32,
}

/// List all running processes on Windows
#[tauri::command]
pub fn get_processes() -> Result<Vec<ProcessInfo>, String> {
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
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32First, Process32Next, PROCESSENTRY32, TH32CS_SNAPPROCESS,
    };
    use windows::Win32::System::ProcessStatus::{K32GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS};
    use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
            .map_err(|e| format!("Failed to create snapshot: {}", e))?;

        let mut entry = PROCESSENTRY32 {
            dwSize: std::mem::size_of::<PROCESSENTRY32>() as u32,
            ..Default::default()
        };

        let mut processes = Vec::new();

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

                // Only inspect non-idle processes
                if pid > 4 && !name.is_empty() {
                    let mut mem_kb: u64 = 0;
                    if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                        let mut pmc = PROCESS_MEMORY_COUNTERS::default();
                        pmc.cb = std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
                        if K32GetProcessMemoryInfo(handle, &mut pmc, pmc.cb).as_bool() {
                            mem_kb = (pmc.WorkingSetSize / 1024) as u64;
                        }
                        let _ = CloseHandle(handle);
                    }

                    let lower_name = name.to_lowercase();
                    let (category, user) = if lower_name.ends_with("service.exe")
                        || lower_name.starts_with("svchost")
                        || lower_name == "services.exe"
                        || lower_name == "lsass.exe"
                        || lower_name == "wininit.exe"
                        || lower_name == "csrss.exe"
                        || lower_name == "smss.exe"
                    {
                        ("system".to_string(), "SYSTEM".to_string())
                    } else if lower_name.contains("daemon")
                        || lower_name.contains("helper")
                        || lower_name.contains("broker")
                        || lower_name.contains("server")
                        || lower_name == "runtimebroker.exe"
                        || lower_name == "sihost.exe"
                        || lower_name == "taskhostw.exe"
                    {
                        ("daemon".to_string(), "LOCAL SERVICE".to_string())
                    } else {
                        ("user".to_string(), "User".to_string())
                    };

                    processes.push(ProcessInfo {
                        pid,
                        name,
                        memory_kb: mem_kb,
                        category,
                        user,
                        cpu: 0.0,
                    });
                }

                if Process32Next(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }

        let _ = CloseHandle(snapshot);
        // Sort processes by memory usage descending by default
        processes.sort_by(|a, b| b.memory_kb.cmp(&a.memory_kb));
        Ok(processes)
    }
}

/// Kill a process by PID
#[tauri::command]
pub fn kill_process(pid: u32) -> Result<bool, String> {
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
    use windows::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};
    use windows::Win32::Foundation::CloseHandle;

    unsafe {
        let handle = OpenProcess(PROCESS_TERMINATE, false, pid)
            .map_err(|e| format!("Failed to open process {}: {}", pid, e))?;

        let result = TerminateProcess(handle, 1);
        let _ = CloseHandle(handle);

        result.map(|_| true).map_err(|e| format!("Failed to terminate process {}: {}", pid, e))
    }
}
