# Project Nodus

> **Cross-Platform Distributed Command Plane & Nodus Home Android Launcher**
>
> **GitHub Repository:** [https://github.com/EntropyRedux/project-nodus](https://github.com/EntropyRedux/project-nodus)

---

## 🌟 Overview
**Project Nodus** is a multi-device orchestration command plane and lightweight Android Home Launcher (**Nodus Home**). It bridges Android hardware (from rooted legacy ARMv7 devices to modern Android 14 HyperOS tablets) and Windows 10/11 workstations into a unified, low-latency control mesh.

---

## 🏗️ System Architecture

```
                                  ┌─────────────────────────────┐
                                  │      PROJECT NODUS UI       │
                                  │   React 19 + Vite + Tailwind│
                                  └──────────────┬──────────────┘
                                                 │
                             HMAC-SHA256 Signed JSON-RPC 2.0
                                (WebSocket over Tailscale)
                                                 │
                   ┌─────────────────────────────┴────────────────────────────┐
                   ▼                                                          ▼
    ┌─────────────────────────────┐                            ┌─────────────────────────────┐
    │    WINDOWS / LINUX HOST     │                            │    ANDROID / NODUS HOME     │
    │  - agent-go (tsnet :8890)   │                            │  - Nodus Home Activity      │
    │  - Process Monitor/Taskkill │                            │  - NodusDaemonService (WS)  │
    │  - Allowlisted Commands     │                            │  - Accessibility Service    │
    │  - Desktop Shell (Tauri)    │                            │  - Root (su) Shell Actions  │
    └─────────────────────────────┘                            └─────────────────────────────┘
```

---

## 📁 Repository Structure

```
project-nodus/
├── src/                         # Frontend Core (React 19 + TypeScript + Motion + Web Audio)
│   ├── components/              # Layout, Dock, Taskbars, Widgets, and System Apps
│   ├── context/                 # Central LauncherContext state management
│   ├── types/                   # TypeScript interfaces (DeviceProcess, RemoteExecutable, etc.)
│   └── utils/                   # BridgeProtocol client (HMAC WebCrypto) and synthesizer
├── agent-go/                    # Multi-Platform Go Agent & Hub
│   ├── main.go                  # Embedded tsnet Tailscale server
│   ├── auth.go                  # HMAC-SHA256 signature verification & clock-skew checks
│   ├── rpc.go                   # LRU nonce cache anti-replay & allowlist command execution
│   ├── agent_windows.go         # Windows native tasklist / taskkill
│   ├── agent_linux.go           # Linux /proc inspector & su -c root execution
│   └── commands.example.json    # Pre-configured allowlist template
├── desktop-shell/               # Tauri 2.0 Desktop Overlay Shell
│   ├── src-tauri/               # Rust wrapper with global shortcut (Ctrl+Shift+N) & tray icon
│   └── package.json             # Desktop shell package scripts
└── android-shell/               # Native Android Launcher Host
    ├── app/src/main/AndroidManifest.xml  # HOME intent filter & foreground service
    └── app/src/main/java/.../            # LauncherActivity (WebViewAssetLoader) & Daemons
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js** v20+ & NPM
* **Go** 1.22+ (for compiling `agent-go`)
* **Tailscale** / Headscale account

### 2. Frontend Web / UI Development
```bash
npm install
npm run dev
```

### 3. Build & Run Go Agent
```bash
cd agent-go

# Windows 10/11
GOOS=windows GOARCH=amd64 go build -o dist/nodus-agent.exe .

# Rooted ARMv7 Android Tablet (Linux Deploy chroot)
GOOS=linux GOARCH=arm GOARM=7 go build -o dist/nodus-agent-armv7 .
```

### 4. Run Tauri Desktop Shell
```bash
cd desktop-shell
npm run dev
# Press Ctrl+Shift+N to toggle the desktop overlay window
```

---

## 🔒 Security Architecture
1. **HMAC-SHA256 Wire Protocol**: All RPC requests are cryptographically signed with a shared key.
2. **Anti-Replay Defense**: Bound by a 30-second clock-skew window and single-use random nonces.
3. **Allowlisted Execution Only**: Arbitrary remote code execution is disabled; only explicitly pre-registered commands in `~/.nodus/commands.json` are permitted.

---

* **v1.3.0** (2026-08-23):
  * **Real-Time OS Notification Subsystem**: Native `NodusNotificationListenerService` (`BIND_NOTIFICATION_LISTENER_SERVICE`) with live real-time notification badge counts per app package and top bar aggregate indicator.
  * **Decoupled Global Drag & Drop Engine**: Zero-lag touch drag-to-reorder on Android tablets via floating GPU drag ghost, preventing DOM thrashing and touch-scroll cancellations.
  * **Desktop App Drawer & Multi-Device Workspace**: Customizable panel opacity controls, responsive taskbar icon scaling, spring-animated folder modals, and paginated/continuous drawer views.
  * **Streamlined Touch Gestures**: 350ms long-press to enter arrange mode, direct touch manipulation, and native Android window controls.

* **v1.0.0** (2026-08-18):
  * Initial migration to Go agent backend (`agent-go`) with embedded `tsnet`.
  * WebCrypto HMAC-SHA256 wire security protocol.
  * Desktop overlay shell integration via Tauri 2.0.
  * Native Android Home launcher shell (`com.nodus.launcher`).
  * Rebranded to **Project Nodus** / **Nodus Home**.
