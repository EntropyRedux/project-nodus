// Nodus Desktop — Remote Execution Engine
// Executes native Windows binaries, powershell scripts, UWP AppIDs, or URLs with permission checks.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecRequest {
    pub command_or_path: String,
    pub args: Option<String>,
    pub working_dir: Option<String>,
    pub run_as_admin: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalExecResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub success: bool,
    pub cwd: Option<String>,
}

#[tauri::command]
pub fn execute_local_command(req: ExecRequest) -> Result<bool, String> {
    execute_shortcut(&req.command_or_path, req.args.as_deref(), req.working_dir.as_deref(), req.run_as_admin.unwrap_or(false))
}

#[tauri::command]
pub fn get_default_working_dir() -> String {
    if let Ok(profile) = std::env::var("USERPROFILE") {
        if Path::new(&profile).is_dir() {
            return profile;
        }
    }
    if let Ok(home) = std::env::var("HOME") {
        if Path::new(&home).is_dir() {
            return home;
        }
    }
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "C:\\".to_string())
}

#[tauri::command]
pub fn run_terminal_command(command: String, cwd: Option<String>) -> Result<TerminalExecResult, String> {
    let trimmed = command.trim();
    let default_dir = get_default_working_dir();

    if trimmed.is_empty() {
        let current_dir = match &cwd {
            Some(d) if Path::new(d).is_dir() => d.clone(),
            _ => default_dir,
        };
        return Ok(TerminalExecResult {
            stdout: String::new(),
            stderr: String::new(),
            exit_code: 0,
            success: true,
            cwd: Some(current_dir),
        });
    }

    #[cfg(windows)]
    {
        let valid_cwd = match &cwd {
            Some(d) if Path::new(d).is_dir() => d.clone(),
            _ => default_dir,
        };

        // Form PowerShell execution script that executes command and outputs resulting working directory
        let mut script = format!("Set-Location -LiteralPath '{}'; ", valid_cwd.replace('\'', "''"));
        script.push_str(&format!("{}; $__nodus_cwd = (Get-Location).Path; [Console]::Out.Write([Environment]::NewLine + \"__NODUS_CWD__:\" + $__nodus_cwd)", trimmed));

        let mut cmd = Command::new("powershell");
        cmd.args(["-NoProfile", "-NonInteractive", "-Command", &script]);
        if Path::new(&valid_cwd).is_dir() {
            cmd.current_dir(&valid_cwd);
        }

        let output = cmd.output().map_err(|e| format!("Failed to execute terminal command: {}", e))?;
        let raw_stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);

        let (stdout, resulting_cwd) = if let Some(idx) = raw_stdout.rfind("__NODUS_CWD__:") {
            let out = raw_stdout[..idx].trim_end().to_string();
            let new_dir = raw_stdout[idx + "__NODUS_CWD__:".len()..].trim().to_string();
            (out, if !new_dir.is_empty() && Path::new(&new_dir).is_dir() { Some(new_dir) } else { Some(valid_cwd) })
        } else {
            (raw_stdout.trim_end().to_string(), Some(valid_cwd))
        };

        Ok(TerminalExecResult {
            stdout,
            stderr: stderr.trim_end().to_string(),
            exit_code,
            success: output.status.success() && stderr.trim().is_empty(),
            cwd: resulting_cwd,
        })
    }
    #[cfg(not(windows))]
    {
        let valid_cwd = match &cwd {
            Some(d) if Path::new(d).is_dir() => d.clone(),
            _ => default_dir,
        };

        let script = format!("cd '{}'; {}; echo \"__NODUS_CWD__:$(pwd)\"", valid_cwd.replace('\'', "''"), trimmed);
        let mut cmd = Command::new("sh");
        cmd.args(["-c", &script]);
        if Path::new(&valid_cwd).is_dir() {
            cmd.current_dir(&valid_cwd);
        }

        let output = cmd.output().map_err(|e| format!("Failed to execute terminal command: {}", e))?;
        let raw_stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);

        let (stdout, resulting_cwd) = if let Some(idx) = raw_stdout.rfind("__NODUS_CWD__:") {
            let out = raw_stdout[..idx].trim_end().to_string();
            let new_dir = raw_stdout[idx + "__NODUS_CWD__:".len()..].trim().to_string();
            (out, if !new_dir.is_empty() { Some(new_dir) } else { Some(valid_cwd) })
        } else {
            (raw_stdout.trim_end().to_string(), Some(valid_cwd))
        };

        Ok(TerminalExecResult {
            stdout,
            stderr: stderr.trim_end().to_string(),
            exit_code,
            success: output.status.success(),
            cwd: resulting_cwd,
        })
    }
}

#[cfg(windows)]
use windows::core::{HSTRING, PCWSTR};
#[cfg(windows)]
use windows::Win32::Foundation::HWND;
#[cfg(windows)]
use windows::Win32::UI::Shell::ShellExecuteW;
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

