# Full Codebase Audit (Pass 1 Raw Findings) — PROJECT-NODUS

- **Date:** 2026-09-30
- **Auditor:** Pass 1 Independent Blind Auditor
- **Target Path:** `C:\Projects\LocalActive\Repo\Active\project-nodus`
- **Codebase State:** **UNADAPTED (Baseline Health & Onboarding Mode)** — `generated-documents/context/living_context.md` does **not** exist
- **Pacing Standard:** 5-Phase Mechanical Inspection Pipeline executed in full (Phases 1–5)
- **Blindness attestation:** The pre-existing `raw_findings_full_codebase_2026-09-13.md` was **not opened or read** prior to code inspection. It was rotated to `archives/audits/` per the Artifact Rotation Rule without being read. No Pass 2 classification notes, tradeoff registers, or prior verdicts influenced any finding below.
- **Pre-approved tradeoffs:** **ZERO** (Baseline Mode — no Living Context Document exists)

---

## 0. Phase 1: Verification Commands Gate

| Gate | Command | Exit Code | Result Summary |
|---|---|---|---|
| Typecheck — home | `npm run lint` (`tsc --noEmit`) | **2** | **FAIL** — `src/__tests__/bridgeProtocol.test.ts(78,6): error TS1005: '}' expected.` |
| Typecheck — fleet | `npm run lint` (`tsc --noEmit`) | 0 | PASS |
| Typecheck — desktop | `npx tsc --noEmit` | 0 | PASS (but **no `lint` script is defined** in `nodus-desktop/package.json` — gate is not wired into any script) |
| Test — home | `npm test` (`vitest run`) | **1** | **FAIL** — `Test Files 1 failed | 4 passed (5)`, `Tests 14 passed (14)`. `bridgeProtocol.test.ts` collected **0 tests** (esbuild `Unexpected end of file`). |
| Test — desktop (native) | `cargo test --manifest-path packages/nodus-desktop/src-tauri/Cargo.toml` | 0 | PASS — 3 passed, 0 failed (`test_auth_token_minting_and_registration`, `test_cors_headers_origin_matching`, `test_json_payload_deserialization`) |
| Build — home | `npm run build` (`vite build`) | 0 | PASS — 1711 modules; `index-0Ws7FGz0.js` 521.25 kB (gzip 137.52) |
| Build — fleet | `npm run build` (`vite build`) | 0 | PASS w/ warning — 1690 modules; `index-qbH9sfn_.js` **753.47 kB** (gzip 196.18); `(!) Some chunks are larger than 600 kB` |
| Build — desktop | `npm run build` (`vite build`) | 0 | PASS w/ warning — 1708 modules; `index-T_qe0HL8.js` **836.20 kB** (gzip 215.85); `(!) Some chunks are larger than 500 kB` |
| Test — fleet | *(no `test` script)* | n/a | **ABSENT** — `nodus-fleet/package.json` declares no `test` script |
| Test — common | *(no test infra)* | n/a | **ABSENT** — `nodus-common` has no test script or files |

**Gate verdict: FAIL.** The repository does not currently pass its own `npm test`. The root `package.json:23` defines `"test": "npm run test:home && npm run test:desktop"`, so the aggregate gate is red at `test:home`.

---

## 1. Phase 2: Codebase Manifest & Metrics

**Hand-written source files: 175** (excluding `node_modules/`, `target/`, `dist/`, `build/`, `.git/`, and generated `assets/frontend/` bundles)
**Total hand-written LOC: 59,424**

| Package | Ext | Files | LOC | Role |
|---|---|---|---|---|
| `nodus-common` (`@nodus/common` v1.0.0) | `.ts` | 1 | 158 | Intended canonical shared contracts |
| `nodus-home` v1.3.0 | `.ts/.tsx` | 70 | 19,772 | Android tablet launcher shell (Vite + Kotlin WebView) |
| `nodus-fleet` v1.2.0 | `.ts/.tsx` | 45 | 18,685 | Fleet control dashboard (Vite + Kotlin WebView) |
| `nodus-desktop` v1.2.0 | `.ts/.tsx/.rs` | 58 | 20,774 | Windows companion HUD (Tauri v2 + Rust `src-tauri`) |
| `nodus-home` Android | `.kt` | 9 | — | `HomeActivity.kt` (1,317 lines) + services |
| `nodus-fleet` Android | `.kt` | 9 | — | `FleetActivity.kt`, `FleetHttpServer.kt` (1,009), `HttpRpcClient.kt` |
| root | `.mjs` | 1 | 35 | `scripts/sync-android-assets.mjs` |

**Entry points:** `packages/nodus-home/src/main.tsx`, `packages/nodus-fleet/src/main.tsx`, `packages/nodus-desktop/src/main.tsx` (+ `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`), `nodus-home/android-shell/.../HomeActivity.kt`, `nodus-fleet/android-shell/.../FleetActivity.kt`

**Visual presenters:** `nodus-home/src/components/{home,layout,desktop,apps,common}/`, `nodus-fleet/src/components/`, `nodus-desktop/src/components/{views,panels,theme,layout,common}/`

**State stores / contexts:** `nodus-home/src/context/` (6 contexts), `nodus-fleet/src/context/FleetContext.tsx`, `nodus-desktop/src/stores/` (6 Zustand stores)

**Services / adapters:** `nodus-home/src/{services,utils}/`, `nodus-fleet/src/services/`, `nodus-desktop/src/services/`

**Native services / IPC handlers:** `nodus-desktop/src-tauri/src/{commands,server,discovery,hotcorners}/` (9 command modules, 1,185-line HTTP server), `nodus-fleet/android-shell/.../net/FleetHttpServer.kt`

**God-object candidates (largest source files):**

| Lines | File |
|---|---|
| 1,766 | `packages/nodus-desktop/src/components/views/RemoteControlTab.tsx` |
| 1,603 | `packages/nodus-fleet/src/components/RemoteControlTab.tsx` |
| 1,330 | `packages/nodus-fleet/src/components/RemoteTerminal.tsx` |
| 1,317 | `packages/nodus-home/android-shell/.../HomeActivity.kt` |
| 1,288 | `packages/nodus-fleet/src/components/FleetDashboard.tsx` |
| 1,256 | `packages/nodus-home/src/components/home/NotesWidgetModal.tsx` |
| 1,185 | `packages/nodus-desktop/src-tauri/src/server/mod.rs` |
| 1,036 | `packages/nodus-home/src/context/AppGridContext.tsx` (24 `useState`, 33 `useCallback`, 6 `useEffect`) |

---

## 2. Raw Findings Table (9 Pillars)

Severity key: **CRITICAL** / **HIGH** / **MEDIUM** / **MANDATORY**

### Pillar 1 — Production Ship Readiness & Mock Quarantine

