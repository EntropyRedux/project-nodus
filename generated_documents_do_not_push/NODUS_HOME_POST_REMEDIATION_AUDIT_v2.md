# Post-Remediation Verification Audit — `packages/nodus-home` (v1.2.2)

**Audit date:** 2026-09-03
**Reference commit:** `2980eeb` — "release: v1.2.2 - remove static secret fallback, unify 100% RPC auth, prune unused deps & add visibility poller hook"
**Prior baseline:** `NODUS_HOME_POST_REMEDIATION_AUDIT.md` (v1.2.1)
**Method:** Every finding reproduced/verified against the current clean working tree (tag v1.2.2). Gates re-run locally.

**Ship Readiness Verdict: 🟡 FURTHER IMPROVED — STILL NOT PRODUCTION-READY (SDLC + auth-model blockers)**
The hardcoded-secret-at-request-site gap is closed and RPC auth is now 100% uniform, but the
new fail-closed model has **no way to establish a token at all** (blanket lockout), and the
remaining Phases (3 wiring, 4, 5-CI, 6) are still open.

---

## 1. Verification Matrix (delta vs v1.2.1 audit)

| Phase | Target | v1.2.1 | v1.2.2 | Verification |
|---|---|---|---|---|
| 1 | Typecheck gate | 🟢 done / no CI | 🟢 **unchanged** | `npm run lint` exit **0**; tests **14/14 pass**. CI gate still absent (§6). |
| 2 | De-hardcode token | 🟡 partial | 🟢 **request-site closed** | Static default removed; all RPC calls now routed through `universalNetworkFetch`. **New regression: no token-set path → permanent lockout** (§3). |
| 3 | Lifecycle poller | 🔴 absent | 🟡 **hook added, NOT wired** | `useVisibilityPoller.ts` created but no context imports it (raw `setInterval` unchanged). |
| 4 | Fault tolerance | 🟡 partial | 🟡 **unchanged** | Destructive clear gone; still no schema validation / storage.ts / isolated fallback. |
| 5 | Deps + bundle | 🔴 not done | 🟢 **deps pruned, chunked** | `@google/genai`, `motion`, `dotenv` removed; Vite manual chunks added. CI untouched. |
| 6 | Tests + release signing | 🔴 not done | 🔴 **unchanged** | No new behavioral tests; release still `minifyEnabled false`, silent unsigned build. |

---

## 2. What is FIXED in v1.2.2 ✅ (verified)

### 2.1 Static secret removed from every request site (Fail‑open → fail‑closed)
- `HomeActivity.kt:455` `activeSessionToken` now initializes to `""` (was `"NODUS-FLEET-SECURE"`).
- `FleetDirectClient.ts:26/28/30` all fallbacks changed to `''` — **zero occurrences of the
  literal `NODUS-FLEET-SECURE` remain** in `src/` or the Kotlin shell (grep-verified).
- The "no static authorization tokens in decompiled APK" requirement from the plan is now **met**.

### 2.2 100% uniform RPC auth
Every previously-bare `fetch()` was rewired through `universalNetworkFetch` (which injects
`Authorization: Bearer <token>` and `X-Nodus-Auth-Token`):
- `FleetDirectClient.ts`: `killProcess`, `executeCommand`, `sendClipboard`, `sendMouseMove`,
  `sendMouseClick`, `sendMouseScroll`, `sendHotkey`, `sendText` — all confirmed routed.
- `FleetContext.tsx:544` `lockDevice` → `universalNetworkFetch(...:9120/api/lock, {method:'POST'})`.
- **Result:** process kill, command exec, input injection, clipboard, and lock are no longer
  sent as unauthenticated calls. The prior unauthenticated-RCE vector is closed.

### 2.3 Dependencies pruned + bundle split
- Removed unused deps: `@google/genai`, `motion`, `dotenv` (still verified zero references).
- `vite.config.ts` added `manualChunks` (`vendor-react`, `vendor-icons`) and
  `chunkSizeWarningLimit: 600`.
- **Build now splits cleanly** (verified real build):
  - `index-CxfUXIil.js` **565.05 kB** min (148.98 kB gzip)
  - `vendor-react-Bk9i9FY8.js` 3.90 kB
  - `vendor-icons-ClxJMPCs.js` 37.04 kB
  - Main bundle down 604.9 kB → 565.0 kB, no 500 kB warning.

---

## 3. NEW critical regression — blank token ⇒ permanent lockout 🔴

Removing the default was correct, but **no code path ever sets the token**:

- `setSessionToken` (Kotlin `@JavascriptInterface`, `HomeActivity.kt:461`) is **never invoked**
  by the web layer.
