# Project Nodus Workspace

> **Cross-Platform Distributed Command Plane & Multi-Device Control Mesh**
>
> **GitHub Repository:** [https://github.com/EntropyRedux/project-nodus](https://github.com/EntropyRedux/project-nodus)

---

## 🌟 Overview
**Project Nodus** is a modular cross-device desktop and launcher ecosystem engineered for Android tablets (Xiaomi HyperOS / Android 14), companion bridges, and multi-device workstation setups.

All Nodus subsystem modules live inside this unified workspace repository under `packages/`.

---

## 📁 Repository & Package Structure

```
project-nodus/
├── package.json                        # Root NPM Workspace
├── README.md
│
└── packages/
    ├── nodus-common/                   # Shared TypeScript types, IPC contracts & Kotlin mirrors
    │   ├── src/ipc/contract.ts         # Single Source of Truth for ContentProviders & Broadcasts
    │   └── src/kotlin/                 # NodusIpcContract.kt & NodusModuleDetector.kt
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

## 🚀 Quick Commands

From the workspace root (`project-nodus/`):

```bash
# Run Nodus Desktop (Windows companion) in dev mode
npm run dev:desktop

# Build Nodus Desktop companion
npm run build:desktop

# Build Nodus Home (Launcher frontend)
npm run build:home

# Build Nodus Fleet (Mesh Extension frontend)
npm run build:fleet

# Build all packages
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

## 🔒 Security & IPC Architecture
- **Signature Permission (`com.nodus.permission.FLEET_ACCESS`)**: Restricts ContentProvider (`content://com.nodus.fleet.provider/`) and broadcast intents exclusively to APKs signed by the Nodus ecosystem key.
- **Dual-Track Sync Architecture**: UI/UX is designed and iterated in `nodus-home-aistudio` and dropped cleanly into `nodus-home` with zero backend rewiring.