| # | Sev | Finding | Location | Verbatim |
|---|---|---|---|---|
| F1.1 | **CRITICAL** | **Unauthenticated Remote Code Execution.** `/api/pair` is on the public (no-auth) allowlist yet unconditionally mints a trusted token, registers it, and **returns it in the response body** — before the "explicit UI confirmation" the comment claims. Chained with `/api/terminal/exec` this is unauthenticated RCE. | `packages/nodus-desktop/src-tauri/src/server/mod.rs:401`, `:713`, `:751-753`, `:771-782` | `let is_public = ... \|\| path == "/api/pair"`<br>`let token = format!("nodus-sec-{:016x}-{:08x}", ts, dev_id.len());`<br>`add_trusted_token(token.clone());`<br>`(200, json!({ ... "authToken": token, ... }))` |
| F1.2 | **CRITICAL** | **Token granted before approval; comment contradicts code.** The `incoming-pair-request` UI prompt at line 755 fires *after* `add_trusted_token` at line 753. The token is already live when the user is asked. | `server/mod.rs:712` (comment), `:753`, `:755-769` | `// Fleet Pairing Handshake (Requires explicit UI confirmation before active token is granted)`<br>`add_trusted_token(token.clone());`<br>`// Emit incoming-pair-request prompt to Desktop UI for out-of-band user approval` |
| F1.3 | **CRITICAL** | **Hardcoded mesh-wide static auth secret in source.** A literal shared secret grants full authorization to every protected endpoint (arbitrary exec, shutdown/restart). AGPL-licensed source is intended to be redistributed, so this secret is public by construction. | `server/mod.rs:198-201` | `// Default mesh network secret`<br>`if constant_time_eq(token_candidate.as_bytes(), b"NODUS-FLEET-SECURE") { return true; }` |
| F1.4 | **CRITICAL** | Same secret hardcoded as a client-side default fallback across the Kotlin mesh. | `nodus-fleet/android-shell/.../net/HttpRpcClient.kt:35`; `FleetDaemonService.kt:234, 266, 366` | `val token = if (!authToken.isNullOrBlank()) authToken else "NODUS-FLEET-SECURE"` |
| F1.5 | **CRITICAL** | Same secret hardcoded as the desktop bootstrap default. | `packages/nodus-desktop/src/App.tsx:10` | `const token = serverConfig?.auth_token \|\| serverConfig?.pairingSecret \|\| 'NODUS-FLEET-SECURE';` |
| F1.6 | **CRITICAL** | Synthetic device telemetry fabricated in the **native pairing handler** and injected as if real. | `server/mod.rs:743-746` | `battery: Some(90),`<br>`cpu_load: Some(10),`<br>`ram_usage: Some("3.4 / 8.0 GB".to_string()),` |
| F1.7 | **CRITICAL** | Inline synthetic device record with fabricated telemetry in **production `utils/`** (not `mocks/`, not `__fixtures__/`). This is the fallback device shown when no persisted state exists. | `packages/nodus-home/src/utils/constants.ts:72-87` | `export const INITIAL_DEVICES: DeviceInfo[] = [ { id: 'poco-pad', name: 'POCO Pad', ... battery: 94, cpuLoad: 12, ramUsage: '3.4 / 8.0 GB', storage: '68 / 256 GB', ipAddress: '127.0.0.1', isLocal: true, } ];` |
| F1.8 | **CRITICAL** | Hardcoded dev-machine device ID denylist filters user devices out of persisted state — production behaviour altered by a developer's local machine. | `packages/nodus-home/src/context/FleetContext.tsx:87`, `:100` | `const valid = list.filter((d: any) => !['tab-pc', 'sm-t230nu', 'main-pc'].includes(d.id));`<br>`return (saved && !['tab-pc', 'sm-t230nu', 'main-pc'].includes(saved)) ? saved : 'poco-pad';` |
| F1.9 | HIGH | `activeDevice` silently falls back to the synthetic device, so a disconnected/absent device renders as `connected` with fake battery/RAM. | `packages/nodus-home/src/context/FleetContext.tsx:168-170` | `const activeDevice = devices.find((d) => d.id === activeDeviceId) \|\| devices[0] \|\| INITIAL_DEVICES[0];`<br>`const remoteExecutables = settings.remoteExecutables \|\| INITIAL_REMOTE_EXECUTABLES;` |
| F1.10 | HIGH | Synthetic "ambient media" playlist hardcoded inside a production context provider; `isPlayingMusic` toggles with no audio source wired. | `packages/nodus-home/src/context/SystemSettingsContext.tsx:456-468` | `const DEFAULT_PLAYLIST = useMemo(() => [ { id: '1', title: 'Solar Echoes', artist: 'Nodus Ambient', ... }, ... ], []);`<br>`const [tracks] = useState(DEFAULT_PLAYLIST);` |
| F1.11 | HIGH | 7 of 8 wallpaper presets load from a **remote third-party CDN at runtime** (`images.unsplash.com`) with no local asset, no integrity check, and no offline fallback. | `packages/nodus-home/src/utils/constants.ts:130` (and :141, :152, :163, :174, :185, :196) | `backgroundImage: \`linear-gradient(...), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80')\`` |
| F1.12 | HIGH | Third-party app package names hardcoded as a seed catalogue in production `utils/`, mixed with genuinely built-in apps. | `packages/nodus-home/src/utils/constants.ts:93-104` | `{ id: 'app-discord', name: 'Discord', iconName: 'MessageSquare', ..., packageName: 'com.discord', pwaDesktopUrl: 'https://discord.com/app' },` |
| F1.13 | MEDIUM | The repo's **only** `__fixtures__` directory is entirely orphaned: 3 exported mock symbols, **zero importers**. Quarantine exists but is dead. | `packages/nodus-desktop/src/__fixtures__/desktopFixtures.ts:3, 12, 21` | `export const MOCK_PROCESSES: DeviceProcess[] = [`<br>`export const MOCK_SYSTEM_STATS: SystemStats = {`<br>`export const INITIAL_SHORTCUTS: RemoteExecutable[] = [` |
| F1.14 | MEDIUM | `pairingSecret` is surfaced as a user-facing security setting but is **never read by any Rust code** — a dead security control. | `packages/nodus-home/src/utils/constants.ts:216`; grep `pairing_secret` → 0 Rust matches | `pairingSecret: '',` |

### Pillar 2 — Universal Presenter Purity & Architectural Separation

