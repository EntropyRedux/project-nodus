// Nodus Desktop — Remote Execution Engine
// Executes native Windows binaries, powershell scripts, or URLs.

use serde::{Deserialize, Serialize};
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

    // 1. If it's a URL or protocol, open with default browser/app handler
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

    // 3. Standard executable or CLI binary
    let mut cmd = if trimmed.ends_with(".bat") || trimmed.ends_with(".cmd") {
        let mut c = Command::new("cmd");
        c.args(["/c", trimmed]);
        c
    } else {
        Command::new(trimmed)
    };

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

    cmd.spawn()
        .map_err(|e| format!("Failed to execute process '{}': {}", trimmed, e))?;

    Ok(true)
}
