export type DeviceType = 'tablet' | 'desktop' | 'laptop' | 'phone';

export type AppCategory = 'productivity' | 'media' | 'tools' | 'social' | 'games' | 'utilities' | 'all';

export type IconSize = 'small' | 'medium' | 'large' | 'xlarge';

export type DrawerLayout = 'continuous' | 'paginated';

export type IconShape = 'modern' | 'frosted' | 'minimal' | 'glass' | 'squircle-color';

export type IconStyle = 'default' | 'material-you' | 'monochrome' | 'outline' | 'neon' | 'squircle-color' | 'minimal-text';

export type AppLaunchMode = 'fullscreen' | 'floating';

export type AccentColorId = 'sapphire' | 'amber' | 'ruby' | 'garnet' | 'emerald';

export type ThemeId = 'glassmorphism' | 'cyberpunk-hud' | 'neobrutalism' | 'nordic-minimal';

export interface AppItem {
  id: string;
  name: string;
  iconName: string;
  color?: string;
  customIcon?: string;
  category?: string;
  packageName?: string;
  pageIndex?: number;
  folderId?: string | null;
  badgeCount?: number;
  isPinned?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  appIds: string[];
  pageIndex?: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  os: string;
  status: 'online' | 'offline' | 'standby';
  ipAddress: string;
  resolution?: string;
  battery?: number;
  cpuLoad?: number;
  ramUsage?: string;
  storage?: string;
  customAvatar?: string;
  isCustom?: boolean;
  isRebooting?: boolean;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  memoryMb: number;
  category: 'user' | 'daemon' | 'service' | 'system';
  description?: string;
}

export interface ClipboardItem {
  id: string;
  text: string;
  sourceDevice: string;
  deviceName: string;
  timestamp: number;
  isPinned?: boolean;
  category?: 'text' | 'link' | 'code' | 'snippet';
}

export interface NotificationItem {
  id: string;
  appId: string;
  appName: string;
  title: string;
  message: string;
  time: string;
  iconName: string;
  color: string;
  packageName?: string;
  read?: boolean;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSec: number;
  coverColor: string;
}

export interface DrawerTab {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface RemoteExecutable {
  id: string;
  name: string;
  description: string;
  deviceId: string;
  deviceName: string;
  iconName: string;
  iconColor: string;
  execType: 'binary' | 'script' | 'command' | 'url';
  command: string;
}

export interface SettingsState {
  theme?: ThemeId;
  accentColor?: AccentColorId;
  appLaunchMode: AppLaunchMode;
  iconSize: IconSize;
  drawerLayout: DrawerLayout;
  wallpaper: string;
  customWallpaperUrl?: string;
  iconShape: IconShape;
  iconStyle: IconStyle;
  iconPack: string;
  taskbarOpacity: number;
  taskbarIconScale: IconSize;
  enableMultiDevice: boolean;
  enableAssistiveTouch: boolean;
  deviceFrame?: boolean;
  soundEffects: boolean;
  showLabels: boolean;
  notificationBadges: boolean;
  minimalistMode?: boolean;
  gridColumns?: number;
  folderOpacity?: number;
  leftPanelOpacity?: number;
  clockWidgetStyle?: 'digital-bold' | 'minimal-pill' | 'material-stack' | 'analog';
  atAGlanceWidget?: boolean;
}

export interface QuickSettingsState {
  wifi: boolean;
  bluetooth: boolean;
  flashlight: boolean;
  dnd: boolean;
  airplane: boolean;
  autoRotate: boolean;
  brightness: number;
  volume: number;
}

export interface AppContextMenuState {
  isOpen: boolean;
  appId: string;
  x: number;
  y: number;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}
