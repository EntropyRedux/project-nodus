// Nodus Desktop — Native Win32 Clipboard Interface

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardPayload {
    pub content_type: String, // "text" or "image"
    pub text: Option<String>,
    pub image_data: Option<String>, // base64 PNG data URL or raw base64
}

#[tauri::command]
pub fn get_clipboard_text() -> Result<String, String> {
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

#[tauri::command]
pub fn get_clipboard_image() -> Result<Option<String>, String> {
    #[cfg(windows)]
    {
        get_win32_clipboard_image()
    }
    #[cfg(not(windows))]
    {
        Ok(None)
    }
}

#[tauri::command]
pub fn set_clipboard_image(base64_png: String) -> Result<bool, String> {
    #[cfg(windows)]
    {
        set_win32_clipboard_image(&base64_png)
    }
    #[cfg(not(windows))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub fn get_clipboard_content() -> Result<ClipboardPayload, String> {
    #[cfg(windows)]
    {
        // First check if clipboard has an image
        if has_win32_clipboard_image() {
            if let Ok(Some(img_b64)) = get_win32_clipboard_image() {
                return Ok(ClipboardPayload {
                    content_type: "image".to_string(),
                    text: Some("Image".to_string()),
                    image_data: Some(format!("data:image/png;base64,{}", img_b64)),
                });
            }
        }

        // Fallback to text
        let text = get_win32_clipboard().unwrap_or_default();
        Ok(ClipboardPayload {
            content_type: "text".to_string(),
            text: Some(text),
            image_data: None,
        })
    }
    #[cfg(not(windows))]
    {
        Ok(ClipboardPayload {
            content_type: "text".to_string(),
            text: Some("".to_string()),
            image_data: None,
        })
    }
}

#[cfg(windows)]
pub fn has_win32_clipboard_image() -> bool {
    use windows::Win32::System::DataExchange::IsClipboardFormatAvailable;

    const CF_BITMAP: u32 = 2;
    const CF_DIB: u32 = 8;
    const CF_DIBV5: u32 = 17;

    unsafe {
        IsClipboardFormatAvailable(CF_DIB).is_ok()
            || IsClipboardFormatAvailable(CF_DIBV5).is_ok()
            || IsClipboardFormatAvailable(CF_BITMAP).is_ok()
    }
}

#[cfg(windows)]
pub fn get_win32_clipboard_image() -> Result<Option<String>, String> {
    use std::process::Command;

    // Fast PowerShell / System.Drawing to export clipboard image to base64 PNG using EncodedCommand
    let script = "$ProgressPreference = 'SilentlyContinue'; Add-Type -AssemblyName System.Windows.Forms, System.Drawing; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img -ne $null) { $ms = New-Object System.IO.MemoryStream; $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [Console]::Write([Convert]::ToBase64String($ms.ToArray())) }";
    let encoded: String = utf16le_base64(script);

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-EncodedCommand", &encoded])
        .output()
        .map_err(|e| format!("Failed to read clipboard image: {}", e))?;

    let base64_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if base64_str.is_empty() {
        Ok(None)
    } else {
        Ok(Some(base64_str))
    }
}

#[cfg(windows)]
pub fn set_win32_clipboard_image(base64_png: &str) -> Result<bool, String> {
    use std::process::Command;

    // Strip prefix if present
    let raw_b64 = if let Some(idx) = base64_png.find("base64,") {
        &base64_png[idx + 7..]
    } else {
        base64_png
    };

    let script = format!(
        "$ProgressPreference = 'SilentlyContinue'; Add-Type -AssemblyName System.Windows.Forms, System.Drawing; $bytes = [System.Convert]::FromBase64String('{}'); $ms = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length); $img = [System.Drawing.Image]::FromStream($ms, $true); [System.Windows.Forms.Clipboard]::SetImage($img)",
        raw_b64
    );
    let encoded = utf16le_base64(&script);

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-EncodedCommand", &encoded])
        .output()
        .map_err(|e| format!("Failed to set clipboard image: {}", e))?;

    Ok(output.status.success())
}

#[cfg(windows)]
fn utf16le_base64(s: &str) -> String {
    let wide: Vec<u8> = s.encode_utf16().flat_map(|c| c.to_le_bytes()).collect();
    
    // Simple custom standard base64 encoder without external crate
    const STANDARD_CHARS: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    let mut chunks = wide.chunks_exact(3);
    for chunk in &mut chunks {
        let b0 = chunk[0];
        let b1 = chunk[1];
        let b2 = chunk[2];
        out.push(STANDARD_CHARS[(b0 >> 2) as usize] as char);
        out.push(STANDARD_CHARS[(((b0 & 3) << 4) | (b1 >> 4)) as usize] as char);
        out.push(STANDARD_CHARS[(((b1 & 15) << 2) | (b2 >> 6)) as usize] as char);
        out.push(STANDARD_CHARS[(b2 & 63) as usize] as char);
    }
    let rem = chunks.remainder();
    if rem.len() == 1 {
        let b0 = rem[0];
        out.push(STANDARD_CHARS[(b0 >> 2) as usize] as char);
        out.push(STANDARD_CHARS[((b0 & 3) << 4) as usize] as char);
        out.push('=');
        out.push('=');
    } else if rem.len() == 2 {
        let b0 = rem[0];
        let b1 = rem[1];
        out.push(STANDARD_CHARS[(b0 >> 2) as usize] as char);
        out.push(STANDARD_CHARS[(((b0 & 3) << 4) | (b1 >> 4)) as usize] as char);
        out.push(STANDARD_CHARS[((b1 & 15) << 2) as usize] as char);
        out.push('=');
    }
    out
}

#[cfg(windows)]
pub fn get_win32_clipboard() -> Result<String, String> {
    use windows::Win32::Foundation::{HGLOBAL, HWND};
    use windows::Win32::System::DataExchange::{CloseClipboard, GetClipboardData, OpenClipboard};
    use windows::Win32::System::Memory::{GlobalLock, GlobalUnlock};

    const CF_UNICODETEXT: u32 = 13;

    unsafe {
        // Retry opening clipboard in case another app has it momentarily locked
        let mut opened = false;
        for _ in 0..5 {
            if OpenClipboard(HWND::default()).is_ok() {
                opened = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(15));
        }

        if !opened {
            return Err("Unable to open Win32 clipboard".to_string());
        }

        let handle_res = GetClipboardData(CF_UNICODETEXT);
        if handle_res.is_err() {
            let _ = CloseClipboard();
            return Ok("".to_string());
        }

        let h_global: HGLOBAL = HGLOBAL(handle_res.unwrap().0);
        if h_global.is_invalid() {
            let _ = CloseClipboard();
            return Ok("".to_string());
        }

        let ptr = GlobalLock(h_global);
        if ptr.is_null() {
            let _ = CloseClipboard();
            return Ok("".to_string());
        }

        let wide_slice = {
            let mut len = 0;
            let p_wide = ptr as *const u16;
            while *p_wide.add(len) != 0 {
                len += 1;
            }
            std::slice::from_raw_parts(p_wide, len)
        };

        let result = String::from_utf16_lossy(wide_slice);
        let _ = GlobalUnlock(h_global);
        let _ = CloseClipboard();

        Ok(result)
    }
}

#[cfg(windows)]
pub fn set_win32_clipboard(text: &str) -> Result<bool, String> {
    use windows::Win32::Foundation::{HANDLE, HWND};
    use windows::Win32::System::DataExchange::{CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData};
    use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};

    const CF_UNICODETEXT: u32 = 13;

    let wide_chars: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    let byte_size = wide_chars.len() * std::mem::size_of::<u16>();

    unsafe {
        let mut opened = false;
        for _ in 0..5 {
            if OpenClipboard(HWND::default()).is_ok() {
                opened = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(15));
        }

        if !opened {
            return Err("Failed to open Win32 clipboard for write".to_string());
        }

        if EmptyClipboard().is_err() {
            let _ = CloseClipboard();
            return Err("Failed to empty Win32 clipboard".to_string());
        }

        let h_mem = GlobalAlloc(GMEM_MOVEABLE, byte_size);
        if h_mem.is_err() {
            let _ = CloseClipboard();
            return Err("Failed to allocate global memory for clipboard".to_string());
        }

        let h_mem = h_mem.unwrap();
        let ptr = GlobalLock(h_mem);
        if ptr.is_null() {
            let _ = CloseClipboard();
            return Err("Failed to lock global memory".to_string());
        }

        std::ptr::copy_nonoverlapping(wide_chars.as_ptr() as *const u8, ptr as *mut u8, byte_size);
        let _ = GlobalUnlock(h_mem);

        let set_res = SetClipboardData(CF_UNICODETEXT, HANDLE(h_mem.0));
        let _ = CloseClipboard();

        if set_res.is_err() {
            return Err("Failed to set Win32 clipboard data".to_string());
        }

        Ok(true)
    }
}
