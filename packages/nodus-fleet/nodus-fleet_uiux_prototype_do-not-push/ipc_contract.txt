// ─── Nodus IPC Contract ───────────────────────────────────────
// Defines all cross-APK communication constants.
// This file is the SINGLE SOURCE OF TRUTH for:
//   - ContentProvider authorities and URI paths
//   - Broadcast action strings
//   - Broadcast extras keys
//   - Custom permission names
//   - Package names for module detection
//
// Both the TypeScript frontend and Kotlin Android code reference these values.
// The Kotlin mirror lives at: nodus-common/src/kotlin/NodusIpcContract.kt

// ─── Package Names ────────────────────────────────────────────
/** Monolith APK (all-in-one, unchanged) */
export const PACKAGE_MONOLITH = 'com.nodus.launcher';
/** Standalone Launcher APK */
export const PACKAGE_HOME = 'com.nodus.home';
/** Multi-Device Extension APK */
export const PACKAGE_FLEET = 'com.nodus.fleet';
/** System-Wide Overlay Companion APK */
export const PACKAGE_ASSISTIVE = 'com.nodus.assistive';

// ─── ContentProvider Authorities ──────────────────────────────
/** Fleet's ContentProvider authority — serves devices, clipboard, config */
export const FLEET_AUTHORITY = 'com.nodus.fleet.provider';
/** Home's ContentProvider authority — serves launcher settings/theme */
export const HOME_AUTHORITY = 'com.nodus.home.provider';

// ─── ContentProvider URI Paths ────────────────────────────────
/** GET /devices → JSON array of DeviceInfo[] */
export const PATH_DEVICES = 'devices';
/** GET /clipboard → JSON array of ClipboardItem[] */
export const PATH_CLIPBOARD = 'clipboard';
/** GET /config → JSON object of FleetConfig */
export const PATH_CONFIG = 'config';
/** GET /settings → JSON object of ThemeSettings */
export const PATH_SETTINGS = 'settings';
/** GET /running-apps → JSON array of running app IDs */
export const PATH_RUNNING_APPS = 'running-apps';

// ─── Full Content URIs (convenience) ──────────────────────────
export const URI_FLEET_DEVICES = `content://${FLEET_AUTHORITY}/${PATH_DEVICES}`;
export const URI_FLEET_CLIPBOARD = `content://${FLEET_AUTHORITY}/${PATH_CLIPBOARD}`;
export const URI_FLEET_CONFIG = `content://${FLEET_AUTHORITY}/${PATH_CONFIG}`;
export const URI_HOME_SETTINGS = `content://${HOME_AUTHORITY}/${PATH_SETTINGS}`;
export const URI_HOME_RUNNING_APPS = `content://${HOME_AUTHORITY}/${PATH_RUNNING_APPS}`;

// ─── Broadcast Actions ────────────────────────────────────────
/** Fleet → Home/Assistive: General state changed (devices, config) */
export const ACTION_FLEET_STATE_CHANGED = 'com.nodus.fleet.STATE_CHANGED';
/** Fleet → Home/Assistive: Clipboard item added/synced */
export const ACTION_CLIPBOARD_CHANGED = 'com.nodus.fleet.CLIPBOARD_CHANGED';
/** Fleet → Home/Assistive: A new device connected to the mesh */
export const ACTION_DEVICE_CONNECTED = 'com.nodus.fleet.DEVICE_CONNECTED';
/** Fleet → Home/Assistive: A device disconnected from the mesh */
export const ACTION_DEVICE_DISCONNECTED = 'com.nodus.fleet.DEVICE_DISCONNECTED';
/** Home → Assistive: Launcher settings changed (theme, opacity, etc.) */
export const ACTION_HOME_SETTINGS_CHANGED = 'com.nodus.home.SETTINGS_CHANGED';
/** Assistive → Home: Request to toggle the desktop taskbar */
export const ACTION_TOGGLE_TASKBAR = 'com.nodus.home.TOGGLE_TASKBAR';

// ─── Broadcast Extras Keys ────────────────────────────────────
/** JSON string of a DeviceInfo object */
export const EXTRA_DEVICE_JSON = 'device_json';
/** Plain text of clipboard content */
export const EXTRA_CLIPBOARD_TEXT = 'clipboard_text';
/** JSON string of a ClipboardItem object */
export const EXTRA_CLIPBOARD_ITEM_JSON = 'clipboard_item_json';
/** JSON string of ThemeSettings */
export const EXTRA_SETTINGS_JSON = 'settings_json';

// ─── Custom Permissions ───────────────────────────────────────
/**
 * Signature-level permission shared across all Nodus APKs.
 * Protects ContentProvider access and broadcast reception.
 * REQUIREMENT: All APKs must be signed with the SAME keystore.
 */
export const PERMISSION_FLEET_ACCESS = 'com.nodus.permission.FLEET_ACCESS';

// ─── Module Detection Result ──────────────────────────────────
export interface NodusModules {
  /** com.nodus.home is installed */
  home: boolean;
  /** com.nodus.fleet is installed */
  fleet: boolean;
  /** com.nodus.assistive is installed */
  assistive: boolean;
  /** com.nodus.launcher (monolith) is installed */
  monolith: boolean;
}

/**
 * Detect which Nodus modules are installed.
 * Relies on the NodusNativeBridge.isPackageInstalled() method
 * provided by the hosting APK's Kotlin WebView bridge.
 */
export function detectModules(): NodusModules {
  const bridge = (window as any).NodusNativeBridge;
  if (!bridge?.isPackageInstalled) {
    // Fallback: assume monolith mode (running inside project-nodus)
    return { home: false, fleet: false, assistive: false, monolith: true };
  }
  return {
    home: bridge.isPackageInstalled(PACKAGE_HOME),
    fleet: bridge.isPackageInstalled(PACKAGE_FLEET),
    assistive: bridge.isPackageInstalled(PACKAGE_ASSISTIVE),
    monolith: bridge.isPackageInstalled(PACKAGE_MONOLITH),
  };
}
