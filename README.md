# Project Nodus Workspace

> **Cross-Platform Distributed Command Plane & Multi-Device Control Mesh**
>
> **Version:** `1.2.0`  
> **GitHub Repository:** [https://github.com/EntropyRedux/project-nodus](https://github.com/EntropyRedux/project-nodus)  
> **License:** AGPL-3.0-only  

---

## 📚 Documentation & Quick Links

- **📊 [v1.2.0 Project Status Report](generated-documents/PROJECT_STATUS_REPORT_2026_09_13.md)**: Comprehensive milestone engineering report covering dual mouse emulation, ConPTY terminal, and mesh architecture.
- **📖 [User & Operations Guide](USER_GUIDE.md)**: Full instructions for tablet setup, gesture controls, window management & settings.
- **📝 [Version Changelog](CHANGELOG.md)**: Detailed historical release notes across ecosystem versions.

---

## 🌟 Overview
**Project Nodus** is a universal cross-device desktop and launcher ecosystem engineered for **Android tablets** (supporting Android 10–14+, foldables, and OEM multitasking environments like Xiaomi HyperOS, Samsung One UI, and Lenovo ZUI), paired with Windows companion bridges and multi-device workstation control.

All Nodus subsystem modules live inside this unified workspace repository under `packages/`.

---

## ✨ Key Capabilities (v1.2.0 Milestone)

### 🖱️ Dual Android Mouse Emulation Engine
- **Engine A (Hardware Overlay):** Standalone, hardware-accelerated floating system overlay (`TYPE_APPLICATION_OVERLAY`) rendering a crisp anti-aliased vector pointer (`MouseOverlayManager.kt`) across all Android applications.
- **Engine B (Linux Kernel uinput):** Direct `/dev/uinput` kernel mouse injection over ADB port 5555 for native system pointer recognition.
- **True Enable / Disable Invariance:** Toggling the mouse pointer off completely detaches the overlay from `WindowManager` (`removeOverlay()`), and virtual trackpad movements strictly bypass cursor rendering while disabled.
- **1:1 Resolution Mapping:** Precise screen percentage translation (`moveToPercent(px, py)`) with dynamic resolution synchronization (2560×1570 on POCO Pad).
- **Aspect-Ratio Preserved Trackpad:** Virtual trackpad strictly locks to the remote display aspect ratio (`aspectRatio: width / height`), eliminating coordinate distortion regardless of column or window resizing.

### 🚀 3-Tier Application & Shortcuts Architecture
- **Tier 1 (Workstation Apps):** Direct local Win32 binary, developer tool, and script execution on the Windows host.
- **Tier 2 (Android Installed Apps):** Dynamic live package inspection (`/api/system/apps`) via Android `PackageManager`, extracting application icons, package names, and launchable intents for remote execution.
- **Tier 3 (Shared Launchpad Pinning):** Unified cross-device deck allowing users to pin both PC tools and Android apps to the central launchpad for 1-tap execution.

### 💻 Interactive ConPTY & Android Terminal Engine
- **Windows ConPTY Host:** Real-time bidirectional terminal streaming powered by `portable-pty`, supporting PowerShell and CMD sessions with full ANSI color support.
- **Interactive Android Shell:** Direct shell bridge running Xterm.js v6 with `@xterm/addon-fit` for responsive terminal emulation.
- **Touch & Productivity Modes:** Dedicated touch selection mode, instant terminal buffer copy chips, and fast-action command pills (`git status`, `ipconfig`, `ps -A`).

### 🛡️ Zero-Trust Security Mesh & Bidirectional Unpairing
- **Mandatory Token Verification:** All non-public RPC endpoints enforce `X-Nodus-Auth-Token` authentication (returning `401 Unauthorized` on forgery).
- **Real-Time Bidirectional Unpair:** Revoking pairing on either device instantly invokes `/api/system/unpair` on the peer, eliminating ghost pairings.
- **Beacon Isolation:** Discovered UDP broadcast beacons are strictly quarantined from active connected mesh members until authenticated.

### 🔊 Remote Media & System Power Control
- Full volume level adjustment (0–100%) and stepping (`up`, `down`, `mute`).
- Hardware media transport controls (`Play/Pause`, `Next`, `Previous`).
- Remote screen wake and sleep/lock actions.

---

## 🚦 Module Status & Ecosystem Architecture

| Module / Package | Type | Target Platform | Status | Description |
| :--- | :---: | :---: | :---: | :--- |
| **`nodus-desktop`** | Companion App | Windows 10/11 | 🟢 **v1.2.0 Active** | Tauri v2 + Rust Win32 Remote Bridge, ConPTY Server & Workstation Control |
| **`nodus-fleet`** | App / APK | Android Tablets / Mobile | 🟢 **v1.2.0 Active** | Standalone LAN Mesh Controller, Dual Mouse Engine, Installed Apps Scanner |
| **`nodus-home`** | App / APK | Universal Android Tablets | 🟢 **Production Ready** | Desktop Launcher Shell, Widgets, Window Manager & System Settings |
| **`@nodus/common`** | Shared Contracts | TypeScript | 🟢 **Canonical Types** | Single Source of Truth for IPC Contracts, Mesh Topology & Hardware Types |

---

## 📁 Repository & Package Structure

```
project-nodus/
├── README.md                           # Main Entry Point & Portal
├── USER_GUIDE.md                       # Comprehensive User & Operations Manual
├── CHANGELOG.md                        # Historical Release Notes & Changelogs
├── LICENSE                             # GNU AGPLv3 License
├── package.json                        # Root NPM Workspace (v1.2.0)
├── generated-documents/                # Engineering status reports, audit logs & plans
│   └── PROJECT_STATUS_REPORT_2026_09_13.md # v1.2.0 Comprehensive Milestone Report
├── scripts/                            # Cross-platform maintenance & asset sync tools
│   └── sync-android-assets.mjs         # Safe bundle synchronization script
│
└── packages/
    ├── nodus-common/                   # Canonical TypeScript types & IPC contracts (@nodus/common)
    ├── nodus-desktop/                  # Windows Companion HUD & Fleet Bridge (Tauri v2 + Rust)
    ├── nodus-home/                     # Primary Launcher & Desktop Shell (com.nodus.home)
    └── nodus-fleet/                    # Multi-Device Mesh Extension (com.nodus.fleet)
```

---

## 🧪 Testing & Verification

Run the unified test suite across workspace packages:

```bash
# Run tests across home and desktop
npm run test

# Run individual test suites
npm run test:home     # Vitest unit tests for nodus-home
npm run test:desktop  # Cargo test for Tauri Rust backend
```

---

## 🛠️ Build & Dev Commands

From the workspace root (`project-nodus/`):

```bash
# Development
npm run dev:home      # Nodus Home frontend dev server (port 3000)
npm run dev:fleet     # Nodus Fleet frontend dev server (port 3001)
npm run dev:desktop   # Nodus Desktop Tauri dev server

# Production Builds
npm run build:home    # Build Nodus Home web bundle
npm run build:fleet   # Build Nodus Fleet web bundle
npm run build:desktop # Build Nodus Desktop production binary

# Android Asset Sync (copies dist bundles to android-shell assets cleanly)
npm run sync:android

# Compile Android APKs
cd packages/nodus-home/android-shell && ./gradlew assembleDebug
cd packages/nodus-fleet/android-shell && ./gradlew assembleDebug
```

---

## 📄 License
GNU AGPLv3 (GNU Affero General Public License v3) © 2026 EntropyRedux.