| # | Sev | Finding | Location | Verbatim |
|---|---|---|---|---|
| F2.1 | **CRITICAL** | **Visual presenter performs 15+ direct network fetches** to remote device control APIs, plus raw `window`/`document` listeners, `innerWidth` reads, `setTimeout`s and 5 `any` casts. 1,766-line Presenter = God Object. | `packages/nodus-desktop/src/components/views/RemoteControlTab.tsx:318, 396, 480, 541, 600, 626, 651, 678, 700, 719, 740, 843, 867, 882, 899` (+ `:156-159, 186-195, 223-232, 298-306, 360-362`) | `await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/input/mouse/click'), {`<br>`await fetch(getDeviceEndpoint(targetDevice.ipAddress, '/api/system/control'), {` |
| F2.2 | **CRITICAL** | App **shell layout** performs direct `fetch()` including remote command launch. | `packages/nodus-desktop/src/components/layout/DesktopAppShell.tsx:260, 342, 886, 1003` | `await fetch(\`http://${peerIp}:9120/api/shortcuts/launch\`, {` |
| F2.3 | HIGH | Visual settings panel performs direct `fetch()`. | `packages/nodus-desktop/src/components/views/AppSettingsPanel.tsx:199, 228` | `await fetch(\`http://${androidDevice.ipAddress}:9120/api/system/overlay\`, {` |
| F2.4 | HIGH | God-Object context: 1,036 lines / 24 `useState` / 33 `useCallback` / 6 `useEffect` / 13 `any`, combining app-grid state, native package sync, `localStorage` persistence, and settings-driven routing. | `packages/nodus-home/src/context/AppGridContext.tsx` (whole file; `:491-504`) | `if (settings.enableExperimentalPwaWindows && settings.preferPwaAlternatives && hasPwaUrl) {` |
| F2.5 | HIGH | God-Object context combining settings, notification centre, confirm dialog, toast system **and** an unrelated media player. | `packages/nodus-home/src/context/SystemSettingsContext.tsx` (524 lines, 14 `useState`, 22 `useCallback`); `:456-470` | `const toggleMusic = useCallback(() => setIsPlayingMusic((prev) => !prev), []);` |
| F2.6 | HIGH | Backend I/O service uses a `try { invoke() } catch { fetch(unauthenticated HTTP) }` dual-path pattern repeated ~25×, so IPC failure silently degrades to token-less HTTP against `127.0.0.1`/`localhost`. | `packages/nodus-desktop/src/services/TauriCommands.ts:28, 86, 124, 174, 197, 261, 359, 386, 406, 426, 446, 466, 486, 508, 527, 550, 569, 587, 610, 629, 652, 681` | `} catch (_) {}` … `const res = await fetch('http://127.0.0.1:9120/api/system/control', {` |
| F2.7 | MEDIUM | Two divergent, near-duplicate `FleetContext.tsx` implementations (750 vs 512 lines) with different device/bootstrap semantics, and two divergent `FleetDirectClient.ts`. | `packages/nodus-home/src/context/FleetContext.tsx` vs `packages/nodus-fleet/src/context/FleetContext.tsx`; `packages/nodus-home/src/services/FleetDirectClient.ts` vs `packages/nodus-fleet/src/services/FleetDirectClient.ts` | `const [devices, setDevices] = useState<DeviceInfo[]>([DEFAULT_LOCAL_TABLET]);` (fleet) vs `return INITIAL_DEVICES;` (home) |

### Pillar 3 — Adherence to Programming Best Practices & Quality

| # | Sev | Finding | Location | Verbatim |
|---|---|---|---|---|
| F3.1 | **CRITICAL** | **Typecheck gate is red.** Truncated test file leaves an unclosed `describe` block → `TS1005` / esbuild `Unexpected end of file`. | `packages/nodus-home/src/__tests__/bridgeProtocol.test.ts:78` (block opened at `:24`) | file ends at line 78 with `  });` — the `describe('NodusBridgeClient', …)` opened at line 24 is never closed |
| F3.2 | **CRITICAL** | 278 `: any` / `as any` / `<any>` occurrences across TS/TSX. Worst offenders: `DesktopAppShell.tsx` (31), `nodus-fleet/FleetContext.tsx` (25), `FleetDashboard.tsx` (24), `AppGridContext.tsx` (13), `TauriCommands.ts` (13), `nodus-home/FleetContext.tsx` (12), `useFleetStore.ts` (11), `SystemSettingsContext.tsx` (11). | e.g. `packages/nodus-desktop/src/components/layout/DesktopAppShell.tsx`, `packages/nodus-fleet/src/context/FleetContext.tsx`, `packages/nodus-desktop/src/services/TauriCommands.ts:517, 540, 559, 600, 664, 690, 724, 736` | `return await invoke<any[]>('get_installed_windows_apps');`<br>`return await invoke<any[]>('scan_shortcuts_folder', { folderPath });` |
| F3.3 | HIGH | Daemon interval handles typed `any` instead of `ReturnType<typeof setInterval>`. | `packages/nodus-desktop/src/services/DaemonManager.ts:8-9` | `private static clipboardInterval: any = null;`<br>`private static fleetInterval: any = null;` |
| F3.4 | HIGH | Error boundary callback parameter typed `any`. | `packages/nodus-home/src/App.tsx:24` | `componentDidCatch(error: Error, errorInfo: any) {` |
| F3.5 | HIGH | 189 of 530 `catch` blocks (35.6%) are **completely empty**; a further 2 are bare `catch {}`; 79 more only `console.error/warn/log`. | Full distribution below; worst files: `AppGridContext.tsx` (17), `useFleetStore.ts` (9), `nodus-home/FleetContext.tsx` (11), `TauriCommands.ts` (10), `audio.ts` (6), `DaemonManager.ts:51, 76, 86` | `} catch {}` (DaemonManager.ts:76, :86 — bare, no binding) |
| F3.6 | MEDIUM | `nodus-desktop` has no `lint` script, so `npx tsc --noEmit` is never enforced by any npm script or CI-invoked target. | `packages/nodus-desktop/package.json:7-12` (scripts block has only `dev`, `build`, `preview`, `tauri`) | `"scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview", "tauri": "tauri" }` |
| F3.7 | MEDIUM | Browser-typed hook uses Node's `NodeJS.Timeout`, coupling DOM code to `@types/node`. | `packages/nodus-home/src/hooks/useVisibilityPoller.ts:15` | `let timer: NodeJS.Timeout \| null = null;` |

### Pillar 4 — Modularity & Maintainability

