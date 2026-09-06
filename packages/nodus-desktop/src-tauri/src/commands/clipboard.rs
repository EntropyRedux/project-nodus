// Nodus Desktop — Native Win32 Clipboard Interface

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardPayload {
    pub content_type: String, // "text" or "image"
    pub text: Option<String>,
    pub image_data: Option<String>, // base64 data URL
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
        // 1. First check if clipboard has an image (PNG, DIB, DIBV5, or GDI Bitmap)
        if has_win32_clipboard_image() {
            if let Ok(Some(img_data_url)) = get_win32_clipboard_image() {
                return Ok(ClipboardPayload {
                    content_type: "image".to_string(),
                    text: Some("Image".to_string()),
                    image_data: Some(img_data_url),
                });
            }
        }

        // 2. Read text from clipboard
        let text = get_win32_clipboard().unwrap_or_default();
        let trimmed = text.trim();

        // 3. Check if text is a path to an existing local image file (e.g. copied from Explorer or dropped)
        if !trimmed.is_empty() {
            let path_str = trimmed.trim_matches('"');
            let p = std::path::Path::new(path_str);
            if p.is_file() {
                if let Some(ext) = p.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()) {
                    let mime = match ext.as_str() {
                        "png" => Some("image/png"),
                        "jpg" | "jpeg" => Some("image/jpeg"),
                        "webp" => Some("image/webp"),
                        "gif" => Some("image/gif"),
                        "bmp" => Some("image/bmp"),
                        "svg" => Some("image/svg+xml"),
                        "ico" => Some("image/x-icon"),
                        _ => None,
                    };
                    if let Some(mime_type) = mime {
                        if let Ok(bytes) = std::fs::read(p) {
                            if bytes.len() <= 15 * 1024 * 1024 { // Up to 15MB
                                use base64::prelude::*;
                                let encoded = BASE64_STANDARD.encode(&bytes);
                                let filename = p.file_name().and_then(|n| n.to_str()).unwrap_or("Image").to_string();
                                return Ok(ClipboardPayload {
                                    content_type: "image".to_string(),
                                    text: Some(filename),
                                    image_data: Some(format!("data:{};base64,{}", mime_type, encoded)),
                                });
                            }
                        }
                    }
                }
            }
        }

        // 4. Fallback to regular text payload
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
    use windows::core::w;
    use windows::Win32::System::DataExchange::{IsClipboardFormatAvailable, RegisterClipboardFormatW};

    const CF_BITMAP: u32 = 2;
    const CF_DIB: u32 = 8;
    const CF_DIBV5: u32 = 17;

    unsafe {
        let png_fmt = RegisterClipboardFormatW(w!("PNG"));
        let png_mime_fmt = RegisterClipboardFormatW(w!("image/png"));

        (png_fmt != 0 && IsClipboardFormatAvailable(png_fmt).is_ok())
            || (png_mime_fmt != 0 && IsClipboardFormatAvailable(png_mime_fmt).is_ok())
            || IsClipboardFormatAvailable(CF_DIBV5).is_ok()
            || IsClipboardFormatAvailable(CF_DIB).is_ok()
            || IsClipboardFormatAvailable(CF_BITMAP).is_ok()
    }
}

