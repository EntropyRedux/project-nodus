# Project Nodus Workspace

> **Cross-Platform Distributed Command Plane & Multi-Device Control Mesh**
>
> **Version:** `1.3.0`  
> **GitHub Repository:** [https://github.com/EntropyRedux/project-nodus](https://github.com/EntropyRedux/project-nodus)  
> **Latest APK Download:** [📥 Download Nodus Home v1.3.0 APK (Direct GitHub Release)](https://github.com/EntropyRedux/project-nodus/releases/latest/download/nodus-home-v1.3.0-debug.apk)

---

## 📥 Fast Downloads & Automated Builds

[![GitHub Release](https://img.shields.io/github/v/release/EntropyRedux/project-nodus?color=007AFF&label=Latest%20Release)](https://github.com/EntropyRedux/project-nodus/releases/latest)
[![CI & APK Build](https://github.com/EntropyRedux/project-nodus/actions/workflows/build-apk.yml/badge.svg)](https://github.com/EntropyRedux/project-nodus/actions/workflows/build-apk.yml)

| Release | Version | Release Package | Quick Link |
| :--- | :---: | :--- | :--- |
| **Nodus Home** | `v1.3.0` | Android Debug APK | [📥 Download v1.3.0 APK](https://github.com/EntropyRedux/project-nodus/releases/download/v1.3.0/nodus-home-v1.3.0-debug.apk) |
| **GitHub Releases Page** | All Builds | Source & Assets | [🔗 View All Releases](https://github.com/EntropyRedux/project-nodus/releases) |

---

## 🌟 Overview
**Project Nodus** is a modular cross-device desktop and launcher ecosystem engineered for Android tablets (optimized for the POCO Pad 12.1" 120Hz HyperOS / Android 14), Windows companion bridges, and multi-device workstation setups.

All Nodus subsystem modules live inside this unified workspace repository under `packages/`.

---

## 🚀 Key Capabilities in v1.3.0

1. **Continuous Scroll App Grid**:
   - Standardized continuous scrolling grid that repacks apps sequentially on Page 1 before spilling onto subsequent pages.
2. **Smart Native Auto-Stash**:
   - On OEM environments with a 2-window floating limit (such as HyperOS), opening a 3rd floating app automatically stashes the oldest active app into the Taskbar stack with a toast notice.
3. **Google Calendar Sync & Privacy Consent**:
   - Explicit account & privacy warning notice before granting calendar access.
   - Synchronizes upcoming meetings, deadlines, and video links (Google Meet, Zoom, Teams).
   - Added 1-tap **Unsync** button in the Calendar header for instant disconnection and event clearing.
4. **Lifecycle-Aware Poller Throttling**:
   - Custom `useVisibilityPoller` hook auto-pauses high-frequency background timers (Clipboard, Telemetry, Notifications) when the app or screen is hidden to conserve battery and CPU.
5. **0%–100% System Surface Opacity Control**:
   - System surface opacity slider range expanded from 0% to 100% across all themes.
6. **Unified Ecosystem Module Labels**:
   - Clear, consistent status badges (`"Requires Fleet APK"` / `"Requires Touch APK"`) when ecosystem modules are missing.
7. **Production CI & Type Safety Gate**:
   - Automated GitHub Actions workflow with strict `tsc --noEmit` lint and `vitest` unit test gates.

---

## 📁 Repository & Package Structure

```
project-nodus/
├── package.json                        # Root NPM Workspace (v1.1.0)
├── README.md
│
└── packages/
    ├── nodus-common/                   # Shared TypeScript types, IPC contracts & Kotlin mirrors
    │   ├── src/ipc/contract.ts         # Single Source of Truth for ContentProviders & Broadcasts
    │   └── src/utils/iconRegistry.ts   # Curated tree-shakeable Lucide icon registry
    │
    ├── nodus-desktop/                  # Windows Companion HUD & Fleet Bridge (Tauri v2 + Rust)
    │   ├── src/                        # React + TypeScript Companion HUD & Process Monitor
    │   └── src-tauri/                  # Win32 media control, hot corners, HTTP server & UDP beacon
    │
    ├── nodus-home/                     # Primary Launcher & Desktop Shell (com.nodus.home)
    │   ├── src/                        # React + TypeScript + TailwindCSS
    │   └── android-shell/              # Kotlin Android Shell (HomeActivity.kt)
    │
    ├── nodus-fleet/                    # Multi-Device Mesh Extension (com.nodus.fleet)
    │   ├── src/                        # Fleet Controller Web Dashboard
    │   └── android-shell/              # UDP Discovery, Telemetry Poller & FleetDataProvider
    │
    ├── nodus-assistive/                # System-Wide Assistive Touch Overlay (com.nodus.assistive)
    │   └── android-shell/              # Floating overlay service & navigation pill
    │
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
# Run Nodus Desktop (Windows companion) in dev mode
npm run dev:desktop

# Build Nodus Desktop companion (Tauri v2)
npm run build:desktop

# Run Nodus Home frontend dev server
npm run dev:home

# Build Nodus Home frontend
npm run build:home

# Build Nodus Fleet frontend
npm run build:fleet

# Build all workspace packages
npm run build:all
```

---

## 📱 Android Shell APK Compilation & Deployment

```bash
# Compile and Deploy Nodus Home to connected tablet via ADB:
cd packages/nodus-home/android-shell
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Compile and Deploy Nodus Fleet:
cd packages/nodus-fleet/android-shell
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔒 Security & Zero-Trust Pairing
- **Signature Permission (`com.nodus.permission.FLEET_ACCESS`)**: Restricts ContentProvider (`content://com.nodus.fleet.provider/`) and broadcast intents exclusively to APKs signed by the Nodus ecosystem key.
- **Tauri Bearer Token Handshake**: REST API routes on Windows workstation require pairing tokens (`X-Nodus-Auth-Token` / Bearer authorization).
- **Sanitized CORS**: Enforces trusted origin checks for local desktop webviews and Android asset platforms.

---

## 📄 License
GNU AGPLv3 (GNU Affero General Public License v3) © 2026 EntropyRedux.

> **Development License Note:**  
> This project is currently licensed under the **GNU Affero General Public License v3 (AGPLv3)** during active ecosystem development to protect source integrity and network deployment reciprocity. Upon completion of full ecosystem development, selected subsystem packages may be re-licensed under more permissive open-source licenses (e.g., MIT / Apache 2.0).
