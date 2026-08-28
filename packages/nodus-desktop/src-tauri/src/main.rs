// Nodus Desktop — Rust Backend Entry Point
// Transparent overlay HUD with hot-corner gestures, system tray, and fleet mesh bridge
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    nodus_desktop_lib::run()
}
