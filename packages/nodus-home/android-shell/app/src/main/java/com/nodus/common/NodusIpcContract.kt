package com.nodus.common

/**
 * Nodus IPC Contract — Kotlin Mirror
 *
 * This file is the Kotlin equivalent of nodus-common/src/ipc/contract.ts.
 * Copy this file into each Android project's shared package.
 *
 * IMPORTANT: Keep this in sync with the TypeScript version.
 * Any changes here MUST be mirrored in contract.ts and vice versa.
 */
object NodusIpcContract {

    // ─── Package Names ────────────────────────────────────────
    /** Monolith APK (all-in-one, unchanged) */
    const val PACKAGE_MONOLITH = "com.nodus.launcher"
    /** Standalone Launcher APK */
    const val PACKAGE_HOME = "com.nodus.home"
    /** Multi-Device Extension APK */
    const val PACKAGE_FLEET = "com.nodus.fleet"
    /** System-Wide Overlay Companion APK */
    const val PACKAGE_ASSISTIVE = "com.nodus.assistive"

    // ─── ContentProvider Authorities ──────────────────────────
    /** Fleet's ContentProvider — serves devices, clipboard, config */
    const val FLEET_AUTHORITY = "com.nodus.fleet.provider"
    /** Home's ContentProvider — serves launcher settings/theme */
    const val HOME_AUTHORITY = "com.nodus.home.provider"

    // ─── ContentProvider URI Paths ────────────────────────────
    const val PATH_DEVICES = "devices"
    const val PATH_CLIPBOARD = "clipboard"
    const val PATH_CONFIG = "config"
    const val PATH_SETTINGS = "settings"
    const val PATH_RUNNING_APPS = "running-apps"

    // ─── Broadcast Actions ────────────────────────────────────
    const val ACTION_FLEET_STATE_CHANGED = "com.nodus.fleet.STATE_CHANGED"
    const val ACTION_CLIPBOARD_CHANGED = "com.nodus.fleet.CLIPBOARD_CHANGED"
    const val ACTION_DEVICE_CONNECTED = "com.nodus.fleet.DEVICE_CONNECTED"
    const val ACTION_DEVICE_DISCONNECTED = "com.nodus.fleet.DEVICE_DISCONNECTED"
    const val ACTION_HOME_SETTINGS_CHANGED = "com.nodus.home.SETTINGS_CHANGED"
    const val ACTION_TOGGLE_TASKBAR = "com.nodus.home.TOGGLE_TASKBAR"

    // ─── Broadcast Extras Keys ────────────────────────────────
    const val EXTRA_DEVICE_JSON = "device_json"
    const val EXTRA_CLIPBOARD_TEXT = "clipboard_text"
    const val EXTRA_CLIPBOARD_ITEM_JSON = "clipboard_item_json"
    const val EXTRA_SETTINGS_JSON = "settings_json"

    // ─── Custom Permissions ───────────────────────────────────
    /**
     * Signature-level permission shared across all Nodus APKs.
     * All APKs MUST be signed with the same keystore for this to work.
     */
    const val PERMISSION_FLEET_ACCESS = "com.nodus.permission.FLEET_ACCESS"
}
