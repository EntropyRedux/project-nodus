# Raw Findings — Full Codebase Baseline Health & Onboarding Audit

- **Project:** project-nodus
- **Date:** 2026-09-13
- **Status:** Pass 1 — Independent Auditor (blind, non-reconciling)
- **Trigger:** `full codebase audit project-nodus`
- **Protocol:** KnowledgeBase `00_master_prompt_index.md` → Audit flow + **Section 8 (Unadapted Codebase Protocol)** applied because `<project>/generated-documents/context/living_context.md` does not exist.

> **MANDATE NOTE (Section 8):** Because no Living Context Document exists, **zero tradeoffs and zero inline mocks are pre-approved**. Every violation of the 9 Pillars below is recorded as an open defect against production readiness. This report is Pass 1 only; the auditor did not reconcile, defend, or edit code, and has halted.

---

## 0. Audit Scope & Method

- Inspected `C:\Projects\LocalActive\Repo\Active\project-nodus` (workspace `project-nodus-workspace` v1.4.0, AGPL-3.0-only).
- Workspaces: `packages/nodus-home` (v1.3.0), `packages/nodus-fleet` (v1.2.0), `packages/nodus-desktop` (v1.2.0, Tauri v2 + Rust `src-tauri`), `packages/nodus-common` (`@nodus/common` v1.0.0, single `src/index.ts`).
- Baseline git state: branch `refactor/security-strict`, HEAD `cf78fd8` `docs(handoff): ...`.
- **Process/doc discrepancy flagged:** `generated-documents/SESSION_HANDOFF_2026_09_13.md` claims a clean working tree, but the repo is actually dirty: ` D AGENTS.md`, ` D generated_documents/.*` (underscore), `?? generated-documents/` (hyphen). The canonical documents directory is `generated-documents/` (hyphen); the underscore variant is a stale, in-flight rename. This is an open defect (Pillar: process/doc accuracy).

---

## 1. Phase 1 — Verification Commands Gate

| Gate | Command | Exit | Result |
|---|---|---|---|
| Typecheck (desktop) | `tsc --noEmit -p packages/nodus-desktop` | 0 | PASS |
| Typecheck (fleet) | `tsc --noEmit -p packages/nodus-fleet` | 0 | PASS |
| Typecheck (home) | `tsc --noEmit -p packages/nodus-home` | 0 | PASS |
| Rust check | `cargo check` (`nodus-desktop/src-tauri`) | 0 | PASS |
| Build all workspaces | `npm run build --workspaces` | 0 | PASS (warnings: fleet chunk **753.47 kB**, desktop chunk **~836 kB** — both exceed the 600 kB chunk-size warning threshold) |
| Vitest | `vitest run` (desktop) | 0 | PASS — 14/14 tests (4 files) |
| Cargo tests | `cargo test` | 0 | PASS — 3/3 |

**Note:** One passing Rust test (`test_auth_token_minting_and_registration`) codifies and enforces the insecure behavior documented in Pillar 8 (token minted by any unauthenticated caller on `/api/fleet/pair-request`). The suite needs a hostile/negative test set.

---

## 2. Phase 2 — Codebase Manifest (summary)

- 212 source files (excluding `node_modules`, `dist`, `build`, `target`): `tsx` 97, `ts` 42, `xml` 40, `json` 24, `kt` 18, `rs` 15, `css` 9, `html` 7.
- **Entry points:** desktop `main.tsx`/`App.tsx`; fleet `main.tsx`/`App.tsx`; home `main.tsx`/`App.tsx` + Android `HomeActivity.kt`; Android native shell under `packages/nodus-fleet/android-shell/`.
- Significant cross-package duplication (Pillar 4): `RemoteControlTab.tsx` ×4, `RemoteTerminal.tsx` ×4, `ProcessMonitorTable.tsx` ×4, `DevicePairingModal.tsx` ×4, `RemoteAppShortcuts.tsx` ×4, `MeshTopologyVisualizer.tsx` ×4, `FleetDashboard.tsx` ×3, plus paired `ClipboardDrawer`/`IncomingPairModal`/`FleetContext`. Same-named *services* (`FleetDirectClient`, `RemoteShortcutsService`) exist in ≥2 packages with divergent implementations.

