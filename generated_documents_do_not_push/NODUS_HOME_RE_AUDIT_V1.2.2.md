# Post-Remediation Re-Audit Report: `@nodus/home` (v1.2.2)

**Target Package:** `packages/nodus-home` (`project-nodus-home` v1.2.2)  
**Parent Workspace:** `C:\Projects\LocalActive\Repo\Active\project-nodus`  
**Auditor Role:** Senior Software Engineer / Lead Systems Architect  
**Audit Date:** September 3, 2026  
**Ship Readiness Verdict:** 🟡 **CONDITIONALLY APPROVED FOR STAGING / BETA SHIP**

---

## Executive Summary

A thorough re-audit of `packages/nodus-home` was performed following the latest codebase updates. Significant engineering improvements have been implemented:
1. **Type Safety Gate**: `npm run lint` (`tsc --noEmit`) passes cleanly with 0 errors.
2. **Dead Weight Pruned**: Unused dependencies (`@google/genai`, `dotenv`, `motion`) were removed from `package.json`.
3. **CI Automation Added**: GitHub Actions workflow `.github/workflows/build-apk.yml` was created.
4. **Battery Preservation Hook**: `useVisibilityPoller` custom hook was introduced to pause polling when backgrounded.
5. **Security Authentication**: Static auth headers were replaced with dynamic token evaluation (`getActiveFleetSessionToken()`).

Despite these major updates, **3 remaining gaps** must be addressed before declaring final production ship readiness.

---

## Detailed Re-Audit Findings

### 1. Build & Test Integrity 🟢 **PASSED**
* **Type Checking**: `npm run lint` (`tsc --noEmit`) passed with **0 errors**.
* **Unit Test Suite**: `npm run test` (`vitest run`) passed **14 / 14 tests (100%)**.
* **Package Cleanup**: `package.json` dependencies reduced to core lightweight runtime libraries (`react`, `react-dom`, `@vitejs/plugin-react`, `lucide-react`, `vite`, `@nodus/common`).

### 2. CI Pipeline Verification 🟡 **CONDITIONALLY PASSED (GAP IDENTIFIED)**
* **File Check**: `.github/workflows/build-apk.yml` now exists.
* **Gap Identified**: Lines 28-36 build the frontend bundle, but the workflow **omits type checking and unit test execution**. If a broken commit reaches `main`, the CI workflow will compile an APK without validating code safety.
* **Required Addition to `.github/workflows/build-apk.yml`**:
  ```yaml
  - name: Run Type Check & Unit Tests
    run: |
      cd packages/nodus-home
      npm run lint
      npm run test
  ```

### 3. Battery Preservation & Lifecycle Polling 🟡 **CONDITIONALLY PASSED (GAP IDENTIFIED)**
* **File Check**: `src/hooks/useVisibilityPoller.ts` was introduced. It correctly tracks `visibilitychange` and `focus` events.
* **Gap Identified**: Context providers (`ClipboardContext`, `FleetContext`, `NotificationsContext`) still instantiate standard `setInterval` calls instead of consuming `useVisibilityPoller`.
* **Impact**: Timers will continue firing when backgrounded until the provider components are refactored to consume `useVisibilityPoller`.

### 4. Security & Authentication Model 🟡 **CONDITIONALLY PASSED**
* **Dynamic Token Evaluation**: `FleetDirectClient.ts` retrieves tokens via `NodusNativeBridge.getSessionToken()` or `sessionStorage`.
* **Staging Note**: In pure browser mode (without the Android APK bridge or valid `sessionStorage`), requests default to an empty token string (`Bearer `), which correctly fails closed on authenticated endpoints.

---

## Comprehensive Status Matrix

| Audit Dimension | Initial Status | Update Status | Production Readiness |
| :--- | :---: | :---: | :---: |
| **TypeScript Type Gate** | 🛑 FAIL | 🟢 PASS | Clean (`tsc --noEmit`) |
| **Unit Test Suite** | 🟢 PASS | 🟢 PASS | 14/14 Passing |
| **Unused Dependencies** | 🛑 FAIL | 🟢 PASS | Pruned `@google/genai`, `motion`, `dotenv` |
| **CI Automation Workflow** | 🛑 MISSING | 🟡 PARTIAL | Workflow created, needs lint/test steps |
| **Lifecycle Polling Hook** | 🛑 MISSING | 🟡 PARTIAL | Hook created, needs consumption in contexts |
| **Security Headers** | 🛑 STATIC TOKEN | 🟢 PASS | Dynamic token helper active |

---

## Required Action Items Prior to Production Release

1. **Update CI Workflow**: Add `npm run lint` and `npm run test` steps to `.github/workflows/build-apk.yml`.
2. **Refactor Context Timers**: Replace standard `setInterval` in `ClipboardContext.tsx` and `FleetContext.tsx` with `useVisibilityPoller`.

---

**Auditor Sign-Off:** Senior Lead Software Engineer  
**Status:** **APPROVED FOR STAGING / BETA TESTERS**
