export type IconStyle = 'material-you' | 'monochrome' | 'outline' | 'minimal-text' | 'squircle-color' | 'neon';

export type AccentColorId = 'sapphire' | 'amber' | 'ruby' | 'garnet' | 'emerald' | 'amethyst';

export type ThemeId = 'glassmorphism' | 'cyberpunk-hud' | 'neobrutalism' | 'nordic-minimal' | 'material-light';

export type IconShape = 'modern' | 'frosted' | 'minimal' | 'glass' | 'squircle-color';

export type WallpaperId = 
  | 'alpine-horizon'
  | 'material-fluid'
  | 'sunset-dune'
  | 'forest-mist'
  | 'nordic-aurora'
  | 'cyber-grid'
  | 'geometric-pastel'
  | 'amoled-black'
  | 'custom';

export type DeviceType = 'tablet' | 'desktop' | 'phone' | 'laptop';

export interface DeviceProcess {
  pid: number;
  name: string;
  user: string;
  cpu: number; // percentage e.g. 4.2
  memoryMb: number; // MB
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  category: 'system' | 'user' | 'service' | 'daemon';
  description?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  os: string;
  status: 'online' | 'connected' | 'idle' | 'offline' | 'rebooting';
  ipAddress: string;
  resolution: string;
  battery?: number;
  cpuLoad?: number;
  ramUsage?: string;
  storage?: string;
  isCustom?: boolean;
  isRebooting?: boolean;
  customAvatar?: string;
}

export interface ClipboardItem {
  id: string;
  text: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  deviceColor: string; // Color code for the device
  type: 'text' | 'link' | 'code' | 'snippet' | 'image';
  timestamp: string;
  pinned?: boolean;
  imageData?: string; // base64 data URL e.g. "data:image/png;base64,..."
}

export interface AppItem {
  id: string;
  name: string;
  iconName: string;
  color: string;
  category: 'system' | 'productivity' | 'media' | 'tools' | 'social' | 'games';
  badgeCount?: number;
  customIcon?: string;
  isRemovable?: boolean;
  folderId?: string | null; // if in a folder
  pageIndex: number; // 0, 1, etc.
  order: number;
  packageName?: string;
  webUrl?: string;
  pwaDesktopUrl?: string;
  launchTarget?: 'native' | 'pwa' | 'hybrid';
  isRemote?: boolean;
  remoteExecutableId?: string;
  remoteDeviceName?: string;
  remoteIconBase64?: string;
}

export interface FloatingWindow {
  id: string;
  appId: string;
  title: string;
  iconName?: string;
  customIcon?: string;
  color?: string;
  webUrl?: string;
  type: 'internal' | 'web_pwa' | 'remote_vnc';
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  savedBounds?: { x: number; y: number; width: number; height: number };
}

export interface FolderItem {
  id: string;
  name: string;
  color: string;
  pageIndex: number;
  order: number;
  appIds: string[];
}

export interface NotificationItem {
  id: string;
  appId: string;
  packageName?: string;
  appName: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  iconName: string;
  color: string;
}

export type DeviceOS = 'android' | 'windows' | 'linux' | 'macos';
export type NodeRole = 'host' | 'client' | 'standalone';

export interface NetworkServerConfig {
  role: NodeRole;
  serverPort: number;
  serverHost: string;
  autoDiscover: boolean;
  heartbeatIntervalMs: number;
  pairingSecret: string;
  encryptionEnabled: boolean;
  autoStartOnBoot: boolean;
  broadcastMdns: boolean;
  serverStatus: 'running' | 'connecting' | 'connected' | 'stopped' | 'error';
}

export interface WindowsBridgeConfig {
  agentInstalled: boolean;
  bridgePort: number;
  authToken: string;
  allowRemotePower: boolean; // Sleep, Lock, Shutdown, Restart
  allowProcessTermination: boolean; // Taskkill
  allowElevatedCommands: boolean; // PowerShell / CMD as Admin
  allowedExecutablesPath: string; // Whitelisted directory
  syncVolumeAndMedia: boolean;
  connectedHost: string;
}

export interface AndroidBridgeConfig {
  companionInstalled: boolean;
  accessibilityServiceGranted: boolean;
  notificationSync: boolean;
  allowIntentBroadcasts: boolean;
  allowDeviceActions: boolean; // Lock, Flashlight, Camera, Hotspot
  syncBatteryAndSensors: boolean;
}