| # | Sev | Finding | Location | Verbatim |
|---|---|---|---|---|
| F4.1 | HIGH | **The designated canonical contracts package is dead.** `@nodus/common` is imported by **zero** production source files. Only consumers are the two gitignored prototype dumps (via a Vite alias) and a 2-line re-export shim. Meanwhile 16 filenames are duplicated across 2–3 packages with divergent content. | `packages/nodus-common/src/index.ts` (158 lines, 0 importers); `packages/nodus-fleet/src/nodus-common.ts` (2 lines); duplicates: `RemoteControlTab.tsx`, `RemoteTerminal.tsx`, `FleetDashboard.tsx`, `DevicePairingModal.tsx`, `IncomingPairModal.tsx`, `MeshTopologyVisualizer.tsx`, `ProcessMonitorTable.tsx`, `RemoteAppShortcuts.tsx`, `ClipboardDrawer.tsx`, `ThemePicker.tsx`, `FleetContext.tsx`, `FleetDirectClient.ts`, `RemoteShortcutsService.ts`, `ui-contracts.ts`, `App.tsx`, `main.tsx`, `vite.config.ts` | `packages/nodus-fleet/src/nodus-common.ts:1` → `// Re-export canonical types and contracts from @nodus-common` (entire file) |
| F4.2 | HIGH | Three divergent definitions of the same domain models with no single source of truth. | `packages/nodus-common/src/index.ts`; `packages/nodus-desktop/src/types/ui-contracts.ts`; `packages/nodus-home/src/types/launcher.ts`; `packages/nodus-fleet/src/types/ui-contracts.ts` | three separate `DeviceInfo` / `DeviceProcess` / `ClipboardItem` declarations |
| F4.3 | MEDIUM | Single 1,185-line Rust file holds auth, CORS, pairing, routing, exec, media, system control, and PTY dispatch. | `packages/nodus-desktop/src-tauri/src/server/mod.rs` (whole file) | `(Method::Post, "/api/system/control") => {` … `(Method::Post, "/api/terminal/pty/spawn") => {` |
| F4.4 | MEDIUM | 1,009-line Kotlin HTTP server performing the same role as the Rust server, with its own divergent auth model. | `packages/nodus-fleet/android-shell/.../net/FleetHttpServer.kt` (1,009 lines) | `"Unauthorized: valid X-Nodus-Auth-Token required"` (line 176) |
| F4.5 | MEDIUM | Project ships its own visibility-aware polling hook, yet the two largest dashboards hand-roll raw `setInterval` instead — inconsistent abstraction use. | `packages/nodus-home/src/hooks/useVisibilityPoller.ts` (defined, correct cleanup at `:36-39`) vs `packages/nodus-fleet/src/components/FleetDashboard.tsx:292, 316` | `const timer = setInterval(syncDiscoveredPeers, 3000);` |

### Pillar 5 — Tech Stack & Dependency Fit

| # | Sev | Finding | Location | Verbatim |
|---|---|---|---|---|
| F5.1 | HIGH | `motion` declared in **two** packages with **zero** imports in either. | `packages/nodus-desktop/package.json:20`; `packages/nodus-fleet/package.json:20` | `"motion": "^12.23.24",` |
| F5.2 | HIGH | **Linux-x64 native binaries declared as `optionalDependencies` in a Windows + Android monorepo.** Zero references; bloats install and can pull wrong-platform artifacts. | `packages/nodus-home/package.json:35-38` | `"optionalDependencies": {`<br>`"@rollup/rollup-linux-x64-gnu": "^4.34.8",`<br>`"lightningcss-linux-x64-gnu": "^1.29.2" }` |
| F5.3 | MEDIUM | `autoprefixer` declared in two packages, zero references — also obsolete under Tailwind v4. | `packages/nodus-home/package.json:27`; `packages/nodus-fleet/package.json:27` | `"autoprefixer": "^10.4.21",` |
| F5.4 | MEDIUM | `esbuild` declared directly in two packages despite being a Vite transitive dependency; zero direct references. | `packages/nodus-home/package.json:28`; `packages/nodus-fleet/package.json:28` | `"esbuild": "^0.25.0",` |
| F5.5 | MEDIUM | Build-time dependencies (`vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`) are declared in **`dependencies`** rather than `devDependencies`, shipping build tooling into the production dependency graph. | `packages/nodus-home/package.json:16-21`; `packages/nodus-fleet/package.json:15-23` | `"dependencies": { "@tailwindcss/vite": "^4.1.14", "@vitejs/plugin-react": "^5.0.4", ..., "vite": "^6.2.3" }` |
| F5.6 | MEDIUM | Two large uncode-split bundles: 836 kB (desktop) and 753 kB (fleet), both emitting chunk-size warnings on every build. | build output, Phase 1 | `dist/assets/index-T_qe0HL8.js  836.20 kB │ gzip: 215.85 kB` |
| F5.7 | LOW | `nodus-common` is a declared workspace with `main`/`types` pointing at raw `src/index.ts` (no build step), yet nothing consumes it. | `packages/nodus-common/package.json:6-7`; root `package.json:6-11` | `"main": "src/index.ts", "types": "src/index.ts",` |

### Pillar 6 — Scope Creep & Non-Goals

| # | Sev | Finding | Location | Verbatim |
|---|---|---|---|---|
| F6.1 | HIGH | No `living_context.md`, no `project_brief_v[n].md` — **no written scope or non-goals exist**, so every module cannot be validated against stated goals. | `generated-documents/` contains only `PROJECT_STATUS_REPORT_2026_09_13.md`, `SESSION_HANDOFF_2026_09_13.md`, and the (now archived) prior audit | `generated-documents/context/living_context.md` → **does not exist** |
| F6.2 | HIGH | Ambient music player state with no audio implementation — a feature surface with no backing logic. | `packages/nodus-home/src/context/SystemSettingsContext.tsx:464-470` | `const [isPlayingMusic, setIsPlayingMusic] = useState(false);` … `const toggleMusic = useCallback(() => setIsPlayingMusic((prev) => !prev), []);` |
| F6.3 | HIGH | Orphaned mock fixture module (3 exports, 0 consumers). | `packages/nodus-desktop/src/__fixtures__/desktopFixtures.ts` (whole file) | `export const MOCK_PROCESSES: DeviceProcess[] = [` |
| F6.4 | MEDIUM | User-facing `pairingSecret` setting with no backend consumer — a vestigial control that implies security it does not provide. | `packages/nodus-home/src/utils/constants.ts:216` | `pairingSecret: '',` |
| F6.5 | MEDIUM | Two complete AI Studio prototype applications remain on disk inside package trees (untracked, but present and confusing during inspection/tooling). | `packages/nodus-desktop/nodus-desktop-replica-1_1/`, `packages/nodus-fleet/nodus-fleet_uiux_prototype/` | duplicate `App.tsx`, 8 components, `vite.config.ts`, `tsconfig.json`, `metadata.json` each |
| F6.6 | MEDIUM | Stray duplicate `index.html` at the `nodus-fleet` package root outside `src/`, alongside the real one. | `packages/nodus-fleet/index.html` + `packages/nodus-fleet/nodus-fleet_uiux_prototype/index.html` + `packages/nodus-desktop/index.html` | — |
| F6.7 | LOW | Agent-studio code-snippet generator emits a full Node/Bun daemon with `exec`/`execSync` and a `Access-Control-Allow-Origin: '*'` HTTP server plus an embedded `AUTH_TOKEN` — a shipped artefact with wildcard CORS. | `packages/nodus-home/src/utils/platformSnippets.ts:756-762, 765` | `import { exec, execSync } from 'child_process';`<br>`const AUTH_TOKEN = process.env.AUTH_TOKEN \|\| '${cfg.authToken}';`<br>`res.setHeader('Access-Control-Allow-Origin', '*');` |

