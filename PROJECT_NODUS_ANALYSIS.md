# Project Nodus — Technical Analysis & Observations

> **Document type:** Independent codebase analysis (observational report)
> **Target repository:** `C:\Projects\LocalActive\Repo\Active\project-nodus`
> **Git remote:** `https://github.com/EntropyRedux/project-nodus.git` (branch `main`)
> **Version analyzed:** `v1.1.1` (workspace root `package.json`), latest commit `9b5b114`
> **Date of analysis:** 2026-08-31
> **Method:** Static review of source, manifests, configs, Git history, wire contracts, and build scripts. No physical/hardware testing was performed; runtime claims are labeled as such when they come from docs vs. code.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Identity](#2-product-identity)
3. [Goals & Vision](#3-goals--vision)
4. [Core Principles](#4-core-principles)
5. [Architecture](#5-architecture)
6. [Wire Protocols & Data Flow](#6-wire-protocols--data-flow)
7. [Use Cases](#7-use-cases)
8. [Security Model](#8-security-model)
9. [Build, Test & CI](#9-build-test--ci)
10. [Strengths](#10-strengths)
11. [Risks & Concerns](#11-risks--concerns)
12. [Recommendations](#12-recommendations)
13. [Appendix](#13-appendix)

---

## 1. Executive Summary

**Project Nodus** ("nodus" = *Latin for knot/node*) is a **cross-platform distributed command plane and multi-device control mesh** built around an Android tablet launcher. It is engineered primarily for the **POCO Pad 12.1" 120Hz Android 14 (HyperOS)** as the center of a "personal device mesh" that also includes **Windows workstations** (via a Tauri v2 + Rust companion), **secondary Android nodes**, and a system-wide **assistive-touch overlay**.

The product has been re-architected from a **single monolith APK** (`com.nodus.launcher`) into a **modular monorepo of up to four Android APKs plus a desktop companion**:

| Package | Role | Artifact |
|---|---|---|
| `nodus-home` | Primary launcher / desktop shell | APK `com.nodus.home` |
| `nodus-fleet` | Multi-device mesh engine | APK `com.nodus.fleet` |
| `nodus-assistive` | System-wide overlay touch | APK `com.nodus.assistive` |
| `nodus-desktop` | Windows HUD / fleet bridge | Tauri v2 desktop app `com.nodus.desktop` |
| `nodus-common` | Shared types + IPC contract | npm workspace lib (`@nodus/common`) |
| `nodus-legacy` | Archived monolith | Reference/archive only |

The most notable engineering choices observed:

- **Web-tech frontends everywhere.** All UI is React 19 + TypeScript + Tailwind CSS built with Vite, served inside Android `WebView`s (via `WebViewAssetLoader`) or Tauri's webview.
- **Native bridges for everything the web cannot do.** Kotlin `NodusNativeBridge` (JavaScript interface) exposes app launching, windowing (HyperOS/MIUI freeform), calendar, clipboard, notifications, and accessibility. Rust exposes Win32 input simulation, media keys, process control, and a local HTTP API.
- **A curated "single source of truth" IPC contract** (`nodus-common/src/ipc/contract.ts`) manually mirrored into Kotlin (`NodusIpcContract.kt`) — package names, ContentProvider authorities, broadcast actions, and permission names.
- **A LAN mesh protocol with graceful degradation**: UDP beacon discovery (port `8765`) + HTTP REST control plane (port `9120`), with in-browser "mock mode" fallbacks for frontend development.

The codebase is in a **pre-release / post-fix state**: the README explicitly flags ongoing end-to-end testing, and Git history shows an extensive audit remediation pass (TypeScript OOM fixes, endpoint harmonization, artifact pruning) leading up to `v1.1.0`.

---

## 2. Product Identity

### 2.1 Elevator Pitch
> **"Cross-Platform Distributed Command Plane & Multi-Device Control Mesh"** — a launcher/desktop shell for tablets that turns a small personal fleet of devices (tablet + PCs + phones) into one unified, always-available control surface.

### 2.2 Primary Reference Hardware
- **POCO Pad** — 12.1" 120Hz, HyperOS / Android 14 (the constant hardware anchor in code: `FleetDaemonService` hardcodes a local device id of `poco-pad`, and discovery fallbacks assume a "POCO Pad" beacon).
- **Windows 11 workstations** — via the Tauri companion; device color constants reference a `main-pc` (Windows 11) and a `tab-pc` (Windows touch) node.
- A legacy **Samsung tablet** node (`sm-t230nu`) appears in the shared `DEVICE_COLORS` table as the original host controller — evidence the ecosystem grew out of an earlier device setup.

### 2.3 Branding & Distribution
- Author: **EntropyRedux**; MIT license (`© 2026`).
- Naming convention: *Nodus* modules all prefixed `nodus-`, Android packages all `com.nodus.*`, authority/permission namespace `com.nodus.*`.
- Single GitHub Actions workflow currently builds and uploads only the **Nodus Home APK** (a second workflow, `build-agent-binaries.yml`, exists in commit history but is deleted in the working tree).
---

## 3. Goals & Vision

### 3.1 Stated Goals (from `README.md` and package metadata)
1. **Cross-device launcher & desktop ecosystem** "engineered for Android tablets, Windows companion bridges, and multi-device workstation setups."
2. **Modular multi-APK architecture** — "All Nodus subsystem modules live inside this unified workspace repository under `packages/`."
3. **Zero/negligible background cost** — the desktop bridge aims for "~15 MB RAM" and the "Join Call" flow promises "0 background process drain."
4. **Agenda & live calendar as first-class launcher features** — two-way notes/agenda with offline caching, Google Calendar sync, chronological meeting pills, and 1-tap "Join Call" bridging to Google Meet / Zoom.
5. **Hardware-neutrality** through a documented HTTP/UDP wire contract so Android, Windows, and future nodes interop.
6. **Zero-trust-ish pairing** ("Security & Zero-Trust Pairing" section) via signature permissions, bearer-token handshakes, and sanitized CORS.

### 3.2 Inferred / Observed Goals (from code, Git history, and commit messages)

| Goal | Evidence |
|---|---|
| **Make the tablet feel like a real desktop OS** | `DesktopLauncherShell`, taskbar, desktop windows, multi-window manager (Tier 1 Web/PWA windows + Tier 2 Shizuku freeform hook), floating app windows via HyperOS freeform intents, hardware back handling, immersive fullscreen. |
| **One launcher surface for many machines** | Fleet mesh provides remote app launch, process kill, system lock, media control, remote shortcuts/executables shown in the launcher drawer (`showRemoteAppsInMainDrawer`, `RemoteShortcutsService`, `FleetDirectClient`). |
| **Universal clipboard across devices** | `ClipboardSyncService` (Android) + Win32 clipboard commands (Rust); text *and* image clipboard sync with dedup, FileProvider-based pasting, pinning, history limits. |
| **Disambiguation from a monolith to modules** | Git history: `2ec784b`/`d5f70a6` "restructure Nodus ecosystem into modular monorepo"; both Home and Fleet embed the `NodusModuleDetector` to know which modules are installed and adapt the UI. |
| **Zero-config LAN pairing with graceful fallback** | UDP broadcast beacons with hardcoded fallbacks everywhere (`POCO Pad`, default ports, mock desktop stats in the frontend when not running under Tauri). |
| **Assistant-style "control plane" ambition** | Naming ("distributed command plane"), remote executable catalog with categories (`tools/productivity/games/media/...`), hot-key decks, remote deck panel, watched shortcut folders on Windows. |
| **Developer velocity via pure-web frontends** | Single React component model reused across Home/Fleet/Desktop; mock-data mode in-browser; Vite dev servers on `3000/3001/3002`; CI builds the web bundle and bakes it into the APK assets. |

### 3.3 Vision Statement (reconstructed)
> *Nodus envisions a personal mesh where a single shared launcher — the family's or power user's Android tablet — becomes the command surface for every other device they own: launching, controlling, monitoring, and synchronizing Windows PCs, phones, and other tablets over the local network, with authentication and trust handled at the APK-signature level.*

---

## 4. Core Principles

The following principles are **observed from code**, not stated in docs:

1. **Modular APK ecosystem over monolith.** Every capability that can ship separately does: launcher, mesh engine, overlay. A single shared `@nodus/common` library keeps them consistent.
2. **Single source of truth for cross-APK contracts.** `contract.ts` literally documents itself as THE single source of truth ("This file is the SINGLE SOURCE OF TRUTH for ContentProviders & Broadcasts"), with a Kotlin mirror (`NodusIpcContract.kt`) that must be kept in sync.
3. **The web cannot do everything; bridge it, don't reimplement it.** WebView JS ↔ Kotlin `@JavascriptInterface` bridges (`NodusNativeBridge`), and Tauri invoke ↔ Rust commands, are the two sanctioned native boundaries.
4. **Be polite to the OS.** Foreground services are `dataSync`/`SPECIAL_USE` with low-priority notifications; telemetry polls every 4–5s; hot corners poll at ~60Hz but with tiny 8px hotspots and 150ms dwell; the desktop bridge claims ~15MB RAM.
5. **Every feature must degrade gracefully.** Frontends ship with browser-mock data (fake processes/system stats, local-only state) so UI can be developed without hardware; discovery falls back to wildcard ports; the launcher can run standalone (monolith mode) when no other module is installed.
6. **Local-first data.** Launcher settings, notes, app grids, and themes are persisted in `localStorage`/SharedPreferences (notes key `nodus_notes`), with cloud/calendar sync layered on top — the launcher stays usable offline.
7. **Tablet-first, desktop-second, everything-else-later.** The POCO Pad is the constant: default colors, local device identity, resolution-aware floating-window bounds, HyperOS-specific freeform intents.
---

## 5. Architecture

### 5.1 Repository Layout

```
project-nodus/
├── package.json                       # Root npm workspace ("project-nodus-workspace" v1.1.1)
├── README.md                          # Positioning + build/test/security docs
├── .github/workflows/build-apk.yml    # CI: builds Nodus Home APK on push to main
├── .cargo/config.toml                 # Rust build env: 64MB min stack, 32MB link stack
│
├── packages/
│   ├── nodus-common/                  # @nodus/common — shared foundation (lib)
│   │   ├── src/ipc/contract.ts        #   ★ IPC contract single source of truth
│   │   ├── src/kotlin/NodusIpcContract.kt     # Kotlin mirror (copied into each APK)
│   │   ├── src/kotlin/NodusModuleDetector.kt  # com.nodus.* package detection
│   │   ├── src/types/{device,clipboard,app,network,settings}.ts
│   │   └── src/utils/{constants,iconRegistry}.ts
│   │
│   ├── nodus-home/                    # Primary Launcher APK — com.nodus.home
│   │   ├── src/                       # React 19 + TS + Tailwind (Vite)
│   │   │   ├── context/               # LauncherProvider = SystemSettings+Fleet+AppGrid+Clipboard+Notes
│   │   │   ├── components/            # home/, desktop/, apps/ (Settings, Notes), common/
│   │   │   ├── services/              # FleetDirectClient, RemoteShortcutsService
│   │   │   └── utils/                 # bridgeProtocol, macroEngine, themes, noteTheme...
│   │   └── android-shell/             # Kotlin shell + Gradle
│   │       └── app/src/main/java/com/nodus/home/
│   │           ├── HomeActivity.kt            # WebView + NodusNativeBridge + calendar/clipboard/windowing
│   │           ├── provider/HomeSettingsProvider.kt
│   │           ├── receiver/FleetStateReceiver.kt
│   │           └── service/{NodusAccessibilityService, NodusNotificationListenerService}.kt
│   │
│   ├── nodus-fleet/                   # Multi-Device Mesh APK — com.nodus.fleet
│   │   ├── src/                       # Fleet Dashboard web UI (React + TS + Tailwind)
│   │   └── android-shell/app/src/main/java/com/nodus/fleet/
│   │       ├── FleetActivity.kt
│   │       ├── net/{UdpDiscoveryManager, HttpRpcClient}.kt
│   │       ├── provider/FleetDataProvider.kt   # content://com.nodus.fleet.provider
│   │       └── service/{FleetDaemonService, ClipboardSyncService}.kt
│   │
│   ├── nodus-assistive/               # System-Wide Overlay APK — com.nodus.assistive
│   │   └── android-shell/app/src/main/java/com/nodus/assistive/
│   │       ├── PermissionActivity.kt
│   │       ├── receiver/FleetStateReceiver.kt
│   │       └── service/AssistiveTouchService.kt  # floating squircle + overlay WebView
│   │
│   ├── nodus-desktop/                 # Windows Companion (Tauri v2 + Rust) — com.nodus.desktop
│   │   ├── src/                       # React HUD: Fleet Panel, Clipboard, Process Manager,
│   │   │                             #   RemoteDeck, Shortcuts, Ambient Taskbar, Hot-Corner config
│   │   └── src-tauri/src/
│   │       ├── lib.rs                 # Window + tray + hot-corner thread + server + discovery boot
│   │       ├── server/mod.rs          # tiny_http REST API on :9120 (routes in §6)
│   │       ├── discovery/mod.rs       # UDP beacons on :8765 + registered-node map
│   │       ├── hotcorners/mod.rs      # 60Hz Win32 cursor poll, 8px corners, 150ms dwell
│   │       └── commands/              # process, system, media, clipboard, exec, input, shortcuts, icon
│   │
│   └── nodus-legacy/                  # Original monolith launcher archive (com.nodus.launcher)
│       └── src/                       # Kept as reference: DesktopWindows, Dock, overlays, macroEngine,
│                                      #   bridgeProtocol, platformSnippets (not built by CI)
│
└── remix-remix-remix-nodus-home-1_1-replica-2.1/
    └── active-sync/                   # Untracked local scratch replica of nodus-home (see §11)
```

### 5.2 The Three Software Tiers

1. **React/TypeScript UI tier** — components, contexts, services. Runs inside Android WebView (asset loader, `https://appassets.androidplatform.net`) or Tauri webview. Web code never talks to the mesh directly; it always goes through `NodusNativeBridge` (Android) or Tauri `invoke`/HTTP (desktop).
2. **Native bridge tier** — Kotlin `NodusNativeBridge` (exposed via `@JavascriptInterface`; methods like `launchApp`, `bringAppToFront`, `minimizeApp`, `getCalendarEvents`, `getNotificationBadges`, clipboard read/write, package detection, accessibility toggles) and Rust Tauri commands (Win32 input, clipboard, media, process, system stats, shortcuts).
3. **Mesh + OS tier** — Kotlin foreground services (Fleet daemon, clipboard sync, assistive service, accessibility & notification listeners) and the Rust HTTP/UDP bridge listening on the LAN.
### 5.3 Why the Bridge Pattern Dominates

Nothing in the WebView has direct Android API access. Everything significant is funneled through **`NodusNativeBridge`**. Home's `HomeActivity.kt` (~1,380 lines) is effectively a *launcher OS kernel in Kotlin*:

- **Windowing:** launching apps fullscreen or HyperOS-freeform floating windows (with explicit MIUI intents like `miui.intent.action.FREEFORM_MINIMIZE`, windowing-mode bundles, launch bounds); desktop "Tier 1 Web/PWA windows" in React + "Tier 2 Shizuku freeform hook."
- **Calendar:** reads `CalendarContract.Instances`, extracts Meet/Zoom/Teams links from event text, computes "In Xm" / "LIVE" status, invokes `AlarmClock` for the next alarm.
- **Notifications:** `NodusNotificationListenerService` feeds badges + notification JSON to the WebView via custom DOM events (`android-notification-badges-updated`, `nodus-notifications-changed`).
- **Clipboard:** native `ClipboardManager` primary-clip listener dispatches to WebView (`__nodusOnNativeClipboardChange`) and clipboard changes flow back through the bridge.
- **Lifecycle:** `onResume` re-registers receivers, `applyImmersiveFullscreen()`, dispatches clipboard, rebinds the notification listener; hardware back is forwarded as a DOM `CustomEvent`.

### 5.4 Cross-APK IPC (the contract)

Defined once in `contract.ts`, mirrored in Kotlin; both shipped into Home, Fleet, and Assistive APKs:

- **ContentProviders** — `content://com.nodus.fleet.provider/` (`devices`, `clipboard`, `config`) and `content://com.nodus.home.provider/` (`settings`, `running-apps`). All guarded by signature permission `com.nodus.permission.FLEET_ACCESS`.
- **Broadcasts** — `com.nodus.fleet.STATE_CHANGED`, `CLIPBOARD_CHANGED`, `DEVICE_CONNECTED`, `DEVICE_DISCONNECTED`, `com.nodus.home.SETTINGS_CHANGED`, `TOGGLE_TASKBAR`, with extras `device_json`, `clipboard_text`, `clipboard_item_json`, `settings_json`.
- **Module detection** — `NodusModuleDetector`/`detectModules()` checks which `com.nodus.*` packages exist (fallback = monolith mode).
- Because broadcasts are `signature`-protected, all Nodus APKs **must be signed with the same keystore** (the repo provides `generate-keystore.bat` + `keystore.properties.example` scaffolds).

### 5.5 Key Data Models (nodus-common)

- `DeviceInfo` (id, type `tablet|desktop|phone|laptop`, os, status, ipAddress, resolution, port, battery, cpuLoad, ramUsage…), `DeviceProcess` (pid, cpu/memory, category).
- `LauncherSettings` — a rich settings envelope incl. `NetworkServerConfig`, `WindowsBridgeConfig`, `AndroidBridgeConfig`, `ClipboardSyncConfig`, `TrustedDevice[]`, `RemoteExecutable[]`; UI subset `ThemeSettings` synced to Assistive.
- `RemoteExecutable` — the mesh app-launch catalog (execType: `native_app|command|url_protocol|script|intent`).
- `ClipboardItem` — cross-device clipboard entries with device attribution + pinning.
- `iconRegistry` — a curated, tree-shakeable Lucide registry with a normalized resolver (`Settings` ⇄ `settings` ⇄ `settings-2`) — deliberately avoiding wildcard icon imports (heap/OOM-related fix).

### 5.6 Technology Stack Snapshot

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript ~5.8, TailwindCSS v4 (@tailwindcss/vite), Vite 6/7, `motion`, `lucide-react`, `@google/genai` (home notes AI hook), Vitest + Testing Library |
| Android shell | Kotlin, Gradle, AndroidX WebKit (`WebViewAssetLoader`), AppCompat, compiled debug APKs |
| Desktop | Tauri v2, Rust (`windows` crate Win32 API), `tiny_http` embedded server, `serde`/`serde_json` |
| Network | HTTP/JSON (REST), UDP JSON beacons, localhost mock fallbacks |
| CI | GitHub Actions (Ubuntu, JDK 17, Node 20, Gradle) |
| Storage | `localStorage` (web tier), Android SharedPreferences/ContentProviders, Rust config file for shared shortcuts |
| Package mgmt | npm workspaces, `file:../nodus-common` local deps, Cargo workspace per desktop package |
8. **Defense via platform security where possible.** Signature-scoped permissions (`FLEET_ACCESS`), package-visibility queries, and OS-level clipboard/accessibility controls are the primary trust anchors; network-layer security is secondary and lighter-weight (see §8).
---

## 6. Wire Protocols & Data Flow

> All mesh communication is plain LAN JSON — no mTLS, no WSS, no encryption layer observed. See §8 for implications.

### 6.1 Ports & Defaults (single source: `nodus-common/src/utils/constants.ts` + Rust)

| Port | Protocol | Role |
|---|---|---|
| `9120` | TCP/HTTP | Nodus Desktop control-plane REST API (`tiny_http`), fallback `8080` |
| `8765` | UDP | Nodus discovery beacons / probes (Android + Rust); broadcast targets also include `:8080` |
| `3000/3001/3002` | HTTP | Vite dev servers: home / fleet / assistive |
| `1420` | HTTP | Tauri dev server (`tauri.conf.json`) |

### 6.2 UDP Discovery (beacon protocol)

- **Beacon payload** (`NODUS_DISCOVER_REQ` / `NODUS_BEACON`): `{ type, client, version, name, deviceType, os, port/httpPort, battery?, cpuLoad? }`.
- **Response** (`NODUS_DISCOVER_RESP`): hostname, role, deviceType, os, status, port, battery (100), cpuLoad, ramUsage.
- Desktop broadcasts every **4s** to `255.255.255.255:8765` and `:8080`; Android broadcasts every **5s** (plus a legacy `PCCONTROL_MASTER`/`PCControlSuite` probe for the older Windows companion).
- Offline detection: Rust marks nodes `offline` after **45s** without a beacon; Android daemon expires devices after **30s**. Device IDs derived from sender IP (`node-1-2-3-4`).

### 6.3 Desktop REST API (port 9120)

| Route | Method | Purpose |
|---|---|---|
| `/api/status` \| `/api/health` \| `/` | GET | Health/pairing status (public) |
| `/api/stats` \| `/api/telemetry` | GET | System stats (CPU/RAM/hostname/uptime) |
| `/api/processes` | GET | Process list |
| `/api/process/kill` | POST | Kill process by pid |
| `/api/exec` | POST | Execute command / shortcut (with workingDir, runAsAdmin) |
| `/api/lock` | POST | Lock workstation (`rundll32 user32.dll,LockWorkStation`) |
| `/api/system/control` | POST | Lock / sleep / restart / shutdown |
| `/api/media` | POST | Media AppCommand abstraction (play/pause/next/…) |
| `/api/clipboard` | GET/POST | Read / write universal clipboard (text + image base64) |
| `/api/shortcuts` \| `/api/apps` | GET | Shared shortcut catalog |
| `/api/shortcuts/installed` | GET | Installed Windows apps |
| `/api/shortcuts/scan` \| `folder` | POST | Scan a shortcut folder |
| `/api/shortcuts/icon` | POST | Extract `.exe` icon → base64 |
| `/api/shortcuts/watched` | GET | Watched folders + shortcuts |
| `/api/shortcuts/watched/add` | POST | Add watched folder |
| `/api/shortcuts/sync` | POST | Update shared shortcut set |
| `/api/fleet/devices` \| `/api/fleet/peers` | GET | Registered mesh nodes (public) |
| `/api/fleet/pair-request` \| `/api/fleet/register` | POST | Pairing / node registration |

- Body cap **64KB** (128KB for clipboard POST) protects the single-threaded `tiny_http` server.
- CORS echoes only `tauri://…`, `http://localhost`, `http://127.0.0.1`, or `https://appassets.androidplatform.net`; unknown origins fall back to the Android asset origin.

### 6.4 Representative Data Flows

**A. Device discovery (tablet → desktop):**
Fleet daemon broadcasts UDP beacon → Rust listener replies with `NODUS_DISCOVER_RESP` → daemon stores node in map → `FleetDataProvider` exposes it → Home/Fleet WebView reads via `NodusNativeBridge.getDevices()` / ContentProvider.

**B. Remote app launch (tablet → Windows):**
Launcher "exec" intent → Fleet `HttpRpcClient.executeShortcut(ip, 9120, …)` → Rust `/api/exec` → `execute_shortcut` resolves command or runs shell → 200 `{ status: success }`.

**C. Remote process kill / lock / media:** same shape via `/api/process/kill`, `/api/lock`, `/api/media` → Win32 APIs (`TerminateProcess`, `rundll32`, media AppCommand keys).

**D. Universal clipboard:**
Kotlin primary-clip listener → `ClipboardSyncService.addAndSync` → POST `/api/clipboard` to each peer → Rust `set_win32_clipboard[_image]` → broadcasts `CLIPBOARD_CHANGED` → other Android nodes re-query provider; WebView notified. Dedup by content hash.

**E. Theme/settings sync:** Home persists settings → `HomeSettingsProvider` (ContentProvider `settings`) → Assistive (or Fleet) queries with `FLEET_ACCESS` permission read via `ACTION_HOME_SETTINGS_CHANGED` broadcast.

---

## 7. Use Cases

### 7.1 The Flagship Scenario — "Tablet as a Desktop OS"
Replace the POCO Pad's stock HyperOS launcher with Nodus Home: app grid + dock + folders on a 4/5-column grid, immersive fullscreen, hardware-back navigation, widgets (dual timezone clock, at-a-glance, weather-light, notes), system theme/accent/icon-pack customization. This is the product's *baseline* — it works with a single APK installed.

### 7.2 Personal Mesh Command
With Nodus Fleet + Nodus Desktop agent on a Windows workstation, the tablet becomes a command plane:
- Launch Windows apps / executables / folder shortcuts from the launcher drawer (including "watched folders" auto-scanning).
- Kill runaway processes, view live CPU/RAM process table per device.
- Lock the workstation, control media (play/pause/next), dispatch system commands (sleep/restart/shutdown).
- Pair new devices via QR deep link (`nodus://pair`) or `pair-request` REST endpoints; per-device permission toggles (remoteExec, clipboardSync, processKill, powerControl).

### 7.3 Universal Clipboard
Copy on any device → paste on any device. Text, links, code, images; per-device color badges acknowledge the source; pin important entries; history retention limits from 1h to unlimited. This addresses a huge real tablet+PC workflow pain point.

### 7.4 Meeting / Agenda Hub
Notes app with offline `localStorage` persistence; calendar events surfaced from the device calendar via native bridge; the desktop-style top bar shows chronological "meeting pills" with `🔴 LIVE:` / `In Xm:` countdowns; 1-tap "Join Call" resolves Meet/Zoom/Teams links into native intents — with **no background process left behind**.

### 7.5 Ambient Desktop Overlay (Windows)
Tauri companion lives in the system tray (~15MB RAM target): hot-corner gestures (8px corner zones, 150ms dwell, 600ms cooldown, ~60Hz polling) slide in Fleet Panel / Clipboard History / Ambient Taskbar without stealing focus; sub-millisecond Win32 `SendInput` mouse/keyboard simulation powers a trackpad + hotkey deck.

### 7.6 Assistive Touch (system-wide)
A floating squircle bubble over any app (even full-screen games) summons: quick app launcher (fullscreen or MIUI floating window), taskbar toggle, clipboard access, device switcher — implemented as an Accessibility/Overlay service with a secondary WebView surface, spring-physics animation, idle dimming, and haptic feedback.

### 7.7 Multi-Android cluster (secondary nodes)
The same mesh works tablet↔tablet / tablet↔phone: UDP discovery, telemetry polling every 4s, remote shortcuts, and clipboard broadcast between Android peers without a PC.

### 7.8 Developer / preview mode
Every UI is fully runnable in a browser (mock processes, mock system stats, fake devices) — used for rapid UI iteration and screenshots without hardware.
**F. In-browser dev collapses everything:** `TauriService.isTauri()` returns false in plain browsers → mock data + direct `fetch('http://localhost:9120/…')` fallback; `NodusNativeBridge` absent → monolith-mode detection. No hardware needed for UI work.
---

## 8. Security Model

### 8.1 What is well done
1. **Signature-level IPC permission.** `com.nodus.permission.FLEET_ACCESS` (`protectionLevel="signature"`) protects the Fleet and Home ContentProviders and all mesh broadcast receivers → only Nodus-ecosystem APKs signed by the same keystore can read device/clipboard/settings data or inject commands.
2. **Package-visibility hardening.** Android 11+ `<queries>` declarations are scoped to the Nodus packages — not a blanket visibility grant.
3. **Desktop API auth.** Loopback calls are trusted; all remote calls must present `Authorization: Bearer <token>` or `X-Nodus-Auth-Token`. Tokens are minted during pairing and compared against a persistent allow-list (`TRUSTED_TOKENS`).
4. **Sanitized CORS.** Origin whitelist + echo-capability prevents browser-origin attacks from arbitrary websites reaching the desktop API.
5. **Body-size caps, JSON validation, and server-thread safety** guard the embedded HTTP server against trivial DoS/malformed payloads.
6. **Minimal sensitive-permission surface.** `READ_CALENDAR` only in Home; network/wifi/foreground-service only in Fleet; overlay/accessibility only in Assistive — good module-permission segregation.
7. **Optional per-device permission matrix** (`TrustedDevice.permissions`) lets the user decide what a peer may *actually do* (exec vs kill vs power vs clipboard).

### 8.2 What deserves attention (observations, not findings of abuse)
1. **Cleartext HTTP on the LAN.** All mesh traffic is plaintext JSON (no TLS layer observed). On normal home Wi-Fi this is a real (if small) confidentiality gap — clipboard contents, running-process names, and passwords copied to clipboard travel unencrypted.
2. **Hardcoded default tokens.** `"NODUS-FLEET-SECURE"`, `"nodus-fleet-token"`, `"nodus-sec-key"` are compiled into the Rust binary and used as the pairing secret fallback in several configs (`pairingSecret: 'NODUS-FLEET-SECURE'` in fleet default config). Any LAN scanner that finds an unpatched Nodus Desktop can use these defaults.
3. **UDP beacons reveal device metadata** (hostnames, OS types, IPs) and are spoofable — node identity is the sender IP only.
4. **`usesCleartextTraffic="true"`** on both Android manifests is required by the current design (LAN HTTP), but paired with §8.1(1) it's acceptable only because LAN is assumed trusted.
5. **`QUERY_ALL_PACKAGES`** + `REQUEST_DELETE_PACKAGES` in Home: justified for a launcher, but Play-Store-reviewable; fine for sideloaded personal use.
6. **QR pairing provisioned via deep link** (`nodus://pair`) had HMAC mentioned in the README structure (intent filter exists), but pairing flow details were not fully traced in this static pass.

---

## 9. Build, Test & CI

### 9.1 Build Toolchain
- **Web tier:** `vite build` per package; `npm run sync:assets` (PowerShell) copies `dist/` into `android-shell/app/src/main/assets/frontend/` so the WebView serves them via `WebViewAssetLoader`.
- **Android tier:** Gradle `assembleDebug`, JDK 17, single shared keystore requirement; `generate-keystore.bat` scaffolds signing (`keystore.properties` is gitignored).
- **Desktop tier:** Tauri v2 `tauri build`; Rust handled with a raised stack (`RUST_MIN_STACK=64MB`, `/STACK:33554432`, `CARGO_BUILD_JOBS=1` — evidently tuned to avoid stack-overflow/heap issues in the Win32 enumeration code).
- Root `npm run build:all` runs workspaces; `npm run test` runs Vitest (common + home) then `cargo test` for the Tauri crate.

### 9.2 Existing Tests
- Vitest: icon registry resolver test; Home context tests (`AppGridContext`, `ClipboardContext`, `LauncherContext`).
- Rust: CORS-origin matching test in `server/mod.rs`.
- Rust samples of failed test runs are committed locally in `.cargo/cargo-test.log` / `test-output.txt` (gitignored).

### 9.3 CI/CD
`.github/workflows/build-apk.yml` (on push to `main` + manual dispatch): Node 20 → `npm ci` → build home web bundle → bake into assets → Gradle `assembleDebug` → upload APK artifact.
- **Observed gaps:** no automated tests in CI; no unsigned debug signing step (fine for PR artifacts); only the **Home** APK is built — Fleet/Assistive/Desktop have no CI pipeline; the second workflow (`build-agent-binaries.yml`) is deleted in the working tree.

### 9.4 Repo State (working tree, as analyzed)
- 402 files tracked (295 source/config), plus build artifacts; `node_modules` and Gradle outputs are properly gitignored.
- Working tree **not clean**: ~18 modified files (desktop Rust + Tauri commands/config, fleet `HttpRpcClient.kt`, home frontend assets, root `package.json`), 1 deleted workflow, ~7 deleted asset files. Uncommitted work is mid-flight.
- `.gitignore` intentionally excludes scratch/replica dirs (`remix-*`, `*replica*`), reports (`*_REPORT.md`, `*_STATUS.md`, `*_STRATEGY.md`), PNGs/JPGs, and Windows shortcuts (`*.lnk`, `shortcuts/`).
- Git history is active and well-formed: conventional commits (`feat/fix/docs/chore`), ~30 recent commits, feature-pair commits (feature + test + fix), disciplined deletion of obsolete artifacts.
**Net posture:** *security by APK signature + network convenience*, appropriate for a personal/home LAN tool, insufficient if Nodus ever ships to untrusted networks or multi-tenant spaces without adding TLS and ephemeral rotating tokens.
---

## 10. Strengths

1. **Coherent product vision, executed end-to-end.** Launcher + mesh + overlay + Windows companion is a rare portfolio; each layer is implemented, wired, and demo-able (mock-mode included).
2. **Excellent contract discipline.** A single IPC contract, mirrored carefully in TS and Kotlin, with module detection — the right antidote to the inevitable multi-APK drift.
3. **Consistent technology choices.** React+TS+Tailwind everywhere, Vite everywhere, Kotlin for Android, Rust for the desktop backend, JSON everywhere. Lower cognitive load for one maintainer.
4. **Graceful degradation as a feature.** Browser-mock mode, monolith fallback, wildcard ports, offline localStorage — the product works partially even when the mesh isn't there.
5. **Thoughtful system-janitor behavior.** Low-priority foreground notifications, poll intervals measured in seconds, hot-corner dwell/cooldown tuning, RAM targets — the mesh respects the battery and desktop resources.
6. **Platform-specific deep knowledge** (HyperOS freeform intents, MIUI windowing extras, `WebViewAssetLoader`, Win32 `SendInput`/`GetCursorPos`, `tiny_http`) is applied pragmatically and comments explain *why*.
7. **Good separation of native boundaries** — no JS→native sprawl; everything goes through one bridge per platform, keeping the web tier portable.
8. **Repo hygiene trajectory.** Turn of events in git history show deliberate cleanup (deleting scratch replicas, reports, build artifacts, `.aistudio`).

---

## 11. Risks & Concerns

| # | Risk | Severity | Rationale |
|---|---|---|---|
| R1 | **Cleartext mesh traffic** (clipboard, passwords, exec payloads) | Medium | Any LAN snooper sees clipboard + commands. Acceptable for home, not for untrusted networks. |
| R2 | **Hardcoded/complied-in default auth tokens** | Medium | Trivial guess for any LAN actor; defenses rely on segmentation. |
| R3 | **No CI for Fleet/Assistive/Desktop** | Medium | Regression in mesh/desktop ships untested; only Home APK is built. |
| R4 | **Single-keystore fragility** | Medium | Losing the keystore bricks the whole signed ecosystem; managing it is manual (`generate-keystore.bat`). |
| R5 | **Kotlin mirror drift** | Low-Medium | `NodusIpcContract.kt` is hand-copied into 3 APKs; future contract changes can silently desync. |
| R6 | **Gateway processes assume single user** | Low | `FleetDaemonService.registerLocalDevice()` hardcodes `poco-pad`/`127.0.0.1`; node identity is IP-only; multi-node same-tablet edge cases. |
| R7 | **Embedded HTTP server robustness** | Low-Medium | Single-threaded `tiny_http` under concurrent tablet polling; caps mitigate but latency can spike. |
| R8 | **Repo scratch residue** | Low | Untracked `remix-*replica-2.1/` + `.aistudio/` + local `hs_err_pid*.log` files bloat the working tree on disk (not tracked). |
| R9 | **Android version surface** | Low | Code targets HyperOS/Android 14 specifics with assumptions (freeform intents, multicast lock limits on some OEMs). |
| R10 | **Unmerged working tree** | Info | ~18 modified files are mid-flight; analysis reflects those latest (uncommitted) states, README may lag code. |

---

## 12. Recommendations

Non-exhaustive, ordered by impact/effort:

1. **Tighten the mesh security posture (R1, R2).**
   - Add ephemeral per-pair tokens (random 32-byte secrets shipped out-of-band via QR/deep link), rotate on reconnect.
   - Remove compiled-in default tokens or gate them behind first-run provisioning.
   - At minimum, document clearly: "Nodus mesh is trusted-LAN only."
2. **Add CI coverage for the other modules (R3).** Extend the workflow to build Fleet & Assistive APKs and `cargo test` under `nodus-desktop`; add a step that runs Vitest so regressions block merges.
3. **Automate contract mirror sync (R5).** Generate `NodusIpcContract.kt` from `contract.ts` in the build step (or add a CI check that diffs the two), removing the hand-copy failure mode.
4. **Introduce a hardware-in-the-loop smoke harness.** A scripted ADB test matrix: discovery → pair → exec → kill → clipboard round-trip → lock; run it before each release (README already flags end-to-end testing as in-progress).
5. **Harden the desktop server.** Move to an async HTTP runtime (e.g., `axum`/`tokio`) when concurrency matters; add per-IP rate limiting; keep the 64KB cap.
6. **Repair repo drift.** Commit or revert the pending working-tree changes; re-add or intentionally delete `build-agent-binaries.yml`; keep scratch replicas out of the workspace (`.gitignore` already handles it).
7. **Document the wire contract.** Promote §6 into `docs/protocol.md` (beacon schema, REST routes, auth) so third-party nodes (Linux, macOS, future phones) can join deterministically.
8. **Small hardening pass:**
   - Centralize the device-identity string (`poco-pad`) into the shared constants instead of hardcoding in the daemon.
   - Validate beacon `name`/`httpPort` inputs (length caps) before inserting into the map.
   - Resurrect RBAC enforcement from `TrustedDevice.permissions` server-side (currently mostly a config).

## 13. Appendix

### 13.1 Key Files Index

| File | Why it matters |
|---|---|
| `packages/nodus-common/src/ipc/contract.ts` | Single source of truth for all cross-APK communication |
| `packages/nodus-common/src/kotlin/NodusIpcContract.kt` | Kotlin mirror (must stay in sync) |
| `packages/nodus-home/android-shell/.../HomeActivity.kt` | Launcher OS kernel: bridge, calendar, windowing, clipboard |
| `packages/nodus-fleet/android-shell/.../FleetDaemonService.kt` | Mesh engine: telemetry, discovery, RPC gateway |
| `packages/nodus-fleet/android-shell/.../FleetDataProvider.kt` | Cross-APK data export + RPC entry points |
| `packages/nodus-desktop/src-tauri/src/server/mod.rs` | Desktop REST control plane (port 9120) |
| `packages/nodus-desktop/src-tauri/src/discovery/mod.rs` | UDP beacon engine (port 8765) |
| `packages/nodus-desktop/src-tauri/src/hotcorners/mod.rs` | Win32 cursor gesture engine |
| `packages/nodus-assistive/android-shell/.../AssistiveTouchService.kt` | System-wide floating overlay |
| `.github/workflows/build-apk.yml` | The only CI pipeline |
| `.cargo/config.toml`, `packages/nodus-desktop/src-tauri/.cargo/config.toml` | Rust stack sizing workarounds |

### 13.2 Port / Constant Reference

| Constant | Value | Where |
|---|---|---|
| `HTTP_PORT` | 9120 | `nodus-common/utils/constants.ts`, Rust server |
| `DISCOVERY_PORT` | 8765 | Rust discovery + Kotlin `UdpDiscoveryManager` |
| `BEACON_INTERVAL_MS` | 5000 (Android), 4s (Rust) | `UdpDiscoveryManager`, `discovery/mod.rs` |
| Telemetry poll / device timeout | 4000ms / 30000ms | `FleetDaemonService` |
| Offline threshold (desktop) | 45s | `discovery/mod.rs` |
| Auth header | `X-Nodus-Auth-Token` | `constants.ts`, Rust CORS heads |
| Signature permission | `com.nodus.permission.FLEET_ACCESS` | All manifests + contract |
| Home / Fleet / Assistive packages | `com.nodus.home` / `.fleet` / `.assistive` | Contract + manifests |
| App icon registry | 100+ curated Lucide icons | `iconRegistry.ts` |

### 13.3 Git History Highlights (most recent 30)

- `9b5b114` Multi-window: Tier 1 Web/PWA windows + Tier 2 Shizuku freeform hook (HEAD)
- `826ba5e` `v1.1.0` — calendar sync, dual clock widgets, audit remediations, type fixes
- `d5f70a6` Restructure ecosystem into modular monorepo + Nodus Desktop companion
- `b4f0a25` Standalone floating Taskbar overlay over full-screen apps
- `9451237` Native Floating Assistive Circle service over full screen apps
- Then the audit trail: heap/OOM fixes, port cleanup, artifact pruning, `.gitignore` hardening.

### 13.4 Authoring Notes & Limitations

- **This is a static analysis.** No devices were flashed; runtime behavior (RAM claims, latency claims, freeform behavior on HyperOS) is reported as *claimed by the project*, not verified here.
- All claims in §11–§12 are observations/recommendations, not security findings with CVE-style proof.
- The working tree had uncommitted modifications at analysis time; the document reflects the on-disk state as of 2026-08-31.
- Doc filename intentionally chosen to avoid `.gitignore` patterns (`*_REPORT.md`, `*_STATUS.md`, `*_STRATEGY.md`) so it can be committed if desired.

---

*End of analysis.*