---

## 3. Findings by Pillar

> Severity legend: **SEV-0** = security-critical production blocker; **SEV-1** = high; **SEV-2** = medium; **SEV-3** = low/polish.

### 3.1 Pillar 8 — Deep Security, Sandboxing & Attack Surface (MAXIMUM SCRUTINY)

**SEV-0 / DESKTOP-001 — Static default auth token hardcoded and accepted from any remote caller.**
`packages/nodus-desktop/src-tauri/src/server/mod.rs:199-201`
```rust
// Default mesh network secret
if constant_time_eq(token_candidate.as_bytes(), b"NODUS-FLEET-SECURE") {
    return true;
}
```
`is_authorized` is the single auth gate; any remote client that sends `X-Nodus-Auth-Token: NODUS-FLEET-SECURE` (or `Bearer NODUS-FLEET-SECURE`, see lines 185-190) passes every restricted endpoint. The secret is also hardcoded into multiple frontends (Pillar 1/8 cross-reference below), i.e., it is effectively public. No token rotation exists.

**SEV-0 / DESKTOP-002 — Tokens are minted and granted BEFORE any human approval, with no pairing-secret verification.**
`packages/nodus-desktop/src-tauri/src/server/mod.rs:397-403`
```rust
let is_public = path == "/api/status"
    || path == "/api/health"
    || path == "/"
    || path == "/api/fleet/pair-request"
    || path == "/api/pair"
    || path == "/api/fleet/unpair"
    || path == "/api/unpair";
```
`packages/nodus-desktop/src-tauri/src/server/mod.rs:736-753, 771-782`
```rust
crate::discovery::register_node(...);                       // node registered immediately
let ts = ...;
let token = format!("nodus-sec-{:016x}-{:08x}", ts, dev_id.len());
add_trusted_token(token.clone());                           // <-- token active immediately
...
let _ = handle.emit("incoming-pair-request", json!({ ... "token": token.clone(), }));
...
"authToken": token,                                          // returned to unauthenticated caller
```
Any host that POSTs `/api/fleet/pair-request` with arbitrary `device_id`/`name` receives a **working** `authToken` (line 778) and is recorded as `"status": "connected"` (line 743) before the user ever clicks "Approve". The emitted UI prompt (line 758) is informational, not an authorization gate. There is **no evaluation of `public_key`, `is_ack`, or `action`** (fields at lines 716-724 are read but unused → also vestigial, Pillar 6). The passing test `test_auth_token_minting_and_registration` asserts exactly this insecure behavior.

**SEV-0 / DESKTOP-003 — Public unauthenticated unpair (pairing DoS).**
`packages/nodus-desktop/src-tauri/src/server/mod.rs:400-403` includes `/api/fleet/unpair` and `/api/unpair` in `is_public` with no authorization, no token binding, no confirmation. Any LAN client can unpair/unregister any or all devices with zero auth.

**SEV-0 / DESKTOP-004 — CORS reflects arbitrary Origin and allows browser-driven cross-origin RCE.**
`packages/nodus-desktop/src-tauri/src/server/mod.rs:228-241`
```rust
let allowed_origin = match origin { Some(o) if !o.is_empty() => o, _ => "*" };
let headers = [
    ..., // POST/GET/OPTIONS
    ... "Content-Type, Authorization, X-Nodus-Auth-Token, X-Requested-With",
    ... "Access-Control-Allow-Origin", allowed_origin,
];
```
Because the static token (DESKTOP-001) is public, a malicious website loaded in a victim's browser can send credentialed-looking cross-origin requests to `http://<pc-ip>:9120` and perform arbitrary command execution (see DESKTOP-006). There is no `Access-Control-Allow-Credentials` handling and no fixed allowlist; reflecting the caller's own Origin yields an effective wildcard.

**SEV-0 / DESKTOP-005 — Unauthenticated remote command execution remains reachable with the static token.**
`packages/nodus-desktop/src-tauri/src/server/mod.rs` — `/api/terminal/exec` path (verified route at ~line 1044-1066) executes commands via `cmd /C` (Windows) with **no command allowlist and no per-request authorization beyond the static token**. Combined with DESKTOP-001/004 this is LAN RCE. A partial sanitizer exists in `packages/nodus-desktop/src-tauri/src/commands/exec.rs` (`contains_dangerous_shell_chars`) and is applied to shortcut args (`execute_shortcut`) and to `cmd` on the server path, but the sanitizer blocks only a metacharacter set — see DESKTOP-007 for the bypass.

