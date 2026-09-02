# Nodus Home: Production Remediation & Refactoring Strategy Plan

**Document Version:** 1.0.0  
**Target Package:** \packages/nodus-home\ (\project-nodus-home\)  
**Created:** September 3, 2026  
**Status:** DRAFT / STRATEGY PLAN  

---

## 1. Executive Summary

Following the comprehensive audits conducted in \NODUS_HOME_PRODUCTION_AUDIT.md\ and \udit_report_nodus_home.md\, this strategy plan outlines a phased, surgical remediation roadmap to transition **Nodus Home** from an internal development build to a **Production-Grade, Battle-Tested Launcher**.

### Key Resolution Targets:
1. **Build & Type Integrity**: Eliminate all \	sc --noEmit\ errors to enforce zero-tolerance CI gates.
2. **Zero-Trust Security Model**: Remove static \NODUS-FLEET-SECURE\ tokens; implement dynamic session pairing & uniform HTTP authorization.
3. **Performance & Battery Optimization**: Replace aggressive background timers with lifecycle-aware poller controls.
4. **Resilience & Fault Tolerance**: Replace destructive \localStorage\ wipes in \ErrorBoundary\ with non-destructive fallback rendering.
5. **Clean Architecture & Bundle Hygiene**: Prune ghost dependencies (\@google/genai\) and optimize Vite build chunking.

---

## 2. Phased Remediation Roadmap

\\\
┌────────────────────────────────────────────────────────────────────────┐
│                   NODUS HOME PRODUCTION REMEDIATION                    │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: Build Integrity & Type Gate (Immediate)                      │
│ • Fix AppGridContext.tsx native app object construction mapping        │
│ • Enforce strict \	sc --noEmit\ check in npm scripts and CI workflows  │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Security & Network Hardening (High Priority)                  │
│ • Replace static \NODUS-FLEET-SECURE\ with dynamic ECDH / pairing key  │
│ • Uniformly apply Bearer auth headers across all LAN RPC endpoints     │
│ • Scope cleartext traffic permissions and add \.gitignore\ entries     │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Lifecycle-Aware Polling & Battery Preservation (Medium)       │
│ • Throttle Clipboard, Fleet, and Notification timers on background     │
│ • Attach window \isibilitychange\ & \ocus\/\lur\ listeners         │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Fault Tolerance & State Persistence (Medium)                  │
│ • Remove \localStorage.clear()\ from React \ErrorBoundary\             │
│ • Add schema validation (Zod/Lightweight parser) for \localStorage\    │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: Bundle Optimization & CI Pipeline Hardening (Pre-Ship)        │
│ • Prune \@google/genai\ dead dependency                                │
│ • Configure Vite dynamic chunk splitting                               │
│ • Add automated \itest\ & \	sc\ execution step in GitHub Actions      │
└────────────────────────────────────────────────────────────────────────┘
\\\

---

## 3. Detailed Technical Execution Strategy

### Phase 1: Build Integrity & Type Safety Gate

#### Issue:
\	sc --noEmit\ fails on \AppGridContext.tsx\ line 270 because native app items mapped from \NodusNativeBridge.getInstalledApps()\ are typed as \AppItem[]\ but constructed without \pageIndex\ and \order\ properties upfront.

#### Technical Solution:
Update the \
ativeApps\ mapping inside \syncNativeInstalledApps\ to calculate default \pageIndex\ and \order\ during object instantiation prior to continuous repacking:

\\\	ypescript
// AppGridContext.tsx (Phase 1 Fix)
const nativeApps: AppItem[] = list.map((item, idx) => {
  const appId = \pkg_\\;
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
    order: existing?.order ?? 0,
    folderId: existing?.folderId ?? null,
  };
});
\\\

---

### Phase 2: Zero-Trust Security & Network Hardening

#### Issue:
Static authorization token \'NODUS-FLEET-SECURE'\ is hardcoded in both \FleetDirectClient.ts\ (TypeScript) and \HomeActivity.kt\ (Kotlin). Additionally, remote execution calls (\killProcess\, \sendMouseMove\, \lockDevice\) omit \Bearer\ headers.

