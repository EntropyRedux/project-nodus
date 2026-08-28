// Nodus Desktop — Library Root
// Registers all Tauri commands, plugins, tray icon, and hot-corner background thread.

mod commands;
mod discovery;
mod hotcorners;
mod server;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::process::get_processes,
            commands::process::kill_process,
            commands::system::lock_workstation,
            commands::system::get_system_stats,
            commands::media::control_media,
            commands::clipboard::get_clipboard_text,
            commands::clipboard::set_clipboard_text,
            commands::exec::execute_local_command,
            hotcorners::get_hotcorner_config,
            hotcorners::set_hotcorner_enabled,
        ])
        .setup(|app| {
            // ─── 1. Configure / Create Main Window First ─────────────
            let window = match app.get_webview_window("main") {
                Some(w) => {
                    let _ = w.set_always_on_top(true);
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                    w
                }
                None => {
                    tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::default())
                        .title("Nodus Desktop Companion")
                        .inner_size(1100.0, 720.0)
                        .min_inner_size(800.0, 550.0)
                        .center()
                        .resizable(true)
                        .always_on_top(true)
                        .visible(true)
                        .build()?
                }
            };
            let _ = window.set_always_on_top(true);
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
            println!("[NodusDesktop] Main window ready, always on top, and focused.");

            // ─── 2. System Tray Setup (Safe with Icon) ────────────────
            let quit_item = MenuItem::with_id(app, "quit", "Quit Nodus Desktop", true, None::<&str>)?;
            let show_fleet = MenuItem::with_id(app, "show_fleet", "Fleet Panel", true, None::<&str>)?;
            let show_clipboard = MenuItem::with_id(app, "show_clipboard", "Clipboard History", true, None::<&str>)?;
            let show_taskbar = MenuItem::with_id(app, "show_taskbar", "Ambient Taskbar", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;

            let menu = Menu::with_items(
                app,
                &[
                    &show_fleet,
                    &show_clipboard,
                    &show_taskbar,
                    &separator,
                    &quit_item,
                ],
            )?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Nodus Desktop Companion");

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let tray_result = tray_builder
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show_fleet" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("open_panel", "fleet");
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "show_clipboard" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("open_panel", "clipboard");
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "show_taskbar" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("open_panel", "taskbar");
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("open_panel", "fleet");
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app);

            if let Err(e) = tray_result {
                println!("[NodusDesktop] Note: Tray initialization skipped/optional: {:?}", e);
            }

            // ─── 3. Start Hot-Corner Detection Thread ─────────────────
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                hotcorners::run_detector(app_handle);
            });

            // ─── 4. Start Fleet HTTP API Server & UDP Discovery ───────
            server::start_server(9120);
            discovery::start_discovery(9120);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Nodus Desktop");
}