**SEV-0 / ANDROID-001 — Static token bypass + always-true CORS on the Android fleet server.**
`packages/nodus-fleet/android-shell/app/src/main/java/com/nodus/fleet/net/FleetHttpServer.kt:40-42, 172, 174`
```kotlin
private fun isAllowedOrigin(origin: String?, clientIp: String): Boolean { return true }
...
val isAuthed = isLoopback || tokenCandidate == "NODUS-FLEET-SECURE" || ... isValidAuthToken(...)
...
val isPublic = ... || uri.startsWith("/api/fleet/pair-request") || ... startsWith("/api/fleet/unpair") ...
```
Any LAN host can authenticate as an admin and pair/unpair devices without user consent.

**SEV-0 / ANDROID-002 — Remote command execution with zero sanitization.**
`packages/nodus-fleet/android-shell/app/src/main/java/com/nodus/fleet/net/FleetHttpServer.kt:971-995, 995`
```kotlin
uri.startsWith("/api/terminal/exec") ... {
    val command = reqObj.optString("command", reqObj.optString("cmd", "")).trim()
    ...
    val pb = ProcessBuilder("/system/bin/sh", "-c", command)
```
The `command` string is passed verbatim to `sh -c` with **no allowlist, length, or character validation**. A malicious or rogue LAN peer (able to authenticate via ANDROID-001) executes arbitrary shell on the device.

**SEV-0 / ANDROID-003 — Shell command injection via package name and keycode.**
`packages/nodus-fleet/android-shell/app/src/main/java/com/nodus/fleet/net/FleetHttpServer.kt:470`
```kotlin
val pb = ProcessBuilder("/system/bin/sh", "-c", "am force-stop $pkg")
```
`pkg` originates from the request body and is interpolated unsanitized.
`packages/nodus-fleet/android-shell/app/src/main/java/com/nodus/fleet/net/FleetHttpServer.kt:940-942`
```kotlin
val p = ProcessBuilder("/system/bin/sh", "-c", "input keyevent $keycode").start()
```
`keycode` likewise interpolated unsanitized.

**SEV-0 / ANDROID-004 — Text injection via `input text`.**
`packages/nodus-fleet/android-shell/app/src/main/java/com/nodus/fleet/net/FleetHttpServer.kt:892-902`
```kotlin
val cleanText = text.replace(" ", "%s").replace("'", "\\'").replace("\"", "\\\"").replace("&", "\\&")
...
val pb = ProcessBuilder("/system/bin/sh", "-c", "input text \"$cleanText\"")
...
val ep = ProcessBuilder("/system/bin/sh", "-c", "input keyevent 66").start()
```
The escaping blocks space, `'`, `"`, `&`, but **not** backticks, `$`, backslash, or newline — `$(...)` command substitution and arbitrary `sh` execution remain.

**SEV-0 / ANDROID-005 — Pairing bypass: any peer supplying the public secret is auto-paired instantly.**
`packages/nodus-fleet/android-shell/app/src/main/java/com/nodus/fleet/net/FleetHttpServer.kt:307-314`
```kotlin
val providedToken = reqObj.optString("token", reqObj.optString("authToken", ""))
val hasValidSecret = isAuthed || providedToken == "NODUS-FLEET-SECURE" || (providedToken.isNotBlank() && [...isValidAuthToken...])
if (isAck || hasValidSecret) {
    ...
    FleetDaemonService.instance?.addOrUpdateRemoteDevice(pairedDevice)
```
The `token`/`authToken` fields arrive in the same unauthenticated request that is being authorized; no out-of-band verification occurs.

