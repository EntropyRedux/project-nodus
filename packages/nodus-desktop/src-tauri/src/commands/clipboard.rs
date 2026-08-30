// Nodus Desktop — Native Win32 Clipboard Interface

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

#[cfg(windows)]
pub fn get_win32_clipboard() -> Result<String, String> {
    use windows::Win32::Foundation::{HANDLE, HGLOBAL, HWND};
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
    use windows::Win32::Foundation::{HANDLE, HGLOBAL, HWND};
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
