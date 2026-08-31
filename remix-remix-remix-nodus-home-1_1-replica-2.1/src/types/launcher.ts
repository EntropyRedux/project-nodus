export type DeviceType = 'tablet' | 'desktop' | 'laptop' | 'phone';

export type AppCategory = 'productivity' | 'media' | 'tools' | 'social' | 'games' | 'utilities' | 'all';

export type IconSize = 'small' | 'medium' | 'large' | 'xlarge';

export type DrawerLayout = 'continuous' | 'paginated';

export type IconShape = 'modern' | 'frosted' | 'minimal' | 'glass' | 'squircle-color';

export type IconStyle = 'default' | 'material-you' | 'monochrome' | 'outline' | 'neon' | 'squircle-color' | 'minimal-text';

export type AppLaunchMode = 'fullscreen' | 'floating';

export type AccentColorId = 'sapphire' | 'amber' | 'ruby' | 'garnet' | 'emerald' | 'amethyst';

export type ThemeId = 'glassmorphism' | 'cyberpunk-hud' | 'neobrutalism' | 'nordic-minimal' | 'material-light';

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
  status: 'online' | 'connected' | 'idle' | 'offline' | 'rebooting' | 'standby';
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

export interface DeviceProcess {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  memoryMb: number;
  category: 'user' | 'daemon' | 'service' | 'system' | string;
  description?: string;
  parentId?: number;
  appName?: string;
  appIcon?: string;
  children?: DeviceProcess[];
}

export type ProcessInfo = DeviceProcess;

export interface ClipboardItem {
  id: string;
  text: string;
  sourceDevice: string;
  deviceId?: string;
  deviceName: string;
  deviceColor?: string;
  imageData?: string;
  type?: 'text' | 'image';
  timestamp: string | number;
  pinned?: boolean;
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
  accentColor?: AccentColorId | string;
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
  enableClockWidget?: boolean;
  enableDeviceNameWidget?: boolean;
  enableBatteryWidget?: boolean;
  enableNotesWidget?: boolean;
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

export type LauncherSettings = SettingsState;

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