**SEV-1 / ANDROID-006 — Fabricated/placeholder telemetry reported on the Android status endpoint.**
`packages/nodus-fleet/android-shell/app/src/main/java/com/nodus/fleet/net/FleetHttpServer.kt:196-217` — battery default `85`, synthetic cpuLoad/ram/storage values; `FleetHttpServer.kt:446` (`cpu: 1.2`); `packages/nodus-fleet/android-shell/app/src/main/java/com/nodus/fleet/net/HttpRpcClient.kt:273-274` hardcodes fallback host `"192.168.1.35"`; the Android status `"sys"` server entry is synthetic. Fabricated health data breaks fleet monitoring semantics (Pillar 1/6).

**SEV-1 / DESKTOP-007 — Sanitizer bypass across native command paths (defense-in-depth gap).**
`packages/nodus-desktop/src-tauri/src/commands/exec.rs` — `contains_dangerous_shell_chars` is applied only to shortcut args and the server-side `cmd`; the Tauri command `run_terminal_command` invokes the underlying executor without re-applying the sanitizer, so a frontend path (e.g., `TauriCommands.runTerminalCommand`) reaches the shell unfiltered. Verified in `packages/nodus-desktop/src/services/TauriCommands.ts` (direct `invoke('run_terminal_command', ...)`), which is callable from the RemoteTerminal view.

**SEV-2 / DESKTOP-008 — Path whitelist is wider than the stated canonical roots.**
`packages/nodus-desktop/src-tauri/src/commands/exec.rs` — `is_path_whitelisted` currently permits `C:\Windows\System32` and `C:\Projects` along with Program Files/AppData/LocalAppData. Widening the whitelist to arbitrary dev roots increases the executable-launch surface; requires explicit sign-off in the future LCD.

**SEV-2 / ANDROID-007 — Cleartext traffic + exported/sensitive surfaces without an approved threat model.**
`packages/nodus-fleet/android-shell/app/src/main/AndroidManifest.xml:41` (`usesCleartextTraffic="true"`), `network_security_config.xml:4` (`<base-config cleartextTrafficPermitted="true">`), plus `SYSTEM_ALERT_WINDOW` (line 14) and `QUERY_ALL_PACKAGES` (line 22). `FleetDataProvider` is exported (line 57-61) but signature-gated (`com.nodus.permission.FLEET_ACCESS`, protectionLevel=signature, lines 17-19) — this is acceptable **provided** the signature gate remains enforced end-to-end. `FleetActivity` exported (line 49, launcher intent) is normal.

**SEV-3 / ANDROID-008 — `NodusAccessibilityService` requires a user-facing consent flow before enabling.**
Line 86-96 exports the accessibility service (`BIND_ACCESSIBILITY_SERVICE`). Requires Settings-gated opt-in with explicit user consent (ties into Pillar 7 toggles).

> **Cross-cutting summary:** The frontends are compiled with the shared secret baked in, so the "secret" is public: `FleetDirectClient.ts` (fleet) `:29`, (home) `:32`; `bridgeProtocol.ts:65,68,77,192`; `useFleetStore.ts:42-43,236,450,624`; `FleetContext.tsx` (fleet) `:243-244,337-338` (+ `pairingSecret` `:53`). This converts every Pillar-8 token gate into an effective no-auth gate. **Pillar 8 verdict for DESKTOP-001..007 and ANDROID-001..005: refusal-level defects; block release.**

### 3.2 Pillar 1 — Production Ship Readiness & Mock Quarantine

**SEV-1 — Home launcher seeds a hardcoded app list into the production grid.**
`packages/nodus-home/src/utils/constants.ts:93-104` (`INITIAL_APPS`, six hardcoded apps); consumed/seeded in `packages/nodus-home/src/context/AppGridContext.tsx:106,124,143-145,152`. `DOCK_APP_IDS` seeded at `AppGridContext.tsx:163`.

**SEV-1 — Home seeds a fabricated device list with fake telemetry as the production fallback.**
`packages/nodus-home/src/utils/constants.ts:72-87` (`INITIAL_DEVICES`; note fake `battery: 94`, `cpuLoad: 12`, `ramUsage: "3.4 / 8.0 GB"`); consumed in `packages/nodus-home/src/context/FleetContext.tsx:94` and again at `:168`; `INITIAL_DEVICE_PROCESSES` seeded at `FleetContext.tsx:128-134`. Hardcoded legacy device IDs (`tab-pc`, `sm-t230nu`, `main-pc`) filtered at `FleetContext.tsx:87,100`.

