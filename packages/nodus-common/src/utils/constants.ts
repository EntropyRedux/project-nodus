// ─── Shared Constants ─────────────────────────────────────────
// Constants used across multiple Nodus modules

/**
 * Device color mapping: device ID → hex color.
 * Used for device sidebar accents, taskbar tinting, and clipboard badges.
 */
export const DEVICE_COLORS: Record<string, string> = {
  'sm-t230nu': '#34C759',  // Green (Host Controller)
  'poco-pad': '#007AFF',   // Blue (Secondary Android)
  'main-pc': '#FF9500',    // Orange (Windows 11 Workstation)
  'tab-pc': '#BF5AF2',     // Purple (Windows Touch)
};

/**
 * Default accent color used across the Nodus ecosystem.
 */
export const DEFAULT_ACCENT_COLOR = '#34C759';

/**
 * Default theme mode.
 */
export const DEFAULT_THEME_MODE = 'dark' as const;

/**
 * Global Nodus Network and Wire Protocol Defaults
 */
export const NODUS_DEFAULTS = {
  HTTP_PORT: 9120,
  DISCOVERY_PORT: 8765,
  BEACON_INTERVAL_MS: 5000,
  DEFAULT_WORKSTATION_COLOR: '#34C759',
  DEFAULT_TABLET_COLOR: '#007AFF',
  AUTH_HEADER: 'X-Nodus-Auth-Token',
};
