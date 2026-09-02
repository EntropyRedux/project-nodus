# Production Ship-Readiness Audit — `project-nodus/packages/nodus-home`

**Audit date:** 2026-09-03
**Scope:** `packages/nodus-home` (with root workspace / CI context)

**Verdict: 🔴 NOT SHIP-READY for production.** The package builds, but fails its own
typecheck gate, contains hardcoded secrets, has sensitive files on disk outside
`.gitignore`, and has near-zero meaningful automated test coverage for the
largest/most security-sensitive surface.

---

## 1. CRITICAL — Verified failures

| # | Severity | Finding | Evidence |
|---|----------|---------|----------|
| 1 | 🔴 Blocking | **`tsc --noEmit` fails CI gate** | `npm run lint` errors: `AppGridContext.tsx(270,21): ... is missing 'pageIndex', 'order'`. `nativeApps` annotated `AppItem[]` but constructed without required `pageIndex`/`order` fields (added later in `repacked` at line 293). |
| 2 | 🔴 Blocking (logic) | **Type-safety silently bypassed in production** | `vite build` succeeds (esbuild strips types, no check) → the type violation ships in the APK even though the typecheck gate fails. Build output confirmed success for the broken type. |
| 3 | 🔴 Security | **Hardcoded auth secret** `NODUS-FLEET-SECURE` | `FleetDirectClient.ts:66-67` (web fetch) and `HomeActivity.kt:466-467` (native `httpFetch`). Static, never rotated, recoverable from decompiled APK (`dex2jar`/`jadx`). |
| 4 | 🔴 Security | **Sensitive files present on disk** | `android-shell/local.properties` (leaks `C:\Users\mbula\...`), **9 JVM crash logs** (`hs_err_pid*.log`/`replay_pid*.log`) that can leak paths/env/JVM layout. Not committed (verified via `git ls-files`), but only `local.properties` is gitignored; crash logs are NOT ignored. |
| 5 | 🟠 Security | **`QUERY_ALL_PACKAGES` + `usesCleartextTraffic="true"`** | `AndroidManifest.xml:8,38`. Cleartext HTTP allowed; `QUERY_ALL_PACKAGES` is Play-Store-restricted and requires justification. |
| 6 | 🟠 Compliance/UX | **Release build not hardened** | `app/build.gradle:35` `minifyEnabled false` → no shrinking/obfuscation for release. Release signing silently degrades (no validation if `keystore.properties` missing). |

---

## 2. Test coverage — effectively absent for the risky surface

- **4 test files pass (14 tests)** — verified with `npm run test`.
- But coverage is **superficial**: `LauncherContext.test.tsx` only asserts that methods
  exist; `ClipboardContext.test.tsx` tests pure inference logic in one mock container;
  `iconRegistry.test.ts` covers the common package.
- **Zero tests** for:
  - `FleetContext.tsx` (750 lines — remote exec, process kill, reboot, lock, trust/permissions model)
  - `AppGridContext.tsx` (1033 lines — app launch, freeform windows, native install sync — the file with the type bug)
  - `FleetDirectClient.ts` (234 lines — all LAN auth/HTTP)
  - `RemoteShortcutsService.ts` (348 lines)
  - All 36 React components, all 7 utils, the `HomeActivity.kt` bridge (1383 lines).
- The `nodus-home` test command does NOT run any Android/Kotlin tests, despite
  `versionCode 1` / debug-only APK.

---

## 3. Resilience & correctness concerns (high risk for a launcher)

- **Aggressive polling** that never pauses when the app is backgrounded or the panel is closed:
  - Clipboard: **1s interval** × every remote node (`ClipboardContext.tsx:315`)
  - Fleet telemetry: **5s** × every device (`FleetContext.tsx:231`)
  - Notification sync: **2.5s** (`SystemSettingsContext.tsx:379`)
  - Calendar: **60s**
  → Constant battery/network drain on a 120Hz tablet.
- **Inconsistent auth path**: `killProcess`, `executeCommand`, `sendClipboard`,
  `sendMouseMove/Click/Scroll`, `sendHotkey`, `sendText`, and `lockDevice`
  (FleetContext:544; FleetDirectClient:123-233) use raw `fetch()` **without** the
  `Bearer`/`X-Nodus-Auth-Token` headers. The companion server's token protection is
  therefore inconsistently applied — mixed secured/unsecured endpoints.
- **Pervasive `as any` casts** (`useSystemSettings() as any` at FleetContext:70; `window as any`
  bridge everywhere) → the native bridge is untyped, so contract drift between the Kotlin
  mirror and TS is invisible to the compiler.
- **`localStorage` as unvalidated source of truth**: device/clipboard/settings state
  deserialized with no schema validation; legacy keys (`nova_launcher_*`) still written/read,
  indicating incomplete migration.
- **`ErrorBoundary` clears `localStorage` on error** (`App.tsx:37`) — a single render error
  wipes all user launcher state. Destructive recovery.
- **Bundle bloat**: main JS `603.82 kB` minified (157.81 kB gzip) — exceeds Vite's 500 kB
  warning; **no code splitting/dynamic import**. Startup parse cost matters on a WebView launcher.

---

## 4. Dependency & build hygiene

- `@google/genai`, `dotenv`, `motion` in `dependencies` but no production use found in
  `nodus-home` source → dead weight inflating the bundle.
- `vite` (v6) and helpers are in **dependencies**, not devDependencies — inappropriate for a
  runtime-only frontend.
- `@nodus/common` wired via both `file:../nodus-common` and a Vite `resolve.alias` to
  `../nodus-common/src` (`vite.config.ts:13`) — **dual resolution**; also `@/*` alias maps to
  `./*` (tsconfig) which is fragile.
- Duplicate vendored Kotlin mirrors (`NodusIpcContract.kt` in `nodus-common/src/kotlin/` AND
  copied into each android-shell) must be kept in sync by hand — a known drift risk
  acknowledged in the file itself.

---

## 5. CI/CD (`.github/workflows/build-apk.yml`)

- Builds **debug** APK only, `timeout-minutes: 15` (tight for Gradle path).
- **Does not run `tsc --noEmit`, `vitest`, or Cargo tests** — so the blocking type error and
  every regression sails through CI. `npm ci || npm install` silently falls back, defeating
  lockfile reproducibility.
- No release build, no `assembleRelease`, no signing, no artifact verification.

---

## Recommended pre-ship checklist (gate before production)

1. **Fix the type error** at `AppGridContext.tsx:270` (construct with `pageIndex`/`order`
   upfront or type the intermediate properly).
2. **Add typecheck + tests to CI** so gates actually enforce quality.
3. **Rotate/remove the hardcoded `NODUS-FLEET-SECURE`** → runtime-provided token; unify auth
   on *all* HTTP paths.
4. **Add `hs_err_pid*.log`/`replay_pid*.log` to `.gitignore`** and delete the 9 present.
5. **Reconsider `QUERY_ALL_PACKAGES`** (replace with explicit `<queries>`) and scope
   `usesCleartextTraffic` to the LAN host only.
6. **Add degradation-safe release signing** + enable minification/ProGuard.
7. **Throttle/pause pollers** when panels are closed or app backgrounded.
8. **Code-split** the bundle and purge unused deps.

---

## Bottom line

The feature set is substantial and the code is coherent, but the combination of a failing
typecheck gate, hardcoded secrets, missing test coverage on the security-critical surfaces,
and inconsistent auth means this is **not ready to ship to production**. It would currently
ship a type-broken bundle with a static auth token over cleartext HTTP.
