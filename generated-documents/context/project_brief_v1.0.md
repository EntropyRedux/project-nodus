PROJECT BRIEF
Version: v1.0
Last Updated: 2026-10-11
Status: [x] Draft  [ ] Audited  [ ] Approved

━━━ VISION ━━━
What this app is:
  Project Nodus is a cross-platform distributed command plane: an Android
  launcher / desktop shell ("Nodus Home") paired with a standalone LAN mesh
  controller ("Nodus Fleet") and a Windows companion bridge ("Nodus Desktop").
  Together they form a single workspace where tablets, phones and PCs discover
  each other on the LAN, share a universal clipboard, launch and control
  applications/files across devices, run remote terminals, and emulate mouse /
  input on a peer device.

What problem it solves:
  Android tablets are powerful but ship with phone-oriented launchers and no
  first-class multi-device workflow. Nodus turns a tablet into a desktop-class
  workstation shell that cooperates with the user's PCs over the local network,
  without cloud dependency.

Who it is for:
  Power users, developers and tinkerers who run an Android tablet (or foldable)
  alongside Windows workstations and want unified control, clipboard and launch
  across those devices on a trusted LAN. OEM environments specifically targeted:
  Xiaomi HyperOS, Samsung One UI, Lenovo ZUI.

━━━ PLATFORM & RUNTIME CONTEXT ━━━
Target Platform(s): Android 10–14+ (tablets, foldables), Windows 10/11. Web build (Vite) is a development/preview target only.
Production Tech Stack:
  - Frontend (all three apps): React 19 + TypeScript + Vite, Tailwind CSS v4.
  - Nodus Desktop state: Zustand stores. Nodus Home / Fleet state: React Context providers.
  - Nodus Desktop backend: Rust (Tauri v2) with tiny_http + portable-pty + windows crate.
  - Android shells: Kotlin WebView hosts (com.nodus.home, com.nodus.fleet), OkHttp, AccessibilityService, foreground services.
  - Shared contracts: @nodus/common (TypeScript, `packages/nodus-common/src/index.ts`).
