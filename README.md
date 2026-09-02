# Project Nodus Workspace

> **Cross-Platform Distributed Command Plane & Multi-Device Control Mesh**
>
> **Version:** `1.3.0`  
> **GitHub Repository:** [https://github.com/EntropyRedux/project-nodus](https://github.com/EntropyRedux/project-nodus)  
> **Latest Release:** [📥 Download Nodus Home v1.3.0 APK](releases/nodus-home-v1.3.0-debug.apk)

---

## 📚 Documentation & Quick Links

- **📥 [Download Nodus Home v1.3.0 APK](releases/nodus-home-v1.3.0-debug.apk)**: Direct link to the compiled `v1.3.0` debug APK stored directly in the repository for fast testing.
- **📖 [User & Operations Guide](USER_GUIDE.md)**: Full instructions for tablet setup, gesture controls, window management, calendar sync & settings.
- **📝 [Version Changelog](CHANGELOG.md)**: Detailed historical release notes across all ecosystem versions (`v1.0.0` through `v1.3.0`).

---

## 🌟 Overview
**Project Nodus** is a universal cross-device desktop and launcher ecosystem engineered for **all Android tablets** (supporting Android 10–14+, foldables, and OEM multitasking environments like Xiaomi HyperOS, Samsung One UI, and Lenovo ZUI), paired with Windows companion bridges and multi-device workstation control.

All Nodus subsystem modules live inside this unified workspace repository under `packages/`.

---

## 🚦 Module Status & Ecosystem Progress

| Module / Package | Type | Target Platform | Current Status | Description |
| :--- | :---: | :---: | :---: | :--- |
| **`nodus-home`** | App / APK | Universal Android Tablets | 🟢 **v1.3.0 Production Ready** | Desktop Launcher Shell, Widgets, Window Manager & System Settings |
| **`nodus-common`** | Shared Library | TypeScript / Kotlin | 🟢 **Stable v1.1.0** | Single Source of Truth for IPC Contracts, Types & Icon Registry |
| **`nodus-fleet`** | App / APK | Android Tablets / Mobile | 🟡 **Active Development** | Standalone LAN Mesh Controller, Device Discovery & Remote RPC |
| **`nodus-assistive`** | Overlay APK | Android Tablets / Phones | 🟡 **Prototype Stage** | System-Wide Assistive Touch Overlay & Navigation Pill |
| **`nodus-desktop`** | Companion App | Windows 10/11 | 🟡 **Active Development** | Tauri v2 + Rust Win32 Remote Bridge, Media & Workstation Server |
| **`nodus-legacy`** | Archive | Android | ⚪ **Archived** | Legacy Monolith Launcher Prototype (Reference Only) |

---

## 📁 Repository & Package Structure

```
project-nodus/
├── README.md                           # Main Entry Point & Portal
├── USER_GUIDE.md                       # Comprehensive User & Operations Manual
├── CHANGELOG.md                        # Historical Release Notes & Changelogs
├── LICENSE                             # GNU AGPLv3 License
├── package.json                        # Root NPM Workspace
│
└── packages/
    ├── nodus-common/                   # Shared TypeScript types, IPC contracts & Kotlin mirrors
    ├── nodus-desktop/                  # Windows Companion HUD & Fleet Bridge (Tauri v2 + Rust)
    ├── nodus-home/                     # Primary Launcher & Desktop Shell (com.nodus.home)
    ├── nodus-fleet/                    # Multi-Device Mesh Extension (com.nodus.fleet)
    ├── nodus-assistive/                # System-Wide Assistive Touch Overlay (com.nodus.assistive)
    └── nodus-legacy/                   # Legacy Monolith Launcher (com.nodus.launcher archive)
```

---

## 🧪 Testing & Verification

Run the unified test suite across all workspace packages:

```bash
# Run tests across common, home, and desktop
npm run test

# Run individual test suites
npm run test:common   # Vitest unit tests for @nodus/common
npm run test:home     # Vitest unit tests for nodus-home
npm run test:desktop  # Cargo test for Tauri Rust backend
```

---

## 🛠️ Build & Dev Commands

From the workspace root (`project-nodus/`):

```bash
# Run Nodus Home frontend dev server
npm run dev:home

# Build Nodus Home frontend
npm run build:home

# Compile and Deploy Nodus Home APK to connected tablet:
cd packages/nodus-home/android-shell
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 📄 License
GNU AGPLv3 (GNU Affero General Public License v3) © 2026 EntropyRedux.

> **Development License Note:**  
> This project is currently licensed under the **GNU Affero General Public License v3 (AGPLv3)** during active ecosystem development to protect source integrity and network deployment reciprocity. Upon completion of full ecosystem development, selected subsystem packages may be re-licensed under more permissive open-source licenses (e.g., MIT / Apache 2.0).