fn get_default_allowed_roots() -> Vec<PathBuf> {
    let mut roots = vec![
        PathBuf::from("C:\\Program Files"),
        PathBuf::from("C:\\Program Files (x86)"),
        PathBuf::from("C:\\Windows\\System32"),
        PathBuf::from("C:\\Windows"),
        PathBuf::from("C:\\Projects"),
    ];

    if let Ok(programdata) = std::env::var("ProgramData") {
        roots.push(PathBuf::from(programdata));
    }
    if let Ok(allusers) = std::env::var("ALLUSERSPROFILE") {
        roots.push(PathBuf::from(allusers));
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        roots.push(PathBuf::from(appdata));
    }
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        roots.push(PathBuf::from(local_appdata));
    }
    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        roots.push(PathBuf::from(userprofile));
    }
    if let Ok(public) = std::env::var("PUBLIC") {
        roots.push(PathBuf::from(public));
    }
    if let Ok(systemroot) = std::env::var("SystemRoot") {
        roots.push(PathBuf::from(systemroot));
    }

    roots
}

fn is_path_whitelisted(target: &Path) -> bool {
    let canonical = match target.canonicalize() {
        Ok(c) => c,
        Err(_) => target.to_path_buf(),
    };

    let allowed = get_default_allowed_roots();
    for root in &allowed {
        let canonical_root = root.canonicalize().unwrap_or_else(|_| root.clone());
        if canonical.starts_with(&canonical_root) {
            return true;
        }
    }
    if let Ok(profile) = std::env::var("USERPROFILE") {
        if canonical.starts_with(Path::new(&profile)) {
            return true;
        }
    }
    false
}

fn contains_dangerous_shell_chars(s: &str) -> bool {
    s.chars().any(|c| matches!(c, '&' | '|' | ';' | '`' | '$' | '\n' | '\r'))
}

#[cfg(windows)]
pub fn win32_shell_execute(
    verb: &str,
    target: &str,
    args: Option<&str>,
    working_dir: Option<&str>,
) -> Result<bool, String> {
    let verb_h = HSTRING::from(verb);
    let target_h = HSTRING::from(target);
    let args_h = args.filter(|a| !a.trim().is_empty()).map(HSTRING::from);
    let dir_h = working_dir.filter(|d| !d.trim().is_empty()).map(HSTRING::from);

    let res = unsafe {
        ShellExecuteW(
            HWND(std::ptr::null_mut()),
            PCWSTR(verb_h.as_ptr()),
            PCWSTR(target_h.as_ptr()),
            args_h.as_ref().map_or(PCWSTR::null(), |a| PCWSTR(a.as_ptr())),
            dir_h.as_ref().map_or(PCWSTR::null(), |d| PCWSTR(d.as_ptr())),
            SW_SHOWNORMAL,
        )
    };

    let code = res.0 as isize;
    if code > 32 {
        Ok(true)
    } else {
        Err(format!("ShellExecuteW failed (code: {}) for target '{}'", code, target))
    }
}

