// Nodus Desktop — Installed Windows Applications & Shortcuts Engine
// Scans Windows Start Menu, PWAs, and custom watched folders.
// Extracts icons using Win32 Shell API and manages the shared shortcuts store.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;

use crate::commands::icon::extract_exe_icon;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredApp {
    pub id: String,
    pub name: String,
    pub path_or_appid: String,
    pub is_uwp: bool,
    pub icon_base64: Option<String>,
    pub icon_name: Option<String>,
    pub icon_color: Option<String>,
    pub category: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SharedShortcutsConfig {
    pub watched_folders: Vec<String>,
    pub shortcuts: Vec<DiscoveredApp>,
}

impl Default for SharedShortcutsConfig {
    fn default() -> Self {
        Self {
            watched_folders: vec![],
            shortcuts: vec![
                DiscoveredApp {
                    id: "preset_vscode".to_string(),
                    name: "Visual Studio Code".to_string(),
                    path_or_appid: "code .".to_string(),
                    is_uwp: false,
                    icon_base64: None,
                    icon_name: Some("Code".to_string()),
                    icon_color: Some("#0EA5E9".to_string()),
                    category: "tools".to_string(),
                    enabled: true,
                },
                DiscoveredApp {
                    id: "preset_terminal".to_string(),
                    name: "Windows Terminal".to_string(),
                    path_or_appid: "wt".to_string(),
                    is_uwp: false,
                    icon_base64: None,
                    icon_name: Some("Terminal".to_string()),
                    icon_color: Some("#22C55E".to_string()),
                    category: "tools".to_string(),
                    enabled: true,
                },
                DiscoveredApp {
                    id: "preset_taskmgr".to_string(),
                    name: "Task Manager".to_string(),
                    path_or_appid: "taskmgr.exe".to_string(),
                    is_uwp: false,
                    icon_base64: None,
                    icon_name: Some("Activity".to_string()),
                    icon_color: Some("#06B6D4".to_string()),
                    category: "system".to_string(),
                    enabled: true,
                },
            ],
        }
    }
}

static SHARED_CONFIG: Mutex<Option<SharedShortcutsConfig>> = Mutex::new(None);

fn get_config_file_path() -> PathBuf {
    if let Some(appdata) = std::env::var_os("APPDATA") {
        let mut p = PathBuf::from(appdata);
        p.push("nodus-desktop");
        let _ = fs::create_dir_all(&p);
        p.push("shared_shortcuts.json");
        p
    } else {
        PathBuf::from("shared_shortcuts.json")
    }
}

pub fn load_shared_config() -> SharedShortcutsConfig {
    if let Ok(guard) = SHARED_CONFIG.lock() {
        if let Some(cfg) = &*guard {
            return cfg.clone();
        }
    }

    let file_path = get_config_file_path();
    let config = if let Ok(data) = fs::read_to_string(&file_path) {
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        SharedShortcutsConfig::default()
    };

    if let Ok(mut guard) = SHARED_CONFIG.lock() {
        *guard = Some(config.clone());
    }

    config
}

pub fn save_shared_config(config: &SharedShortcutsConfig) {
    if let Ok(mut guard) = SHARED_CONFIG.lock() {
        *guard = Some(config.clone());
    }

    let file_path = get_config_file_path();
    if let Ok(json_str) = serde_json::to_string_pretty(config) {
        let _ = fs::write(file_path, json_str);
    }
}

#[allow(dead_code)]
pub fn resolve_windows_app_path(app_id: &str) -> Option<String> {
    if Path::new(app_id).exists() {
        return Some(app_id.to_string());
    }

    // Replace common KnownFolder GUIDs
    let replaced = if app_id.starts_with("{6D809377-6AF0-444B-8957-A3773F02200E}") {
        let prog_files = std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
        app_id.replace("{6D809377-6AF0-444B-8957-A3773F02200E}", &prog_files)
    } else if app_id.starts_with("{7C5A40EF-A0FB-4BFC-874A-C0F2E0B9FA8E}") {
        let prog_files_x86 = std::env::var("ProgramFiles(x86)").unwrap_or_else(|_| "C:\\Program Files (x86)".to_string());
        app_id.replace("{7C5A40EF-A0FB-4BFC-874A-C0F2E0B9FA8E}", &prog_files_x86)
    } else if app_id.starts_with("{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}") || app_id.starts_with("{D65231B0-B2F1-4857-A4CE-A8E7C6EA7D27}") {
        let windir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".to_string());
        let sys32 = format!("{}\\System32", windir);
        app_id.replace("{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}", &sys32)
              .replace("{D65231B0-B2F1-4857-A4CE-A8E7C6EA7D27}", &sys32)
    } else if app_id.starts_with("{F38BF404-1D43-42F2-9305-67DE0B28FC23}") {
        let windir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".to_string());
        app_id.replace("{F38BF404-1D43-42F2-9305-67DE0B28FC23}", &windir)
    } else if app_id.starts_with("{A52BBA46-E9E1-435F-B3D9-28DAA648C0F6}") {
        let local_appdata = std::env::var("LOCALAPPDATA").unwrap_or_default();
        app_id.replace("{A52BBA46-E9E1-435F-B3D9-28DAA648C0F6}", &local_appdata)
    } else if app_id.starts_with("{3EB685DB-65F9-4CF6-A03A-E3EF65729F3D}") {
        let appdata = std::env::var("APPDATA").unwrap_or_default();
        app_id.replace("{3EB685DB-65F9-4CF6-A03A-E3EF65729F3D}", &appdata)
    } else {
        app_id.to_string()
    };

    if Path::new(&replaced).exists() {
        return Some(replaced);
    }

    None
}

pub fn determine_lucide_icon_and_color(name: &str, app_id: &str) -> (&'static str, &'static str) {
    let lower = format!("{} {}", name, app_id).to_lowercase();

    // 1. Code & Development
    if lower.contains("code") || lower.contains("studio") || lower.contains("cursor") || lower.contains("sublime")
        || lower.contains("idea") || lower.contains("pycharm") || lower.contains("clion") || lower.contains("webstorm")
        || lower.contains("rider") || lower.contains("git") || lower.contains("neovim") || lower.contains("vim")
        || lower.contains("developer") {
        ("Code", "#0EA5E9")
    }
    // 2. Terminal & Command Line
    else if lower.contains("terminal") || lower.contains("powershell") || lower.contains("cmd") || lower.contains("prompt")
        || lower.contains("bash") || lower.contains("wsl") || lower.contains("console") || lower.contains("putty") {
        ("Terminal", "#22C55E")
    }
    // 3. Web & Browsers
    else if lower.contains("chrome") || lower.contains("brave") || lower.contains("edge") || lower.contains("firefox")
        || lower.contains("browser") || lower.contains("opera") || lower.contains("vivaldi") || lower.contains("internet")
        || lower.contains("http") {
        ("Globe", "#38BDF8")
    }
    // 4. AI & Next-Gen Workstations
    else if lower.contains("antigravity") || lower.contains("ai") || lower.contains("gpt") || lower.contains("claude")
        || lower.contains("copilot") || lower.contains("gemini") || lower.contains("ollama") || lower.contains("llm") {
        ("Sparkles", "#A855F7")
    }
    // 5. Screen Capture, OCR, Camera
    else if lower.contains("capture") || lower.contains("ocr") || lower.contains("camera") || lower.contains("snip")
        || lower.contains("screenshot") || lower.contains("scan") || lower.contains("lens") {
        ("Camera", "#F43F5E")
    }
    // 6. Messaging & Chat
    else if lower.contains("discord") || lower.contains("slack") || lower.contains("telegram") || lower.contains("whatsapp")
        || lower.contains("teams") || lower.contains("messenger") || lower.contains("chat") || lower.contains("signal") {
        ("MessageSquare", "#6366F1")
    }
    // 7. Audio & Music
    else if lower.contains("spotify") || lower.contains("music") || lower.contains("sound") || lower.contains("audio")
        || lower.contains("itunes") || lower.contains("podcast") || lower.contains("tidal") || lower.contains("audacity") {
        ("Music", "#10B981")
    }
    // 8. Video & Streaming
    else if lower.contains("video") || lower.contains("vlc") || lower.contains("netflix") || lower.contains("youtube")
        || lower.contains("obs") || lower.contains("stream") || lower.contains("premiere") || lower.contains("davinci")
        || lower.contains("film") || lower.contains("player") {
        ("Film", "#EF4444")
    }
    // 9. Gaming & Game Launchers
    else if lower.contains("steam") || lower.contains("game") || lower.contains("epic") || lower.contains("xbox")
        || lower.contains("minecraft") || lower.contains("roblox") || lower.contains("riot") || lower.contains("valorant")
        || lower.contains("ea") || lower.contains("ubisoft") || lower.contains("gog") || lower.contains("play") {
        ("Gamepad2", "#F97316")
    }
    // 10. Documents, Notes, Office
    else if lower.contains("word") || lower.contains("excel") || lower.contains("powerpoint") || lower.contains("office")
        || lower.contains("pdf") || lower.contains("acrobat") || lower.contains("notion") || lower.contains("obsidian")
        || lower.contains("notes") || lower.contains("onenote") || lower.contains("docs") || lower.contains("reader") {
        ("FileText", "#3B82F6")
    }
    // 11. Creative & Design
    else if lower.contains("contextpad") || lower.contains("draw") || lower.contains("paint") || lower.contains("canvas")
        || lower.contains("photoshop") || lower.contains("figma") || lower.contains("illustrator") || lower.contains("blender")
        || lower.contains("gimp") || lower.contains("design") || lower.contains("art") {
        ("PenTool", "#EC4899")
    }
    // 12. Hardware, Process & System Monitor
    else if lower.contains("taskmgr") || lower.contains("manager") || lower.contains("process") || lower.contains("monitor")
        || lower.contains("afterburner") || lower.contains("hwmonitor") || lower.contains("cpu") || lower.contains("gpu")
        || lower.contains("benchmark") || lower.contains("activity") {
        ("Activity", "#06B6D4")
    }
    // 13. Files, Folders, Archiving
    else if lower.contains("explorer") || lower.contains("file") || lower.contains("folder") || lower.contains("7-zip")
        || lower.contains("winrar") || lower.contains("zip") || lower.contains("archive") {
        ("Folder", "#EAB308")
    }
    // 14. Database & Storage
    else if lower.contains("database") || lower.contains("sql") || lower.contains("mysql") || lower.contains("postgres")
        || lower.contains("mongo") || lower.contains("redis") || lower.contains("dbeaver") {
        ("Database", "#8B5CF6")
    }
    // 15. Security, VPN, Password
    else if lower.contains("security") || lower.contains("antivirus") || lower.contains("defender") || lower.contains("vpn")
        || lower.contains("password") || lower.contains("bitwarden") || lower.contains("1password") || lower.contains("keepass") {
        ("Shield", "#14B8A6")
    }
    // 16. Mail & Communications
    else if lower.contains("mail") || lower.contains("outlook") || lower.contains("thunderbird") || lower.contains("email") {
        ("Mail", "#0284C7")
    }
    // 17. Cloud & Sync
    else if lower.contains("cloud") || lower.contains("drive") || lower.contains("dropbox") || lower.contains("onedrive")
        || lower.contains("sync") || lower.contains("backup") {
        ("Cloud", "#38BDF8")
    }
    // 18. Calculator & Math
    else if lower.contains("calc") || lower.contains("math") {
        ("Calculator", "#F97316")
    }
    // 19. Settings & System Control
    else if lower.contains("setting") || lower.contains("config") || lower.contains("control") || lower.contains("panel")
        || lower.contains("option") {
        ("Settings", "#94A3B8")
    }
    // Default
    else {
        ("AppWindow", "#38BDF8")
    }
}

/// Scan all installed Windows applications using PowerShell Get-StartApps
#[tauri::command]
pub fn get_installed_windows_apps() -> Result<Vec<DiscoveredApp>, String> {
    #[cfg(windows)]
    {
        let mut results = Vec::new();
        let mut seen_paths = std::collections::HashSet::new();
        let mut seen_names = std::collections::HashSet::new();

        let current_cfg = load_shared_config();
        let enabled_ids: std::collections::HashSet<String> = current_cfg
            .shortcuts
            .iter()
            .filter(|s| s.enabled)
            .map(|s| s.path_or_appid.clone())
            .collect();

        // 1. Scan Start Menu Directories for .lnk shortcuts (primary source of high-res icons)
        let mut start_menu_dirs = Vec::new();
        if let Ok(progdata) = std::env::var("ProgramData") {
            start_menu_dirs.push(PathBuf::from(progdata).join("Microsoft\\Windows\\Start Menu\\Programs"));
        }
        if let Ok(appdata) = std::env::var("APPDATA") {
            start_menu_dirs.push(PathBuf::from(appdata).join("Microsoft\\Windows\\Start Menu\\Programs"));
        }
        if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
            start_menu_dirs.push(PathBuf::from(localappdata).join("Programs"));
        }

        for dir in start_menu_dirs {
            if dir.exists() {
                scan_dir_shortcuts_recursive(&dir, &enabled_ids, &mut results, &mut seen_paths, &mut seen_names);
            }
        }

        // 2. Scan Get-StartApps for UWP & Registry Registered Apps
        let ps_cmd = "Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress";
        if let Ok(output) = Command::new("powershell").args(["-NoProfile", "-Command", ps_cmd]).output() {
            let out_str = String::from_utf8_lossy(&output.stdout);
            let trimmed = out_str.trim();

            if !trimmed.is_empty() {
                #[derive(Deserialize)]
                struct RawApp {
                    #[serde(rename = "Name")]
                    name: Option<String>,
                    #[serde(rename = "AppID")]
                    app_id: Option<String>,
                }

                let raw_list: Vec<RawApp> = if trimmed.starts_with('[') {
                    serde_json::from_str(trimmed).unwrap_or_default()
                } else if let Ok(single) = serde_json::from_str::<RawApp>(trimmed) {
                    vec![single]
                } else {
                    vec![]
                };

                for (idx, app) in raw_list.into_iter().enumerate() {
                    let name = match app.name {
                        Some(n) if !n.trim().is_empty() => n.trim().to_string(),
                        _ => continue,
                    };
                    let app_id = match app.app_id {
                        Some(id) if !id.trim().is_empty() => id.trim().to_string(),
                        _ => continue,
                    };

                    let name_lower = name.to_lowercase();
                    if seen_names.contains(&name_lower) || seen_paths.contains(&app_id) {
                        continue;
                    }
                    seen_names.insert(name_lower);
                    seen_paths.insert(app_id.clone());

                    let is_uwp = !app_id.contains('\\') && !app_id.ends_with(".exe");
                    let is_enabled = enabled_ids.contains(&app_id);

                    // Extract icon
                    let icon_base64 = extract_exe_icon(&app_id).ok();
                    let (icon_name, icon_color) = determine_lucide_icon_and_color(&name, &app_id);
                    let category = categorize_app_name(&name);

                    results.push(DiscoveredApp {
                        id: format!("win_startapp_{}", idx),
                        name,
                        path_or_appid: app_id,
                        is_uwp,
                        icon_base64,
                        icon_name: Some(icon_name.to_string()),
                        icon_color: Some(icon_color.to_string()),
                        category,
                        enabled: is_enabled,
                    });
                }
            }
        }

        Ok(results)
    }

    #[cfg(not(windows))]
    {
        Ok(vec![])
    }
}

