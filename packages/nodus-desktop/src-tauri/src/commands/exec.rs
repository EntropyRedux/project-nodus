// Nodus Desktop — Remote Execution Engine
// Executes native Windows binaries, powershell scripts, UWP AppIDs, or URLs.

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecRequest {
    pub command_or_path: String,
    pub args: Option<String>,
    pub working_dir: Option<String>,
    pub run_as_admin: Option<bool>,
}

#[tauri::command]
pub fn execute_local_command(req: ExecRequest) -> Result<bool, String> {
    execute_shortcut(&req.command_or_path, req.args.as_deref(), req.working_dir.as_deref())
}

pub fn execute_shortcut(
    command_or_path: &str,
    args: Option<&str>,
    working_dir: Option<&str>,
) -> Result<bool, String> {
    let trimmed = command_or_path.trim();
    if trimmed.is_empty() {
        return Err("Command or path cannot be empty".to_string());
    }

    // 1. If it's a URL or protocol handler, open with default system handler
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") || trimmed.contains("://") {
        #[cfg(windows)]
        {
            Command::new("cmd")
                .args(["/c", "start", "", trimmed])
                .spawn()
                .map_err(|e| format!("Failed to open URL: {}", e))?;
            return Ok(true);
        }
    }

    // 1b. If it's a Windows .lnk or .url shortcut file (PWAs, desktop shortcuts)
    if trimmed.ends_with(".lnk") || trimmed.ends_with(".url") {
        #[cfg(windows)]
        {
            Command::new("cmd")
                .args(["/c", "start", "", trimmed])
                .spawn()
                .map_err(|e| format!("Failed to launch shortcut (.lnk/.url): {}", e))?;
            return Ok(true);
        }
    }

    // 2. If it's a PowerShell command or script
    if trimmed.ends_with(".ps1") {
        let mut cmd = Command::new("powershell");
        cmd.args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", trimmed]);
        if let Some(a) = args {
            cmd.arg(a);
        }
        if let Some(wd) = working_dir {
            cmd.current_dir(wd);
        }
        cmd.spawn()
            .map_err(|e| format!("Failed to execute powershell script: {}", e))?;
        return Ok(true);
    }

    // 3. If it's a Windows Start Menu AUMID or Shell AppID (e.g. starts with "{" or UWP package name)
    let p = Path::new(trimmed);
    if trimmed.starts_with('{') || (!p.exists() && !trimmed.contains('\\') && !trimmed.contains('/')) {
        #[cfg(windows)]
        {
            let shell_target = format!("shell:AppsFolder\\{}", trimmed);
            Command::new("explorer.exe")
                .arg(&shell_target)
                .spawn()
                .map_err(|e| format!("Failed to launch Windows Shell AppID '{}': {}", trimmed, e))?;
            return Ok(true);
        }
    }

    // 4. Batch files
    if trimmed.ends_with(".bat") || trimmed.ends_with(".cmd") {
        let mut c = Command::new("cmd");
        c.args(["/c", trimmed]);
        if let Some(wd) = working_dir {
            c.current_dir(wd);
        }
        c.spawn()
            .map_err(|e| format!("Failed to execute batch file: {}", e))?;
        return Ok(true);
    }

    // 5. Standard executable binary or system path
    let mut cmd = Command::new(trimmed);
    if let Some(a) = args {
        if !a.trim().is_empty() {
            cmd.args(a.split_whitespace());
        }
    }
    if let Some(wd) = working_dir {
        if !wd.trim().is_empty() {
            cmd.current_dir(wd);
        }
    }

    match cmd.spawn() {
        Ok(_) => Ok(true),
        Err(e) => {
            // Fallback to explorer.exe shell execution if direct spawn fails
            #[cfg(windows)]
            {
                let shell_target = format!("shell:AppsFolder\\{}", trimmed);
                if Command::new("explorer.exe").arg(&shell_target).spawn().is_ok() {
                    return Ok(true);
                }
            }
            Err(format!("Failed to execute process '{}': {}", trimmed, e))
        }
    }
}
