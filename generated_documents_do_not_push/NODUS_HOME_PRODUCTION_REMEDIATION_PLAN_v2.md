# Nodus Home: Production Remediation & Refactoring Strategy Plan (REVISED)

**Document Version:** 2.0.0 (revision of v1.0.0)
**Target Package:** `packages/nodus-home` (`project-nodus-home`)
**Created:** September 3, 2026
**Revised:** September 3, 2026
**Status:** APPROVED FOR IMPLEMENTATION (after revisions below are incorporated)

> This revision supersedes v1.0.0. It corrects markdown/code-fence corruption, closes the
> TypeScript↔Kotlin token seam, scopes the full dependency cleanup, adds test-authoring
> tasks, and corrects the CI step (the workflow already exists and must be **modified**, not
> created). The four source artifacts that drove these changes are verified against the
> current codebase.

---

## 1. Executive Summary

Following the audits in `NODUS_HOME_PRODUCTION_AUDIT.md` and
`audit_report_nodus_home.md`, this document is the **executable** remediation roadmap to
transition Nodus Home from internal development build to a **Production-Grade, Battle-Tested
Launcher**.

### Key Resolution Targets

1. **Build & Type Integrity** — Eliminate all `tsc --noEmit` errors and enforce zero-tolerance
   CI gates (`lint` + `test` must run in the existing workflow).
2. **Zero-Trust Security Model** — Remove the static `NODUS-FLEET-SECURE` token from **both**
   the TypeScript client and the Kotlin `NodusNativeBridge`; implement dynamic session pairing
   with uniform HTTP authorization on **100%** of LAN RPC paths.
3. **Performance & Battery Optimization** — Replace aggressive background timers with
   lifecycle-aware poller controls (Clipboard 1s, Telemetry 5s, Notifications 2.5s).
4. **Resilience & Fault Tolerance** — Replace the destructive `localStorage.clear()` in
   `ErrorBoundary` with non-destructive fallback rendering.
5. **Clean Architecture & Bundle Hygiene** — Prune ghost dependencies (`@google/genai`,
   `motion`, `dotenv`) and optimize Vite build chunking.

---

## 2. Phased Remediation Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│                   NODUS HOME PRODUCTION REMEDIATION                    │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: Build Integrity & Type Gate (Immediate)                      │
│   • Fix AppGridContext.tsx native app object construction mapping     │
│   • Enforce strict `tsc --noEmit` + `vitest` in npm scripts and CI    │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Security & Network Hardening (High Priority)                 │
│   • De-hardcode `NODUS-FLEET-SECURE` in BOTH TS client and Kotlin     │
│   • Add bridge endpoint(s) for dynamic session-token storage          │
│   • Unify `fetchWithAuth` across ALL LAN RPC endpoints                │
│   • Add `network_security_config.xml` to scope cleartext to LAN host  │
│   • Add `.gitignore` entries for JVM crash logs                       │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Lifecycle-Aware Polling & Battery Preservation (Medium)      │
│   • `useVisibilityPoller` hook + `visibilitychange`/`focus`/`blur`    │
│   • Throttle Clipboard, Fleet, and Notification timers on background  │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Fault Tolerance & State Persistence (Medium)                 │
│   • Remove `localStorage.clear()` from React `ErrorBoundary`          │
│   • Add schema validation (Zod/lightweight) for all `localStorage`    │
│   • Add unit tests for the state-migration/deserializers              │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: Bundle Optimization & CI Pipeline Hardening (Pre-Ship)       │
│   • Prune `@google/genai`, `motion`, `dotenv`                         │
│   • Configure Vite dynamic chunk splitting                            │
│   • EXTEND existing `.github/workflows/build-apk.yml` with lint+test  │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 6: Test Expansion & Release Signing (Pre-Ship)                  │
│   • Author real tests for Fleet/AppGrid/Clipboard/RemoteShortcuts     │
│   • Add degradation-safe release signing + enable minification        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Technical Execution Strategy

