// Nodus Desktop — Virtual Input & Trackpad Simulation Engine
// Simulates low-latency mouse cursor, click, scroll, and keystrokes via Win32 SendInput.

use serde::{Deserialize, Serialize};

#[cfg(windows)]
use windows::Win32::UI::Input::KeyboardAndMouse::{
    MapVirtualKeyW, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT,
    KEYBD_EVENT_FLAGS, KEYEVENTF_EXTENDEDKEY, KEYEVENTF_KEYUP, KEYEVENTF_UNICODE,
    MAPVK_VK_TO_VSC, MOUSEEVENTF_HWHEEL, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
    MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_MOVE, MOUSEEVENTF_RIGHTDOWN,
    MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_WHEEL, MOUSEINPUT, MOUSE_EVENT_FLAGS, VIRTUAL_KEY, VK_BACK,
    VK_CONTROL, VK_DELETE, VK_DOWN, VK_END, VK_ESCAPE, VK_F1, VK_F10, VK_F11, VK_F12, VK_F2,
    VK_F3, VK_F4, VK_F5, VK_F6, VK_F7, VK_F8, VK_F9, VK_HOME, VK_INSERT, VK_LEFT, VK_LWIN,
    VK_MENU, VK_NEXT, VK_PRIOR, VK_RCONTROL, VK_RETURN, VK_RIGHT, VK_RMENU, VK_RSHIFT, VK_RWIN,
    VK_SHIFT, VK_SNAPSHOT, VK_SPACE, VK_TAB, VK_UP,
};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseMoveReq {
    pub dx: i32,
    pub dy: i32,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseClickReq {
    pub button: String, // "left", "right", "middle", "double"
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseScrollReq {
    pub dx: Option<i32>,
    pub dy: Option<i32>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyCombinationReq {
    pub keys: Vec<String>, // e.g. ["ctrl", "shift", "esc"], ["win", "d"]
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendTextReq {
    pub text: String,
}

#[tauri::command]
pub fn simulate_mouse_move(dx: i32, dy: i32) -> Result<bool, String> {
    #[cfg(windows)]
    {
        send_mouse_relative(dx, dy)
    }
    #[cfg(not(windows))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub fn simulate_mouse_click(button: String) -> Result<bool, String> {
    #[cfg(windows)]
    {
        send_mouse_click(&button)
    }
    #[cfg(not(windows))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub fn simulate_mouse_scroll(dx: Option<i32>, dy: Option<i32>) -> Result<bool, String> {
    #[cfg(windows)]
    {
        send_mouse_scroll(dx.unwrap_or(0), dy.unwrap_or(0))
    }
    #[cfg(not(windows))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub fn simulate_hotkey(keys: Vec<String>) -> Result<bool, String> {
    #[cfg(windows)]
    {
        send_hotkey(&keys)
    }
    #[cfg(not(windows))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub fn simulate_text(text: String) -> Result<bool, String> {
    #[cfg(windows)]
    {
        send_unicode_text(&text)
    }
    #[cfg(not(windows))]
    {
        Ok(true)
    }
}

// ─── Win32 Implementation Details ──────────────────────────────────────

#[cfg(windows)]
pub fn send_mouse_relative(dx: i32, dy: i32) -> Result<bool, String> {
    let input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx,
                dy,
                mouseData: 0,
                dwFlags: MOUSEEVENTF_MOVE,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    unsafe {
        let sent = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        if sent == 1 {
            Ok(true)
        } else {
            Err("SendInput mouse move failed".to_string())
        }
    }
}

#[cfg(windows)]
pub fn send_mouse_click(button: &str) -> Result<bool, String> {
    let (down_flag, up_flag) = match button.to_lowercase().as_str() {
        "left" | "primary" => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
        "right" | "secondary" => (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
        "middle" => (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
        "double" => {
            send_single_mouse_click(MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP)?;
            std::thread::sleep(std::time::Duration::from_millis(60));
            return send_single_mouse_click(MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP);
        }
        _ => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
    };

    send_single_mouse_click(down_flag, up_flag)
}

#[cfg(windows)]
fn send_single_mouse_click(down_flag: MOUSE_EVENT_FLAGS, up_flag: MOUSE_EVENT_FLAGS) -> Result<bool, String> {
    let down_input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: 0,
                dwFlags: down_flag,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    let up_input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: 0,
                dwFlags: up_flag,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    unsafe {
        SendInput(&[down_input], std::mem::size_of::<INPUT>() as i32);
        std::thread::sleep(std::time::Duration::from_millis(20));
        SendInput(&[up_input], std::mem::size_of::<INPUT>() as i32);
    }
    Ok(true)
}

#[cfg(windows)]
pub fn send_mouse_scroll(dx: i32, dy: i32) -> Result<bool, String> {
    let mut inputs = Vec::new();

    if dy != 0 {
        inputs.push(INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: (dy * 120) as u32,
                    dwFlags: MOUSEEVENTF_WHEEL,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        });
    }

    if dx != 0 {
        inputs.push(INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: (dx * 120) as u32,
                    dwFlags: MOUSEEVENTF_HWHEEL,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        });
    }

    if inputs.is_empty() {
        return Ok(true);
    }

    unsafe {
        let sent = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        if sent as usize == inputs.len() {
            Ok(true)
        } else {
            Err("SendInput mouse scroll failed".to_string())
        }
    }
}

#[cfg(windows)]
fn is_extended_key(vk: VIRTUAL_KEY) -> KEYBD_EVENT_FLAGS {
    match vk {
        VK_LWIN | VK_RWIN | VK_RMENU | VK_RCONTROL | VK_INSERT | VK_DELETE |
        VK_HOME | VK_END | VK_PRIOR | VK_NEXT | VK_LEFT | VK_RIGHT | VK_UP | VK_DOWN | VK_SNAPSHOT => {
            KEYEVENTF_EXTENDEDKEY
        }
        _ => KEYBD_EVENT_FLAGS(0),
    }
}

#[cfg(windows)]
fn parse_vk(key: &str) -> Option<VIRTUAL_KEY> {
    match key.to_lowercase().as_str() {
        "ctrl" | "control" => Some(VK_CONTROL),
        "rctrl" => Some(VK_RCONTROL),
        "shift" => Some(VK_SHIFT),
        "rshift" => Some(VK_RSHIFT),
        "alt" | "menu" => Some(VK_MENU),
        "ralt" => Some(VK_RMENU),
        "win" | "meta" | "cmd" | "super" => Some(VK_LWIN),
        "rwin" => Some(VK_RWIN),
        "esc" | "escape" => Some(VK_ESCAPE),
        "enter" | "return" => Some(VK_RETURN),
        "tab" => Some(VK_TAB),
        "space" => Some(VK_SPACE),
        "backspace" | "bs" => Some(VK_BACK),
        "delete" | "del" => Some(VK_DELETE),
        "insert" | "ins" => Some(VK_INSERT),
        "home" => Some(VK_HOME),
        "end" => Some(VK_END),
        "pageup" | "pgup" | "prior" => Some(VK_PRIOR),
        "pagedown" | "pgdn" | "next" => Some(VK_NEXT),
        "left" => Some(VK_LEFT),
        "right" => Some(VK_RIGHT),
        "up" => Some(VK_UP),
        "down" => Some(VK_DOWN),
        "printscreen" | "prtscn" | "snapshot" => Some(VK_SNAPSHOT),
        "f1" => Some(VK_F1),
        "f2" => Some(VK_F2),
        "f3" => Some(VK_F3),
        "f4" => Some(VK_F4),
        "f5" => Some(VK_F5),
        "f6" => Some(VK_F6),
        "f7" => Some(VK_F7),
        "f8" => Some(VK_F8),
        "f9" => Some(VK_F9),
        "f10" => Some(VK_F10),
        "f11" => Some(VK_F11),
        "f12" => Some(VK_F12),
        s if s.len() == 1 => {
            let c = s.chars().next()?.to_ascii_uppercase();
            if c.is_ascii_alphanumeric() {
                Some(VIRTUAL_KEY(c as u16))
            } else {
                None
            }
        }
        _ => None,
    }
}

#[cfg(windows)]
pub fn send_hotkey(keys: &[String]) -> Result<bool, String> {
    let mut vk_keys = Vec::new();
    for k in keys {
        if let Some(vk) = parse_vk(k) {
            vk_keys.push(vk);
        } else {
            return Err(format!("Unknown key in combination: {}", k));
        }
    }

    if vk_keys.is_empty() {
        return Ok(true);
    }

    // 1. Press all modifier/target keys down in order with small micro-delay
    for &vk in &vk_keys {
        let scan = unsafe { MapVirtualKeyW(vk.0 as u32, MAPVK_VK_TO_VSC) as u16 };
        let flags = is_extended_key(vk);
        let input = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: scan,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        unsafe {
            SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        }
        std::thread::sleep(std::time::Duration::from_millis(15));
    }

    // Key hold duration for OS message loop recognition
    std::thread::sleep(std::time::Duration::from_millis(35));

    // 2. Release all keys in reverse order
    for &vk in vk_keys.iter().rev() {
        let scan = unsafe { MapVirtualKeyW(vk.0 as u32, MAPVK_VK_TO_VSC) as u16 };
        let flags = is_extended_key(vk) | KEYEVENTF_KEYUP;
        let input = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: scan,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        unsafe {
            SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        }
        std::thread::sleep(std::time::Duration::from_millis(15));
    }

    Ok(true)
}

#[cfg(windows)]
pub fn send_unicode_text(text: &str) -> Result<bool, String> {
    for c in text.encode_utf16() {
        let down = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(0),
                    wScan: c,
                    dwFlags: KEYEVENTF_UNICODE,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        let up = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(0),
                    wScan: c,
                    dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        unsafe {
            SendInput(&[down], std::mem::size_of::<INPUT>() as i32);
            SendInput(&[up], std::mem::size_of::<INPUT>() as i32);
        }
        std::thread::sleep(std::time::Duration::from_millis(2));
    }
    Ok(true)
}
