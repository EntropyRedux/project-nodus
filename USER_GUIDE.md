# User & Operations Guide — Project Nodus

Welcome to the **Project Nodus** Ecosystem User Guide! This guide provides step-by-step instructions on installing, configuring, and using Nodus Home on your Android tablet.

---

## 📖 Table of Contents
1. [Installation & First-Time Setup](#1-installation--first-time-setup)
2. [Desktop & Launcher Basics](#2-desktop--launcher-basics)
3. [Window Management & Smart Auto-Stash](#3-window-management--smart-auto-stash)
4. [Calendar & Notes Sync](#4-calendar--notes-sync)
5. [System Settings & Customization](#5-system-settings--customization)
6. [Companion Apps & Nodus Fleet](#6-companion-apps--nodus-fleet)
7. [Troubleshooting & FAQs](#7-troubleshooting--faqs)

---

## 1. Installation & First-Time Setup

### Requirements:
- **Device**: Any Android tablet running Android 10, 11, 12, 13, or 14+ (e.g., POCO Pad, Xiaomi Pad, Samsung Galaxy Tab, Lenovo Tab, foldables).
- **Permissions**: Grant Notification Access when prompted to enable live icon badges for Gmail, LinkedIn, and system notifications.

### Quick Installation:
1. Download the latest `nodus-home-v1.3.0-debug.apk` directly from the [GitHub Releases Page](https://github.com/EntropyRedux/project-nodus/releases/latest).
2. Open the downloaded `.apk` file on your tablet and tap **Install**.
3. Press the **Home** button on your device and select **Nodus Home** as your Default Home App / Launcher.

---

## 2. Desktop & Launcher Basics

- **Continuous App Grid**: Swipe horizontally between pages. Nodus Home automatically packs installed apps sequentially on Page 1 before spilling onto subsequent pages.
- **Desktop Status Bar**: Displays real-time time, active live agenda pills, battery level, Wi-Fi status, and system notifications.
- **System Dock**: Access your pinned applications and launcher drawer at any time from the bottom of the screen.

---

## 3. Window Management & Smart Auto-Stash

Nodus Home features an advanced windowing engine designed to handle multi-tasking across all Android OEM systems:

- **Floating Windows**: Open apps in floating window mode for PC-like desktop multitasking.
- **Smart Auto-Stash**: On OEM environments with a 2-window floating limit (such as Xiaomi HyperOS), opening a 3rd floating app automatically stashes the oldest active app into the Taskbar stack with a toast notice.
- **Taskbar Stash Stack**: Tap any stashed app icon on the Taskbar to instantly restore its floating window.

---

## 4. Calendar & Notes Sync

- **Live Meeting Bar**: Upcoming calendar events automatically display on the desktop top bar with real-time indicators (`🔴 LIVE: Meeting Title` or `In 15m: Meeting Title`). Tapping a meeting pill opens the meeting link directly in Google Meet, Zoom, or Teams.
- **Google Calendar Sync**: Open the **Notes & Calendar** widget modal and tap **Sync Google Calendar**. An explicit privacy warning card will explain account scope before syncing.
- **Unsync Control**: To remove synced events or unlink your account, tap the **Unsync** button in the Notes & Calendar modal header at any time.

---

## 5. System Settings & Customization

Open **Settings App** from your desktop or app drawer to customize:
- **Surface Opacity**: Adjust background surface opacity smoothly from `0%` (completely transparent) to `100%` (solid opaque).
- **Secondary Timezone**: Enable a second clock container on the desktop to monitor remote timezones.
- **Custom Icon Packs**: Select custom icon packs. Dropdown options float smoothly above surface cards across all themes.

---

## 6. Companion Apps & Nodus Fleet

- **Nodus Fleet APK**: Nodus Home includes Fleet UI panels for workstation control (PC volume, process manager, mouse/keyboard remote). When Nodus Fleet APK is installed on the tablet, control actions delegate via IPC. If not installed, Nodus Home cleanly displays `"Requires Fleet APK"`.
- **Nodus Touch APK**: Assistive floating navigation overlay. Displays `"Requires Touch APK"` until installed.

---

## 7. Troubleshooting & FAQs

- **Q: Why do full-screen swipe gestures stop working on Xiaomi HyperOS / MIUI when setting Nodus Home as default launcher?**  
  This is an intentional vendor restriction by Xiaomi in HyperOS/MIUI: Xiaomi ties its full-screen gesture navigation service exclusively to System Launcher (`com.miui.home`). When any 3rd-party launcher is selected as default, HyperOS automatically disables system swipe gestures.
  
  **Workarounds**:
  - **Option 1 (3-Button Navigation)**: In System Settings > Home Screen > System Navigation, select **Buttons**. 3-button navigation (Home, Back, Recents) works flawlessly with 3rd-party launchers.
  - **Option 2 (Nodus Assistive Touch / Floating Overlay)**: Keep Xiaomi System Launcher as default to preserve swipe gestures, and use Nodus Home as a floating desktop app or trigger it via the Nodus Assistive Touch ball.
  - **Option 3 (Accessibility Gesture Service)**: Enable `Nodus Accessibility Service` in System Settings to trigger Home/Back/Recents actions via software hot corners or floating bars.

- **Q: How do I reset settings to default?**  
  Open **Settings** > scroll to the bottom > tap **Reset to Default**. This restores default theme, surface opacity, and clears secondary timezone settings without deleting your installed apps.
- **Q: How do I report a bug or request a feature?**  
  Submit an issue on our [GitHub Repository](https://github.com/EntropyRedux/project-nodus/issues).
