// Nodus Desktop — Interactive PTY Stream Engine
// Provides persistent Windows ConPTY and Unix PTY streaming for interactive CLI tools & agents.

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

struct ActivePty {
    master: Box<dyn MasterPty + Send>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
}

static PTY_REGISTRY: Mutex<Option<HashMap<String, ActivePty>>> = Mutex::new(None);

fn get_registry() -> std::sync::MutexGuard<'static, Option<HashMap<String, ActivePty>>> {
    let mut lock = PTY_REGISTRY.lock().unwrap();
    if lock.is_none() {
        *lock = Some(HashMap::new());
    }
    lock
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PtySpawnRequest {
    pub session_id: String,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
    pub cwd: Option<String>,
    pub shell: Option<String>,
}

/// Spawns a real interactive ConPTY session and streams output via Tauri events
pub fn spawn_pty_session(req: PtySpawnRequest, app: Option<AppHandle>) -> Result<bool, String> {
    let pty_system = native_pty_system();
    let cols = req.cols.unwrap_or(80);
    let rows = req.rows.unwrap_or(24);

    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open pseudo-terminal: {}", e))?;

    let (shell_to_run, default_args) = if let Some(custom) = req.shell {
        (custom, vec![])
    } else if cfg!(windows) {
        // Fast-path: Check for PowerShell 7 (pwsh.exe) or fall back to powershell.exe with -NoLogo
        let pwsh_paths = [
            "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
            "C:\\Program Files\\PowerShell\\6\\pwsh.exe",
        ];
        let mut chosen = "powershell.exe".to_string();
        for p in &pwsh_paths {
            if Path::new(p).exists() {
                chosen = p.to_string();
                break;
            }
        }
        (chosen, vec!["-NoLogo".to_string()])
    } else {
        (std::env::var("SHELL").unwrap_or_else(|_| "sh".to_string()), vec![])
    };

    let mut cmd = CommandBuilder::new(&shell_to_run);
    for arg in &default_args {
        cmd.arg(arg);
    }

    if let Some(ref dir) = req.cwd {
        if Path::new(dir).is_dir() {
            cmd.cwd(dir);
        }
    }

    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell process in PTY: {}", e))?;

    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

    let session_id_clone = req.session_id.clone();

    // Background reader thread: captures stdout/stderr stream from ConPTY and emits directly to frontend
    std::thread::spawn(move || {
        let mut buffer = [0u8; 4096];
        let event_name = format!("pty:data:{}", session_id_clone);
        let exit_event = format!("pty:exit:{}", session_id_clone);

        while let Ok(n) = reader.read(&mut buffer) {
            if n == 0 {
                break;
            }
            let chunk = String::from_utf8_lossy(&buffer[..n]).to_string();
            if let Some(ref app_handle) = app {
                let _ = app_handle.emit(&event_name, &chunk);
            }
        }

        if let Some(ref app_handle) = app {
            let _ = app_handle.emit(&exit_event, ());
        }
    });

    let mut registry = get_registry();
    if let Some(map) = registry.as_mut() {
        map.insert(
            req.session_id,
            ActivePty {
                master: pair.master,
                writer: Arc::new(Mutex::new(writer)),
            },
        );
    }

    Ok(true)
}

/// Spawns a real interactive ConPTY session via Tauri command (non-blocking)
#[tauri::command]
pub async fn spawn_pty(app: AppHandle, req: PtySpawnRequest) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        spawn_pty_session(req, Some(app))
    })
    .await
    .map_err(|e| format!("Spawn PTY task error: {}", e))?
}

/// Writes raw keystrokes / input to active ConPTY session
#[tauri::command]
pub fn write_pty(session_id: String, data: String) -> Result<bool, String> {
    let registry = get_registry();
    if let Some(map) = registry.as_ref() {
        if let Some(pty) = map.get(&session_id) {
            if let Ok(mut writer) = pty.writer.lock() {
                writer
                    .write_all(data.as_bytes())
                    .map_err(|e| format!("Write failed: {}", e))?;
                writer.flush().map_err(|e| format!("Flush failed: {}", e))?;
                return Ok(true);
            }
        }
    }
    Err(format!("PTY session '{}' not found", session_id))
}

/// Resizes active ConPTY terminal window dimensions
#[tauri::command]
pub fn resize_pty(session_id: String, cols: u16, rows: u16) -> Result<bool, String> {
    let registry = get_registry();
    if let Some(map) = registry.as_ref() {
        if let Some(pty) = map.get(&session_id) {
            pty.master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Resize failed: {}", e))?;
            return Ok(true);
        }
    }
    Err(format!("PTY session '{}' not found", session_id))
}

/// Terminates and closes ConPTY session
#[tauri::command]
pub fn kill_pty(session_id: String) -> Result<bool, String> {
    let mut registry = get_registry();
    if let Some(map) = registry.as_mut() {
        if map.remove(&session_id).is_some() {
            return Ok(true);
        }
    }
    Ok(false)
}