pub fn execute_shortcut(
    command_or_path: &str,
    args: Option<&str>,
    working_dir: Option<&str>,
    run_as_admin: bool,
) -> Result<bool, String> {
    let trimmed = command_or_path.trim();
    if trimmed.is_empty() {
        return Err("Command or path cannot be empty".to_string());
    }

    // Disallow dangerous null bytes
    if trimmed.contains('\0') {
        return Err("Null byte detected in command".to_string());
    }

    // Reject dangerous shell metacharacters in args
    if let Some(a) = args {
        if contains_dangerous_shell_chars(a) {
            return Err("Disallowed shell metacharacter detected in arguments".to_string());
        }
    }

    // 1. If elevated execution is requested on Windows
    if run_as_admin {
        #[cfg(windows)]
        {
            if let Ok(res) = win32_shell_execute("runas", trimmed, args, working_dir) {
                return Ok(res);
            }
            let mut ps_args = format!("Start-Process -FilePath '{}'", trimmed.replace('\'', "''"));
            if let Some(a) = args {
                if !a.trim().is_empty() {
                    ps_args.push_str(&format!(" -ArgumentList '{}'", a.replace('\'', "''")));
                }
            }
            if let Some(wd) = working_dir {
                if !wd.trim().is_empty() {
                    ps_args.push_str(&format!(" -WorkingDirectory '{}'", wd.replace('\'', "''")));
                }
            }
            ps_args.push_str(" -Verb RunAs");

            Command::new("powershell")
                .args(["-NoProfile", "-NonInteractive", "-Command", &ps_args])
                .spawn()
                .map_err(|e| format!("Failed to launch elevated process: {}", e))?;
            return Ok(true);
        }
    }

    // 2. Safe URLs or Protocol Schemes (http, https, vscode, steam, spotify, mailto, etc.)
    if trimmed.contains("://") || trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        let safe_schemes = ["http://", "https://", "steam://", "vscode://", "spotify://", "mailto:"];
        let is_safe = safe_schemes.iter().any(|&scheme| trimmed.to_lowercase().starts_with(scheme));
        if !is_safe {
            return Err(format!("Unsafe or disallowed protocol handler scheme in '{}'", trimmed));
        }

        #[cfg(windows)]
        {
            if let Ok(res) = win32_shell_execute("open", trimmed, None, None) {
                return Ok(res);
            }
            Command::new("explorer.exe")
                .arg(trimmed)
                .spawn()
                .map_err(|e| format!("Failed to open URL: {}", e))?;
            return Ok(true);
        }
    }

    // 3. Windows .lnk or .url shortcut file (PWAs, desktop shortcuts, Start Menu)
    if trimmed.ends_with(".lnk") || trimmed.ends_with(".url") {
        let p = Path::new(trimmed);
        if p.is_absolute() && !is_path_whitelisted(p) {
            return Err(format!("Execution blocked: Shortcut path '{}' is outside allowed directories", trimmed));
        }
        #[cfg(windows)]
        {
            if let Ok(res) = win32_shell_execute("open", trimmed, args, working_dir) {
                return Ok(res);
            }
            Command::new("explorer.exe")
                .arg(trimmed)
                .spawn()
                .map_err(|e| format!("Failed to launch shortcut (.lnk/.url): {}", e))?;
            return Ok(true);
        }
    }

    // 4. PowerShell Script (.ps1)
    if trimmed.ends_with(".ps1") {
        let p = Path::new(trimmed);
        if p.is_absolute() && !is_path_whitelisted(p) {
            return Err(format!("Execution blocked: PowerShell script '{}' is outside allowed directories", trimmed));
        }
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

    // 5. Batch files (.bat, .cmd)
    if trimmed.ends_with(".bat") || trimmed.ends_with(".cmd") {
        let p = Path::new(trimmed);
        if p.is_absolute() && !is_path_whitelisted(p) {
            return Err(format!("Execution blocked: Batch file '{}' is outside allowed directories", trimmed));
        }
        let mut c = Command::new("cmd");
        c.args(["/c", trimmed]);
        if let Some(a) = args {
            c.arg(a);
        }
        if let Some(wd) = working_dir {
            c.current_dir(wd);
        }
        c.spawn()
            .map_err(|e| format!("Failed to execute batch file: {}", e))?;
        return Ok(true);
    }

    // 6. Windows UWP AUMID or Shell AppID (e.g., "shell:AppsFolder\...", "Microsoft.WindowsTerminal_...!", "{GUID}\...")
    if trimmed.starts_with("shell:AppsFolder\\") || (trimmed.contains('!') && !trimmed.contains('\\')) || (trimmed.starts_with('{') && trimmed.contains('}')) {
        #[cfg(windows)]
        {
            let shell_target = if trimmed.starts_with("shell:AppsFolder\\") {
                trimmed.to_string()
            } else {
                format!("shell:AppsFolder\\{}", trimmed)
            };
            if let Ok(res) = win32_shell_execute("open", &shell_target, args, working_dir) {
                return Ok(res);
            }
            Command::new("explorer.exe")
                .arg(&shell_target)
                .spawn()
                .map_err(|e| format!("Failed to launch Windows Shell AppID '{}': {}", trimmed, e))?;
            return Ok(true);
        }
    }

    // 7. General Executable, Command Line with arguments, or PATH Command
    let p = Path::new(trimmed);
    if p.is_absolute() && !is_path_whitelisted(p) {
        return Err(format!("Execution blocked: Binary '{}' is outside allowed directory roots", trimmed));
    }

    // Try Win32 ShellExecuteW first for native desktop apps / paths
    #[cfg(windows)]
    {
        if let Ok(res) = win32_shell_execute("open", trimmed, args, working_dir) {
            return Ok(res);
        }
    }

    // If trimmed contains space-separated command arguments (e.g. "code .", "wt -p PowerShell") and isn't a file
    if !p.exists() && trimmed.contains(' ') {
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if let Some(binary) = parts.first() {
            let embedded_args = parts[1..].join(" ");
            let combined_args = match args {
                Some(a) if !a.trim().is_empty() => format!("{} {}", embedded_args, a),
                _ => embedded_args,
            };

            #[cfg(windows)]
            {
                if let Ok(res) = win32_shell_execute("open", binary, if combined_args.is_empty() { None } else { Some(&combined_args) }, working_dir) {
                    return Ok(res);
                }
            }

            let mut cmd = Command::new(binary);
            if !combined_args.is_empty() {
                cmd.args(combined_args.split_whitespace());
            }
            if let Some(wd) = working_dir {
                if !wd.trim().is_empty() {
                    cmd.current_dir(wd);
                }
            }
            if let Ok(_) = cmd.spawn() {
                return Ok(true);
            }
        }
    }

    // Standard process spawn
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
            #[cfg(windows)]
            {
                let mut fallback = Command::new("cmd");
                fallback.args(["/c", "start", "", trimmed]);
                if let Some(wd) = working_dir {
                    fallback.current_dir(wd);
                }
                if fallback.spawn().is_ok() {
                    return Ok(true);
                }
            }
            Err(format!("Failed to execute process '{}': {}", trimmed, e))
        }
    }
}