**SEV-2 — Production constants coupled to external network resources and stale config defaults.**
`packages/nodus-home/src/utils/constants.ts` `WALLPAPER_PRESETS` (verified present ~lines 123-260) hardcode `images.unsplash.com` URLs → the desktop launcher depends on the public internet at runtime. `useFleetStore.ts:42-43` seeds `pairingSecret`/`auth_token` with the public mesh secret (Pillar 8 cross-reference).

**SEV-2 — Quarantined fixtures exist but are unregistered (no LCD to declare them).**
`packages/nodus-desktop/src/__fixtures__/desktopFixtures.ts` (`MOCK_PROCESSES` etc.). Physically quarantined correctly, but with no `living_context.md` the Mock Registry requirement is unmet.

**SEV-3 — Fashioned server-side fabrication.**
`server/mod.rs:744-746` registers fake `battery: Some(90)`, `cpu_load: Some(10)`, `ram_usage: Some("3.4 / 8.0 GB")` for a just-paired device. Same family as ANDROID-006.

### 3.3 Pillar 2 — Universal Presenter Purity & Architectural Separation

**SEV-1 — Desktop `RemoteControlTab.tsx` performs direct `fetch()` calls inside a presenter-component.**
`packages/nodus-desktop/src/components/views/RemoteControlTab.tsx` — ~15 raw `fetch()` calls within the component (lines: 318, 396, 480, 541, 600, 626, 651, 678, 700, 719, 740, 843, 867, 882, 899). Additional impure internals: `(targetDevice as any)` casts, hardcoded `'NODUS-FLEET-SECURE'` fallback (line 283), local fallback host object (`~lines 272-280`, `http://127.0.0.1:9120`), hardcoded screen defaults (`~lines 298-301`, 2560×1570 default), and empty-catch blocks (lines 247, 27x). This directly contradicts the handoff's own Container-Presenter mandate (presenters must be 100% pure UI, zero direct network/invoke), and duplicates behavior that the fleet presenter owns.

**SEV-2 — Desktop `AppSettingsPanel.tsx` performs direct `fetch()` calls (should consume a service).**
`packages/nodus-desktop/src/components/views/AppSettingsPanel.tsx:199, 228` — direct `fetch` to overlay/RPC endpoints instead of going through `TauriCommands`/`FleetDirectClient`; empty catches at lines 107, 116 (`catch` no-op).

**SEV-3 — Desktop container coupling in `DesktopAppShell.tsx`.**
`fetch` used at lines 260, 342, 886, 1003 in the app-shell container. Containers may perform data ops per the architecture, but the hardcoded secret header at ~line 1003 (`Authorization: Bearer NODUS-FLEET-SECURE` family) must route through the token store instead.

**SEV-3 — Fleet `FleetContext.tsx` is a god-container holding UI state + network + polling + secrets in one provider.**
`packages/nodus-fleet/src/context/FleetContext.tsx` (state init lines 34-63; secret headers lines 243-244, 337-338; poll timer ~line 311). Not a presenter, but the coupling of secrets, polling, and network into a single provider should be decomposed for testability.

### 3.4 Pillar 3 — Type Safety, Best Practices & Code Quality

- **`any` at ~86 matches in `*.ts`**, concentrated in transport/bridge code:
  - `packages/nodus-fleet/src/services/FleetDirectClient.ts:7,11,18,53,68,73,80,94,98,107`; `(window as any).NodusNativeBridge` at line 73.
  - `packages/nodus-home/src/services/FleetDirectClient.ts`, `bridgeProtocol.ts:175`, home `FleetContext.tsx:71` (`useSystemSettings() as any`).
  - `packages/nodus-desktop/src/services/TauriCommands.ts` throughout (many `any[]`/`as any` signatures).
  - `packages/nodus-desktop/src/components/views/RemoteControlTab.tsx` (`as any` casts), `packages/nodus-desktop/src/components/views/RemoteShortcutsService.ts:115` (`s: any`).
  - `packages/nodus-desktop/src/stores/useProcessStore.ts:34` (`pollingTimer: any`), `useFleetStore.ts` casts at 235, 236, 370, 449 plus the token-resolution ternaries at 450, 624.
  - `packages/nodus-desktop/src/__fixtures__/desktopFixtures.ts`, `iconRegistry.ts:94,186`, `audio.ts:8`.
