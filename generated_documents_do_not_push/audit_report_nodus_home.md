# Production Ship-Readiness Audit Report: `@nodus/home`

**Target Package:** `packages/nodus-home` (`project-nodus-home` v1.1.1)  
**Parent Workspace:** `C:\Projects\LocalActive\Repo\Active\project-nodus`  
**Auditor Role:** Senior Software Engineer / Lead Systems Architect  
**Audit Date:** September 3, 2026  
**Ship Readiness Verdict:** 🛑 **NOT READY FOR PRODUCTION SHIP**

---

## Executive Summary

An in-depth production ship-readiness audit was conducted across `@nodus/home` and its interaction boundaries with local services and Android host bridges. While the project exhibits impressive architecture (rich multi-windowing, custom theme engines, cross-device fleet control, and local bridge integration), several **critical blocking issues** prevent safe deployment to end-user devices.

The most critical concerns include:
1. **Compilation Failures**: TypeScript type checking fails on main context data transformations.
2. **Network Security Vulnerabilities**: Unauthenticated LAN HTTP RPC endpoints using static hardcoded tokens (`Bearer NODUS-FLEET-SECURE`).
3. **Unused / Bloated Dependencies**: `@google/genai` is included in `package.json` production dependencies despite zero usages across the codebase.
4. **State Persistence Fragility**: Fallbacks, missing validation, and silent error swallowing in `localStorage` operations.
5. **Lack of Automated Test Coverage**: Only 14 unit tests across 4 test files exist for a package containing 73+ source files.

---

## Detailed Audit Findings

### 1. Build Integrity & Type Safety 🛑 **BLOCKER**

* **Issue**: Running `npm run lint` (`tsc --noEmit`) fails with type errors:
  ```text
  src/context/AppGridContext.tsx(270,21): error TS2322: Type '{ id: string; name: string; packageName: string; customIcon: string; iconName: string; color: string; category: "system" | "productivity"; isRemovable: boolean; folderId: string; }[]' is not assignable to type 'AppItem[]'.
    Type '{ ... }' is missing the following properties from type 'AppItem': pageIndex, order
  ```
* **Impact**: Type contracts are violated when mapping native Android apps mapped via `NodusNativeBridge.getInstalledApps()`. CI pipelines will fail on production release builds.
* **Remediation**: Populate `pageIndex` and `order` properties during native item instantiation prior to grid repacking.

---

### 2. Security & Network Protocols 🔴 **CRITICAL**

* **Hardcoded Bearer Tokens**:
  * In `src/services/FleetDirectClient.ts`, network requests attach a static header:
    ```typescript
    'Authorization': 'Bearer NODUS-FLEET-SECURE',
    'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE'
    ```
* **Insecure HTTP Communication**:
  * Direct LAN communication to Windows companion nodes (`http://${hostIp}:9120`) uses unencrypted plain HTTP.
  * Any entity on the local Wi-Fi network can sniff or spoof commands (media control, remote process termination, executable launching).
* **Missing Request Authentication & Rate Limiting**:
  * No HMAC signatures, nonce validation, or dynamic session handshake for remote control actions.
* **Remediation**:
  * Replace static credentials with pairing secret key exchanges (mTLS or dynamically generated session tokens).
  * Require HTTPS or encrypted WebSockets for local fleet communication.

---

### 3. Dependency Management & Bundle Hygiene ⚠️ **HIGH**

* **Ghost Dependencies**:
  * `package.json` declares `@google/genai`: `"^2.4.0"` in `dependencies`.
  * **Codebase Verification**: Zero `import` statements or runtime usages of `@google/genai` exist across `nodus-home`.
  * **Impact**: Increases `node_modules` size, lengthens install times, and expands the attack surface without providing functionality.
* **Vite / Node Polyfills**:
  * `package.json` lists `@types/node`: `"^22.14.0"` under `devDependencies`, but web build target assumptions rely on NodeJS globals in browser runtime paths.
* **Remediation**:
  * Run `npm prune` and strip `@google/genai` unless actively consumed by an AI module.

---

## Priority Recommendations & Action Plan

1. **Immediate (Blocker Fixes)**:
   * [ ] Fix TypeScript type mapping error in `src/context/AppGridContext.tsx` lines 270-284.
   * [ ] Remove static `'NODUS-FLEET-SECURE'` tokens from `FleetDirectClient.ts`.
2. **Short-Term (Security & Quality)**:
   * [ ] Remove `@google/genai` from `package.json` dependencies.
   * [ ] Implement token exchange / pairing authentication for LAN HTTP calls to port 9120.
   * [ ] Improve ErrorBoundary recovery to avoid clearing all `localStorage`.
3. **Pre-Ship (Testing & Observability)**:
   * [ ] Expand unit test suite covering `AppGridContext`, `FleetContext`, and `ClipboardContext`.
   * [ ] Add dynamic error logging for native bridge call failures.
