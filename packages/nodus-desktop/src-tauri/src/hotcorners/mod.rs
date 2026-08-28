// Nodus Desktop — Hot-Corner Gesture Detection Engine
// Polls mouse position at ~60Hz, detects corner dwelling with velocity thresholds,
// and emits Tauri events to the frontend to trigger panel slide-ins.

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};


static HOTCORNERS_ENABLED: AtomicBool = AtomicBool::new(true);

/// Corner identification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Corner {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}

impl Corner {
    fn as_str(&self) -> &'static str {
        match self {
            Corner::TopLeft => "top-left",
            Corner::TopRight => "top-right",
            Corner::BottomLeft => "bottom-left",
            Corner::BottomRight => "bottom-right",
        }
    }
}

/// Configuration constants
const HOTSPOT_SIZE: i32 = 8; // px from screen edge
const DWELL_TIME: Duration = Duration::from_millis(150);
const COOLDOWN: Duration = Duration::from_millis(600);
const POLL_INTERVAL: Duration = Duration::from_millis(16); // ~60Hz

/// Event payload sent to frontend
#[derive(Clone, Serialize)]
struct CornerEvent {
    corner: String,
    timestamp: u64,
}

/// Get cursor position using Win32 API
#[cfg(windows)]
fn get_cursor_pos() -> Option<(i32, i32)> {
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    use windows::Win32::Foundation::POINT;

    let mut point = POINT { x: 0, y: 0 };
    unsafe {
        if GetCursorPos(&mut point).is_ok() {
            Some((point.x, point.y))
        } else {
            None
        }
    }
}

#[cfg(not(windows))]
fn get_cursor_pos() -> Option<(i32, i32)> {
    None // Linux/macOS stub — implement via X11/Wayland later
}

/// Get the primary monitor dimensions
#[cfg(windows)]
fn get_screen_size() -> (i32, i32) {
    use windows::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};
    unsafe {
        let w = GetSystemMetrics(SM_CXSCREEN);
        let h = GetSystemMetrics(SM_CYSCREEN);
        (w, h)
    }
}

#[cfg(not(windows))]
fn get_screen_size() -> (i32, i32) {
    (1920, 1080) // Fallback
}

/// Check if a fullscreen exclusive app is active (game mode exemption)
#[cfg(windows)]
fn is_fullscreen_foreground() -> bool {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowRect,
    };
    use windows::Win32::Foundation::RECT;

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return false;
        }
        let mut rect = RECT::default();
        if GetWindowRect(hwnd, &mut rect).is_ok() {
            let (sw, sh) = get_screen_size();
            let win_w = rect.right - rect.left;
            let win_h = rect.bottom - rect.top;
            // If the foreground window covers the entire screen, assume fullscreen
            win_w >= sw && win_h >= sh
        } else {
            false
        }
    }
}

#[cfg(not(windows))]
fn is_fullscreen_foreground() -> bool {
    false
}

/// Determine which corner (if any) the cursor is in
fn detect_corner(x: i32, y: i32, screen_w: i32, screen_h: i32) -> Option<Corner> {
    let in_left = x < HOTSPOT_SIZE;
    let in_right = x >= screen_w - HOTSPOT_SIZE;
    let in_top = y < HOTSPOT_SIZE;
    let in_bottom = y >= screen_h - HOTSPOT_SIZE;

    if in_top && in_left {
        Some(Corner::TopLeft)
    } else if in_top && in_right {
        Some(Corner::TopRight)
    } else if in_bottom && in_left {
        Some(Corner::BottomLeft)
    } else if in_bottom && in_right {
        Some(Corner::BottomRight)
    } else {
        None
    }
}

/// Main hot-corner detection loop — runs in a background thread
pub fn run_detector(app: AppHandle) {
    let (screen_w, screen_h) = get_screen_size();
    let mut dwelling_corner: Option<Corner> = None;
    let mut dwell_start: Option<Instant> = None;
    let mut last_trigger: Option<Instant> = None;

    loop {
        std::thread::sleep(POLL_INTERVAL);

        if !HOTCORNERS_ENABLED.load(Ordering::Relaxed) {
            continue;
        }

        // Skip if a fullscreen app is active (game mode)
        if is_fullscreen_foreground() {
            dwelling_corner = None;
            dwell_start = None;
            continue;
        }

        let Some((cx, cy)) = get_cursor_pos() else {
            continue;
        };

        let corner = detect_corner(cx, cy, screen_w, screen_h);

        match corner {
            Some(c) => {
                if dwelling_corner == Some(c) {
                    // Already dwelling in this corner — check if dwell time exceeded
                    if let Some(start) = dwell_start {
                        if start.elapsed() >= DWELL_TIME {
                            // Check cooldown
                            let can_trigger = match last_trigger {
                                Some(lt) => lt.elapsed() >= COOLDOWN,
                                None => true,
                            };

                            if can_trigger {
                                let now = std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_millis() as u64;

                                let _ = app.emit(
                                    "corner_triggered",
                                    CornerEvent {
                                        corner: c.as_str().to_string(),
                                        timestamp: now,
                                    },
                                );

                                last_trigger = Some(Instant::now());
                                dwelling_corner = None;
                                dwell_start = None;
                            }
                        }
                    }
                } else {
                    // Entered a new corner — start dwell timer
                    dwelling_corner = Some(c);
                    dwell_start = Some(Instant::now());
                }
            }
            None => {
                // Cursor left all corners — reset
                dwelling_corner = None;
                dwell_start = None;
            }
        }
    }
}

// ─── Tauri Commands ──────────────────────────────────────────────

#[derive(Serialize)]
pub struct HotCornerConfig {
    enabled: bool,
    hotspot_size: i32,
    dwell_time_ms: u64,
    cooldown_ms: u64,
}

#[tauri::command]
pub fn get_hotcorner_config() -> HotCornerConfig {
    HotCornerConfig {
        enabled: HOTCORNERS_ENABLED.load(Ordering::Relaxed),
        hotspot_size: HOTSPOT_SIZE,
        dwell_time_ms: DWELL_TIME.as_millis() as u64,
        cooldown_ms: COOLDOWN.as_millis() as u64,
    }
}

#[tauri::command]
pub fn set_hotcorner_enabled(enabled: bool) {
    HOTCORNERS_ENABLED.store(enabled, Ordering::Relaxed);
}