- `packages/nodus-desktop/src/types/ui-contracts.ts:27,75` — `systemStats?: any`, `scannedPeers: any[]`. The claimed "strict typed contracts" (handoff) are not yet true at the boundary.
- The bridge fallback comments at `FleetContext.tsx:82` ("Browser mock fallback") indicate a Tauri-only runtime that still ships dead browser paths.

### 3.5 Pillar 4 — Modularity & Maintainability

- **SEV-1 — Cross-package private-relative import bypasses the canonical contracts package.**
  `packages/nodus-fleet/src/nodus-common.ts:2` and the equivalent in `packages/nodus-home`: `export * from '../../nodus-common/src';`. Both packages declare no dependency on `@nodus/common` in their `package.json`, so this is an implicit path coupling. `packages/nodus-common` is effectively bypassed as the canonical schema home.
- **SEV-1 — Massive copy/paste duplication across packages** (list in §2): `RemoteControlTab`, `RemoteTerminal`, `ProcessMonitorTable`, `DevicePairingModal`, `RemoteAppShortcuts`, `MeshTopologyVisualizer`, `FleetDashboard`, `IncomingPairModal`, `FleetContext`, `ClipboardDrawer`, and services `FleetDirectClient` (fleet vs home diverge), `RemoteShortcutsService`. Each divergence threatens drift bugs; e.g., desktop RemoteControlTab and fleet RemoteControlTab both own remote-control UX but differ in security posture.
- **SEV-2 — `server/mod.rs` is a 1304-line monolith** (route dispatch, auth, CORS, pairing, exec, clipboard, shortcuts) in one file — replaceable-module boundaries are not achievable in the current shape.

### 3.6 Pillar 5 — Tech Stack & Dependency Fit

- **SEV-3 — `motion`** declared in desktop/fleet/home `package.json` with **zero imports** (grep: no `from 'motion'` / `require('motion')`). Remove.
- **SEV-3 — `@tauri-apps/plugin-opener`** frontend package unused in TS/TSX (registered in `nodus-desktop/src-tauri/src/lib.rs:18` and listed in `vite.config.ts:20` manualChunks — chunk-size contributor). Either wire up `openUrl` usages or drop the frontend binding.
- **SEV-3 — Romper chunk sizes:** fleet 753.47 kB, desktop ~836 kB (single-chunk warnings during build) — code-splitting is not effective; duplication (§3.5) is a material cause.
- `@xterm` (used), `base64` crate (`icon.rs:8`, `clipboard.rs`) are justified. Node engine/type alignment across workspaces (v1.2.0 vs v1.3.0 vs v1.4.0) should be reconciled in the LCD.

### 3.7 Pillar 6 — Scope Creep & Vestigial Code

- **SEV-2 — Stale hardcoded version `"1.1.1"` reported by both servers** while workspace is v1.4.0 / packages v1.2.0-v1.3.0: `server/mod.rs:428`, `FleetHttpServer.kt:1063`; README claims v1.2.0 (`README.md:5`). Status/health consumers (home dashboard) will display the wrong version.
- **SEV-3 — Unused pairing fields:** `PairRequest.{is_ack, action, public_key}` parsed at `server/mod.rs:716-724` but never evaluated (the `is_ack` path returns the minted token regardless; see DESKTOP-002).
- **SEV-3 — `AgentStudioTab.tsx`** (fleet, speculative agent/dictation UI) is not named in any approved goal or feature-group plan in the documentation that exists; requires an explicit keep/scrap decision.
- **SEV-3 — Legacy localStorage migration keys (`nova_launcher_*`, `nodus_home_v5_*`)** in `AppGridContext.tsx:130`, home `FleetContext.tsx:76-77,99,107,114,130`, `constants.ts` — acceptable as compatibility shims, but must be documented as deliberate (LCD) rather than accumulating.

### 3.8 Pillar 7 — Background Processes & User-Facing Toggles

