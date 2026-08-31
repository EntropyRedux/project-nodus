# Project Nodus Workspace

> **Cross-Platform Distributed Command Plane & Multi-Device Control Mesh**
>
> **Version:** `1.1.0`  
> **GitHub Repository:** [https://github.com/EntropyRedux/project-nodus](https://github.com/EntropyRedux/project-nodus)

---

> [!IMPORTANT]
> **⚠️ Pre-Release / Post-Fix Notice**:  
> This version (`v1.1.0`) contains extensive architectural refactoring, full codebase audit remediations, TypeScript heap optimizations, and new calendar/widget features. **End-to-end integration testing across all physical hardware scenarios is ongoing.**

---

## 🌟 Overview
**Project Nodus** is a modular cross-device desktop and launcher ecosystem engineered for Android tablets (optimized for the POCO Pad 12.1" 120Hz HyperOS / Android 14), Windows companion bridges, and multi-device workstation setups.

All Nodus subsystem modules live inside this unified workspace repository under `packages/`.

---

## 🚀 Key Capabilities in v1.1.0

1. **Agenda & Live Calendar Integration**:
   - Two-way synchronized Notes & Agenda hub with offline caching and Google Calendar sync.
   - Chronological multi-meeting pills on the desktop top bar with real-time status badges (`🔴 LIVE:` / `In Xm:`).
   - 1-tap "Join Call" intent bridging to native Google Meet and Zoom applications with 0 background process drain.
2. **Clock & Dual Timezone Widgets**:
   - Main digital clock tapping directly opens the default system clock (`com.android.deskclock`).
   - Matching-height, non-intrusive Secondary Timezone clock container supporting global timezones.
3. **Comprehensive Codebase Audit Remediations**:
   - Resolved TypeScript heap allocation Out-Of-Memory compilation failures.
   - Harmonized Kotlin HTTP client endpoints (`/api/status`, `/api/process/kill`, `/api/exec`, `/api/lock`) with Tauri Rust desktop server.
   - Cleaned redundant IP/port concatenation in device control modals.
   - Pruned obsolete build artifacts from Android assets.
4. **Desktop Native Engine (Tauri v2 + Rust)**:
   - High-performance background bridge consuming only ~15 MB RAM.
   - Sub-millisecond Win32 input simulation and dynamic 500ms power-saving hot corners.

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
MIT © 2026 EntropyRedux