#### Technical Solution:
1. **Dynamic Pairing Token Exchange**:
   - On first pairing, Nodus Fleet generates a dynamic 256-bit cryptographically secure session token (\crypto.getRandomValues()\).
   - Store session token in encrypted Android \EncryptedSharedPreferences\ / Web secure local storage.
2. **Unified Auth Interceptor**:
   - Create a central \etchWithAuth\ wrapper in \FleetDirectClient.ts\ to guarantee that **100% of outgoing LAN RPC requests** carry the \Authorization: Bearer <token>\ and \X-Nodus-Auth-Token\ headers.

\\\	ypescript
// FleetDirectClient.ts (Phase 2 Fix)
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getActiveSessionToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', \Bearer \\);
    headers.set('X-Nodus-Auth-Token', token);
  }
  return fetch(url, { ...options, headers });
}
\\\

3. **Disk Hygiene**:
   - Update \.gitignore\ to explicitly ignore JVM crash logs:
     \\\gitignore
     # Crash logs & Local Environment
     hs_err_pid*.log
     replay_pid*.log
     android-shell/local.properties
     \\\

---

### Phase 3: Lifecycle-Aware Polling & Battery Preservation

#### Issue:
Poller timers (Clipboard 1s, Telemetry 5s, Notifications 2.5s) continuously fire even when the launcher is backgrounded or panels are closed.

#### Technical Solution:
Create a reusable React hook \useVisibilityPoller\ that automatically pauses intervals when \document.visibilityState === 'hidden'\:

\\\	ypescript
// src/hooks/useVisibilityPoller.ts
export function useVisibilityPoller(callback: () => void, intervalMs: number, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    let timer: NodeJS.Timeout | null = null;

    const runPoller = () => {
      if (document.visibilityState === 'visible') {
        callback();
      }
    };

    runPoller();
    timer = setInterval(runPoller, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callback();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [callback, intervalMs, enabled]);
}
\\\

---

### Phase 4: Error Boundary Resilience & State Validation

#### Issue:
\App.tsx\'s \ErrorBoundary\ executes \localStorage.clear()\ upon catching any unhandled render exception, wiping all launcher folders, app orders, and user settings.

#### Technical Solution:
1. Replace \localStorage.clear()\ with a non-destructive recovery fallback (re-rendering the desktop UI while isolating the failing component).
2. Wrap \localStorage\ deserializers with safe JSON schema defaults to prevent invalid stored states from triggering crashes.

\\\	ypescript
// App.tsx (Phase 4 Fix)
class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Nodus Home] Caught unhandled render exception:', error, errorInfo);
    // Non-destructive: Log diagnostic telemetry without wiping user data
  }

  render() {
    if (this.state.hasError) {
      return <SafeFallbackDesktopUI onResetState={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
\\\

---

### Phase 5: Dependency Pruning, Bundle Optimization & CI Pipeline

#### Execution Steps:
1. **Prune Dead Weight**: Remove \@google/genai\ from \package.json\ (\
pm uninstall @google/genai\).
2. **Optimize Vite Code-Splitting**: Configure \manualChunks\ in \ite.config.ts\ to separate Lucide icons, Heavy Themes, and Core Logic into isolated chunks under 300 kB.
3. **Harden CI Workflow (\.github/workflows/build-apk.yml\)**:
   Add explicit typecheck and test steps before APK compilation:

\\\yaml
- name: Type Check
  run: npm --prefix packages/nodus-home run lint

- name: Run Unit Tests
  run: npm --prefix packages/nodus-home run test
\\\

---

## 4. Verification & Validation Checklist

Before declaring \@nodus/home\ ship-ready for production, the following criteria must be met:

- [ ] \
pm --prefix packages/nodus-home run lint\ (\	sc --noEmit\) passes with **0 errors**.
- [ ] \
pm --prefix packages/nodus-home run test\ passes **100% of unit tests**.
- [ ] APK decompilation check confirms no static authorization tokens (\NODUS-FLEET-SECURE\) exist in bytecode.
- [ ] All LAN RPC requests attach valid Authorization headers.
- [ ] Polling intervals automatically pause when launcher is backgrounded.
- [ ] React \ErrorBoundary\ recovers gracefully without wiping \localStorage\.
- [ ] Dead dependency \@google/genai\ is removed.

---

**Approved By:** Lead Systems Architect / Lead Core Engineer  
**Target Completion Date:** September 10, 2026  
