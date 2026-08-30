import {
  AppItem,
  NotificationItem,
  DeviceInfo,
  DeviceProcess,
  ClipboardItem,
  NetworkServerConfig,
  WindowsBridgeConfig,
  AndroidBridgeConfig,
  ClipboardSyncConfig,
  RemoteExecutable,
  TrustedDevice
} from '../types/launcher';

export const DEVICE_COLORS: Record<string, string> = {
  'poco-pad': '#007AFF',  // Blue (POCO Pad Android Tablet)
  'this-pc': '#34C759',   // Green (Windows PC Host)
  'tab-pc': '#34C759',    // Green (Windows Companion)
  'main-pc': '#34C759',   // Green (Windows PC)
  'sm-t230nu': '#AF52DE', // Purple (Secondary Android)
};

const PALETTE = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#5856D6', // Indigo
  '#5AC8FA', // Teal
  '#FFCC00', // Yellow
];

export function getDeviceColor(deviceId: string, type?: string, os?: string): string {
  if (DEVICE_COLORS[deviceId]) return DEVICE_COLORS[deviceId];
  if (type === 'desktop' || type === 'laptop' || (os && os.toLowerCase().includes('windows'))) {
    return '#34C759'; // Green for Windows PC nodes
  }
  if (type === 'tablet' || (os && os.toLowerCase().includes('hyperos')) || deviceId.toLowerCase().includes('poco')) {
    return '#007AFF'; // Blue for POCO Pad / Android
  }
  // Deterministic consistent hash color for new dynamically added devices
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = (hash << 5) - hash + deviceId.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export const INITIAL_CLIPBOARD_ITEMS: ClipboardItem[] = [];

export const INITIAL_DEVICES: DeviceInfo[] = [
  {
    id: 'poco-pad',
    name: 'POCO Pad',
    type: 'tablet',
    os: 'Xiaomi HyperOS (Android 14)',
    status: 'connected',
    ipAddress: '127.0.0.1',
    resolution: '2560 × 1600 (12.1" 120Hz)',
    battery: 94,
    cpuLoad: 12,
    ramUsage: '3.4 / 8.0 GB',
    storage: '68 / 256 GB',
  },
];

export const INITIAL_DEVICE_PROCESSES: Record<string, DeviceProcess[]> = {
  'poco-pad': [],
};

export const INITIAL_APPS: AppItem[] = [
  // Core Operational Launcher Settings & Hub
  { id: 'settings', name: 'Settings & Hub', iconName: 'Settings', color: '#34C759', category: 'system', pageIndex: 0, order: 0 },

  // Real Queryable 3rd Party Packages on Device
  { id: 'app-calculator', name: 'Calculator', iconName: 'Calculator', color: '#FF9500', category: 'system', pageIndex: 0, order: 1, packageName: 'com.miui.calculator' },
  { id: 'app-notes', name: 'Notes', iconName: 'PenTool', color: '#FFCC00', category: 'productivity', pageIndex: 0, order: 2, packageName: 'com.miui.notes' },
  { id: 'app-termux', name: 'Termux', iconName: 'SquareTerminal', color: '#34C759', category: 'tools', pageIndex: 0, order: 3, packageName: 'com.termux' },
  { id: 'app-discord', name: 'Discord', iconName: 'MessageSquare', color: '#5865F2', category: 'media', pageIndex: 0, order: 4, packageName: 'com.discord' },
  { id: 'app-brave', name: 'Brave Browser', iconName: 'Globe', color: '#FF1B2D', category: 'media', pageIndex: 0, order: 5, packageName: 'com.brave.browser' },
];

export const DOCK_APP_IDS = ['settings'];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const WALLPAPER_PRESETS = [
  {
    id: 'alpine-horizon',
    name: 'Alpine Dusk',
    bgClass: 'bg-cover bg-center',
    preview: '#3B5998',
    style: {
      backgroundImage: `linear-gradient(rgba(10, 10, 12, 0.4), rgba(10, 10, 12, 0.65)), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
  },
  {
    id: 'material-fluid',
    name: 'Material Waves',
    bgClass: 'bg-cover bg-center',
    preview: '#2D3748',
    style: {
      backgroundImage: `linear-gradient(rgba(10, 10, 12, 0.35), rgba(10, 10, 12, 0.6)), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
  },
  {
    id: 'sunset-dune',
    name: 'Desert Mirage',
    bgClass: 'bg-cover bg-center',
    preview: '#C05621',
    style: {
      backgroundImage: `linear-gradient(rgba(10, 10, 12, 0.35), rgba(10, 10, 12, 0.6)), url('https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2000&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
  },
  {
    id: 'forest-mist',
    name: 'Nordic Forest',
    bgClass: 'bg-cover bg-center',
    preview: '#22543D',
    style: {
      backgroundImage: `linear-gradient(rgba(10, 10, 12, 0.4), rgba(10, 10, 12, 0.65)), url('https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2000&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
  },
  {
    id: 'nordic-aurora',
    name: 'Polar Aurora',
    bgClass: 'bg-cover bg-center',
    preview: '#234E52',
    style: {
      backgroundImage: `linear-gradient(rgba(10, 10, 12, 0.35), rgba(10, 10, 12, 0.6)), url('https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=2000&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
  },
  {
    id: 'cyber-grid',
    name: 'Cosmic Nebula',
    bgClass: 'bg-cover bg-center',
    preview: '#44337A',
    style: {
      backgroundImage: `linear-gradient(rgba(10, 10, 12, 0.4), rgba(10, 10, 12, 0.65)), url('https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2000&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
  },
  {
    id: 'geometric-pastel',
    name: 'Minimal Architecture',
    bgClass: 'bg-cover bg-center',
    preview: '#4A5568',
    style: {
      backgroundImage: `linear-gradient(rgba(10, 10, 12, 0.4), rgba(10, 10, 12, 0.65)), url('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=2000&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
  },
  {
    id: 'amoled-black',
    name: 'Clean Obsidian',
    bgClass: 'bg-[#0A0A0C]',
    preview: '#0A0A0C',
    style: { background: '#0A0A0C' },
  },
];

export const INITIAL_SERVER_CONFIG: NetworkServerConfig = {
  role: 'host',
  serverPort: 8890,
  serverHost: '192.168.1.104',
  autoDiscover: true,
  heartbeatIntervalMs: 5000,
  pairingSecret: '748-921',
  encryptionEnabled: true,
  autoStartOnBoot: true,
  broadcastMdns: true,
  serverStatus: 'running',
};

export const INITIAL_WINDOWS_BRIDGE: WindowsBridgeConfig = {
  agentInstalled: false,
  bridgePort: 9120,
  authToken: 'win-bridge-sec-token-894',
  allowRemotePower: true,
  allowProcessTermination: true,
  allowElevatedCommands: false,
  allowedExecutablesPath: 'C:\\Program Files;C:\\Tools;C:\\Windows\\System32',
  syncVolumeAndMedia: true,
  connectedHost: '',
};

export const INITIAL_ANDROID_BRIDGE: AndroidBridgeConfig = {
  companionInstalled: true,
  accessibilityServiceGranted: true,
  notificationSync: true,
  allowIntentBroadcasts: true,
  allowDeviceActions: true,
  syncBatteryAndSensors: true,
};

export const INITIAL_CLIPBOARD_SYNC_CONFIG: ClipboardSyncConfig = {
  enabled: true,
  syncMode: 'bidirectional',
  historyLimit: 50,
  retentionHours: 24,
  filterPasswords: true,
  syncImages: true,
  maxPayloadSizeKb: 2048,
  autoClearSensitiveMinutes: 15,
};

export const INITIAL_TRUSTED_DEVICES: TrustedDevice[] = [];

export const INITIAL_REMOTE_EXECUTABLES: RemoteExecutable[] = [];