### Phase 1: Build Integrity & Type Safety Gate

#### Issue
`tsc --noEmit` fails at `AppGridContext.tsx:270` because native app items mapped from
`NodusNativeBridge.getInstalledApps()` are typed as `AppItem[]` but constructed without the
required `pageIndex` and `order` properties upfront.

#### Technical Solution
Instantiate `pageIndex`/`order` inside the `nativeApps` mapping using existing values (or a
sensible default) rather than relying solely on later repacking:

```typescript
// AppGridContext.tsx (Phase 1 Fix, lines ~270-284)
const nativeApps: AppItem[] = list.map((item, idx) => {
  const appId = `pkg_${item.packageName}`;
  const existing = existingMap.get(appId);
  return {
    id: appId,
    name: item.label,
    packageName: item.packageName,
    customIcon: item.icon || undefined,
    iconName: 'Smartphone',
    color: palette[idx % palette.length],
    category: item.isSystemApp ? 'system' : 'productivity',
    isRemovable: !item.isSystemApp,
    pageIndex: existing?.pageIndex ?? 0,
    order: existing?.order ?? idx,   // use idx (not 0) to avoid duplicate order:0
    folderId: existing?.folderId ?? null,
  };
});
```

> **Revision note (was `?? 0`):** use `idx` as the fallback for `order` to avoid several
> apps sharing `order: 0` before continuous repacking normalizes them.

#### CI Enforcement
Add to the **existing** `.github/workflows/build-apk.yml` (it already exists; modify only):

```yaml
- name: Type Check
  run: npm --prefix packages/nodus-home run lint

- name: Run Unit Tests
  run: npm --prefix packages/nodus-home run test
```

Place these BEFORE the frontend build + APK compilation steps, and replace the lax
`npm ci || npm install` with a hard `npm ci` so lockfile drift fails the build.

---

### Phase 2: Zero-Trust Security & Network Hardening

#### Issue
The static token `'NODUS-FLEET-SECURE'` is hardcoded in **two** places:
`FleetDirectClient.ts:66-67` (web fetch) and `HomeActivity.kt:466-467` (Kotlin
`NodusNativeBridge.httpFetch`). Additionally, several remote operations
(`killProcess`, `sendMouseMove/Click/Scroll`, `sendHotkey`, `sendText`, `executeCommand`,
and `lockDevice` at `FleetContext.tsx:544`) omit the auth headers entirely.

#### Root cause / the seam everyone misses
The TS-side `fetchWithAuth` alone is **insufficient**. When the app runs inside the Android
APK, `universalNetworkFetch` prefers the native bridge path (`NodusNativeBridge.httpFetch`),
which re-injects the **same static token** from Kotlin. Fixing only the TypeScript client
leaves the security hole open on the primary (native) code path.

#### Technical Solution

**Step 2a — Add a bridge storage endpoint for the session token** (new Kotlin +
`@JavascriptInterface` in `HomeActivity.kt`):

```kotlin
// HomeActivity.kt (new bridge methods)
@JavascriptInterface
fun getSessionToken(): String = secureTokenStore.get() ?: ""

@JavascriptInterface
fun setSessionToken(token: String) { secureTokenStore.set(token) }
```

- Use encrypted storage on Android: `EncryptedSharedPreferences` / `EncryptedFile`, or the
  Android Keystore-backed approach. Do **not** use unencrypted `SharedPreferences` for the
  token.
- In Web-only (browser) context, fall back to `sessionStorage` guarded by a same-origin check.

**Step 2b — De-hardcode the token in Kotlin `httpFetch`:**

```kotlin
// HomeActivity.kt — replace lines 466-467
conn.setRequestProperty("Authorization", "Bearer ${getSessionToken()}")
conn.setRequestProperty("X-Nodus-Auth-Token", getSessionToken())
```

**Step 2c — Centralize TS auth in a single wrapper** (`FleetDirectClient.ts`):