#[cfg(windows)]
pub fn get_win32_clipboard_image() -> Result<Option<String>, String> {
    use base64::prelude::*;
    use windows::core::w;
    use windows::Win32::Foundation::{HGLOBAL, HWND};
    use windows::Win32::System::DataExchange::{CloseClipboard, GetClipboardData, OpenClipboard, RegisterClipboardFormatW};
    use windows::Win32::System::Memory::{GlobalLock, GlobalSize, GlobalUnlock};

    const CF_DIB: u32 = 8;
    const CF_DIBV5: u32 = 17;

    unsafe {
        let mut opened = false;
        for _ in 0..6 {
            if OpenClipboard(HWND::default()).is_ok() {
                opened = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(15));
        }

        if !opened {
            return Err("Unable to open Win32 clipboard".to_string());
        }

        // 1. First attempt: Direct PNG format (lossless transparency, used by Chrome, Edge, Discord, Snipping Tool, Photoshop)
        let png_fmt = RegisterClipboardFormatW(w!("PNG"));
        let png_mime_fmt = RegisterClipboardFormatW(w!("image/png"));

        for fmt in [png_fmt, png_mime_fmt] {
            if fmt != 0 {
                if let Ok(handle) = GetClipboardData(fmt) {
                    let h_global = HGLOBAL(handle.0);
                    if !h_global.is_invalid() {
                        let ptr = GlobalLock(h_global);
                        if !ptr.is_null() {
                            let size = GlobalSize(h_global);
                            if size > 8 {
                                let slice = std::slice::from_raw_parts(ptr as *const u8, size);
                                if slice.starts_with(b"\x89PNG\r\n\x1a\n") {
                                    let encoded = BASE64_STANDARD.encode(slice);
                                    let _ = GlobalUnlock(h_global);
                                    let _ = CloseClipboard();
                                    return Ok(Some(format!("data:image/png;base64,{}", encoded)));
                                }
                            }
                            let _ = GlobalUnlock(h_global);
                        }
                    }
                }
            }
        }

        // 2. Second attempt: CF_DIBV5 or CF_DIB Device-Independent Bitmaps
        for dib_fmt in [CF_DIBV5, CF_DIB] {
            if let Ok(handle) = GetClipboardData(dib_fmt) {
                let h_global = HGLOBAL(handle.0);
                if !h_global.is_invalid() {
                    let ptr = GlobalLock(h_global);
                    if !ptr.is_null() {
                        let dib_size = GlobalSize(h_global);
                        if dib_size >= 40 {
                            let dib_slice = std::slice::from_raw_parts(ptr as *const u8, dib_size);

                            let bi_size = u32::from_le_bytes([dib_slice[0], dib_slice[1], dib_slice[2], dib_slice[3]]);
                            let bi_bit_count = if dib_size >= 16 {
                                u16::from_le_bytes([dib_slice[14], dib_slice[15]])
                            } else {
                                0
                            };
                            let bi_compression = if dib_size >= 20 {
                                u32::from_le_bytes([dib_slice[16], dib_slice[17], dib_slice[18], dib_slice[19]])
                            } else {
                                0
                            };
                            let bi_clr_used = if dib_size >= 36 {
                                u32::from_le_bytes([dib_slice[32], dib_slice[33], dib_slice[34], dib_slice[35]])
                            } else {
                                0
                            };

                            let palette_entries = if bi_clr_used > 0 {
                                bi_clr_used
                            } else if bi_bit_count <= 8 && bi_bit_count > 0 {
                                1u32 << bi_bit_count
                            } else {
                                0
                            };

                            let mut mask_size = 0u32;
                            if bi_size == 40 && (bi_compression == 3 || bi_compression == 6) {
                                mask_size = 12; // 3 DWORD masks
                            }

                            let off_bits = 14 + bi_size + (palette_entries * 4) + mask_size;
                            let file_size = 14 + dib_size as u32;

                            // Construct valid 14-byte BITMAPFILEHEADER
                            let mut bmp_data = Vec::with_capacity(file_size as usize);
                            bmp_data.extend_from_slice(b"BM"); // bfType
                            bmp_data.extend_from_slice(&file_size.to_le_bytes()); // bfSize
                            bmp_data.extend_from_slice(&0u16.to_le_bytes()); // bfReserved1
                            bmp_data.extend_from_slice(&0u16.to_le_bytes()); // bfReserved2
                            bmp_data.extend_from_slice(&off_bits.to_le_bytes()); // bfOffBits
                            bmp_data.extend_from_slice(dib_slice);

                            let _ = GlobalUnlock(h_global);
                            let _ = CloseClipboard();

                            let encoded = BASE64_STANDARD.encode(&bmp_data);
                            return Ok(Some(format!("data:image/bmp;base64,{}", encoded)));
                        }
                        let _ = GlobalUnlock(h_global);
                    }
                }
            }
        }

        let _ = CloseClipboard();
        Ok(None)
    }
}

#[cfg(windows)]
pub fn set_win32_clipboard_image(base64_png: &str) -> Result<bool, String> {
    use base64::prelude::*;
    use windows::Win32::Foundation::{HANDLE, HWND};
    use windows::Win32::System::DataExchange::{CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData};
    use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};

    const CF_DIB: u32 = 8;

    let raw_b64 = if let Some(idx) = base64_png.find("base64,") {
        &base64_png[idx + 7..]
    } else {
        base64_png
    };

    let bytes = match BASE64_STANDARD.decode(raw_b64.trim()) {
        Ok(b) => b,
        Err(e) => return Err(format!("Invalid base64 image data: {}", e)),
    };

    if bytes.is_empty() {
        return Err("Empty image payload".to_string());
    }

    // If it's a BMP file (starts with "BM" and at least 14 bytes)
    if bytes.len() > 14 && bytes[0] == b'B' && bytes[1] == b'M' {
        let dib_bytes = &bytes[14..];
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
                return Err("Unable to open Win32 clipboard".to_string());
            }

            let _ = EmptyClipboard();

            let h_mem = match GlobalAlloc(GMEM_MOVEABLE, dib_bytes.len()) {
                Ok(h) => h,
                Err(_) => {
                    let _ = CloseClipboard();
                    return Err("Failed to allocate global memory for image".to_string());
                }
            };

            let ptr = GlobalLock(h_mem);
            if ptr.is_null() {
                let _ = CloseClipboard();
                return Err("Failed to lock global memory".to_string());
            }

            std::ptr::copy_nonoverlapping(dib_bytes.as_ptr(), ptr as *mut u8, dib_bytes.len());
            let _ = GlobalUnlock(h_mem);

            if let Err(e) = SetClipboardData(CF_DIB, HANDLE(h_mem.0)) {
                let _ = CloseClipboard();
                return Err(format!("SetClipboardData failed: {}", e));
            }

            let _ = CloseClipboard();
            return Ok(true);
        }
    }

    // For PNG / JPEG payloads, use fast STA PowerShell
    let script = format!(
        "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; [System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null; $b = [System.Convert]::FromBase64String('{}'); $ms = New-Object System.IO.MemoryStream(@(,$b), 0, $b.Length); $img = [System.Drawing.Image]::FromStream($ms, $true); [System.Windows.Forms.Clipboard]::SetImage($img)",
        raw_b64.trim()
    );

    let output = std::process::Command::new("powershell")
        .args(["-Sta", "-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
        .map_err(|e| format!("Failed to set clipboard image via STA PowerShell: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("PowerShell image copy failed: {}", err_msg));
    }

    Ok(true)
}

#[cfg(windows)]
#[allow(dead_code)]
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
