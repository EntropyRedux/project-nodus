# Project Nodus — Current Project Status & Architecture Report

**Document Date:** August 20, 2026  
**Current Version:** `v1.2.0`  
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
       │  - Process Monitor & Taskkill│ │  - Dynamic App Scanner (pm) │
       │  - Tauri 2.0 Desktop Shell   │ │  - Root (su) Shell Actions  │
       └──────────────────────────────┘ └─────────────────────────────┘
```

---

## 2. Subsystem Architecture & Implementation Status

### 🟢 2.1 Backend Go Agent (`agent-go/`)
The backend agent consolidates scripting runtimes into a single cross-compiled Go binary with embedded Tailscale mesh networking.

* **Embedded `tsnet` Engine ([`main.go`](agent-go/main.go))**: Connects directly to Tailscale mesh networks on port `:8890` without external daemon dependencies. Supports headless pre-auth bootstrapping via `TS_AUTHKEY` / `NODUS_HOSTNAME`.
* **HMAC-SHA256 Wire Authentication ([`auth.go`](agent-go/auth.go))**: Replaces unchecked tokens with canonical payload serialization (`action|timestamp|nonce|json(params)`) and constant-time signature verification with $\le 30\text{s}$ clock-skew tolerance.
* **Anti-Replay Nonce Cache & RPC Dispatcher ([`rpc.go`](agent-go/rpc.go))**: Maintains an in-memory LRU nonce cache preventing replay attacks, handling `PING`, `GET_PROCESSES`, `KILL_PROCESS`, `RUN_COMMAND`, `GET_INSTALLED_APPS`, `GET_TELEMETRY`, `LIST_DIRECTORY`, and `TRANSFER_FILE`.
* **Dynamic Android Package Scanner ([`rpc.go`](agent-go/rpc.go))**: Executes native `pm list packages -3` to return third-party installed Android application metadata dynamically to the launcher.

---

### 🟢 2.2 Frontend Core & RPC Transport (`src/`)
* **Nodus Bridge Client ([`src/utils/bridgeProtocol.ts`](src/utils/bridgeProtocol.ts))**: Production WebSocket client utilizing WebCrypto API (`window.crypto.subtle`) for automatic HMAC-SHA256 signing, monotonic nonces, and Promise-based RPC calls.
* **Cluster Macro Engine ([`src/utils/macroEngine.ts`](src/utils/macroEngine.ts))**: Multi-step action runner (`runClusterMacro`) executing cross-device action chains (e.g. locking workstation + syncing fleet clipboard).
* **Live Remote Viewport Stream App ([`src/components/apps/RemoteStreamApp.tsx`](src/components/apps/RemoteStreamApp.tsx))**: Canvas stream viewer with `1080p`/`720p`/`480p` quality toggles and touch/click event forwarding (`input tap x y`) via RPC.
* **HTML5 2D Live Telemetry Canvas ([`src/components/home/RemoteCanvasWidget.tsx`](src/components/home/RemoteCanvasWidget.tsx))**: Real-time CPU sparkline rendering and quick macro trigger buttons.

---

## 4. Quality Assurance & Verification Matrix

| Test Suite / Metric | Scope | Target | Result |
| :--- | :--- | :--- | :---: |
| **TypeScript Static Analysis** | Frontend & Types | `tsc --noEmit` | 🟢 **Passed (0 errors)** |
| **Vite Production Bundler** | Production Build | `npm run build` | 🟢 **Passed (17.70s)** |
| **HMAC Signature Verification** | Wire Security | `auth_test.go` | 🟢 **Passed** |
| **Dynamic App Scanner RPC** | `agent-go` | `GET_INSTALLED_APPS` | 🟢 **Passed** |
| **Git Repository Synchronization** | Version Control | `origin/main` | 🟢 **Synchronized (`5f947dd`)** |

---

## 5. Completed Milestones & Roadmap
- [x] **Phase 1-5**: Core RPC wire protocol, `agent-go`, Tailscale mesh integration, and KitKat ARMv7 chroot subnets.
- [x] **Phase 6**: Codebase Hardening & Removal of Mock Data (100% dynamic network & host IPs).
- [x] **Phase 7**: Dynamic Package Scanner RPC (`GET_INSTALLED_APPS`) & Launcher App Grid Hydration.
- [x] **Phase 8**: Cluster Macro Automation Engine & HTML5 2D Live Remote Canvas Widget.
- [x] **Phase 9**: Remote Viewport Stream App (`RemoteStreamApp.tsx`) & Fleet Volume RPC Sync.
