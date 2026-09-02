# Changelog — Project Nodus

All notable changes to the Project Nodus workspace and its ecosystem modules will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-09-03

### Added
- **Automated GitHub Actions CI/CD Release Pipeline**: Created .github/workflows/build-apk.yml with explicit 	sc --noEmit lint gate, itest unit test gate, and automatic release publishing on * tag push.
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
- **TypeScript Heap Optimizations**: Fixed 	sc --noEmit type checking memory allocation errors.

---

## [1.1.0] - 2026-08-28

### Added
- **Agenda & Live Calendar Integration**: Chronological multi-meeting pills on the desktop top bar with live status badges (🔴 LIVE: / In Xm:).
- **Clock & Dual Timezone Widgets**: Digital clock opens system clock (com.android.deskclock); matching-height secondary timezone container.
- **Tauri v2 Desktop Bridge**: Win32 media control and sub-millisecond hot corners companion server.