```typescript
function getActiveSessionToken(): string {
  const bridge = (window as any)?.NodusNativeBridge;
  if (bridge?.getSessionToken) return bridge.getSessionToken() || '';
  return sessionStorage.getItem('nodus_session_token') || '';
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getActiveSessionToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-Nodus-Auth-Token', token);
  }
  return fetch(url, { ...options, headers });
}
```

Then route **every** raw `fetch` call in `FleetDirectClient.ts` and
`FleetContext.tsx:544` (`lockDevice`) through `fetchWithAuth`. This closes the gap where
`killProcess`, `executeCommand`, mouse/keyboard input, clipboard, and `lockDevice` currently
send **no** auth header.

**Step 2d — Bootstrap pairing handshake (must be specified, was missing):**
1. First pairing: user enters a PIN / scans a QR presented by the target companion (out-of-band
   secret); both sides derive a fresh 256-bit session token via
   `crypto.getRandomValues()` + a short-lived salt.
2. Store the derived token via `setSessionToken` (native) / `sessionStorage` (web).
3. Companion server enforces the same token on all `/api/*` routes; reject requests with
   missing/invalid tokens (401).

**Step 2e — Scope cleartext traffic correctly.** Android's `usesCleartextTraffic="true"`
is app-wide, not per-host. Replace it with a `network_security_config.xml` that permits
cleartext only to the trusted LAN host/port range:

```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">192.168.0.0/16</domain>
  </domain-config>
</network-security-config>
```

Refer to it in the manifest: `android:networkSecurityConfig="@xml/network_security_config"`.
> Note: per-subnet/domain scoping of cleartext in `network-security-config` requires the
> domain entries to be resolvable addresses; if the range approach is unsupported, ship a
> `cleartextTrafficPermitted="true"` only for explicitly trusted device IPs managed via
> `TrustedDevice` records, and set the base config to `false`.

**Step 2f — Disk hygiene.** Add to the relevant `.gitignore` (root and/or
`android-shell/.gitignore` — an android-scoped `.gitignore` currently does not exist):

```gitignore
# Crash logs & Local Environment
hs_err_pid*.log
replay_pid*.log
android-shell/local.properties
app/build/
.gradle/
```

Also delete the 9 present JVM crash logs
(`hs_err_pid15084/16272/17148/21800/25464.log`, `replay_pid16272/17148/21800/25464.log`)
from the working tree.

---

### Phase 3: Lifecycle-Aware Polling & Battery Preservation

#### Issue
Poller timers (Clipboard 1s, Telemetry 5s, Notifications 2.5s, Calendar 60s) fire continuously
even when the launcher is backgrounded or panels are closed.

#### Technical Solution
Create a reusable hook that pauses intervals in the background and resumes on return, with
`visibilitychange` **plus** `focus`/`blur` fallbacks for multi-window webview contexts:

```typescript
// src/hooks/useVisibilityPoller.ts
import { useEffect } from 'react';

export function useVisibilityPoller(
  callback: () => void,
  intervalMs: number,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const isActive = () =>
      document.visibilityState === 'visible' && document.hasFocus?.() !== false;

    const runPoller = () => {
      if (isActive()) callback();
    };

    runPoller();
    timer = setInterval(runPoller, intervalMs);

    const onVisible = () => {
      if (isActive()) callback();
    };

    document.addEventListener('visibilitychange', onVisible);
    // Fallback for webview/multi-window where visibilitychange does not fire reliably
    window.addEventListener('focus', onVisible);
    window.addEventListener('blur', () => { /* optional: pause immediately */ });

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('blur', onVisible);
    };
  }, [callback, intervalMs, enabled]);
}
```

Apply to the three hot pollers:
- `ClipboardContext.tsx:315` (1s) — also gate on `isClipboardOpen` / clipboard sync enabled.
- `FleetContext.tsx:231` (5s) — pause when window hidden and when `enableMultiDevice` is off.
- `SystemSettingsContext.tsx:379` (2.5s) — pause when hidden and notification listener disabled.

