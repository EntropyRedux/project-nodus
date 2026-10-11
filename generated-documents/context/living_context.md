LIVING CONTEXT DOCUMENT
Version: v1.0
Last Updated: 2026-10-11
Last Updated By: Pass 1 Independent Auditor (baseline onboarding)
Project: Project Nodus
Target Platform(s): Android 10–14+ (tablets/foldables), Windows 10/11 (Web = dev only)
Production Stack: React 19 + TS + Vite + Tailwind v4; Zustand (desktop) / React Context (home, fleet); Tauri v2 + Rust (desktop); Kotlin WebView shells (home, fleet)

━━━ CURRENT DEVELOPMENT STATE ━━━
Active Stage:
  [ ] Planning
  [ ] AI Studio — MVP Spec Build
  [ ] AI Studio — Iterations
  [x] Porting & Spec Implementation  (milestone v1.2.0/v1.4.0 largely ported & shipping)
  [x] Feature Implementation
  [x] Refactor  (ongoing: legacy removal, security-strict branch)
  [ ] Testing
  [ ] Sync-Back

Current Feature Group: Multi-Device Remote Command Plane (v1.2.0 milestone) — implementation complete; awaiting next group (screen mirroring / Shizuku / edge-hop).
Branch: `refactor/security-strict`
Last Git Checkpoint: 2026-10-11 — legacy package removal + generated-documents tracking policy (local commits `2ab3e28`, `4739b3c`; not yet pushed).

━━━ PROJECT BRIEF REFERENCE ━━━
Brief Version: v1.0
Brief Location: /generated-documents/context/project_brief_v1.0.md
Last Brief Update: 2026-10-11
Reason for last update: Initial baseline brief authored during onboarding audit.

━━━ CANONICAL DATA SHAPES ━━━
Location: packages/nodus-common/src/index.ts  (NOT /context/contracts/data_shapes.ts — that mirror does not exist yet)
Last Updated: 2026-09 (mirrored manually into Kotlin/Rust)
Active Shapes: DeviceInfo, DeviceProcess, ClipboardItem, AutoExportSettings, SystemStats, NetworkServerConfig, TrustedEntry, ScannedPeer, TerminalLine, TerminalSession, SharedApp, PairingRequestPayload, PairingResponsePayload, DEVICE_COLORS.

━━━ MOCK REGISTRY (PHYSICALLY QUARANTINED) ━━━
[All active mocks MUST reside physically in mocks/ or src/__fixtures__/. No mock array inline in production code.]

Mock ID | Physical Location | Type | Real Replacement Target | Feature Group | Status
--------|-------------------|------|------------------------|---------------|-------
desktopFixture | packages/nodus-desktop/src/__fixtures__/desktopFixtures.ts | MOCK (MOCK_PROCESSES, MOCK_SYSTEM_STATS, INITIAL_SHORTCUTS) | Win32 process API / system stats | C | active (unused/dead — no importer)

Inline synthetic data still present in production (flagged as defects, NOT approved):
- `nodus-home/src/utils/constants.ts` — `INITIAL_DEVICES` hardcoded POCO Pad (127.0.0.1, battery 94, cpuLoad 12, "3.4 / 8.0 GB"); `INITIAL_APPS` hardcoded package list; `PWA_APP_REGISTRY`.
- `nodus-home/src/context/FleetContext.tsx` — fabricated post-reboot process list.
- `nodus-home/src/context/AppGridContext.tsx` — stale recentApps seed of obsolete app ids.
- `nodus-fleet/src/components/FleetDashboard.tsx` — `INITIAL_DEVICES = []`, `INITIAL_CLIPBOARD = []` (clean), but hardcoded clock `14:42:08` / `24 OCT 2026`.
- `nodus-fleet` Kotlin `FleetHttpServer.kt` — fabricated telemetry (cpuLoad 12, RAM "3.4 / 8.0 GB", storage "42 / 128 GB", name "POCO Pad"); synthetic "Android System Services & OS" process row.
- `nodus-desktop` — `useFleetStore.ts` synthetic DEFAULT_LOCAL_HOST / manual-connect fabrication (battery 90, cpuLoad 12, resolution 2560x1600); `server/mod.rs` fabricated node telemetry (battery 90, cpu_load 10). Hardcoded `NODUS-FLEET-SECURE` and `192.168.1.35` throughout.
- `nodus-desktop/src/types/ui-contracts.ts` — `any` types (`systemStats?: any`, `scannedPeers: any[]`).

━━━ FEATURE GROUP STATUS ━━━

