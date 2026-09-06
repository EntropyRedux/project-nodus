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
            commands::clipboard::get_clipboard_image,
            commands::clipboard::set_clipboard_image,
            commands::clipboard::get_clipboard_content,
            commands::exec::execute_local_command,
            commands::exec::run_terminal_command,
            commands::exec::get_default_working_dir,
            commands::pty::spawn_pty,
            commands::pty::write_pty,
            commands::pty::resize_pty,
            commands::pty::kill_pty,
            commands::input::simulate_mouse_move,
            commands::input::simulate_mouse_click,
            commands::input::simulate_mouse_scroll,
            commands::input::simulate_hotkey,
            commands::input::simulate_text,
            commands::shortcuts::get_installed_windows_apps,
            commands::shortcuts::scan_shortcuts_folder,
            commands::icon::extract_app_icon,
            commands::shortcuts::get_shared_shortcuts,
            commands::shortcuts::set_shared_shortcuts,
            commands::shortcuts::add_watched_folder,
            commands::shortcuts::get_watched_folders,
            commands::shortcuts::remove_watched_folder,
            commands::shortcuts::rescan_all_watched_folders,
            discovery::get_discovered_devices,
            discovery::unregister_node,
            discovery::scan_subnet,
            discovery::get_lan_device_count,
            server::get_server_status,
            server::set_server_running,
            hotcorners::get_hotcorner_config,
            hotcorners::set_hotcorner_enabled,
        ])
        .setup(|app| {
            // ─── 1. Access Main Window Defined in tauri.conf.json ────
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
                println!("[NodusDesktop] Main window ready, shown and focused.");
            } else {
                println!("[NodusDesktop] Warning: 'main' window not found in tauri.conf.json!");
            }

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

            // ─── 5. Start Automatic Watched Folders Filesystem Monitor ─
            commands::shortcuts::start_watched_folders_monitor(Some(app.handle().clone()));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Nodus Desktop");
}