- **SEV-1 — Desktop `DaemonManager` runs two background loops bound to app lifecycle with no Settings toggles.**
  `packages/nodus-desktop/src/App.tsx:12-13` (`DaemonManager.start(token)` / `stop()`). Inside `packages/nodus-desktop/src/services/DaemonManager.ts`: clipboard poll every **1200ms** (`:58-77`) and fleet discovery poll every **2500ms** (`:80-87`). The clipboard interval only *acts* when `isSyncEnabled` (line 60), but the interval and `getClipboardContent()` interrogation continue regardless — no independent toggle; empty `catch {}` at lines 76, 86.
- **SEV-1 — Fleet web poll every 3s with no toggle.**
  `packages/nodus-fleet/src/context/FleetContext.tsx:~311` — `refreshState`/poll timer bound only to provider lifetime; no Settings switch.
- **SEV-2 — Home `NotesContext` polls on a 60s interval** (`packages/nodus-home/src/context/NotesContext.tsx:~179-183`): calendar looks gated by `isCalendarSyncEnabled`, but the alarm/devices refresh segment runs un-gated; no dedicated toggle for the whole poller.
- **SEV-2 — Home visibility-gated polls without Settings toggles:** `SystemSettingsContext.tsx:405` (badge-push every 2500ms), home `FleetContext.tsx:204`, `ClipboardContext.tsx:217` (`useVisibilityPoller` in `packages/nodus-home/src/hooks/useVisibilityPoller.ts:7-42` — hook itself is lifecycle-clean; good). Each poller must be independently gateable in Settings per Pillar 7.
- **SEV-2 — Ad-hoc UI/daemon intervals with no toggles:** `FleetDashboard.tsx` 3s/5s intervals; `MeshTopologyVisualizer.tsx:~114`; `StatusBar.tsx` 1s clock; `RemoteAppShortcuts.tsx` background-poll label (`~line 802`; no toggle surfaced).
- **COMPLIANT (positive finding):** `useProcessStore.ts` polling is gated by `setMonitoringEnabled` + `localStorage nodus_process_monitoring_enabled` (Settings hook) — the reference pattern the others must copy.
- **SEV-3 — Requirement missed:** per the mandate, all toggles must live behind an **Experimental/Advanced Settings** master gate in the Settings panel; no such master gate exists in any package.

### 3.9 Pillar 9 — Validation, Resilient Error Handling & User Notifications

- **SEV-1 — Systematic silent catch swallowing (100+ matches).** Representative verified cites:
  - `packages/nodus-fleet/src/context/FleetContext.tsx:70,93,101,111,114,412` (`catch (_) {}`).
  - `packages/nodus-fleet/src/components/FleetDashboard.tsx` (95..578, multiple `catch {}`).
  - `packages/nodus-fleet/src/components/DevicePairingModal.tsx:245`, `RemoteAppShortcuts.tsx:118,165`, `QuickSettingsShade.tsx:209`, `SettingsTab.tsx:85`.
  - `packages/nodus-desktop/src/components/views/RemoteTerminal.tsx:208,337,836,939`; `RemoteControlTab.tsx:247,27x`; `AppSettingsPanel.tsx:107,116`; `DesktopAppShell.tsx`; `services/DaemonManager.ts:76,86`; `stores/useFleetStore.ts:252`.
  - `packages/nodus-home/src/context/NotesContext.tsx:57,78,213`; `AppGridContext.tsx:128,149`; `FleetContext.tsx:78,92,141`; `services/audio.ts` (≈6).
  - Android: `HomeActivity.kt:391,996`; `FleetHttpServer.kt:58,864,889,944,1005,1008,1019-1020` (many `catch (_: Exception) { ... }` / empty).
  Many are bridge-presence guards or best-effort IO, but **none are registered as approved tradeoffs** — per Section 8, unregistered silent swallowing is a defect.
- **SEV-1 — Pairing/action RPCs run with no user feedback on failure.** Key remote actions in `RemoteControlTab.tsx` and the silent-catch wrapping in fleet `FleetContext.tsx:255,349` and `DesktopAppShell.tsx:1003` can fail invisibly (Pillar 9: every async op must dispatch Toast/Banner on success *and* error).
- **SEV-2 — No Error Boundaries in desktop or fleet.**
  Only `packages/nodus-home/src/App.tsx:5-24,58` defines an `ErrorBoundary`. Desktop `main.tsx` and fleet `main.tsx` mount apps with no `ErrorBoundary` → a single render error bricks the Tauri surfaces.
