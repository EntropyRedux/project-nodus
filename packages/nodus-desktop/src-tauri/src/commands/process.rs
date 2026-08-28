// Nodus Desktop — Windows Process Management Commands
// Lists running processes and allows termination via Win32 ToolHelp API.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub memory_kb: u64,
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
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32First, Process32Next, PROCESSENTRY32,
        TH32CS_SNAPPROCESS,
    };
    use windows::Win32::Foundation::CloseHandle;

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

                processes.push(ProcessInfo {
                    pid: entry.th32ProcessID,
                    name,
                    memory_kb: 0, // ToolHelp doesn't provide memory; use a separate call if needed
                });

                if Process32Next(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }

        let _ = CloseHandle(snapshot);
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
