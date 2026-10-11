# Changelog — Project Nodus

All notable changes to the Project Nodus workspace and its ecosystem modules will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Removed
- **`packages/nodus-legacy/`**: Deleted the obsolete legacy launcher implementation (duplicate `LauncherActivity.kt` shell, Go agent, and full UI tree) that duplicated `nodus-home` functionality and caused architectural confusion.
- **`packages/nodus-assistive/`**: Removed the superseded standalone assistive-touch package; assistive functionality now lives inside `nodus-home`.
- **Legacy Release Artifacts**: Dropped tracked `releases/*.apk` binaries from version control (APKs are never committed; see `.gitignore`).

### Changed
- **Documentation Folder Standardization**: Migrated `generated_documents/` to `generated-documents/` and updated all README/CHANGELOG references.
- **Generated-Documents Tracking Policy**: `.gitignore` now tracks only `generated-documents/context/` (living context, project briefs, contracts), `plans/`, and `issues/`; ephemeral artifacts (`audits/`, `handoffs/`, `gaps/`, `test-reports/`, `archives/`) are ignored.
- **Stale Lockfile Entry**: Pruned the extraneous `packages/nodus-legacy` record from `package-lock.json`.

### Fixed
- **Broken Documentation Link**: Removed the dead `REFACTOR_AND_UPDATE_STRATEGY_PLAN_2026.md` link from `README.md`.

---

## [1.4.0] - 2026-09-13

### Added
- **Dual Android Mouse Emulation Engine**:
  - Hardware-accelerated floating system overlay (`MouseOverlayManager.kt`) utilizing Android `WindowManager` (`TYPE_APPLICATION_OVERLAY`) with zero-compute idle state.
  - Direct Linux kernel mouse emulation (`/dev/uinput` via ADB port 5555) for native OS pointer recognition.
- **1:1 Resolution-Synced Coordinate Translation**:
  - Percentage-based coordinate mapping (`moveToPercent(px, py)`) dynamically synced to the target device's active resolution (e.g. 2560×1570 on Xiaomi POCO Pad).
- **3-Tier Shortcuts & Application Architecture**:
  - **Tier 1 (Workstation Apps):** Direct local Win32 binary and developer script execution on the Windows host.
  - **Tier 2 (Android Installed Apps):** Dynamic live package inspection (`/api/system/apps`) via Android `PackageManager`, extracting application icons, package names, and launchable intents for remote execution.
  - **Tier 3 (Shared Launchpad Pinning):** Unified cross-device deck allowing users to pin both PC tools and Android apps to the central launchpad for 1-tap execution.
- **Interactive ConPTY & Android Shell Terminal Engine**:
  - Real-time bidirectional Windows ConPTY terminal streaming over `portable-pty`.
  - Android interactive shell bridge running Xterm.js v6 with `@xterm/addon-fit`, touch selection mode, and clipboard copy chips.
- **Zero-Trust Security Mesh & Bidirectional Unpairing**:
  - Enforced `X-Nodus-Auth-Token` across all non-public RPC endpoints on both Desktop HUD and Android Fleet server.
  - Added `/api/system/unpair` RPC: revoking pairing on either device immediately notifies the peer to wipe session credentials and prevent ghost pairings.
  - Discovered UDP broadcast beacons (port 9121) are strictly isolated from connected mesh members until authenticated.
- **Remote Media & System Power Control**:
  - Remote volume adjustments (0–100%, volume up/down, mute toggle).
  - Hardware media transport controls (`Play/Pause`, `Next`, `Previous`).
  - Remote screen wake and sleep/lock actions.
- **Project Status Report**: Published comprehensive milestone documentation in `generated-documents/PROJECT_STATUS_REPORT_2026_09_13.md`.

### Changed
- **Trackpad Aspect Ratio Invariance**: Bound the virtual trackpad DOM element strictly to `aspectRatio: width / height`, preventing coordinate distortion during column or window resizing.
- **Package Versions**: Bumped workspace root to `v1.4.0`, `nodus-desktop` to `v1.2.0`, and `nodus-fleet` to `v1.2.0` (versionCode 3).

### Fixed
- **Pointer Toggle Lifecycle Invariance**: Fixed pointer toggle so disabling completely removes the overlay view (`removeOverlay()`, `isEnabled = false`) from `WindowManager`. Moving the trackpad while disabled strictly prevents the pointer from rendering.
- **Android 14 Focus Guard**: Restricted clipboard sync to active window focus, eliminating security denial exceptions on Android 14 / HyperOS.
- **CORS & Loopback Authorization**: Standardized explicit CORS origins and authenticated loopback RPC headers in `nodus-desktop`.

---

## [1.3.0] - 2026-09-03

### Added
- **Automated GitHub Actions CI/CD Release Pipeline**: Created `.github/workflows/build-apk.yml` with explicit `tsc --noEmit` lint gate, `vitest` unit test gate, and automatic release publishing on `v*` tag push.
- **Lifecycle-Aware Poller Throttling**: Custom useVisibilityPoller hook wired into ClipboardContext, FleetContext, and SystemSettingsContext to pause high-frequency background timers when the app is hidden or unfocused.
- **IPC Bridge Handoff Cleanups**: Refactored universalNetworkFetch in FleetDirectClient.ts to delegate LAN RPCs to NodusNativeBridge IPC when running inside APK shell.
- **Direct Download Badge**: Added GitHub release badges and direct .apk artifact download links in README.md.

### Changed
- **License Update**: Updated project repository license to **GNU AGPLv3** for active development reciprocity.
- **Architectural Scope Decoupling**: Documented formal separation between Nodus Home (Launcher UI Shell) and Nodus Fleet (Standalone LAN Mesh APK) in NODUS_HOME_ARCHITECTURAL_CLARIFICATION.md.

---

## [1.2.1] - 2026-09-02

### Added
- **Google Calendar Opt-In & Unsync**: Privacy warning consent card before calendar access, plus a 1-tap **Unsync** button in NotesWidgetModal.tsx.
- **Ecosystem Status Consistency**: Standardized module badges (Requires Fleet APK and Requires Touch APK) in SettingsApp.tsx.

### Fixed
- **Continuous Scroll App Grid**: Repacked app icons sequentially on Page 1 before spilling onto subsequent pages in AppGridContext.tsx.
- **Secondary Timezone Reset**: handleResetToDefaults now properly clears secondaryTimezone.
- **Custom Icon Pack Dropdown Stacking**: Fixed dropdown menu z-index layering above surface cards across all themes.
- **0%–100% Surface Opacity Range**: Expanded system opacity slider lower bound from 20% to 0%.
- **Removed Destructive localStorage.clear()**: Replaced hard reset reload in ErrorBoundary.tsx with non-destructive page reload.

---

## [1.2.0] - 2026-09-01

### Added
- **Smart Native Auto-Stash**: Automatically stashes the 3rd native floating window into the Taskbar stack on dual-window capped OS environments (e.g., HyperOS).
- **TypeScript Heap Optimizations**: Fixed `tsc --noEmit` type checking memory allocation errors.

---

## [1.1.0] - 2026-08-28

### Added
- **Agenda & Live Calendar Integration**: Chronological multi-meeting pills on the desktop top bar with live status badges (🔴 LIVE: / In Xm:).
- **Clock & Dual Timezone Widgets**: Digital clock opens system clock (com.android.deskclock); matching-height secondary timezone container.
- **Tauri v2 Desktop Bridge**: Win32 media control and sub-millisecond hot corners companion server.