Additionally, register a native `onPause`/`onResume` handoff via `NodusNativeBridge` so the
WebView timers stop entirely when the Activity is paused (capture in `HomeActivity.kt`).

---

### Phase 4: Fault Tolerance & State Persistence

#### Issue
`App.tsx`'s `ErrorBoundary` executes `localStorage.clear()` on any unhandled render exception,
wiping all folders, app order, and user settings.

#### Technical Solution
1. Replace the destructive clear with non-destructive recovery:

```typescript
// App.tsx (Phase 4 Fix)
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Non-destructive: log telemetry WITHOUT wiping user data
    console.error('[Nodus Home] Caught unhandled render exception:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      // Isolate the failing subtree; keep persisted state intact
      return <SafeFallbackDesktopUI onResetState={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

2. Add schema validation for `localStorage` reads across all context providers
   (`FleetContext`, `AppGridContext`, `ClipboardContext`, `SystemSettingsContext`). Wrap
   deserialization with safe defaults so invalid/corrupt stored JSON cannot crash the app:
   a. Adopt a lightweight validator (Zod) OR hand-rolled `isAppItem(x)`-style guards.
   b. On parse failure, discard only the corrupt key and fall back to `INITIAL_*` defaults,
      never clearing unrelated keys.
   c. Standardize via a single `src/utils/storage.ts` helper (safeGet/safeSet with schema)
      used by every provider.
3. Phase 4 must ship **unit tests** for the migration/deserializers (corrupt-JSON fallback,
   legacy `nova_launcher_*` key migration, unknown-field tolerance).

> **Resolution note on "100% tests":** existing tests are shallow (mostly existence checks).
> See Phase 6 for the authoring needed to make the verification bar meaningful.

---

### Phase 5: Dependency Pruning, Bundle Optimization & CI Pipeline

#### Execution Steps
1. **Prune dead weight** (verified: zero source references in `nodus-home/src`):
   ```bash
   npm --prefix packages/nodus-home uninstall @google/genai motion dotenv
   ```
   Moving helper build/runtime tooling appropriately: `vite`, `@vitejs/plugin-react`,
   `@tailwindcss/vite`, `typescript` belong in `devDependencies`, not `dependencies`.
2. **Optimize Vite code-splitting** — `vite.config.ts` `build.rollupOptions.output.manualChunks`
   to isolate `lucide-react`, heavy theme code, and core logic into chunks under ~300 kB.
   Verify output with `npm --prefix packages/nodus-home run build`; current main bundle is
   `603.82 kB` minified (`157.81 kB` gzip) and exceeds the 500 kB warning.
3. **Harden CI** — modify the **existing** `.github/workflows/build-apk.yml`:
   - Replace `npm ci || npm install` with `npm ci` (stop silent lockfile fallback).
   - Add `lint` (`tsc --noEmit`) and `test` (`vitest run`) steps **before** `vite build`.
   - Keep `timeout-minutes` reasonable for the added steps (raise from 15 to ~25).

---

### Phase 6: Test Expansion & Release Signing (NEW phase)

#### Issue
14 tests across 4 files exist, but cover only icon registry + a few context smoke tests.
`FleetContext`, `AppGridContext` (the file with the type bug), `ClipboardContext` internals,
`FleetDirectClient`, and `RemoteShortcutsService` have **no meaningful tests**.

#### Execution Steps
1. Author behavioral tests (not just existence checks):
   - `AppGridContext`: native-app mapping, folder repacking, floating-window lifecycle,
     `pageIndex`/`order` invariants after native-sync.
   - `FleetContext`: `executeRemoteApp` dispatch, `killProcess` auth path, trust/permission
     toggles, poller pause behavior.
   - `FleetDirectClient` / `fetchWithAuth`: all endpoints attach `Authorization` +
     `X-Nodus-Auth-Token`; `killProcess`/`sendMouseMove`/`sendHotkey`/`sendText`/`executeCommand`
     **no longer omit headers** (regression guard for the Phase 2 fix).
   - `RemoteShortcutsService`: systematic macro parsing, forbidden-command filtering
     (password/CORDS heuristics already present at lines ~231-233), error handling.
   - `storage.ts` (new from Phase 4): corrupt-JSON fallback, migration, schema.
2. **Release signing hardening** (`app/build.gradle`):
   - Fail the build (not silently produce an unsigned APK) when `keystore.properties` is
     missing for `assembleRelease`.
   - Enable `minifyEnabled true` + `proguard-rules.pro` for release to reduce reverse-engineering
     surface and shrink the APK.
   - Bump `versionCode`/`versionName` per release; consider a `ci` build type for the pipeline.
3. **Verify against the full gate:**
   - `npm --prefix packages/nodus-home run lint` → **0 errors**, and
   - `npm --prefix packages/nodus-home run test` → **100% passing** on every push (now enforced
     in CI).

---

## 4. Verification & Validation Checklist

Before declaring `@nodus/home` ship-ready:

- [ ] `npm --prefix packages/nodus-home run lint` (`tsc --noEmit`) passes with **0 errors**.
- [ ] `npm --prefix packages/nodus-home run test` passes **100% of unit tests**, including the
      new `FleetDirectClient`/`AppGridContext`/`storage` suites.
- [ ] APK decompilation check confirms **no** static `NODUS-FLEET-SECURE` in bytecode (both
      TS bundle and Kotlin `httpFetch` de-hardcoded).
- [ ] **All** LAN RPC requests attach valid `Authorization` / `X-Nodus-Auth-Token` headers —
      including `killProcess`, `executeCommand`, mouse/keyboard input, clipboard, and
      `lockDevice` (native bridge path covered too).
- [ ] Dynamic session token stored via encrypted Android storage / secured web storage; bootstrap
      pairing (PIN/QR) documented and working.
- [ ] Polling intervals automatically pause when the launcher is backgrounded (visibility +
      focus/blur + native pause).
- [ ] React `ErrorBoundary` recovers gracefully **without** wiping `localStorage`.
- [ ] Dead dependencies removed: `@google/genai`, `motion`, `dotenv`.
- [ ] `npm ci` (not `npm ci || npm install`) runs in CI; `lint` + `test` stages present in the
      existing `build-apk.yml`.
- [ ] JVM crash logs (`hs_err_pid*.log`, `replay_pid*.log`) gitignored and removed from tree.
- [ ] Release build signs correctly and fails loudly if `keystore.properties` is missing;
      `minifyEnabled true` for release.

---

## 5. Summary of Revisions vs. v1.0.0

| # | Area | v1.0.0 | v2.0.0 (this revision) |
|---|------|--------|------------------------|
| 1 | Formatting | Corrupted backtick/backslash escaping + broken ` ```typescript`/` ```yaml` | Clean standard markdown fences throughout |
| 2 | Phase 1 `order` fallback | `existing?.order ?? 0` (duplicate-`0` risk) | `existing?.order ?? idx` |
| 3 | Phase 2 Kotlin seam | TS-only token replacement | De-hardcode **both** `HomeActivity.kt:466-467` + add bridge `get/setSessionToken`; new `network_security_config.xml` |
| 4 | Phase 2 pairing | Not specified | Explicit PIN/QR bootstrap handshake added |
| 5 | Phase 2 CI assumption | Implied "create" workflow | Existing `.github/workflows/build-apk.yml` is **modified** (lint/test/`npm ci`) |
| 6 | Phase 5 deps | `@google/genai` only | `@google/genai`, `motion`, `dotenv` (verified unused) + correct dep/devDep split |
| 7 | Phase 5 tests | Run existing tests only | NEW Phase 6: author real tests + release-signing hardening |
| 8 | Auth coverage | Partial (TS client) | All raw-fetch call sites incl. `lockDevice` (`FleetContext.tsx:544`) unified through `fetchWithAuth` |

---

**Approved By:** Lead Systems Architect / Lead Core Engineer
**Original Target Completion Date:** September 10, 2026 (revised scope may extend to Sep 15)