Feature Group: A — Launcher & Desktop Shell (nodus-home)
Status: implemented / shipping
Background Processes: notification badge sync (no toggle), fleet poll (no toggle), clipboard poll (no toggle), calendar sync (internal flag only)
Unit Tests: written [x] passing [x]  (AppGridContext, ClipboardContext, LauncherContext, bridgeProtocol, iconRegistry — but NOT FleetContext / SystemSettingsContext / NotesContext / SmartAppTaskbar)
Last Audit Reconciliation: none (baseline only)
Git Checkpoint: `cf78fd8` (v1.4.0 handoff)
Notes: Home APK build.gradle version is 1.0.0 / versionCode 1 (stale vs package.json 1.3.0 and root 1.4.0).

Feature Group: B — Multi-Device Mesh & Remote Control (nodus-fleet)
Status: implemented / shipping
Background Processes: HTTP server, UDP beacon, telemetry poll, context poll, peers sync, LAN count, clipboard watcher — mostly without toggles
Unit Tests: written [ ] passing [ ]  (NONE — no test runner configured)
Git Checkpoint: `cf78fd8`
Notes: version discrepancies (package.json 1.2.0; UI emits v1.1.2 / 1.1.1). Dead code: AgentStudioTab.tsx, DeviceControlModal.tsx, RemoteShortcutsService.ts (all unwired).

Feature Group: C — Windows Companion & Hot Corners (nodus-desktop)
Status: implemented / shipping
Background Processes: hot-corner thread (OFF by default, no UI toggle), watched-folders monitor (always-on), process poll (toggle exists), server + discovery + 5s fleet poll (partial)
Unit Tests: written [x] passing [x]  (3 Rust tests: CORS, token minting, JSON deserialization — no frontend tests)
Git Checkpoint: `cf78fd8`
Notes: `DesktopAppShell.tsx` (1040 lines) is a God component mixing routing + Tauri events + fetch + polling.

Feature Group: D — Shared Contracts (nodus-common)
Status: implemented
Notes: Hand-mirrored to Kotlin (`NodusIpcContract.kt`); no automated sync verifier.

━━━ ARCHITECTURAL DECISIONS LOG ━━━

Date | Decision | Reasoning | Decided By
-----|----------|-----------|----------
2026-10-11 | Removed `packages/nodus-legacy/` and `packages/nodus-assistive/`; gitignore ephemeral generated docs (track only context/ + plans/ + issues/) | Legacy duplicated nodus-home functionality and caused confusion; aligns repo with KnowledgeBase lifecycle rules | Human + Agent
2026-10-11 | Baseline `generated-documents/context/` scaffolding created (living_context, project_brief) | No prior living context existed; project used ad-hoc `generated_documents/` status reports | Human-directed
2026-09 | Decision: dual mouse engine (hardware overlay + /dev/uinput) | Overlay works without ADB bootstrap; uinput gives native OS pointer | Prod Agent
2026-09 | Bidirectional unpair RPC instead of client-only delete | Eliminates ghost pairings | Prod Agent

━━━ STACK FRICTION LOG ━━━

Date | Friction Point | Options Considered | Decision | Outcome
-----|---------------|-------------------|----------|--------
2026-09 | Pointer toggle merely faded opacity | full removeOverlay() lifecycle vs CSS hide | removeOverlay() + isEnabled=false | Resolved
2026-09 | Trackpad coordinate distortion on resize | fixed px mapping vs percentage + aspectRatio | percentage `moveToPercent` + `aspectRatio: width/height` | Resolved
2026-10-11 | `generated_documents/` (underscore) vs `generated-documents/` (hyphen) | keep underscore vs migrate to workspace standard | migrated to `generated-documents/` | Resolved
2026-10-11 | UTF-8 integrity: invalid byte in `nodus-desktop/package.json` description | repair byte vs leave | repaired to em-dash | Resolved

━━━ RECONCILED TRADEOFF HISTORY (AUDITOR REFERENCE) ━━━
[Record of accepted tradeoffs so independent auditors do not re-flag approved decisions]

Date | Audit Finding | Approved Tradeoff Reason | Document Reference | Approved By
-----|---------------|--------------------------|-------------------|------------
(none yet — baseline onboarding audit produced no pre-approved tradeoffs)

━━━ KNOWN ISSUES / TECHNICAL DEBT ━━━

