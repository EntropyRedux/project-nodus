# Project Nodus Workspace

> **Cross-Platform Distributed Command Plane & Multi-Device Control Mesh**
>
> **Version:** `1.3.0`  
> **GitHub Repository:** [https://github.com/EntropyRedux/project-nodus](https://github.com/EntropyRedux/project-nodus)  
> **License:** AGPL-3.0-only  

---

## 📚 Documentation & Quick Links

- **📖 [User & Operations Guide](USER_GUIDE.md)**: Full instructions for tablet setup, gesture controls, window management & settings.
- **📝 [Version Changelog](CHANGELOG.md)**: Detailed historical release notes across ecosystem versions.
- **🛡️ [Master Refactor Strategy Plan](generated_documents/REFACTOR_AND_UPDATE_STRATEGY_PLAN_2026.md)**: Forensic security hardening and architectural roadmap.

---

## 🌟 Overview
**Project Nodus** is a universal cross-device desktop and launcher ecosystem engineered for **Android tablets** (supporting Android 10–14+, foldables, and OEM multitasking environments like Xiaomi HyperOS, Samsung One UI, and Lenovo ZUI), paired with Windows companion bridges and multi-device workstation control.

All Nodus subsystem modules live inside this unified workspace repository under `packages/`.

---

## 🚦 Module Status & Ecosystem Architecture

| Module / Package | Type | Target Platform | Status | Description |
| :--- | :---: | :---: | :---: | :--- |
| **`nodus-home`** | App / APK | Universal Android Tablets | 🟢 **Production Ready** | Desktop Launcher Shell, Widgets, Window Manager & System Settings |
| **`nodus-fleet`** | App / APK | Android Tablets / Mobile | 🟢 **Active Mesh** | Standalone LAN Mesh Controller, Device Discovery, ConPTY Remote Shell |
| **`nodus-desktop`** | Companion App | Windows 10/11 | 🟢 **Active Desktop** | Tauri v2 + Rust Win32 Remote Bridge, ConPTY Server & Workstation Control |
| **`@nodus/common`** | Shared Contracts | TypeScript | 🟢 **Canonical Types** | Single Source of Truth for IPC Contracts, Mesh Topology & Hardware Types |

---

## 📁 Repository & Package Structure

```
project-nodus/
├── README.md                           # Main Entry Point & Portal
├── USER_GUIDE.md                       # Comprehensive User & Operations Manual
├── CHANGELOG.md                        # Historical Release Notes & Changelogs
├── LICENSE                             # GNU AGPLv3 License
├── package.json                        # Root NPM Workspace
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

Run the unified test suite across all workspace packages:

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
npm run dev:home      # Nodus Home frontend dev server
npm run dev:fleet     # Nodus Fleet frontend dev server
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
