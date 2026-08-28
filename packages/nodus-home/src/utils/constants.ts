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
  'sm-t230nu': '#34C759', // Green (Host Controller)
  'poco-pad': '#007AFF',  // Blue (Secondary Android)
  'main-pc': '#FF9500',   // Orange (Windows 11 Workstation)
  'tab-pc': '#BF5AF2',    // Purple (Windows Touch)
};

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

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    appId: 'settings',
    appName: 'Fleet Hub',
    title: 'Cluster Server Active',
    message: 'WebSocket Hub listening on 192.168.1.104:8890',
    time: '2m ago',
    read: false,
    iconName: 'Server',
    color: '#34C759',
  },
  {
    id: 'notif-2',
    appId: 'terminal',
    appName: 'Remote Bridge',
    title: 'Windows Agent Connected',
    message: 'MAIN PC (192.168.1.150:9120) ready for remote execution',
    time: '8m ago',
    read: false,
    iconName: 'Terminal',
    color: '#007AFF',
  },
  {
    id: 'notif-3',
    appId: 'settings',
    appName: 'Clipboard Sync',
    title: 'Clipboard Linked',
    message: '2-way clipboard sync active across 4 nodes',
    time: '25m ago',
    read: true,
    iconName: 'Clipboard',
    color: '#FF9500',
  },
];

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
  agentInstalled: true,
  bridgePort: 9120,
  authToken: 'win-bridge-sec-token-894',
  allowRemotePower: true,
  allowProcessTermination: true,
  allowElevatedCommands: false,
  allowedExecutablesPath: 'C:\\Program Files;C:\\Tools;C:\\Windows\\System32',
  syncVolumeAndMedia: true,
  connectedHost: '192.168.1.150',
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

export const INITIAL_TRUSTED_DEVICES: TrustedDevice[] = [
  {
    id: 'sm-t230nu',
    name: 'SM-T230NU (Host Controller)',
    os: 'android',
    ip: '192.168.1.104',
    fingerprint: 'SHA256:7B:3A:99:C1:20:FE:44:88',
    isTrusted: true,
    lastSeen: 'Active Now',
    permissions: {
      remoteExec: true,
      clipboardSync: true,
      processKill: true,
      powerControl: true,
    },
  },
  {
    id: 'main-pc',
    name: 'MAIN PC (Windows 11)',
    os: 'windows',
    ip: '192.168.1.150',
    fingerprint: 'SHA256:4C:82:11:A9:90:3E:AA:12',
    isTrusted: true,
    lastSeen: '1m ago',
    permissions: {
      remoteExec: true,
      clipboardSync: true,
      processKill: true,
      powerControl: true,
    },
  },
  {
    id: 'poco-pad',
    name: 'POCO-PAD (HyperOS)',
    os: 'android',
    ip: '192.168.1.118',
    fingerprint: 'SHA256:19:FC:83:55:A2:11:66:3D',
    isTrusted: true,
    lastSeen: '3m ago',
    permissions: {
      remoteExec: true,
      clipboardSync: true,
      processKill: true,
      powerControl: false,
    },
  },
  {
    id: 'tab-pc',
    name: 'TAB PC (Windows Touch)',
    os: 'windows',
    ip: '192.168.1.172',
    fingerprint: 'SHA256:E0:44:77:99:01:BC:48:9A',
    isTrusted: true,
    lastSeen: '12m ago',
    permissions: {
      remoteExec: true,
      clipboardSync: true,
      processKill: false,
      powerControl: true,
    },
  },
];

