// ─── Settings Types ───────────────────────────────────────────
// Launcher settings type shared across Home and Assistive Touch (for theme sync)

import { NetworkServerConfig, WindowsBridgeConfig, AndroidBridgeConfig, TrustedDevice, RemoteExecutable } from './network';
import { ClipboardSyncConfig } from './clipboard';

export type IconStyle = 'material-you' | 'monochrome' | 'outline' | 'minimal-text' | 'squircle-color' | 'neon';

export type WallpaperId =
  | 'alpine-horizon'
  | 'material-fluid'
  | 'sunset-dune'
  | 'forest-mist'
  | 'cyber-grid'
  | 'nordic-aurora'
  | 'geometric-pastel'
  | 'amoled-black'
  | 'custom';

export interface LauncherSettings {
  deviceFrame: boolean;
  themeMode: 'dark' | 'light' | 'auto';
  accentColor: string;
  iconStyle: IconStyle;
  selectedIconPackPackage?: string;
  iconSize: 'small' | 'medium' | 'large' | 'xlarge';
  drawerLayout: 'continuous' | 'paginated';
  showLabels: boolean;
  gridColumns: 4 | 5;
  wallpaper: WallpaperId;
  customWallpaperUrl?: string;
  soundEffects: boolean;
  hapticFeedback: boolean;
  notificationBadges: boolean;
  atAGlanceWidget: boolean;
  clockWidgetStyle: 'digital-bold' | 'minimal-pill' | 'analog' | 'material-stack';
  minimalistMode: boolean;
  leftPanelOpacity?: number;
  taskbarOpacity?: number;
  clipboardPanelOpacity?: number;
  folderOpacity?: number;
  taskbarIconScale?: 'small' | 'medium' | 'large' | 'xlarge';
  appLaunchMode?: 'fullscreen' | 'floating';

  // Multi-Device Network Controller & Server Settings (populated when Fleet is installed)
  networkServer: NetworkServerConfig;
  windowsBridge: WindowsBridgeConfig;
  androidBridge: AndroidBridgeConfig;
  clipboardSync: ClipboardSyncConfig;
  trustedDevices: TrustedDevice[];
  remoteExecutables: RemoteExecutable[];
  showRemoteAppsInMainDrawer: boolean;
  showOnlyLocalInDrawer: boolean;
}

/**
 * Subset of LauncherSettings that Assistive Touch needs for theme matching.
 * Queried from Home's ContentProvider.
 */
export interface ThemeSettings {
  themeMode: 'dark' | 'light' | 'auto';
  accentColor: string;
  taskbarOpacity?: number;
  taskbarIconScale?: 'small' | 'medium' | 'large' | 'xlarge';
  soundEffects: boolean;
}