#[cfg(windows)]
fn scan_dir_shortcuts_recursive(
    dir: &Path,
    enabled_ids: &std::collections::HashSet<String>,
    results: &mut Vec<DiscoveredApp>,
    seen_paths: &mut std::collections::HashSet<String>,
    seen_names: &mut std::collections::HashSet<String>,
) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                scan_dir_shortcuts_recursive(&path, enabled_ids, results, seen_paths, seen_names);
            } else if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                let ext_lower = ext.to_lowercase();
                if ext_lower == "lnk" || ext_lower == "exe" {
                    let file_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("Shortcut").to_string();
                    let name_lower = file_stem.to_lowercase();

                    // Skip uninstallers, help files, and duplicates
                    if name_lower.contains("uninstall") || name_lower.contains("help") || name_lower.contains("readme") {
                        continue;
                    }
                    if seen_names.contains(&name_lower) {
                        continue;
                    }

                    let full_path = path.to_string_lossy().to_string();
                    if seen_paths.contains(&full_path) {
                        continue;
                    }

                    seen_names.insert(name_lower);
                    seen_paths.insert(full_path.clone());

                    let icon_base64 = extract_exe_icon(&full_path).ok();
                    let (icon_name, icon_color) = determine_lucide_icon_and_color(&file_stem, &full_path);
                    let category = categorize_app_name(&file_stem);
                    let is_enabled = enabled_ids.contains(&full_path);

                    results.push(DiscoveredApp {
                        id: format!("lnk_{}", results.len()),
                        name: file_stem,
                        path_or_appid: full_path,
                        is_uwp: false,
                        icon_base64,
                        icon_name: Some(icon_name.to_string()),
                        icon_color: Some(icon_color.to_string()),
                        category,
                        enabled: is_enabled,
                    });
                }
            }
        }
    }
}

