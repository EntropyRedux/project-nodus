# Project Nodus — Current Project Status & Architecture Report

**Document Date:** August 18, 2026  
**Current Version:** `v1.0.0`  
**Repository:** [https://github.com/EntropyRedux/project-nodus](https://github.com/EntropyRedux/project-nodus)  
**Branch:** `main`

---

## 1. Executive Summary
**Project Nodus** is a cross-platform distributed command plane and unified device controller pairing an Android Home Launcher (**Nodus Home**) with high-performance desktop workstations. It transitions from an early simulation prototype into a hardened, production-grade systems architecture powered by an embedded **Tailscale Go agent (`agent-go`)**, **WebCrypto HMAC-SHA256 wire security**, a **Tauri 2.0 desktop overlay shell**, and a **native Android Launcher Activity**.

```
       ┌─────────────────────────────────────────────────────────────┐
       │                      PROJECT NODUS UI                       │
       │        React 19 + TypeScript + Tailwind v4 + Motion         │
       └──────────────┬──────────────────────────────┬───────────────┘
                      │                              │
        WebSocket / HTTP JSON-RPC       WebSocket / HTTP JSON-RPC
        Port: 8890 (HMAC-SHA256)         Port: 8890 (HMAC-SHA256)
                      │                              │
                      ▼                              ▼
       ┌──────────────────────────────┐ ┌─────────────────────────────┐
       │   WINDOWS / LINUX HOST       │ │    ANDROID / NODUS HOME     │
       │  - agent-go (tsnet embedded) │ │  - Native HOME Launcher Act │
       │  - Allowlisted Command Exec  │ │  - NodusDaemonService (WS)  │
       │  - Process Monitor & Taskkill│ │  - Accessibility Actions    │
       │  - Tauri 2.0 Desktop Shell   │ │  - Root (su) Shell Actions  │
       └──────────────────────────────┘ └─────────────────────────────┘
```

---

## 2. Subsystem Architecture & Implementation Status

### 🟢 2.1 Backend Go Agent (`agent-go/`)
The backend agent consolidates previously fragmented scripting runtimes (PowerShell and Node.js) into a single, cross-compiled Go binary with embedded Tailscale mesh networking.

* **Embedded `tsnet` Engine ([`main.go`](agent-go/main.go))**: Connects directly to Tailscale mesh networks on port `:8890` without external daemon dependencies. Supports headless pre-auth bootstrapping via `TS_AUTHKEY` / `NODUS_HOSTNAME`.
* **HMAC-SHA256 Wire Authentication ([`auth.go`](agent-go/auth.go))**: Replaces unchecked tokens with canonical payload serialization (`action|timestamp|nonce|json(params)`) and constant-time signature verification with $\le 30\text{s}$ clock-skew tolerance.
* **Anti-Replay Nonce Cache & RPC Dispatcher ([`rpc.go`](agent-go/rpc.go))**: Maintains an in-memory LRU nonce cache preventing replay attacks, handling `PING`, `GET_PROCESSES`, `KILL_PROCESS`, and `RUN_COMMAND`.
* **Allowlisted Command Execution ([`commands.example.json`](agent-go/commands.example.json))**: Disallows arbitrary remote code execution, strictly restricting triggers to pre-registered command IDs and whitelisted working directories.
* **Cross-Platform Host Process Control**:
  * **Windows ([`agent_windows.go`](agent-go/agent_windows.go))**: Native `tasklist` and `taskkill /F /PID` handlers + `rundll32.exe user32.dll,LockWorkStation`.
  * **Linux & Android Host ([`agent_linux.go`](agent-go/agent_linux.go))**: Direct `/proc` inspection with `su -c` root fallback for container and Android host processes.

---

### 🟢 2.2 Frontend Core & RPC Transport (`src/`)
The user interface retains 100% of its visual polish and component structure while upgrading its transport layer to enterprise-grade cryptography.

* **Nodus Bridge Client ([`src/utils/bridgeProtocol.ts`](src/utils/bridgeProtocol.ts))**: Production WebSocket client utilizing browser native `window.crypto.subtle` (WebCrypto API) for automatic HMAC-SHA256 signing, monotonic nonces, Promise-based RPC calls, and asynchronous event streaming (`.on('event', callback)`).
* **Launcher UI Shell ([`src/components/layout/DesktopLauncherShell.tsx`](src/components/layout/DesktopLauncherShell.tsx))**: Hybrid workspace supporting glassmorphic desktop and mobile simulator modes, smart taskbars, quick settings shades, and notification centers.
* **Zero-Asset Procedural Audio Synth ([`src/utils/audio.ts`](src/utils/audio.ts))**: Procedural Web Audio API sound generator delivering haptic and click feedback with zero external MP3/WAV assets.

---

### 🟢 2.3 Desktop Shell Overlay (`desktop-shell/`)
* **Tauri 2.0 Rust Shell ([`desktop-shell/src-tauri/src/main.rs`](desktop-shell/src-tauri/src/main.rs))**: Native desktop overlay wrapper with borderless transparency, `skipTaskbar: true`, system tray controls, and global hotkey toggle (`CmdOrCtrl+Shift+N`).
* **Configuration ([`desktop-shell/src-tauri/tauri.conf.json`](desktop-shell/src-tauri/tauri.conf.json))**: Pointed directly to `../../dist` to serve the compiled Vite production bundle with zero latency.

---

### 🟢 2.4 Android Native Shell — Nodus Home (`android-shell/`)
* **Launcher Intent Filter ([`AndroidManifest.xml`](android-shell/app/src/main/AndroidManifest.xml))**: Registered with `<category android:name="android.intent.category.HOME" />` and `<category android:name="android.intent.category.DEFAULT" />` under package `com.nodus.launcher`.
* **Secure Web View Host ([`LauncherActivity.kt`](android-shell/app/src/main/java/com/nodus/launcher/LauncherActivity.kt))**: Uses AndroidX `WebViewAssetLoader` (`https://appassets.androidplatform.net/assets/`) to eliminate CORS/origin errors for WebCrypto and WebSockets.
* **Background Daemon & Accessibility Services**:
  * [`NodusDaemonService.kt`](android-shell/app/src/main/java/com/nodus/launcher/service/NodusDaemonService.kt): Foreground service maintaining outbound WebSocket links to the Tailnet mesh.
  * [`NodusAccessibilityService.kt`](android-shell/app/src/main/java/com/nodus/launcher/service/NodusAccessibilityService.kt): Intercepts hardware keys and executes global system navigation.

---

## 3. Rooted Legacy Device Strategy (e.g., Samsung SM-T230NU ARMv7)
Rooted devices running **Linux Deploy (chroot)** operate as full-tier nodes within Project Nodus:

1. **Native Go Binary Execution**: Bypasses Android 4.4 KitKat WebView and obsolete TLS 1.0/1.1 limitations:
   ```bash
   GOOS=linux GOARCH=arm GOARM=7 go build -o dist/nodus-agent-armv7 ./agent-go
   ```
2. **Userspace Tailnet**: Runs `tailscaled --tun=userspace-networking` inside the chroot.
3. **Subnet Router**: Enables `tailscale up --advertise-routes=192.168.1.0/24` to bridge other local devices onto Tailscale.
4. **Root Shell Host Execution**: Replaces accessibility permissions with direct `su -c "input keyevent ..."` and `su -c "kill -9 ..."`.

---

## 4. Quality Assurance & Verification Matrix

| Test Suite / Metric | Scope | Target | Result |
| :--- | :--- | :--- | :---: |
| **TypeScript Static Analysis** | Frontend & Types | `tsc --noEmit` | 🟢 **Passed (0 errors)** |
| **Vite Production Bundler** | Production Build | `npm run build` | 🟢 **Passed (5.17s)** |
| **HMAC Signature Verification** | Wire Security | `auth_test.go` | 🟢 **Passed** |
| **Anti-Replay Nonce Engine** | Anti-Tampering | `auth_test.go` | 🟢 **Passed** |
| **Allowlist Command Filter** | Security Boundary | `rpc_test.go` | 🟢 **Passed** |
| **Git Repository Synchronization** | Version Control | `origin/main` | 🟢 **Synchronized** |

---

## 5. Upcoming Milestones & Roadmap
- [x] **Phase 2.1**: Automated QR code pairing generator in `SettingsApp.tsx` for fast HMAC shared-key exchange.
- [x] **Phase 2.2**: Cross-device telemetry charts (live CPU/RAM graphs streaming from `agent-go` to `ProcessMonitorApp.tsx`).
- [x] **Phase 2.3**: Headless File Transfer & Remote Cluster Explorer (`FileExplorerApp.tsx` & P2P file transfers).
- [x] **Phase 3**: Android Companion Deployment & Hardware Provisioning (`nodus://pair` deep-linking, KitKat TLS fallback, `deploy_nodes.sh`).