ID | Description | Severity | Feature Group | Status
---|-------------|----------|---------------|-------
ND-001 | Desktop `/api/pair` registers a node and returns a working token BEFORE UI approval; token formula is derivable (`nodus-sec-{ts:016x}-{len:08x}`), not CSPRNG | Critical | C | Open
ND-002 | Loopback connections bypass token auth entirely on desktop and fleet servers (any local process = full control incl. `/api/terminal/exec`) | Critical | B/C | Open
ND-003 | Unauthenticated public pair/unpair endpoints on fleet HTTP server (LAN reachable) | High | B | Open
ND-004 | Remote shell exec (`/api/terminal/exec`, `/api/exec`) with incomplete sanitization; desktop `command_or_path` not metacharacter-filtered; fallback `cmd /c start` unsanitized | Critical | B/C | Open
ND-005 | Hardcoded shared secret `NODUS-FLEET-SECURE` accepted everywhere; single global mesh token | High | A/B/C | Open
ND-006 | Cleartext HTTP permitted app-wide (Android network_security_config base-config true; manifest usesCleartextTraffic) + WebView MIXED_CONTENT_ALWAYS_ALLOW | High | A/B | Open
ND-007 | CORS effectively open on both servers (reflects any Origin / `*`) | Medium | B/C | Open
ND-008 | Presenter Purity violations: direct `fetch()`/native bridge in DesktopAppShell, AppSettingsPanel, RemoteControlTab (desktop), FleetDashboard, FleetContext, RemoteAppShortcuts, SettingsTab (fleet), plus Home JS-bridge calls in components | High | A/B/C | Open
ND-009 | No Error Boundaries in desktop or fleet; pervasive silent `catch {}` swallowing; TauriCommands returns empty/false on failure | High | B/C | Open
ND-010 | Background loops lack user-facing Settings toggles and there is no "Experimental/Advanced" master gate hiding advanced controls | High | A/B/C | Open
ND-011 | Synthetic/fabricated telemetry in production (devices, processes, server node registration) presented as real | Medium | A/B/C | Open
ND-012 | God objects: `DesktopAppShell.tsx` (1040), `AppGridContext.tsx` (1036), `FleetDashboard.tsx` (1281), `FleetContext.tsx` (750) mix UI + state + effects | Medium | A/B/C | Open
ND-013 | Dead/unwired code: desktop `desktopFixtures.ts` (unused), fleet `AgentStudioTab.tsx` / `DeviceControlModal.tsx` / `RemoteShortcutsService.ts` / unused MeshTopologyVisualizer import, home `PhoneFrame.tsx` + phone-frame tree + `RemoteCanvasWidget.tsx` | Low | A/B/C | Open
ND-014 | Version drift: root 1.4.0, desktop/fleet 1.2.0, home package.json 1.3.0, home APK build.gradle 1.0.0/versionCode 1, UI strings v1.1.2/1.1.1 | Medium | all | Open
ND-015 | Zero frontend tests in fleet and desktop; no test runner configured in either package | Medium | B/C | Open
ND-016 | Open-plugin/engine extensibility missing: `platformSnippets.ts` and `macroEngine.ts` use hardcoded arrays/switch dispatch with no runtime `register*` API | Medium | A | Open
ND-017 | No runtime schema validation (Zod/valibot) at HTTP/IPC boundaries | Medium | A/B/C | Open
ND-018 | Stale `INITIAL_DEVICES` hardcoded POCO Pad and obsolete recentApps seed in home constants | Low | A | Open
ND-019 | `simulateBridgeRpc` is an alias for the real `sendBridgeRpc` (misleading name hiding real network I/O) | Low | A | Open

━━━ AUDIT RECONCILIATION HISTORY ━━━

Date | Type | Auditor Agent | Reconciler Agent | Verdict | Document
-----|------|---------------|------------------|---------|--------
2026-10-11 | Baseline onboarding / full codebase (analyze-only) | Pass 1 Independent Auditor | (pending Prod Agent) | CONDITIONAL | generated-documents/audits/raw_findings_full_codebase_2026-09-30.md (prior) + this baseline
2026-09-30 | Full codebase raw findings | Pass 1 Independent Auditor | (unreconciled) | — | generated-documents/audits/raw_findings_full_codebase_2026-09-30.md
2026-09-13 | Full codebase raw findings | Pass 1 Independent Auditor | (unreconciled) | — | generated-documents/archives/audits/raw_findings_full_codebase_2026-09-13.md

━━━ AI STUDIO SPEC STATE ━━━
Last Export: (AI Studio prototypes quarantined under gitignored `*-replica*` / `*_uiux_prototype/`)
Components Exported: n/a
Manifest Location: packages/nodus-desktop/nodus-desktop-replica-1_1/ , packages/nodus-fleet/nodus-fleet_uiux_prototype/ (both gitignored)
Data Shapes Version: n/a
Pending Sync-Back: NO
Sync-Back Reason: —

━━━ AGENT READING ORDER ━━━
All agents (Prod Agent and Independent Auditor) must read in this order before starting any session:
1. This document (generated-documents/context/living_context.md) — MANDATORY
2. Canonical Data Shapes (packages/nodus-common/src/index.ts — the /context/contracts/data_shapes.ts mirror is pending)
3. Project Brief (generated-documents/context/project_brief_v1.0.md)
4. Role-specific session handoff document (generated-documents/handoffs/, gitignored)
5. Proceed with assigned task