fn categorize_app_name(name: &str) -> String {
    let lower = name.to_lowercase();
    if lower.contains("code") || lower.contains("terminal") || lower.contains("git") || lower.contains("cmd") || lower.contains("powershell") || lower.contains("studio") || lower.contains("dev") {
        "dev".to_string()
    } else if lower.contains("chrome") || lower.contains("edge") || lower.contains("browser") || lower.contains("firefox") || lower.contains("brave") {
        "browser".to_string()
    } else if lower.contains("game") || lower.contains("steam") || lower.contains("epic") || lower.contains("xbox") || lower.contains("play") {
        "game".to_string()
    } else if lower.contains("spotify") || lower.contains("media") || lower.contains("music") || lower.contains("vlc") || lower.contains("video") {
        "media".to_string()
    } else if lower.contains("word") || lower.contains("excel") || lower.contains("office") || lower.contains("notion") || lower.contains("obsidian") || lower.contains("doc") {
        "productivity".to_string()
    } else {
        "utility".to_string()
    }
}

/// Scan a watched folder for .lnk, .url, .exe, .bat, and .ps1 shortcuts
#[tauri::command]
pub fn scan_shortcuts_folder(folder_path: &str) -> Result<Vec<DiscoveredApp>, String> {
    let p = Path::new(folder_path);
    if !p.exists() || !p.is_dir() {
        return Err(format!("Directory '{}' does not exist", folder_path));
    }

    let current_cfg = load_shared_config();
    let enabled_ids: std::collections::HashSet<String> = current_cfg
        .shortcuts
        .iter()
        .filter(|s| s.enabled)
        .map(|s| s.path_or_appid.clone())
        .collect();

    let mut list = Vec::new();
    if let Ok(entries) = fs::read_dir(p) {
        for (idx, entry) in entries.flatten().enumerate() {
            let path = entry.path();
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                let ext_lower = ext.to_lowercase();
                if ["exe", "lnk", "url", "bat", "cmd", "ps1"].contains(&ext_lower.as_str()) {
                    let file_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("Shortcut").to_string();
                    let full_path = path.to_string_lossy().to_string();

                    let icon = extract_exe_icon(&full_path).ok();
                    let (icon_name, icon_color) = determine_lucide_icon_and_color(&file_stem, &full_path);
                    let is_enabled = enabled_ids.contains(&full_path);

                    list.push(DiscoveredApp {
                        id: format!("folder_{}_{}", idx, file_stem),
                        name: file_stem,
                        path_or_appid: full_path,
                        is_uwp: false,
                        icon_base64: icon,
                        icon_name: Some(icon_name.to_string()),
                        icon_color: Some(icon_color.to_string()),
                        category: "tools".to_string(),
                        enabled: is_enabled,
                    });
                }
            }
        }
    }

    Ok(list)
}

