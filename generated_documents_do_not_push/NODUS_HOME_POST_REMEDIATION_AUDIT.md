# Post-Remediation Verification Audit — `packages/nodus-home` (v1.2.1)

**Audit date:** 2026-09-03
**Reference commit:** `4f4863d` — "fix: v1.2.1 - resolve tsc typecheck gate, de-hardcode fleet security token & non-destructive error recovery"
**Baseline docs:** `NODUS_HOME_PRODUCTION_AUDIT.md`, `NODUS_HOME_PRODUCTION_REMEDIATION_PLAN_v2.md`
**Method:** Every finding below was reproduced/verified directly against the current working tree (clean `git status`, tag v1.2.1).

**Ship Readiness Verdict: 🟠 IMPROVED — STILL NOT PRODUCTION-READY**
The blocking typecheck gate is fixed and the destructive state wipe is removed, but the
security remediation is **incomplete** (the insecure token remains as a default; most LAN RPC
calls still send no auth), and Phases 3, 5, and 6 are entirely unaddressed.

---

## 1. Verification Matrix (per Phase)

| Phase | Target | Status | Verification |
|---|---|---|---|
| 1 | Type integrity + CI gate | 🟢 **DONE** (partial) | `npm run lint` exit **0**; `npm run test` **14/14 pass**. Fix added `pageIndex`/`order` with `existing?.order ?? idx`. CI step **NOT** added (see §5). |
| 2 | Zero-trust security / de-hardcode token | 🟡 **PARTIAL** | Headers centralized via `getSessionToken()`/`getActiveFleetSessionToken()`, but static token remains as default; auth gaps on most RPC calls persist. |
| 3 | Lifecycle-aware polling | 🔴 **NOT DONE** | No `useVisibilityPoller`; Clipboard 1s, Telemetry 5s, Notifications 2.5s unchanged. |
| 4 | Fault tolerance / state persistence | 🟡 **PARTIAL** | `localStorage.clear()` removed; no schema validation or `storage.ts`. |
| 5 | Dep pruning + bundle + CI | 🔴 **NOT DONE** | `@google/genai`, `motion`, `dotenv` still in deps; bundle 604.94 kB (no splitting); CI still `npm ci \|\| npm install`, no lint/test. |
| 6 | Test authoring + release signing | 🔴 **NOT DONE** | No new behavioral tests; release still `minifyEnabled false`, silent unsigned build. |

---

## 2. What is FIXED and verified ✅

### 2.1 TypeScript typecheck gate passes (Blocking blocker resolved)
Reproduced the prior failure (`AppGridContext.tsx(270,21) ... missing pageIndex, order`), then
verified the v1.2.1 fix.

```typescript
// AppGridContext.tsx ~line 282
pageIndex: existing?.pageIndex ?? 0,
order: existing?.order ?? idx,     // uses idx, avoiding duplicate order:0
```

- `npm run lint` (`tsc --noEmit`) → **exit 0, zero errors**.
- `npm run test` (`vitest run`) → **4 files, 14 tests, all passing**.
- Production `vite build` still succeeds (bundle updated from `index-DRLujugw.js` →
  `index-CYrPybv6.js`).

### 2.2 Destructive ErrorBoundary wipe removed
`App.tsx` no longer calls `localStorage.clear()`; the button now reads "Reload Launcher" and
only reloads. User launcher state (folders, app order, settings) is preserved on render
recovery. (Non-destructive concern from the original audit is resolved.)

### 2.3 Auth-header injection centralized
Both the web-fetch path and the Kotlin native-bridge path now read the session token
dynamically instead of inline-hardcoding it at the request site:

- `FleetDirectClient.ts` → `getActiveFleetSessionToken()` + header injection in
  `universalNetworkFetch`.
- `HomeActivity.kt:466-467` → `"Bearer ${getSessionToken()}"` / `getSessionToken()` , plus new
  `@JavascriptInterface getSessionToken()` / `setSessionToken()`.

---

## 3. Critical security gaps REMAINING 🔴

### 3.1 The insecure token is still the DEFAULT
The remediation moved the secret into a helper but **kept it as the default value**. A fresh
install with no paired token still transmits `NODUS-FLEET-SECURE`:

- `FleetDirectClient.ts:26` `bridge.getSessionToken() || 'NODUS-FLEET-SECURE'`
- `FleetDirectClient.ts:28` `sessionStorage.getItem(...) || 'NODUS-FLEET-SECURE'`
- `FleetDirectClient.ts:30` `return 'NODUS-FLEET-SECURE';`
- `HomeActivity.kt:455` `private var activeSessionToken: String = "NODUS-FLEET-SECURE"`