export interface RemoteExecutable {
  id: string;
  deviceId: string; // Target device ID e.g. "main-pc" or "poco-pad"
  deviceName: string;
  deviceType: DeviceType;
  deviceOs: DeviceOS;
  name: string;
  description?: string;
  category: 'tools' | 'productivity' | 'games' | 'media' | 'system' | 'custom';
  iconName: string;
  iconColor: string;
  iconBase64?: string;
  execType: 'native_app' | 'command' | 'url_protocol' | 'script' | 'intent';
  commandOrPackage: string; // e.g. "code .", "steam://run/730", "powershell -Command ...", "com.spotify.music"
  args?: string;
  workingDir?: string;
  runAsAdmin?: boolean;
  enabled: boolean;
  pinnedToDrawer: boolean;
  lastExecuted?: string;
}

export interface ClipboardSyncConfig {
  enabled: boolean;
  syncMode: 'bidirectional' | 'send_only' | 'receive_only' | 'manual';
  historyLimit: number; // 10, 25, 50, 100
  retentionHours: number; // 1, 24, 168 (7d), 0 (unlimited)
  filterPasswords: boolean;
  syncImages: boolean;
  maxPayloadSizeKb: number;
  autoClearSensitiveMinutes: number;
}

export interface TrustedDevice {
  id: string;
  name: string;
  os: DeviceOS;
  ip: string;
  fingerprint: string;
  isTrusted: boolean;
  lastSeen: string;
  permissions: {
    remoteExec: boolean;
    clipboardSync: boolean;
    processKill: boolean;
    powerControl: boolean;
  };
}

export interface IconPackInfo {
  packageName: string;
  name: string;
  icon?: string;
}

export interface LauncherSettings {
  deviceFrame: boolean; // Show simulated phone shell or full viewport
  theme: ThemeId;
  themeMode: 'dark' | 'light' | 'auto';
  accentColor: string; // Hex or theme key
  iconStyle: IconStyle;
  iconShape?: IconShape;
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
  enableClockWidget?: boolean;
  secondaryTimezone?: string;
  enableDeviceNameWidget?: boolean;
  enableBatteryWidget?: boolean;
  enableNotesWidget?: boolean;
  minimalistMode: boolean; // list-based text launcher vs icon grid
  leftPanelOpacity?: number;
  taskbarOpacity?: number;
  clipboardPanelOpacity?: number;
  folderOpacity?: number;
  taskbarIconScale?: 'small' | 'medium' | 'large' | 'xlarge';
  appLaunchMode?: 'fullscreen' | 'floating';

  // Multi-Device & Extensions Gating
  enableMultiDevice: boolean; // Left device sidebar & multi-device switcher
  enableClipboardPanel: boolean; // Right universal clipboard history panel
  enableAssistiveTouch?: boolean;
  taskbarMode?: 'static' | 'assistive_only' | 'auto';

  // Multi-Device Network Controller & Server Settings
  networkServer: NetworkServerConfig;
  windowsBridge: WindowsBridgeConfig;
  androidBridge: AndroidBridgeConfig;
  clipboardSync: ClipboardSyncConfig;
  trustedDevices: TrustedDevice[];
  remoteExecutables: RemoteExecutable[];
  showRemoteAppsInMainDrawer: boolean; // Show whitelisted remote shortcuts in main launcher
  showOnlyLocalInDrawer: boolean; // Filter strictly to local apps

  // 🧪 Experimental Features (Multi-Window PWA & Shizuku)
  enableExperimentalPwaWindows: boolean; // Enable floating draggable/resizable desktop PWA windows
  preferPwaAlternatives: boolean; // Route apps with web equivalents to rich desktop PWA windows
  enableExperimentalShizukuFreeform: boolean; // Use privileged Shizuku AOSP freeform window dispatch
}

export type NoteCategory = 'todo' | 'note' | 'calendar' | 'checklist';
export type NoteColor = 'amber' | 'emerald' | 'sapphire' | 'purple' | 'rose';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface NoteItem {
  id: string;
  title?: string;
  text: string;
  completed: boolean;
  type: NoteCategory;
  color?: NoteColor;
  createdAt: number;
  dueDate?: string;
  pinned?: boolean;
  checklist?: ChecklistItem[];
}

export interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
  allDay: boolean;
  location?: string;
  meetLink?: string;
  color?: string;
}