#[tauri::command]
pub fn get_shared_shortcuts() -> Vec<DiscoveredApp> {
    let cfg = load_shared_config();
    cfg.shortcuts.into_iter().filter(|s| s.enabled).collect()
}

#[tauri::command]
pub fn set_shared_shortcuts(shortcuts: Vec<DiscoveredApp>) {
    let mut cfg = load_shared_config();
    cfg.shortcuts = shortcuts;
    save_shared_config(&cfg);
}

#[tauri::command]
pub fn add_watched_folder(path: String) -> Result<Vec<DiscoveredApp>, String> {
    let mut cfg = load_shared_config();
    if !cfg.watched_folders.contains(&path) {
        cfg.watched_folders.push(path.clone());
    }

    let discovered = scan_shortcuts_folder(&path)?;
    for item in &discovered {
        if !cfg.shortcuts.iter().any(|s| s.path_or_appid == item.path_or_appid) {
            cfg.shortcuts.push(item.clone());
        }
    }

    save_shared_config(&cfg);
    Ok(discovered)
}

#[tauri::command]
pub fn get_watched_folders() -> Vec<String> {
    let cfg = load_shared_config();
    cfg.watched_folders
}

#[tauri::command]
pub fn remove_watched_folder(path: String) -> Vec<String> {
    let mut cfg = load_shared_config();
    cfg.watched_folders.retain(|f| f != &path);
    save_shared_config(&cfg);
    cfg.watched_folders
}