export const INITIAL_REMOTE_EXECUTABLES: RemoteExecutable[] = [
  // Windows PC Remote Executables
  {
    id: 'win-exec-1',
    deviceId: 'main-pc',
    deviceName: 'MAIN PC',
    deviceType: 'desktop',
    deviceOs: 'windows',
    name: 'Visual Studio Code',
    description: 'Launch VS Code workspace on Windows Desktop',
    category: 'productivity',
    iconName: 'Code',
    iconColor: '#007ACC',
    execType: 'command',
    commandOrPackage: 'code .',
    workingDir: 'C:\\Projects',
    runAsAdmin: false,
    enabled: true,
    pinnedToDrawer: true,
    lastExecuted: '20m ago',
  },
  {
    id: 'win-exec-2',
    deviceId: 'main-pc',
    deviceName: 'MAIN PC',
    deviceType: 'desktop',
    deviceOs: 'windows',
    name: 'Windows Terminal (Admin)',
    description: 'Elevated PowerShell CLI prompt',
    category: 'tools',
    iconName: 'Terminal',
    iconColor: '#4E75F8',
    execType: 'command',
    commandOrPackage: 'wt.exe -p "PowerShell"',
    runAsAdmin: true,
    enabled: true,
    pinnedToDrawer: true,
    lastExecuted: '1h ago',
  },
  {
    id: 'win-exec-3',
    deviceId: 'main-pc',
    deviceName: 'MAIN PC',
    deviceType: 'desktop',
    deviceOs: 'windows',
    name: 'Steam Big Picture',
    description: 'Launch Steam client in Controller Gaming UI',
    category: 'games',
    iconName: 'Gamepad2',
    iconColor: '#1B2838',
    execType: 'url_protocol',
    commandOrPackage: 'steam://open/bigpicture',
    enabled: true,
    pinnedToDrawer: true,
    lastExecuted: 'Yesterday',
  },
  {
    id: 'win-exec-4',
    deviceId: 'main-pc',
    deviceName: 'MAIN PC',
    deviceType: 'desktop',
    deviceOs: 'windows',
    name: 'Lock Windows Workstation',
    description: 'Instant Lock Workstation Screen (rundll32.exe)',
    category: 'system',
    iconName: 'Lock',
    iconColor: '#FF9500',
    execType: 'command',
    commandOrPackage: 'rundll32.exe user32.dll,LockWorkStation',
    enabled: true,
    pinnedToDrawer: false,
  },
  {
    id: 'win-exec-5',
    deviceId: 'main-pc',
    deviceName: 'MAIN PC',
    deviceType: 'desktop',
    deviceOs: 'windows',
    name: 'Spotify Desktop Player',
    description: 'Start Spotify desktop background service',
    category: 'media',
    iconName: 'Music',
    iconColor: '#1DB954',
    execType: 'url_protocol',
    commandOrPackage: 'spotify:',
    enabled: true,
    pinnedToDrawer: true,
  },

  // Remote Android Executables (POCO-PAD)
  {
    id: 'and-exec-1',
    deviceId: 'poco-pad',
    deviceName: 'POCO-PAD',
    deviceType: 'tablet',
    deviceOs: 'android',
    name: 'Remote Camera Shutter',
    description: 'Trigger rear sensor high-res photo capture',
    category: 'tools',
    iconName: 'Camera',
    iconColor: '#007AFF',
    execType: 'intent',
    commandOrPackage: 'android.media.action.STILL_IMAGE_CAMERA',
    enabled: true,
    pinnedToDrawer: true,
    lastExecuted: '45m ago',
  },
  {
    id: 'and-exec-2',
    deviceId: 'poco-pad',
    deviceName: 'POCO-PAD',
    deviceType: 'tablet',
    deviceOs: 'android',
    name: 'YouTube Kids / Player',
    description: 'Launch YouTube app intent on tablet display',
    category: 'media',
    iconName: 'PlaySquare',
    iconColor: '#FF0000',
    execType: 'native_app',
    commandOrPackage: 'com.google.android.youtube',
    enabled: true,
    pinnedToDrawer: true,
  },
  {
    id: 'and-exec-3',
    deviceId: 'poco-pad',
    deviceName: 'POCO-PAD',
    deviceType: 'tablet',
    deviceOs: 'android',
    name: 'Toggle Portable WiFi Hotspot',
    description: 'Enable / Disable tethered 5G hotspot broadcast',
    category: 'system',
    iconName: 'Wifi',
    iconColor: '#34C759',
    execType: 'intent',
    commandOrPackage: 'nova.intent.action.TOGGLE_TETHERING',
    enabled: true,
    pinnedToDrawer: false,
  },
];
