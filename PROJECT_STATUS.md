# Project Nodus — Ecosystem Status & Architecture Guide

> **Current Milestone**: Monorepo Restructure, Windows Desktop Companion (Tauri v2 + Rust), & LAN Fleet Control Mesh  
> **Repository**: [https://github.com/EntropyRedux/project-nodus](https://github.com/EntropyRedux/project-nodus)  
> **Last Updated**: August 2026

---

## 🧭 Executive Summary

**Project Nodus** is a cross-device workstation shell, launcher, and distributed command plane built for Android tablets (specifically optimized for the **POCO Pad** / 12.1" 120Hz HyperOS / Android 14), Windows workstations, and multi-node setups.

The project is structured as a **Turborepo/NPM modular monorepo** under `packages/`, cleanly isolating the launcher shell, Windows desktop companion, fleet mesh daemon, overlay services, and shared cross-platform contracts.

---

## 📦 Package Matrix & Current Status

| Package | Subsystem | Tech Stack | Status | Target Platforms |
| :--- | :--- | :--- | :--- | :--- |
| **`nodus-common`** | Shared Contracts & Schemas | TypeScript, Kotlin | 🟢 **Stable** | Cross-Platform |
| **`nodus-desktop`** | Windows Companion & Fleet Bridge | Tauri v2, Rust, React 19 | 🟢 **Operational** | Windows 10 / 11 (x64) |
| **`nodus-home`** | Primary Launcher & Desktop Shell | React, TailwindCSS, Kotlin WebView | 🟢 **Active Dev** | Android Tablets (POCO Pad) |
| **`nodus-fleet`** | Multi-Device Discovery & Telemetry | Kotlin, Android ContentProvider, React | 🟢 **Operational** | Android, Windows LAN Mesh |
| **`nodus-assistive`** | System Assistive Touch Overlay | Kotlin Android Service, WindowManager | 🟢 **Operational** | Android 10+ |
| **`nodus-legacy`** | Archived Monolithic Codebase | TypeScript, Kotlin | 🟡 **Archived** | Reference |

---

## 🏗️ Architectural Overview

```
+─────────────────────────────────────────────────────────────────────────────+
|                             NODUS ECOSYSTEM                                 |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│   nodus-home     │◄────────►│  nodus-desktop   │◄────────►│   nodus-fleet    │
│  (Tablet Shell)  │   UDP    │ (Windows Bridge) │   IPC    │  (Mesh Service)  │
│  React + Android │ Discovery│  Tauri v2 + Rust │ Content  │ Kotlin Provider  │
│  WebViewAssetLdr │          │  Win32 Native    │ Provider │ Discovery Daemon │
└──────────────────┘          └──────────────────┘          └──────────────────┘
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       ▼
                            ┌──────────────────┐
                            │   nodus-common   │
                            │ Single Source of │
                            │ Truth Contracts  │
                            └──────────────────┘
```

---

## 🔍 Module Deep-Dive

### 1. `packages/nodus-desktop` (Windows Companion & Fleet Bridge)
- **Engine**: Tauri v2 (`wry` WebView2 renderer) + Rust + React 19 / Vite.
- **Key Capabilities**:
  - **Embedded HTTP Remote API (`src-tauri/src/server/mod.rs`)**: Listens on `http://0.0.0.0:9120` (fallback `8080`) with CORS support. Exposes REST endpoints for telemetry, media commands, process management, and workstation locking.
  - **Subnet UDP Beacon & Responder (`src-tauri/src/discovery/mod.rs`)**: Listens on UDP `8765` for `NODUS_DISCOVER_REQ` and `PCCONTROL_MASTER` probes; broadcasts 5-second discovery beacons across the LAN.
  - **Win32 Media Control (`src-tauri/src/commands/media.rs`)**: Direct `WM_APPCOMMAND` dispatch to `Shell_TrayWnd` for volume control, mute, and media playback.
  - **Host Clipboard Watcher (`src-tauri/src/commands/clipboard.rs`)**: Automatically synchronizes host Windows clipboard changes to the Clipboard Hub and connected tablet nodes.
  - **Win32 Input Simulation Engine (`src-tauri/src/commands/input.rs`)**: Native `SendInput` backend supporting sub-millisecond mouse relative movement, left/right/double clicks, vertical/horizontal scrolling, system hotkey combos (`Ctrl+Shift+Esc`, `Win+D`, `Alt+Tab`, `Win+Shift+S`), and direct Unicode text typing into the focused Windows window.
  - **Virtual Trackpad & Remote Deck UI (`src/components/panels/RemoteDeckPanel.tsx`)**: Precision glass trackpad surface with touch/mouse event capture, media scrubbing deck, hotkey launchpads, and remote text injector.
  - **Hot-Corner Detection (`src-tauri/src/hotcorners/mod.rs`)**: Low-overhead 60Hz cursor polling detecting screen corners to trigger customized actions.
  - **Compilation Stability**: Optimized `.cargo/config.toml` with `RUST_MIN_STACK = "16777216"`, `jobs = 2`, and `[profile.dev] opt-level = 1` preventing Windows MSVC compiler stack buffer overrun (`0xc0000409`).

### 2. `packages/nodus-home` (Primary Tablet Launcher)
- **Engine**: React 19 + TypeScript + TailwindCSS hosted inside a native Kotlin Android shell (`HomeActivity.kt`) with `WebViewAssetLoader`.
- **Key Capabilities**:
  - **Dynamic App Dock & App Drawer**: Fast application launching and categorization.
  - **Multi-Device Radar**: Live node status cards displaying connected workstation stats.
  - **Desktop HUD & Widgets**: Clock, battery telemetry, and quick settings shade.
  - **AI Studio UI/UX Drop-In Compatibility**: Frontend is decoupled from Android IPC to accept rapid UI prototypes directly from AI Studio.

### 3. `packages/nodus-fleet` (Multi-Device Mesh Extension)
- **Engine**: Kotlin Android Shell (`com.nodus.fleet`) + ContentProvider.
- **Key Capabilities**:
  - **`UdpDiscoveryManager.kt`**: Subnet discovery engine discovering local Windows companion nodes and tablets without manual IP configuration.
  - **Secure IPC (`com.nodus.permission.FLEET_ACCESS`)**: Signature-level permission restricting fleet data queries to verified Nodus ecosystem packages.
  - **`FleetDataProvider.kt`**: Exposes discovered nodes and metrics via `content://com.nodus.fleet.provider/devices`.

### 4. `packages/nodus-assistive` (System Assistive Overlay)
- **Engine**: Kotlin Android Accessibility & System Overlay Service (`com.nodus.assistive`).
- **Key Capabilities**:
  - Floating pill overlay rendered over third-party applications.
  - Quick access to universal clipboard, taskbar drawer, and device switching.

### 5. `packages/nodus-common` (Single Source of Truth)
- Shared TypeScript interfaces (`DeviceInfo`, `DeviceProcess`, `ClipboardItem`, `RemoteExecutable`).
- Shared Kotlin IPC definitions (`NodusIpcContract.kt`, `NodusModuleDetector.kt`).

---

## 📡 Remote Control & HTTP API Specification

The embedded Windows companion server (`http://<PC_IP>:9120`) exposes the following REST API:

| Method | Endpoint | Description | Sample Request / Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/status` | Host system telemetry | `{"name":"Workstation (PC)","os":"windows","cpuLoad":8,"ramUsage":"5.2 / 32.0 GB"}` |
| `POST` | `/api/media/control` | Control host playback & volume | `{"action":"volume_up" \| "volume_down" \| "volume_mute" \| "play_pause" \| "next" \| "prev"}` |
| `POST` | `/api/lock` | Lock Windows workstation | `{"status":"success","message":"Workstation locked"}` |
| `GET` | `/api/processes` | List active processes | `{"status":"success","processes":[{"pid":1024,"name":"code.exe","memory_kb":125000}]}` |
| `POST` | `/api/process/kill` | Kill process by PID | `{"pid": 1024}` |
| `POST` | `/api/exec` | Launch app, script, or URL | `{"command":"wt.exe","args":"-p PowerShell"}` |
| `GET` | `/api/clipboard` | Read host clipboard | `{"status":"success","text":"https://github.com/..."}` |
| `POST` | `/api/clipboard` | Write to host clipboard | `{"text":"Hello from POCO Pad"}` |
| `POST` | `/api/input/mouse/move` | Relative mouse delta | `{"dx": 15, "dy": -8}` |
| `POST` | `/api/input/mouse/click` | Mouse button click | `{"button": "left" \| "right" \| "middle" \| "double"}` |
| `POST` | `/api/input/mouse/scroll` | Mouse wheel scroll | `{"dx": 0, "dy": 1}` |
| `POST` | `/api/input/keyboard/hotkey` | Trigger key combination | `{"keys": ["ctrl", "shift", "esc"]}` |
| `POST` | `/api/input/keyboard/text` | Type Unicode string | `{"text": "git commit -m 'feat: trackpad'"}` |


---

## 🚀 Quick Start & Development Commands

### Prerequisites
- **Node.js**: v20+ / npm v10+
- **Rust**: 1.78+ (MSVC toolchain for Windows desktop)
- **Android SDK**: API Level 34 (Android 14) + JDK 17

### Commands

```bash
# ─── Windows Desktop Companion (Tauri v2) ────────────────────────
cd packages/nodus-desktop
npm run tauri dev              # Launch native Windows HUD Companion

# ─── Nodus Home Tablet Frontend ─────────────────────────────────
cd packages/nodus-home
npm run dev                    # Run web preview on http://localhost:5173

# ─── Android Shell Builds (Gradle) ──────────────────────────────
# Build & Deploy Nodus Home APK:
cd packages/nodus-home/android-shell
./gradlew assembleDebug

# Build & Deploy Nodus Fleet APK:
cd packages/nodus-fleet/android-shell
./gradlew assembleDebug
```

---

## 🗺️ Roadmap & Next Milestones

- [x] Monorepo restructure under `packages/`
- [x] Tauri v2 Windows Companion app with `wry` WebView2 integration
- [x] Win32 `WM_APPCOMMAND` host media & volume control
- [x] Subnet UDP Discovery & automatic peer pairing
- [x] Embedded HTTP REST control server (port 9120)
- [x] Cross-device clipboard sync engine
- [ ] Bidirectional WebSocket stream for real-time sensor & trackpad streaming
- [ ] Virtual display / second-screen streaming to POCO Pad (low-latency WebRTC/RTSP)
- [ ] Hardware key remapping for tablet keyboard dock & stylus shortcuts