UI Specification Tool: AI Studio (visual & behavioral reference only — never ported verbatim; quarantined under `*-replica*` / `*_uiux_prototype` which are gitignored).
Native Architecture Pattern:
  - React (Desktop):    Presenter (*View.tsx / *Tab.tsx) + Headless Store (use*Store.ts) + Container (DesktopAppShell.tsx)
  - React (Home/Fleet): Component presenters + Context providers (deviation: Contexts currently combine state + effects)
  - Android shell:      WebView host Activity + JS bridge (window.NodusNativeBridge) + Kotlin services
  - Desktop/Tauri:      Renderer Presenter (*View.tsx) + Native IPC Commands (src-tauri/src/commands/*.rs)

━━━ GOALS ━━━
Primary (must achieve):
  - Provide a production-viable Android desktop launcher shell with app grid, folders, dock, widgets, multi-window floating apps, taskbar, notes and search.
  - Establish trustworthy LAN discovery + pairing between Home / Fleet / Desktop with a shared clipboard and remote command plane.
  - Reliable Windows↔Android remote control: process monitor, remote launch/shortcuts, interactive terminal, media/power control, pointer emulation.
  - Keep a single canonical contract source (@nodus/common) mirrored across TS, Kotlin and Rust boundaries.

Secondary (nice to have):
  - Live low-latency screen mirroring into the remote-control tab.
  - Headless wireless ADB (Shizuku) bootstrap so uinput injection survives reboots without manual port 5555 setup.
  - Multi-monitor edge-boundary cursor traversal (auto-hop cursor from PC to tablet at screen edge).

━━━ EXPLICIT NON-GOALS ━━━
What this app will NOT do:
  - No cloud account, cloud sync or remote-internet control. The mesh is LAN-only by design.
  - No verbatim porting of AI Studio prototypes; prototypes are reference only.
  - No third-party app-store distribution pipeline (APKs are built locally / via CI release tags only).

What is explicitly out of scope:
  - iOS / macOS native shells (macOS appears only as a discovered peer type).
  - Bundling the Shizuku API is undecided (see Open Questions) and therefore currently out of scope.
  - Live screen mirroring transport choice is undecided; not yet implemented.

━━━ CORE FEATURES ━━━
Feature Group: A — Launcher & Desktop Shell (`nodus-home`)
  - Home app grid with pages, folders, app context menus, edit mode, minimal text mode.
  - Dock + smart app taskbar with drawer tabs, running/recent apps and badges.
  - Multi-window floating desktop (drag/resize/minimize) hosting in-shell apps + iframe PWA windows.
  - Widgets & telemetry rows (notes, calendar, remote-canvas, clock).
  - Universal search, quick-settings shade, dynamic icon packs, themes, wallpaper & opacity.
  - Notes app with rich editor, note themes and optional calendar sync.
  - Clipboard history panel + QR-based device pairing (`nodus://pair` deep link).
  - Device sidebar / process side panel + remote executables (requires Fleet).

Feature Group: B — Multi-Device Mesh & Remote Control (`nodus-fleet`)
  - LAN device discovery (UDP beacon + subnet scan) and bidirectional pairing.
  - Embedded Android HTTP command server (port 9120) with token auth.
  - Remote process monitoring & kill, remote launch of installed apps / shortcuts.
  - Interactive Android + ConPTY terminal bridge (xterm.js).
  - Remote media transport, volume, screen lock/wake, power control.
  - Dual mouse emulation: hardware overlay cursor + `/dev/uinput` kernel injection; virtual trackpad with 1:1 resolution mapping.
  - Accessibility-based gesture/back/home/recents dispatch; clipboard sync service.
  - Mesh topology visualizer and agent studio (agent studio currently unwired — see Known Issues).

Feature Group: C — Windows Companion & Hot Corners (`nodus-desktop`)
  - Tauri desktop HUD: tabs for processes, remote control, terminal, shortcuts, topology, settings, clipboard.
  - Win32 process enumeration/kill, hot-corner gestures, media control, system control.
  - HTTP bridge server (port 9120) + UDP discovery; ConPTY terminal streaming.
  - 3-tier shortcuts: local workstation apps, remote Android apps, shared launchpad pins.

Feature Group: D — Shared Contracts (`nodus-common`)
  - Canonical TypeScript interfaces: DeviceInfo, DeviceProcess, ClipboardItem, SystemStats, NetworkServerConfig, TerminalLine/Session, SharedApp, ScannedPeer, Pairing payloads.

━━━ BACKGROUND PROCESSES ━━━
[Every background process MUST have an independently controllable user-facing toggle, hidden by default behind an "Experimental Settings" / "Advanced" master toggle. Current implementation does NOT yet satisfy this — see gaps.]

- Process: Nodus Home notification badge sync
  Purpose: poll notification counts for launcher badges
  Toggle: [ ] planned (Settings -> Experimental)  [ ] implemented   (runs unconditionally, 2.5s)
- Process: Nodus Home fleet status poll
  Purpose: refresh paired device status/telemetry
  Toggle: [ ] planned  [ ] implemented   (~5s, unconditional)
- Process: Nodus Home clipboard sync poll
  Purpose: pull shared clipboard entries
  Toggle: [x] planned  [ ] implemented   (~4s, unconditional)
- Process: Nodus Home calendar sync
  Purpose: pull agenda/calendar events
  Toggle: [ ] planned  [x] partial (internal `isCalendarSyncEnabled` flag, interval always mounted)
- Process: Nodus Fleet HTTP command server (:9120)
  Purpose: receive remote commands
  Toggle: [x] planned  [x] partial (global daemon toggle, not under an Experimental master gate)
- Process: Nodus Fleet UDP discovery beacon (:8765)
  Purpose: advertise/presence on LAN
  Toggle: [ ] planned  [ ] implemented
- Process: Nodus Fleet telemetry poll loop (4s)
  Purpose: poll connected peers for stats
  Toggle: [ ] planned  [ ] implemented
- Process: Nodus Fleet clipboard watcher
  Purpose: broadcast clipboard changes
  Toggle: [x] planned  [x] partial (`toggleClipboardSync`, not Experimental-gated)
- Process: Nodus Fleet background state poll (3s) / peers sync (3s) / LAN count (5s)
  Purpose: fleet UI freshness
  Toggle: [ ] planned  [ ] implemented
- Process: Nodus Desktop hot-corner detector (~60Hz thread)
  Purpose: detect cursor at screen corners for gestures
  Toggle: [x] planned  [x] partial (Rust command exists, default OFF, but no UI toggle exposed in HotCornerConfigPanel)
- Process: Nodus Desktop watched-folders monitor (4s)
  Purpose: auto-import shortcuts from configured folders
  Toggle: [ ] planned  [ ] implemented (always-on)
- Process: Nodus Desktop process monitor poll (configurable)
  Purpose: enumerate processes
  Toggle: [x] planned  [x] implemented (isMonitoringEnabled + interval)
- Process: Nodus Desktop server + discovery + 5s fleet poll
  Purpose: host bridge server, discover peers
  Toggle: [x] planned  [x] partial (daemon toggle exists; frontend 5s poll ungated)

━━━ ERROR HANDLING, VALIDATION & USER NOTIFICATIONS ━━━
Form & Input Validation Standard: Partial — TS interfaces exist, but no runtime schema library (Zod/valibot) is used at IPC/HTTP boundaries. Some stores validate manually.
User Notification & Toast Strategy: Present but inconsistent — Home has `ToastNotification.tsx`; Desktop has a toast helper in AppSettingsPanel; Fleet uses inline status. Many async failures are silent.
Crash Resilience & Error Boundaries: Home wraps the app in a single ErrorBoundary (reload-on-crash). Desktop and Fleet have NO ErrorBoundaries. Known gap.
Silent-Failure Policy: Currently violated — pervasive `catch {}` / `catch (_) {}` in stores, services and containers. Target: zero silent failures.

━━━ TECH STACK DECISIONS ━━━
Frontend / UI Layer: React 19 + TypeScript + Vite 6/7 + Tailwind v4 + lucide-react + motion; xterm.js for terminals.
Backend / Native Runtime: Tauri v2 + Rust (`tiny_http`, `portable-pty`, `windows` 0.58) for the Windows companion; Kotlin + Android SDK WebView/foreground services for the two Android apps.
Database / Local Storage: SharedPreferences (Android), localStorage (webview shell), in-memory Zustand/Context. No SQL database.
Auth / Security Gateway: Shared-secret token (`X-Nodus-Auth-Token` / `Authorization: Bearer`), default literal `NODUS-FLEET-SECURE`; loopback bypass; LAN-only.
Hosting / Infrastructure: none (local LAN). GitHub repo `EntropyRedux/project-nodus`; CI builds APKs on `v*` tags.
Key Libraries / Dependencies: tauri, tiny_http, portable-pty, okhttp3, androidx.webkit, @xterm/xterm + addon-fit, zustand (desktop only).

━━━ CANONICAL DATA CONTRACTS ━━━
Canonical Data Shapes Location: `packages/nodus-common/src/index.ts` (single source of truth; referenced by all three apps). A mirror/spec at `generated-documents/context/contracts/data_shapes.ts` is NOT yet present.
Target Native Translation:
  - DeviceInfo        → Kotlin `NodusIpcContract.kt` mirror / Rust serde structs
  - DeviceProcess     → Kotlin data class / Rust struct
  - ClipboardItem     → Kotlin data class / Rust struct
  - NetworkServerConfig → per-app settings models
  - PairingRequestPayload / PairingResponsePayload → Kotlin/TS pairing handlers
  - TerminalLine / TerminalSession → xterm.js + PTY session models

━━━ ARCHITECTURAL DECISIONS ━━━
Decision: Separate Home (launcher) vs Fleet (mesh controller) into two APKs.
Reasoning: Launcher surface and mesh/control surface have different lifecycles, permissions and risk profiles; decoupling allows either to be installed independently.
Alternatives considered: single monolithic APK with module flags.

Decision: Desktop uses Zustand headless stores; Home/Fleet use React Context.
Reasoning: Desktop nodes are independently mounted; Context nesting in Home/Fleet already composes 5 providers for coherent cross-domain state.
Alternatives considered: unify all on Zustand (deferred; Contexts predate the pattern).

Decision: Single canonical TypeScript contract in @nodus/common, manually mirrored to Kotlin/Rust.
Reasoning: One documented schema across three runtimes.
Alternatives considered: automated codegen from schema (not yet adopted; no `check-contract-sync` script exists).

Decision: LAN-only mesh with shared-secret bearer token.
Reasoning: Simplicity and zero-cloud operation for a trusted home/office LAN.
Alternatives considered: per-device key exchange / mTLS (not implemented).

━━━ SECURITY CONSIDERATIONS ━━━
Known concerns:
  - Hardcoded shared secret `NODUS-FLEET-SECURE` accepted everywhere as valid.
  - Loopback connections bypass auth entirely on both desktop (:9120) and fleet (:9120) servers.
  - Pair/unpair endpoints are public (unauthenticated) on the LAN.
  - Predictable/derivable token minting on the desktop server (not CSPRNG).
  - Remote shell execution (`/api/terminal/exec`, `/api/exec`) with incomplete sanitization; desktop `command_or_path` path is not metacharacter-filtered.
  - Cleartext HTTP permitted app-wide in Android network security config; WebView mixed content always allowed.
  - CORS on both servers effectively open (reflects any Origin / `*`).
Accepted tradeoffs:
  - LAN trust model assumed; deliberate for local peer control.
  - Loopback trust assumed safe for local-process convenience.
Hard requirements (non-negotiable):
  - All non-loopback command/device endpoints MUST require a valid auth token.
  - Executables MUST be validated against canonical allowed roots; shell metacharacters sanitized.
  - No silent failures on security-relevant operations.

━━━ OPEN QUESTIONS ━━━
  - Screen mirroring transport: WebRTC peer connection vs lightweight local H.264 RTSP/HTTP chunked stream?
  - Shizuku: bundle the Shizuku API into `nodus-fleet/android-shell`, or keep optional?
  - Versioning: workspace root is 1.4.0 while packages report 1.2.0/1.3.0 and the installed Home APK reports 1.0.0. Which is the canonical release train going forward?
  - Should Home/Fleet Contexts be migrated to Zustand headless stores to satisfy the headless-store architecture invariant?
  - Should the canonical contracts be generated/mirror-checked (add `scripts/check-contract-sync.mjs`)?

━━━ AUDIT STATUS ━━━
[x] Architecture audited (Baseline Health & Onboarding audit, 2026-10-11)
[x] Tech stack audited
[x] Platform translation audited
[x] Security audited
[x] Scope validated
[ ] Approved — ready for AI Studio