**Impact:** The APK-decompilation verification bar ("no static authorization tokens in
bytecode") from the remediation plan **still fails**. The static string remains fully
recoverable and is actively used until a token is set.

**Required fix:** default the token to **empty**, fail closed (401/refuse) on unconfigured
token, and enforce a bootstrap pairing (PIN/QR) to establish the first token.

### 3.2 Most LAN RPC calls still send NO auth headers
`getActiveFleetSessionToken()` is only applied inside `universalNetworkFetch`. The following
methods still call **bare `fetch()`** with no `Authorization` / `X-Nodus-Auth-Token`:

- `FleetDirectClient.ts`: `killProcess` (:135), `executeCommand` (:150), `sendClipboard` (:165),
  `sendMouseMove` (:180), `sendMouseClick` (:194), `sendMouseScroll` (:208), `sendHotkey` (:222),
  `sendText` (:236).
- `FleetContext.tsx:544` `lockDevice` — raw `fetch(.../api/lock, { method: 'POST' })`, no headers.

**Impact:** Remote process termination, arbitrary command execution (with `runAsAdmin`),
mouse/keyboard input injection, clipboard sync, and lock are **unauthenticated** from the
tablet. Any LAN peer can drive these endpoints. The `fetchWithAuth` centralization proposed in
Plan v2 was **not** wired through these call sites.

### 3.3 Not addressed: encrypted storage, pairing handshake, cleartext scoping
- Token is held in a plain Kotlin `var` (memory only, not persisted) and web `sessionStorage`;
  no `EncryptedSharedPreferences` / Keystore-backed store.
- No bootstrap pairing protocol (PIN/QR/ECDH) — no path to a trustworthy first token.
- `AndroidManifest.xml` still has `usesCleartextTraffic="true"` app-wide; no
  `network_security_config.xml` scope added.

---

## 4. Partially / not addressed — remaining gaps

### 4.1 Phase 3 — pollers (🔴 unchanged)
- Clipboard **1s** (`ClipboardContext.tsx:315`), Fleet telemetry **5s** (`FleetContext.tsx:231`),
  Notifications **2.5s** (`SystemSettingsContext.tsx:379`), Calendar **60s**.
- No `useVisibilityPoller` hook exists (only `useFleetDetection.ts` is present in `hooks/`).
- No `visibilitychange`/`focus`/`blur` gating and no native `onPause` handoff.

### 4.2 Phase 4 — state validation (🟡 partial)
- Destructive wipe removed (good), but no `storage.ts`, no schema validation, and
  `ErrorBoundary` still reloads the whole app rather than isolating the failing subtree
  (`<SafeFallbackDesktopUI>` from the plan was not implemented).

### 4.3 Phase 5 — bundle & CI (🔴 unchanged)
- Dead deps still present: `@google/genai`, `motion`, `dotenv` in `dependencies`.
- **Bundle regressed slightly**: main JS now **604.94 kB** minified (158.15 kB gzip),
  still > 500 kB warning threshold, no manual chunking.
- `.github/workflows/build-apk.yml` **unchanged**: still `npm ci || npm install` (silent
  lockfile fallback), no `lint`, no `test`, no `tsc` step. The typecheck gate that now passes
  locally is **not enforced in CI**.

### 4.4 Phase 6 — tests & release signing (🔴 unchanged)
- Still only 14 tests across 4 files; no behavioral tests for `FleetContext`, `AppGridContext`,
  `FleetDirectClient` auth paths, `RemoteShortcutsService`, or a `storage` helper.
- `app/build.gradle:35` release still `minifyEnabled false`; release signing still degrades
  silently if `keystore.properties` is absent.

---

## 5. CI / gate status

| Item | Required | Actual |
|---|---|---|
| `tsc --noEmit` in CI | Must block on error | ❌ Not in workflow |
| `vitest run` in CI | Must be part of PR gates | ❌ Not in workflow |
| Reproducible install | `npm ci` | ❌ Still `npm ci \|\| npm install` |
| Crash logs gitignored | `hs_err_pid*.log`, `replay_pid*.log` | ❌ Not added (still present on disk) |

---

## 6. Positive verification summary

- ✅ Local typecheck gate passes (exit 0) — was the top priority.
- ✅ All 14 unit tests pass.
- ✅ Destructive `localStorage.clear()` removed from `ErrorBoundary`.
- ✅ Auth-header *injection* centralized in both web and native paths.
- ✅ No uncommitted changes (clean working tree, tagged v1.2.1).

---

## 7. Priority remediation required before next ship attempt

1. **Fail closed on token** — remove all `'NODUS-FLEET-SECURE'` defaults (TS ×3, Kotlin ×1);
   empty token ⇒ refuse/401. Add a real bootstrap pairing handshake (PIN/QR) + encrypted token
   storage. *(Blocker)*
2. **Uniform auth** — route `killProcess`, `executeCommand`, `sendClipboard`,
   `sendMouseMove/Click/Scroll`, `sendHotkey`, `sendText`, and `lockDevice` through a single
   authenticated helper. *(Blocker — currently unauthenticated RCE vector)*
3. **Add CI gates** — `lint` + `test` steps and `npm ci` in the existing `build-apk.yml`.
4. **Implement Phase 3** (lifecycle poller) and **Phase 4** (schema validation / isolated
   fallback UI).
5. **Prune deps** (`@google/genai`, `motion`, `dotenv`), enable Vite chunking, release
   minification + loud failure on missing release keystore.
6. **Gitignore + delete** JVM crash logs.

---

## Bottom line

The remediation's **highest-priority fix (the failing typecheck gate) is genuinely fixed and
verified**, and the destructive state wipe is gone. However, the security remediation is
**only partially complete**: the static auth token survives as the default, and the most
dangerous endpoints (process kill, command exec, input injection, lock) are still
**unauthenticated**. Combined with unaddressed Phases 3/5/6 and a CI pipeline that still
doesn't run the passing gates locally, this package is **progressed but not yet
production-ready**.