- `nodus_fleet_session_token` in `sessionStorage` is only **read** (`getItem`), never **written**
  (`setItem` is absent from `src/`).
- No PIN/QR pairing, no ECDH bootstrap, no server handshake exists.

**Net effect:** `getActiveFleetSessionToken()` always returns `''`, so every authenticated RPC
now sends an **empty** `Authorization: Bearer ` header → the server (which still validates)
rejects all of them. The device is effectively **locked out of fleet operations** (lock,
input, clipboard, exec, kill) until a real token-distribution mechanism ships.

This is strictly better security-wise than shipping with a known secret, but it **converts the
secret leak into an availability outage**: the pairing/bootstrap sub-phase of Plan v2 (Phase 2)
was never implemented.

---

## 4. Phase 3 — poller created but NOT wired 🟡

`useVisibilityPoller.ts` (43 lines: visibility + focus gating, interval cleanup) is a valid,
correct hook. However **it is not imported anywhere**:

- `ClipboardContext.tsx:315`  `setInterval(checkClipboard, 1000)` — unchanged
- `FleetContext.tsx:231`      `setInterval(pollRemoteStats, 5000)` — unchanged
- `SystemSettingsContext.tsx:379` `setInterval(syncNotificationBadges, 2500)` — unchanged
- `NotesContext.tsx:183`      `setInterval(...)` — unchanged

Only "clock" timers (StatusBar, Taskbar, TopWidgetRow, DesktopWidgets) use `setInterval` for
time display, which is intended. But the **battery/CPU-heavy pollers were never migrated** to
the new hook, so the visibility pause gained nothing yet.

---

## 5. Phase 4 — unchanged 🟡
- `ErrorBoundary` still globally reloads on render failure (no `SafeFallbackDesktopUI`, no
  subtree isolation, though the destructive `localStorage.clear()` stays removed).
- Still no `storage.ts`, no localStorage schema validation.

---

## 6. CI / gates — still NOT enforced 🔴
- `.github/workflows/build-apk.yml` **unchanged**: still `npm ci || npm install`, and **no
  `lint` (`tsc`) or `test` steps**. The green local gates are not enforced in CI.
- No `tsc --noEmit` / `vitest run` in the pipeline.

---

## 7. Phase 6 — tests & release signing — unchanged 🔴
- Still only the original suite (4 vitest files / 14 tests + small `utils` specs); **no new
  behavioral tests** for the auth path, `universalNetworkFetch`, `useVisibilityPoller`, or the
  contexts.
- `app/build.gradle:36` release still `minifyEnabled false`.
- Release signing still **silent-degrade**: if `keystore.properties` is missing, `signingConfigs.release`
  stays empty and falls back, with no `abortOnError`/loud failure (verified at `app/build.gradle:20-31`).

---

## 8. Crash logs — RESOLVED ✅
- JVM crash artifacts are cleaned from disk, and `packages/nodus-home/.gitignore` now has
  `*.log` (covers `hs_err_pid*.log`, `replay_pid*.log`). No crash logs are tracked.

---

## 9. Priority remediation before next ship attempt

1. **Implement the token bootstrap (Blocker).** Ship the pairing path (PIN/QR + challenge)
   that calls `setSessionToken` / persists `nodus_fleet_session_token` BEFORE authenticated
   RPCs are enabled. Verify the `universalNetworkFetch` header now carries a real bearer token
   in an APK runtime trace. Until then, fail-closed = fail-closed-locked-out.
2. **Wire `useVisibilityPoller`** into `ClipboardContext`, `FleetContext`,
   `SystemSettingsContext` (and `NotesContext`) so the Phase-3 death-by-polling is actually
   mitigated, with a regression test on the gating.
3. **Add CI gates** to the existing `build-apk.yml`: `npm ci`, `npm run lint`, `npm run test`.
4. **Phase 4:** add `storage.ts` + schema validation; isolate ErrorBoundary fallback to the
   failing subtree.
5. **Phase 6:** add behavioral tests for the RPC/auth layer and the visibility poller; set
   release `minifyEnabled true` + `shrinkResources` and make missing keystore **fail loudly**.

---

## Bottom line

v1.2.2 is a meaningfully better release than v1.2.1: the **static secret is gone from all
request sites**, **RPC authentication is now uniform**, **deps are pruned and the bundle is
split**, and crash logs are contained. Gate checks are green locally.

However, removing the secret default without adding a **token-provisioning path** means the app
is now **permanently locked out of authenticated fleet operations** — a functional blocker that
must be resolved by shipping Phase-2's bootstrapping, not left as an empty-token default. With
the poller unwired and CI still ungated, the package is **closer to but not yet
production-ready**.