### Pillar 7 — Background Processes & User-Facing Toggles (MANDATORY)

| # | Sev | Finding | Location | Verbatim |
|---|---|---|---|---|
| F7.1 | **MANDATORY** | **Headless background daemons started unconditionally at app root with no user consent and no enable/disable toggle.** 1.2 s clipboard poll + 2.5 s fleet poll. | `packages/nodus-desktop/src/App.tsx:9-14`; `packages/nodus-desktop/src/services/DaemonManager.ts:58-77, 80-87` | `useEffect(() => {`<br>`const token = serverConfig?.auth_token \|\| serverConfig?.pairingSecret \|\| 'NODUS-FLEET-SECURE';`<br>`DaemonManager.start(token);`<br>`return () => DaemonManager.stop();`<br>`}, [serverConfig]);` |
| F7.2 | **MANDATORY** | The 2.5 s fleet-discovery poller has **no gate whatsoever** — not even the internal `isSyncEnabled` check the clipboard poller has. | `packages/nodus-desktop/src/services/DaemonManager.ts:80-87` | `this.fleetInterval = setInterval(async () => {`<br>`try { const discovered = await TauriService.getDiscoveredDevices(); ... } catch {}`<br>`}, 2500);` |
| F7.3 | **MANDATORY** | Dashboard pollers run unconditionally and are **recreated on every state change** (restart storm), with no toggle and no visibility awareness. | `packages/nodus-fleet/src/components/FleetDashboard.tsx:292-294, 316-318` | `const timer = setInterval(syncDiscoveredPeers, 3000);`<br>`return () => clearInterval(timer);`<br>`}, [fleetContext?.discoveredPeers, devices, trustedDevices]);` |
| F7.4 | **MANDATORY** | Additional unconditional background timers: 1 s clock, plus progress/transfer intervals. | `packages/nodus-fleet/src/components/FleetDashboard.tsx:185, 483, 519` | `const timer = setInterval(updateTime, 1000);` |
| F7.5 | **MANDATORY** | Android-side daemons/services run outside any Settings toggle: `FleetDaemonService`, `ClipboardSyncService`, `NodusAccessibilityService`, `NodusNotificationListenerService`, `UdpDiscoveryManager`. | `packages/nodus-fleet/android-shell/.../service/FleetDaemonService.kt`, `service/ClipboardSyncService.kt`, `net/UdpDiscoveryManager.kt`; `packages/nodus-home/android-shell/.../service/{NodusAccessibilityService,NodusNotificationListenerService}.kt` | — |
| F7.6 | HIGH | No "Experimental Features" / "Advanced Settings" **master gate** exists. Experimental toggles are scattered and per-feature; there is no single hidden-by-default switch that gates the background workers above. | `packages/nodus-home/src/context/SystemSettingsContext.tsx:75, 77`; `packages/nodus-home/src/types/launcher.ts:267-270`; `packages/nodus-desktop/src/components/views/AppSettingsPanel.tsx:671, 792` | `enableExperimentalPwaWindows: false,`<br>`enableExperimentalShizukuFreeform: false,` |
| F7.7 | MEDIUM | Kotlin discovery daemon binds wildcard UDP with a silent port-fallback and no visibility into failure. | `packages/nodus-desktop/src-tauri/src/discovery/mod.rs:619-623` (Rust) | `let socket = match UdpSocket::bind(format!("0.0.0.0:{}", DISCOVERY_PORT)) { ... match UdpSocket::bind("0.0.0.0:0") {` |

### Pillar 8 — Deep Security, Sandboxing & Attack Surface (CRITICAL)

