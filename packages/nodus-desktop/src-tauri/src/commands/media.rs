// Nodus Desktop — Win32 Media & Audio Control Engine
// Sends WM_APPCOMMAND messages directly to Shell_TrayWnd to control volume and playback.

#[cfg(windows)]
use windows::Win32::Foundation::{LPARAM, WPARAM};
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{FindWindowW, SendMessageW};
#[cfg(windows)]
use windows::core::w;

const WM_APPCOMMAND: u32 = 0x0319;
const APPCOMMAND_VOLUME_MUTE: isize = 8 << 16;
const APPCOMMAND_VOLUME_DOWN: isize = 9 << 16;
const APPCOMMAND_VOLUME_UP: isize = 10 << 16;
const APPCOMMAND_MEDIA_NEXT: isize = 11 << 16;
const APPCOMMAND_MEDIA_PREV: isize = 12 << 16;
const APPCOMMAND_MEDIA_STOP: isize = 13 << 16;
const APPCOMMAND_MEDIA_PLAY_PAUSE: isize = 14 << 16;

#[tauri::command]
pub fn control_media(action: String) -> Result<bool, String> {
    #[cfg(windows)]
    {
        send_media_appcommand(&action)
    }
    #[cfg(not(windows))]
    {
        Err("Media control only supported on Windows".to_string())
    }
}

#[cfg(windows)]
pub fn send_media_appcommand(action: &str) -> Result<bool, String> {
    let cmd = match action {
        "volume_up" | "vol_up" => APPCOMMAND_VOLUME_UP,
        "volume_down" | "vol_down" => APPCOMMAND_VOLUME_DOWN,
        "volume_mute" | "mute" | "toggle_mute" => APPCOMMAND_VOLUME_MUTE,
        "play_pause" | "play" | "pause" => APPCOMMAND_MEDIA_PLAY_PAUSE,
        "next" | "next_track" => APPCOMMAND_MEDIA_NEXT,
        "prev" | "previous_track" => APPCOMMAND_MEDIA_PREV,
        "stop" => APPCOMMAND_MEDIA_STOP,
        _ => return Err(format!("Unknown media action: {}", action)),
    };

    unsafe {
        let hwnd = FindWindowW(w!("Shell_TrayWnd"), None)
            .map_err(|e| format!("Windows taskbar Shell_TrayWnd not found: {}", e))?;

        SendMessageW(
            hwnd,
            WM_APPCOMMAND,
            WPARAM(hwnd.0 as usize),
            LPARAM(cmd),
        );
        Ok(true)
    }
}