- **SEV-2 — Boundary payloads are not schema-validated.**
  No Zod (or equivalent type-guard) validation exists at any IPC/HTTP boundary (Rust/TS or TS/Android). Body parsing is `serde_json::from_str(...).unwrap_or(PairRequest{...all-None...})` (`server/mod.rs:715-725`) — malformed input silently becomes a "valid" default request, and Android uses per-key `optString` coercion (`FleetHttpServer.kt:974-980`).
- **SEV-2 — Input/confirmation UX gaps:** no confirmation dialog on `unpair` from the desktop UI, and `RemoteControlTab` hardcodes screen defaults (`2560x1570`) instead of reading the validated device contract.

---

## 4. Summary Counts

| Severity | Count |
|---|---:|
| SEV-0 (security-critical) | 12 |
| SEV-1 (high) | 16 |
| SEV-2 (medium) | 19 |
| SEV-3 (low) | 13 |

**Gate results:** build, typecheck, and tests all pass; passing tests currently *assert* security-weak behavior (DESKTOP-002) and 14/14 JS tests cover only a small positive surface. **Pillar verdicts:** all 9 pillars have open defects; Pillars 1, 2, 3, 7, 8, 9 are release-blocking in their current state.

---

## 5. Onboarding Scaffolding Specification (Section 8 Deliverable)

### 5.1 Directory structure to create

```
packages/../project-nodus/generated-documents/     <- already exists (hyphen form)
  ├── context/
  │     ├── living_context.md                      <- CREATE
  │     ├── project_brief_v1.0.md                  <- CREATE (from README + SESSION_HANDOFF)
  │     └── contracts/
  │           └── data_shapes.ts                   <- CREATE
  ├── plans/                                       <- CREATE
  ├── handoffs/                                    <- exists (ephemeral)
  └── audits/                                      <- exists (this report)
```

### 5.2 Baseline `living_context.md` content outline
- Tech stack: Tauri v2 + Rust (`src-tauri`), React + Vite + Tailwind + Zustand, Android Kotlin shell (raw `ServerSocket` HTTP + Accessibility), workspace `project-nodus-workspace` v1.4.0 (AGPL-3.0-only).
- Build/verify commands: `npm run build --workspaces`, per-package `tsc --noEmit`, `cargo check`/`cargo test` (note variance between vitest vs cargo test commands), bundle-size triggers.
- Detected inline mock locations (Pillar 1 list in §3.2) to be moved into `mocks/` registry.
- Known secrets/tradeoff board (all currently UNAPPROVED): static mesh secret, CORS reflect, auto-minted tokens, public unpair, cleartext Android traffic, exposed accessibility service.
- Version matrix: workspace 1.4.0 vs packages 1.2.0/1.3.0 vs servers advertising "1.1.1".

### 5.3 Baseline models to extract into `contracts/data_shapes.ts`
`DeviceInfo`, `RemoteDeviceNode`, `AppItem`, `Note`, `ClipboardEntry`, `ProcessInfo`, `DiscoveredDeviceNode`, `PairRequest`, `SystemStats`, `ServerConfig` — sourced from the divergent `ui-contracts.ts` (desktop), `types/` (fleet/home) and `nodus-common/src/index.ts`; the re-export shims (`nodus-common.ts`) must be removed once real consumption of `@nodus/common` is wired.

### 5.4 `.gitignore` entries to append
```
generated-documents/audits/
generated-documents/handoffs/
```
(Also reconcile the deleting `generated_documents/` residue and restore/readd root `AGENTS.md` which is currently deleted in the worktree.)

---

## 6. Pass 1 Stop / Handoff

Auditor has **halted** per protocol. No code was modified, no findings were reconciled or classified (no `[APPROVED TRADEOFF]` labels exist anywhere — every item above is an **open defect** under Section 8).

> **Prompt your Prod Agent with:** `reconcile audit C:\Projects\LocalActive\Repo\Active\project-nodus\generated-documents\audits\raw_findings_full_codebase_2026-09-13.md`