| # | Sev | Finding | Location | Verbatim |
|---|---|---|---|---|
| F8.1 | **CRITICAL** | **Drive-by RCE from any website.** CORS **reflects any `Origin`** and explicitly allows the auth headers, while loopback callers are **auto-trusted with no token**. A page on `evil.com` can `POST http://127.0.0.1:9120/api/terminal/exec` and read the response. | `packages/nodus-desktop/src-tauri/src/server/mod.rs:170-175, 228-241, 1074-1099` | `if addr.ip().is_loopback() { return true; }`<br>`Some(o) if !o.is_empty() => o,` … `Access-Control-Allow-Origin: <reflected>`<br>`Access-Control-Allow-Headers: Content-Type, Authorization, X-Nodus-Auth-Token, X-Requested-With` |
| F8.2 | **CRITICAL** | **Shell metacharacter sanitization is never applied to the command/target itself** — only to `args`. Verified: `contains_dangerous_shell_chars` has exactly 2 call sites, and neither checks the command being executed. | `packages/nodus-desktop/src-tauri/src/commands/exec.rs:460-462, 511-516` (definition + only internal call) | `if let Some(a) = args { if contains_dangerous_shell_chars(a) { return Err(...) } }`<br>// `trimmed` (the command) is never checked |
| F8.3 | **CRITICAL** | **Unvalidated `cmd /c` injection.** `.bat`/`.cmd` path reaches `Command::new("cmd").args(["/c", trimmed])` with only an `is_absolute()`-gated path check. | `packages/nodus-desktop/src-tauri/src/commands/exec.rs:606-620` | `if p.is_absolute() && !is_path_whitelisted(p) { return Err(...) }`<br>`let mut c = Command::new("cmd");`<br>`c.args(["/c", trimmed]);` |
| F8.4 | **CRITICAL** | **Unvalidated PowerShell `-ExecutionPolicy Bypass` script execution.** | `packages/nodus-desktop/src-tauri/src/commands/exec.rs:587-602` | `cmd.args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", trimmed]);` |
| F8.5 | **CRITICAL** | **Path whitelist bypassed for all relative paths.** Every call site guards with `if p.is_absolute() && !is_path_whitelisted(p)`, so `..\..\evil.exe`, `evil.exe`, or any working-directory-relative path skips whitelisting entirely. | `exec.rs:570, 589, 608, 646` | `if p.is_absolute() && !is_path_whitelisted(p) {` |
| F8.6 | **CRITICAL** | **Whitelist root set includes the entire user profile**, so anything under `C:\Users\<user>\` (Downloads, Temp, AppData subtree) is an allowed execution target — this is not a canonical system root. | `exec.rs:420-437, 452-456` | `if let Ok(userprofile) = std::env::var("USERPROFILE") { roots.push(PathBuf::from(userprofile)); }`<br>`if let Ok(profile) = std::env::var("USERPROFILE") { if canonical.starts_with(Path::new(&profile)) { return true; } }` |
| F8.7 | **CRITICAL** | **UAC elevation path performs no validation whatsoever** — no metacharacter check, no whitelist, and `working_dir` is interpolated into a PowerShell `-Command` string with only single-quote escaping. | `exec.rs:519-543` | `if run_as_admin { ... if let Ok(res) = win32_shell_execute("runas", trimmed, args, working_dir) { return Ok(res); }`<br>`let mut ps_args = format!("Start-Process -FilePath '{}'", trimmed.replace('\'', "''"));`<br>`ps_args.push_str(&format!(" -WorkingDirectory '{}'", wd.replace('\'', "''")));` |
| F8.8 | **CRITICAL** | **PTY spawn endpoint accepts attacker-controlled `shell`, `args[]` and `cwd` with zero validation**, bypassing the metacharacter filter used by the sibling exec endpoint. | `server/mod.rs:1102-1124` | `let shell = req.get("shell").or_else(|| req.get("command")).and_then(\|v\| v.as_str()).map(\|s\| s.to_string());`<br>`let cwd = req.get("cwd")...;`<br>`let args = req.get("args")...` |
| F8.9 | HIGH | `/api/terminal/exec` metacharacter filter omits `>` `<` `"` `(` `)` `%` — **shell redirection passes**, giving an arbitrary file-write primitive. | `exec.rs:460-462`; `server/mod.rs:1079-1080` | `s.chars().any(\|c\| matches!(c, '&' \| '\|' \| ';' \| '\`' \| '$' \| '\n' \| '\r'))`<br>`"Command contains forbidden shell metacharacters (&, \|, ;, \`, $, newline)"` |
| F8.10 | HIGH | `cwd` is never metacharacter-checked on either terminal endpoint and is concatenated into a PowerShell script string. | `server/mod.rs:1078`; `exec.rs:327` | `let cwd = req.get("cwd").and_then(\|v\| v.as_str()).map(\|s\| s.to_string());`<br>`let mut script = format!("Set-Location -LiteralPath '{}'; ", valid_cwd.replace('\'', "''"));` |
| F8.11 | HIGH | Server binds all interfaces, with a silent fallback to a second port — two undocumented, unauthenticated-by-default network surfaces. | `server/mod.rs:342-352` | `let addr = format!("0.0.0.0:{}", port);`<br>`eprintln!("[NodusFleetServer] Failed to bind on {}: {}. Trying port 8080...", addr, e);`<br>`match Server::http("0.0.0.0:8080") {` |
| F8.12 | HIGH | Production CSP enables `'unsafe-eval'` and blanket `http:` in `connect-src`/`default-src`, defeating script-injection protection and permitting plaintext transport. | `packages/nodus-desktop/src-tauri/tauri.conf.json:36` | `"csp": "default-src 'self' tauri: http: https:; connect-src 'self' tauri: http: https: ws: wss:; img-src 'self' data: https: http:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval';"` |
| F8.13 | MEDIUM | Tauri capability granted to the `"*"` window wildcard, so any dynamically created window inherits the full permission set. | `packages/nodus-desktop/src-tauri/capabilities/default.json:5` | `"windows": ["main", "overlay", "*"],` |
| F8.14 | MEDIUM | Auth tests cover only token minting/CORS-header/payload helpers — **no test asserts that an unauthenticated request to `/api/pair` or `/api/terminal/exec` is rejected.** | `packages/nodus-desktop/src-tauri/src/server/mod.rs:1253` and 2 sibling `mod tests` | `test server::tests::test_auth_token_minting_and_registration` / `test_cors_headers_origin_matching` / `test_json_payload_deserialization` |
| F8.15 | MEDIUM | `Runtime.exec(arrayOf("sh", "-c", cmd))` in the Android shell — needs verification that `cmd` is not user-controlled. | `packages/nodus-home/android-shell/.../HomeActivity.kt:938` | `val process = Runtime.getRuntime().exec(arrayOf("sh", "-c", cmd))` |
| F8.16 | MEDIUM | Native auth test asserts nothing about rejection paths, and one test name references a helper whose name does not match the assertion made. | `server/mod.rs:1253` | `fn test_auth_token_minting_and_registration()` |

### Pillar 9 — Validation, Resilient Error Handling & User Notifications (CRITICAL)

| # | Sev | Finding | Location | Verbatim |
|---|---|---|---|---|
| F9.1 | **CRITICAL** | **Zero input-validation infrastructure in the entire codebase.** No `zod`, `yup`, `joi`, `ajv`, `valibot`, or `superstruct` — 0 imports of any. Every IPC/HTTP/form payload is unvalidated. | repo-wide (0 matches for all six libraries); closest thing is `serde_json::from_str` in Rust with `unwrap_or` defaults | `let pair_req: PairRequest = serde_json::from_str(&body_str).unwrap_or(PairRequest { device_id: None, name: None, ... });` (`server/mod.rs:715-725`) |
| F9.2 | **CRITICAL** | **Silent failure masquerading as success on system power control.** `spawn()` result discarded with `let _ =`; HTTP 200 `"status": "ok"` returned unconditionally, even off-Windows or on spawn failure. | `server/mod.rs:485-511` | `let _ = std::process::Command::new("rundll32.exe").args(["powrprof.dll,SetSuspendState", "0,1,0"]).spawn();`<br>`(200, json!({ "status": "ok", "action": "sleep" }))` |
| F9.3 | **CRITICAL** | 189 empty `catch` blocks + 2 bare `catch {}` + 79 console-only catches = **~40% of all error handling is silent.** | Full distribution: `AppGridContext.tsx` (17), `nodus-home/FleetContext.tsx` (11), `TauriCommands.ts` (10), `useFleetStore.ts` (9), `audio.ts` (6), `DaemonManager.ts:51,76,86`, `FleetDashboard.tsx` (12), `SystemSettingsContext.tsx:220,420,430`, `ClipboardContext.tsx` (4), `NotesContext.tsx` (2), `FloatingAssistiveCircle.tsx` (3), `platformSnippets`-adjacent, `AppSettingsPanel` path | `} catch {}` (DaemonManager.ts:76)<br>`} catch (_) {}` (FleetDashboard.tsx:95) |
| F9.4 | **CRITICAL** | **Whole test suite is red and the security-relevant test file is vacuous.** `bridgeProtocol.test.ts` cannot even parse (0 tests collected). Of the 7 tests it contains, 3 assert only `expect(client).toBeDefined()` — including one named *"should fall back to default auth token when empty string is passed"* which never inspects the token. | `packages/nodus-home/src/__tests__/bridgeProtocol.test.ts:38-51, 78` | `it('should fall back to default auth token when empty string is passed', () => {`<br>`const client = new NodusBridgeClient('127.0.0.1', 9120, '');`<br>`expect(client).toBeDefined();`<br>`});` |
| F9.5 | HIGH | **Only one ErrorBoundary exists in the whole monorepo**, at the `nodus-home` root. `nodus-fleet` and `nodus-desktop` have **zero** — any render crash is a blank window. | `packages/nodus-home/src/App.tsx:14-62`; `packages/nodus-fleet/src/App.tsx:1-10`; `packages/nodus-desktop/src/App.tsx:1-17` | `export default function App() { return (<FleetProvider><FleetDashboard /></FleetProvider>); }` (fleet — no boundary) |
| F9.6 | HIGH | The single ErrorBoundary offers no graceful recovery — the only remedy is a full page reload, discarding all state. No error reporting/telemetry (console only). | `packages/nodus-home/src/App.tsx:24-26, 41-48` | `componentDidCatch(error: Error, errorInfo: any) { console.error('[Nodus Home Crash]', error, errorInfo); }`<br>`onClick={() => { window.location.reload(); }}` |
| F9.7 | HIGH | `/api/pair` **silently defaults every field** on malformed input instead of rejecting — a garbage body still yields a valid device + token. | `server/mod.rs:715-733` | `serde_json::from_str(&body_str).unwrap_or(PairRequest { device_id: None, name: None, public_key: None, ... })`<br>`let dev_name = pair_req.name.unwrap_or_else(\|\| "Tablet Device".to_string());` |
| F9.8 | MEDIUM | Empty `stdout` is returned as `success: true` with `exit_code: 0` when the command is blank — a no-op reported as a successful execution. | `exec.rs:294-306` | `if trimmed.is_empty() { ... return Ok(TerminalExecResult { stdout: String::new(), stderr: String::new(), exit_code: 0, success: true, ... }); }` |
| F9.9 | MEDIUM | Telemetry endpoints silently substitute placeholder values when stats collection fails, so a failed read is indistinguishable from real data. | `server/mod.rs:411-415` | `let stats = get_system_stats().ok();`<br>`let ram_used = stats.as_ref().map(\|s\| s.ram_used_mb).unwrap_or(0);`<br>`.unwrap_or_else(\|\| "Workstation (PC)".to_string())` |
| F9.10 | MEDIUM | Persistence reads swallow parse errors and silently return the synthetic fallback, so corrupt state is invisible to the user. | `packages/nodus-home/src/context/FleetContext.tsx:78-95, 128-134`; `NotesContext.tsx:56-61`; `SystemSettingsContext.tsx:165-192` | `} catch (_) {}` … `return INITIAL_DEVICES;` |
| F9.11 | MEDIUM | No `nodus-fleet` test suite at all, and `nodus-common` has none — 2 of 4 packages have zero automated coverage. | `packages/nodus-fleet/package.json:6-13`; `packages/nodus-common/package.json` | `"scripts": { "dev", "build", "sync:assets", "preview", "clean", "lint" }` (no `test`) |

---

## 3. Cross-Cutting Attack Chain (F1.1 + F1.3 + F8.1)

The three critical findings compose into a single unauthenticated remote-code-execution path requiring **no user interaction**:

```
Step 1  POST http://<any-LAN-host>:9120/api/pair        body: {"device_id":"x","name":"x"}
        → is_public == true                      (server/mod.rs:401)  → no token required
        → add_trusted_token(token)               (server/mod.rs:753)  → token now trusted
        → 200 {"authToken":"nodus-sec-…"}        (server/mod.rs:778)  → token returned to caller

Step 2  POST http://<any-LAN-host>:9120/api/terminal/exec
        Authorization: Bearer nodus-sec-…
        body: {"command":"<any command without & | ; ` $ \\n \\r>"}
        → is_authorized == true                  (server/mod.rs:213)
        → metachar filter passes (redirection allowed)  (exec.rs:461, F8.9)
        → powershell -Command "<script>"         (exec.rs:330-331)
        → 200 {"stdout":"…"}                     (server/mod.rs:1083-1089)
```

Two independent variants reach the same result without even Step 1:
- **Loopback + CORS reflection (F8.1):** any website the user visits can call `http://127.0.0.1:9120/api/terminal/exec` — `is_authorized` returns `true` for loopback with no token (`:170-175`) and the reflected `Access-Control-Allow-Origin` lets the page read stdout.
- **Static secret (F1.3):** `X-Nodus-Auth-Token: NODUS-FLEET-SECURE` authorizes any protected endpoint directly. The literal is in AGPL source intended for redistribution.

---

## 4. Onboarding Scaffolding Blueprint (Baseline Mode — mandatory deliverable)

Per `07_independent_auditor_protocol.md` §4, this project has **no** `living_context.md`. The following scaffolding is required before any Pass 2 verdict can be issued.

### 4.1 Directory structure to create

```
project-nodus/generated-documents/
  ├── context/
  │   ├── living_context.md            ← permanent architectural memory + Mock Registry + Security Model
  │   ├── project_brief_v1.0.md        ← scope, goals, explicit non-goals
  │   └── contracts/
  │       └── data_shapes.ts           ← canonical domain models
  ├── plans/
  ├── issues/
  ├── handoffs/
  └── audits/
```

### 4.2 `.gitignore` lines to append

`.gitignore` currently has **no** `generated-documents` entry. Verified: `git ls-files` returns **0** tracked files under `generated-documents/`, so `living_context.md` and `plans/` are currently unversioned — they will be lost or silently divergent across clones.

```gitignore
# Workflow Ephemeral Session Documents
/generated-documents/handoffs/
/generated-documents/audits/
/generated-documents/gaps/
/generated-documents/test-reports/
```

`context/` and `plans/` must remain **tracked** per the Document Lifecycle rules.

### 4.3 `living_context.md` baseline content outline (facts extracted in Phase 2)

| Section | Content to record (verified this audit) |
|---|---|
| Architecture | npm workspaces monorepo, 4 packages: `nodus-common` (dead), `nodus-home` (Android launcher, Vite + Kotlin WebView), `nodus-fleet` (dashboard, Vite + Kotlin WebView), `nodus-desktop` (Tauri v2 + Rust) |
| Build scripts | root `dev:home`/`build:home`/`dev:fleet`/`build:fleet`/`dev:desktop`/`build:desktop`/`build`/`build:all`/`test:home`/`test:desktop`/`test`/`sync:android`/`clean` |
| Gate status | `test` **RED** (`bridgeProtocol.test.ts` unparseable); `nodus-desktop` has **no** `lint` script; `nodus-fleet` has **no** `test` script |
| Native surface | Rust `src-tauri` binds `0.0.0.0:9120` (fallback `:8080`); Kotlin `FleetHttpServer` on the tablet; both expose exec/system-control/pairing |
| Security model | **MUST be documented as a known-defect state**: static secret `NODUS-FLEET-SECURE`, loopback auto-trust, Origin-reflecting CORS, `pairingSecret` unimplemented |
| Mock Registry | F1.6, F1.7, F1.10, F1.12, F3.1, F6.3 — every entry below must be registered here or relocated to `mocks/`/`__fixtures__/` |
| Background workers | F7.1–F7.5 — clipboard 1.2 s, fleet 2.5 s, peers 3 s, LAN 5 s, clock 1 s, 5 Kotlin services; **none** behind a Settings toggle |
| Contract option | Recommend **Option A** (single source) after F4.1/F4.2 are resolved |

### 4.4 Model extraction blueprint for `contracts/data_shapes.ts`

Three divergent declarations must be reconciled into one canonical file. Candidate models identified by divergent declaration site:

- `DeviceInfo` — `nodus-desktop/src/types/ui-contracts.ts` ↔ `nodus-home/src/types/launcher.ts` ↔ `nodus-fleet/src/types/ui-contracts.ts` ↔ `nodus-common/src/index.ts` (F4.2)
- `DeviceProcess`, `ClipboardItem`, `AppItem`, `NoteItem`, `NotificationItem`, `RemoteExecutable`, `TrustedDevice` — same four sites
- `NetworkServerConfig`, `WindowsBridgeConfig`, `AndroidBridgeConfig`, `ClipboardSyncSyncConfig` — `nodus-home/src/utils/constants.ts:210-253` (note: the F1.14 `pairingSecret` field must be reconciled with the actual Rust auth model)
- `ServerConfig` — `nodus-desktop/src/stores/useFleetStore.ts:38` vs `nodus-fleet/src/context/FleetContext.tsx:47` (two divergent shapes)
- IPC boundary payloads (currently unvalidated, F9.1): `PairRequest`, `ExecReq`, `SystemControlReq`, `KillProcReq`, `MediaControlReq`, `PtySpawnRequest`
- Rust structs that must mirror these: `DiscoveredDeviceNode` (`discovery/mod.rs`), `SystemStats`, `TerminalExecResult` (`exec.rs`)

Per Invariant 3, the Kotlin/TS/Rust tri-stack makes this an **Option B (polyglot)** mirror-sync case: `scripts/check-contract-sync.mjs` does not exist and must be created.

### 4.5 Mock quarantine migration table (for the Mock Registry)

| Symbol | Current location | Disposition required |
|---|---|---|
| `INITIAL_DEVICES` | `nodus-home/src/utils/constants.ts:72` | Move to `src/__fixtures__/`; production must init `[]` |
| `DEFAULT_PLAYLIST` | `nodus-home/src/context/SystemSettingsContext.tsx:456` | Remove (no audio source — F6.2) or quarantine |
| `DEFAULT_LOCAL_TABLET` | `nodus-fleet/src/context/FleetContext.tsx:34` | Quarantine |
| `DEFAULT_LOCAL_HOST` | `nodus-desktop/src/stores/useFleetStore.ts:52` | Quarantine |
| `MOCK_PROCESSES`, `MOCK_SYSTEM_STATS`, `INITIAL_SHORTCUTS` | `nodus-desktop/src/__fixtures__/desktopFixtures.ts:3,12,21` | Already quarantined — **delete as dead** (F6.3) |
| `DEFAULT_MACRO_SNIPPETS`, `DEFAULT_HOTKEYS`, `DEFAULT_PRESETS` | `nodus-fleet/src/components/{RemoteControlTab,RemoteAppShortcuts}.tsx:54,64,48`; `nodus-desktop/src/components/views/RemoteControlTab.tsx:67,77` | Presets vs. inline defaults must be distinguished and registered |
| Synthetic pairing telemetry | `server/mod.rs:743-746` | **Remove** — native backend must not fabricate device metrics |
| `DEFAULT_SETTINGS`, `DEFAULT_QUICK_SETTINGS` | `nodus-home/src/context/SystemSettingsContext.tsx:36, 80` | Legitimate config defaults — register as such, not as mocks |

---

## 5. Verification Metrics Summary

| Metric | Value | Source |
|---|---|---|
| Hand-written source files | 175 | Phase 2 |
| Hand-written LOC | 59,424 | Phase 2 |
| `: any` / `as any` / `<any>` | **278** | Phase 3 sweep |
| Total `catch` blocks | 530 | Phase 3 sweep |
| Empty `catch` blocks | **189 (35.6%)** | Phase 3 sweep |
| Bare `catch {}` | 2 | `DaemonManager.ts:76, 86` |
| Console-only catches | 79 | Phase 3 sweep |
| ErrorBoundary implementations | **1** (of 3 apps) | `nodus-home/src/App.tsx:14` |
| Validation libraries | **0** | Phase 3 sweep |
| Background intervals/poller hooks | 8+ TS, 5 Kotlin services | F7.1–F7.5 |
| Test files passing | 4 of 5 (nodus-home); 3 native | Phase 1 |
| `nodus-fleet` test coverage | **none** | F9.11 |
| Filenames duplicated across packages | 16 | Phase 2 |
| Unused/bloated dependencies | 5 | F5.1–F5.4 |
| Unauthenticated public endpoints | 7 | `server/mod.rs:397-403` |

---

## 6. Pass 1 Halt Directive

**Pass 1 Independent Audit complete.** Raw findings recorded with line-level citations across all 9 pillars.

**PROHIBITION OBSERVED:** The auditor has halted and will **NOT** self-reconcile. No finding in this report has been classified as `[APPROVED TRADEOFF]`, `[QUARANTINED MOCK]`, or downgraded. No code was modified. The pre-existing 2026-09-13 audit report was rotated to `archives/audits/` **without being read**, to preserve Pass 1 blindness.

To reconcile this audit, prompt the **Prod Agent** with the literal path of this report:

```
reconcile audit generated-documents/audits/raw_findings_full_codebase_2026-09-30.md
```

> **Note for Pass 2 (Prod Agent):** this is an **UNADAPTED** codebase — no `living_context.md` exists, therefore **zero tradeoffs and zero mocks are pre-approved**. Under `07_independent_auditor_protocol.md` §4, every finding above is an open defect against production readiness until the human explicitly approves a tradeoff in a newly created Living Context Document. The Onboarding Scaffolding Blueprint (§4) must be actioned as part of reconciliation.

---

*End of Pass 1 Raw Findings — PROJECT-NODUS — 2026-09-30*
