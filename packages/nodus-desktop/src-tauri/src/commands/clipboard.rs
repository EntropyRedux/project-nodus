// Nodus Desktop — Clipboard Command Interface

#[tauri::command]
pub fn get_clipboard_text() -> Result<String, String> {
    // In Tauri 2 or via std process / win32
    #[cfg(windows)]
    {
        get_win32_clipboard()
    }
    #[cfg(not(windows))]
    {
        Ok("".to_string())
    }
}

#[tauri::command]
pub fn set_clipboard_text(text: String) -> Result<bool, String> {
    #[cfg(windows)]
    {
        set_win32_clipboard(&text)
    }
    #[cfg(not(windows))]
    {
        Ok(true)
    }
}

#[cfg(windows)]
pub fn get_win32_clipboard() -> Result<String, String> {
    use std::process::Command;
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", "Get-Clipboard"])
        .output()
        .map_err(|e| format!("Failed to read clipboard: {}", e))?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[cfg(windows)]
pub fn set_win32_clipboard(text: &str) -> Result<bool, String> {
    use std::io::Write;
    use std::process::{Command, Stdio};

    let mut child = Command::new("powershell")
        .args(["-NoProfile", "-Command", "Set-Clipboard -Value $input"])
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn clipboard process: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(text.as_bytes())
            .map_err(|e| format!("Failed to write to stdin: {}", e))?;
    }

    let status = child
        .wait()
        .map_err(|e| format!("Failed to wait on clipboard setter: {}", e))?;
    Ok(status.success())
}
