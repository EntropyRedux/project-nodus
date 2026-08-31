import { AppItem, DeviceInfo, ClipboardItem, ProcessInfo, MusicTrack, RemoteExecutable, NoteItem } from '../types/launcher';

export const DEVICE_COLORS: Record<string, string> = {
  'dev-tablet': '#10B981', // Calibrated Emerald Mint
  'dev-desktop': '#38BDF8', // Precision Azure Blue
  'dev-macbook': '#A855F7', // Cluster Violet
  'dev-phone': '#F59E0B', // Warm Amber
  'dev-server': '#06B6D4', // Cyan Node
};

export const WALLPAPER_PRESETS = [
  {
    id: 'alpine',
    name: 'Precision Obsidian',
    style: {
      backgroundColor: '#090B10',
      backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% -15%, rgba(56, 189, 248, 0.12), rgba(16, 185, 129, 0.05), rgba(9, 11, 16, 0.98))',
    },
  },
  {
    id: 'tokyo-synth',
    name: 'Tokyo Neon Dusk',
    style: {
      backgroundColor: '#0A0518',
      backgroundImage: 'radial-gradient(ellipse 85% 65% at 50% -10%, rgba(255, 42, 133, 0.22), rgba(168, 85, 247, 0.15), rgba(10, 5, 24, 0.98)), linear-gradient(180deg, rgba(16, 8, 38, 0.6) 0%, rgba(10, 5, 24, 1) 100%)',
    },
  },
  {
    id: 'deep-nebula',
    name: 'Deep Core Violet',
    style: {
      backgroundColor: '#090A12',
      backgroundImage: 'radial-gradient(ellipse 70% 60% at 80% 20%, rgba(168, 85, 247, 0.14), rgba(56, 189, 248, 0.08), rgba(9, 10, 18, 0.98))',
    },
  },
  {
    id: 'cyber-emerald',
    name: 'Cyber Telemetry',
    style: {
      backgroundColor: '#070E0B',
      backgroundImage: 'radial-gradient(ellipse 80% 50% at 20% 90%, rgba(16, 185, 129, 0.16), rgba(6, 182, 212, 0.04), rgba(7, 14, 11, 0.98))',
    },
  },
  {
    id: 'solar-flare',
    name: 'Amber Glow Workstation',
    style: {
      backgroundColor: '#100C09',
      backgroundImage: 'radial-gradient(ellipse 70% 70% at 50% 10%, rgba(245, 158, 11, 0.14), rgba(244, 63, 94, 0.06), rgba(16, 12, 9, 0.98))',
    },
  },
  {
    id: 'midnight-slate',
    name: 'Midnight Carbon Slate',
    style: {
      backgroundColor: '#0B0F17',
      backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(30, 41, 59, 0.7), rgba(11, 15, 23, 0.98)), linear-gradient(180deg, #0F172A 0%, #080C14 100%)',
    },
  },
  {
    id: 'aurora-borealis',
    name: 'Arctic Aurora Matrix',
    style: {
      backgroundColor: '#06131A',
      backgroundImage: 'radial-gradient(ellipse 70% 50% at 30% 20%, rgba(20, 184, 166, 0.18), rgba(6, 182, 212, 0.12), rgba(6, 19, 26, 0.98)), linear-gradient(180deg, #071D24 0%, #040D12 100%)',
    },
  },
  {
    id: 'titanium-core',
    name: 'Titanium Matrix Core',
    style: {
      backgroundColor: '#111318',
      backgroundImage: 'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(100, 116, 139, 0.16), rgba(17, 19, 24, 0.98)), linear-gradient(180deg, #181B22 0%, #0F1116 100%)',
    },
  },
];

export const INITIAL_APPS: AppItem[] = [
  {
    id: 'settings',
    name: 'System Config',
    iconName: 'Sliders',
    color: '#64748B',
    category: 'tools',
    pageIndex: 0,
  },
  {
    id: 'browser',
    name: 'Browser',
    iconName: 'Globe',
    color: '#38BDF8',
    category: 'productivity',
    packageName: 'com.android.chrome',
    pageIndex: 0,
    isPinned: true,
  },
  {
    id: 'files',
    name: 'Workspace Files',
    iconName: 'Folder',
    color: '#F59E0B',
    category: 'tools',
    packageName: 'com.google.android.documentsui',
    pageIndex: 0,
    isPinned: true,
  },
  {
    id: 'terminal',
    name: 'Console Shell',
    iconName: 'Terminal',
    color: '#10B981',
    category: 'tools',
    pageIndex: 0,
  },
  {
    id: 'notes',
    name: 'Notes',
    iconName: 'FileText',
    color: '#EAB308',
    category: 'productivity',
    pageIndex: 0,
    badgeCount: 2,
  },
  {
    id: 'gallery',
    name: 'Media Vault',
    iconName: 'Image',
    color: '#A855F7',
    category: 'media',
    packageName: 'com.google.android.apps.photos',
    pageIndex: 0,
  },
  {
    id: 'music',
    name: 'Audio Lab',
    iconName: 'Music',
    color: '#F43F5E',
    category: 'media',
    packageName: 'com.spotify.music',
    pageIndex: 0,
    badgeCount: 1,
    isPinned: true,
  },
  {
    id: 'camera',
    name: 'Optical Capture',
    iconName: 'Camera',
    color: '#06B6D4',
    category: 'media',
    packageName: 'com.android.camera',
    pageIndex: 0,
  },
  {
    id: 'clock',
    name: 'Precision Clock',
    iconName: 'Clock',
    color: '#F59E0B',
    category: 'tools',
    pageIndex: 0,
  },
  {
    id: 'calculator',
    name: 'Matrix Calc',
    iconName: 'Calculator',
    color: '#10B981',
    category: 'tools',
    pageIndex: 0,
  },
  {
    id: 'calendar',
    name: 'Timeline',
    iconName: 'Calendar',
    color: '#F43F5E',
    category: 'productivity',
    packageName: 'com.google.android.calendar',
    pageIndex: 0,
  },
  {
    id: 'mail',
    name: 'Inbox Feed',
    iconName: 'Mail',
    color: '#38BDF8',
    category: 'productivity',
    packageName: 'com.google.android.gm',
    pageIndex: 0,
    badgeCount: 5,
  },
  {
    id: 'messages',
    name: 'Mesh Comms',
    iconName: 'MessageSquare',
    color: '#10B981',
    category: 'social',
    packageName: 'com.google.android.apps.messaging',
    pageIndex: 1,
    badgeCount: 3,
  },
  {
    id: 'discord',
    name: 'Discord Dev',
    iconName: 'MessageCircle',
    color: '#6366F1',
    category: 'social',
    packageName: 'com.discord',
    pageIndex: 1,
    badgeCount: 12,
  },
  {
    id: 'vscode',
    name: 'VS Code Cloud',
    iconName: 'Code',
    color: '#38BDF8',
    category: 'productivity',
    pageIndex: 1,
  },
  {
    id: 'studio',
    name: 'Mesh Telemetry',
    iconName: 'Cpu',
    color: '#10B981',
    category: 'tools',
    pageIndex: 1,
  },
  {
    id: 'remote-desktop',
    name: 'Node Display',
    iconName: 'Monitor',
    color: '#A855F7',
    category: 'tools',
    pageIndex: 1,
  },
  {
    id: 'gaming-hub',
    name: 'GPU Sandbox',
    iconName: 'Gamepad2',
    color: '#F43F5E',
    category: 'games',
    pageIndex: 1,
  },
];

export const INITIAL_DEVICES: DeviceInfo[] = [
  {
    id: 'dev-tablet',
    name: 'Xiaomi POCO Pad',
    type: 'tablet',
    os: 'Android 14 / HyperOS',
    status: 'online',
    ipAddress: '192.168.1.108',
    resolution: '2560 × 1600 @ 120Hz',
    battery: 92,
    cpuLoad: 16,
    ramUsage: '3.6 / 8.0 GB',
    storage: '64 / 256 GB',
  },
  {
    id: 'dev-desktop',
    name: 'Workstation RIG-01',
    type: 'desktop',
    os: 'Windows 11 Pro (24H2)',
    status: 'online',
    ipAddress: '192.168.1.140',
    resolution: '3840 × 2160 @ 144Hz',
    cpuLoad: 34,
    ramUsage: '18.4 / 64.0 GB',
    storage: '1.2 / 4.0 TB',
  },
  {
    id: 'dev-laptop',
    name: 'MacBook Pro M3 Max',
    type: 'laptop',
    os: 'macOS Sonoma 14.5',
    status: 'online',
    ipAddress: '192.168.1.175',
    resolution: '3024 × 1964 @ 120Hz',
    battery: 88,
    cpuLoad: 12,
    ramUsage: '22.1 / 36.0 GB',
    storage: '320 / 1000 GB',
  },
  {
    id: 'dev-phone',
    name: 'Xiaomi 14 Ultra',
    type: 'phone',
    os: 'Android 14 / HyperOS',
    status: 'standby',
    ipAddress: '192.168.1.192',
    resolution: '3200 × 1440 @ 120Hz',
    battery: 76,
    cpuLoad: 8,
    ramUsage: '4.8 / 16.0 GB',
    storage: '180 / 512 GB',
  },
];

export const INITIAL_PROCESSES: Record<string, ProcessInfo[]> = {
  'dev-desktop': [
    // Visual Studio Code
    { pid: 4820, name: 'Code.exe', appName: 'Visual Studio Code', user: 'user', cpu: 7.4, memoryMb: 580, category: 'user', description: 'Visual Studio Code (Main Window)' },
    { pid: 4824, name: 'Code.exe (Extension Host)', appName: 'Visual Studio Code', user: 'user', cpu: 4.6, memoryMb: 490, category: 'user', description: 'Extension Host (nodus-desktop, tailwind)' },
    { pid: 4829, name: 'Code.exe (Language Server)', appName: 'Visual Studio Code', user: 'user', cpu: 2.2, memoryMb: 350, category: 'user', description: 'TypeScript Language Server (tsserver)' },

    // Google Chrome
    { pid: 7812, name: 'chrome.exe', appName: 'Google Chrome', user: 'user', cpu: 3.8, memoryMb: 820, category: 'user', description: 'Tab: GitHub - project-nodus/core' },
    { pid: 7815, name: 'chrome.exe (GPU)', appName: 'Google Chrome', user: 'user', cpu: 2.9, memoryMb: 610, category: 'user', description: 'GPU Process (DirectX 12 D3D11)' },
    { pid: 7818, name: 'chrome.exe (Tab: Docs)', appName: 'Google Chrome', user: 'user', cpu: 1.1, memoryMb: 440, category: 'user', description: 'Tab: Google AI Studio Build' },
    { pid: 7822, name: 'chrome.exe (Utility)', appName: 'Google Chrome', user: 'user', cpu: 0.8, memoryMb: 440, category: 'user', description: 'Utility: Audio Service & WebRTC' },

    // Docker Desktop
    { pid: 1204, name: 'docker.exe', appName: 'Docker Desktop', user: 'SYSTEM', cpu: 2.6, memoryMb: 1980, category: 'daemon', description: 'Docker Engine Container Host' },
    { pid: 1208, name: 'containerd.exe', appName: 'Docker Desktop', user: 'SYSTEM', cpu: 1.5, memoryMb: 1120, category: 'daemon', description: 'containerd worker service' },

    // Spotify
    { pid: 9024, name: 'Spotify.exe', appName: 'Spotify', user: 'user', cpu: 1.6, memoryMb: 240, category: 'user', description: 'Spotify Desktop Player' },
    { pid: 9028, name: 'SpotifyHelper.exe', appName: 'Spotify', user: 'user', cpu: 0.7, memoryMb: 140, category: 'user', description: 'Audio Engine & Cache Manager' },

    // Discord
    { pid: 3316, name: 'Discord.exe', appName: 'Discord', user: 'user', cpu: 1.2, memoryMb: 310, category: 'user', description: 'Discord Voice & Video Client' },
    { pid: 3320, name: 'DiscordHelper.exe', appName: 'Discord', user: 'user', cpu: 0.6, memoryMb: 180, category: 'user', description: 'Discord GPU Overlay Worker' },

    // Background & System Services
    { pid: 104, name: 'nodus-daemon.exe', appName: 'Nodus Mesh Sync', user: 'SYSTEM', cpu: 0.5, memoryMb: 48, category: 'daemon', description: 'Nodus Mesh Sync Daemon (Port 2222)' },
    { pid: 884, name: 'explorer.exe', appName: 'Windows Explorer', user: 'user', cpu: 1.2, memoryMb: 240, category: 'system', description: 'Windows Shell Experience & Taskbar' },
    { pid: 5612, name: 'adb.exe', appName: 'Android Debug Bridge', user: 'user', cpu: 0.2, memoryMb: 34, category: 'daemon', description: 'ADB Server Daemon (Port 5037)' },
  ],
  'dev-tablet': [
    // Nodus Home Launcher
    { pid: 1024, name: 'com.nodus.launcher', appName: 'Nodus Home', user: 'u0_a112', cpu: 3.1, memoryMb: 125, category: 'user', description: 'Nodus Home Primary Desktop Shell' },
    { pid: 1028, name: 'com.nodus.launcher:surface', appName: 'Nodus Home', user: 'u0_a112', cpu: 1.4, memoryMb: 60, category: 'user', description: 'Live Hardware Canvas Surface' },

    // System UI
    { pid: 2301, name: 'com.android.systemui', appName: 'System UI', user: 'system', cpu: 2.4, memoryMb: 190, category: 'system', description: 'Navigation Bar & Notification Center' },
    { pid: 2305, name: 'com.android.systemui:keyguard', appName: 'System UI', user: 'system', cpu: 0.8, memoryMb: 70, category: 'system', description: 'Biometric & Lockscreen Pipeline' },

    // Spotify
    { pid: 3410, name: 'com.spotify.music', appName: 'Spotify', user: 'u0_a98', cpu: 1.5, memoryMb: 130, category: 'user', description: 'Spotify Audio Playback Engine' },
    { pid: 3415, name: 'com.spotify.music:service', appName: 'Spotify', user: 'u0_a98', cpu: 0.6, memoryMb: 60, category: 'user', description: 'Media Session & Notification Handler' },

    // Google Play Services
    { pid: 5120, name: 'com.google.android.gms', appName: 'Google Play Services', user: 'system', cpu: 1.2, memoryMb: 220, category: 'service', description: 'GMS Core Location & Cloud Messaging' },
    { pid: 5128, name: 'com.google.android.gms.persistent', appName: 'Google Play Services', user: 'system', cpu: 0.6, memoryMb: 100, category: 'service', description: 'Persistent Auth & Backup Broker' },

    // Nodus Low-Latency Bridge
    { pid: 6104, name: 'nodus_bridge_agent', appName: 'Nodus Bridge', user: 'root', cpu: 0.4, memoryMb: 28, category: 'daemon', description: 'Native Kotlin UNIX Socket Bridge' },
  ],
  'dev-laptop': [
    // Figma
    { pid: 2190, name: 'Figma', appName: 'Figma', user: 'staff', cpu: 4.8, memoryMb: 1250, category: 'user', description: 'Figma Canvas & GPU Renderer' },
    { pid: 2195, name: 'Figma Helper (Renderer)', appName: 'Figma', user: 'staff', cpu: 1.6, memoryMb: 600, category: 'user', description: 'Metal Graphics Shader Engine' },

    // iTerm2
    { pid: 1420, name: 'iTerm2', appName: 'iTerm2', user: 'staff', cpu: 2.2, memoryMb: 150, category: 'user', description: 'Zsh Session (/bin/zsh)' },
    { pid: 1425, name: 'login', appName: 'iTerm2', user: 'staff', cpu: 1.0, memoryMb: 70, category: 'user', description: 'Sub-TTY Terminal PTY worker' },

    // Nodus Node Agent
    { pid: 912, name: 'NodusAgent', appName: 'Nodus Node Host', user: 'staff', cpu: 0.8, memoryMb: 64, category: 'daemon', description: 'Nodus macOS Node Mesh Host' },
  ],
  'dev-phone': [
    { pid: 801, name: 'system_server', appName: 'Android Core Server', user: 'system', cpu: 2.8, memoryMb: 410, category: 'system', description: 'Activity Manager & Window Manager' },
    { pid: 1102, name: 'nodus_fleet_worker', appName: 'Nodus Fleet Worker', user: 'u0_a104', cpu: 0.3, memoryMb: 32, category: 'daemon', description: 'Low Power BLE & WiFi Mesh Probe' },
  ],
};

export const INITIAL_CLIPBOARD: ClipboardItem[] = [
  {
    id: 'clip-1',
    text: 'ssh user@192.168.1.140 -p 2222',
    sourceDevice: 'dev-desktop',
    deviceName: 'Workstation RIG-01',
    timestamp: Date.now() - 1000 * 60 * 5,
    isPinned: true,
    category: 'code',
  },
  {
    id: 'clip-2',
    text: 'https://github.com/project-nodus/nodus-home',
    sourceDevice: 'dev-tablet',
    deviceName: 'Xiaomi POCO Pad',
    timestamp: Date.now() - 1000 * 60 * 22,
    isPinned: true,
    category: 'link',
  },
  {
    id: 'clip-3',
    text: 'npm run dev -- --host 0.0.0.0 --port 3000',
    sourceDevice: 'dev-laptop',
    deviceName: 'MacBook Pro M3 Max',
    timestamp: Date.now() - 1000 * 60 * 65,
    isPinned: false,
    category: 'code',
  },
  {
    id: 'clip-4',
    text: 'Meeting notes: finalize 120Hz gesture response, optimize Web Audio latency buffer, verify cross-device clip sync.',
    sourceDevice: 'dev-phone',
    deviceName: 'Xiaomi 14 Ultra',
    timestamp: Date.now() - 1000 * 60 * 180,
    isPinned: false,
    category: 'text',
  },
];

export const INITIAL_MUSIC_TRACK: MusicTrack = {
  id: 'track-1',
  title: 'Obsidian Synthesis (120Hz Mix)',
  artist: 'Nodus Audio Lab',
  album: 'HyperOS Ambient',
  durationSec: 245,
  coverColor: '#34C759',
};

export const REMOTE_EXECUTABLES: RemoteExecutable[] = [
  {
    id: 'exec-1',
    name: 'Build Full Cluster',
    description: 'Triggers remote webpack/vite build on RIG-01 workstation',
    deviceId: 'dev-desktop',
    deviceName: 'Workstation RIG-01',
    iconName: 'Layers',
    iconColor: '#007AFF',
    execType: 'command',
    command: 'cd ~/nodus-repo && npm run build',
  },
  {
    id: 'exec-2',
    name: 'Reboot Android Debug Bridge',
    description: 'Restarts adb server and reconnects wireless mesh ports',
    deviceId: 'dev-desktop',
    deviceName: 'Workstation RIG-01',
    iconName: 'RotateCcw',
    iconColor: '#34C759',
    execType: 'command',
    command: 'adb kill-server && adb start-server',
  },
  {
    id: 'exec-3',
    name: 'Clear GPU Cache & Free RAM',
    description: 'Flushes system buffer caches across tablet memory',
    deviceId: 'dev-tablet',
    deviceName: 'Xiaomi POCO Pad',
    iconName: 'Zap',
    iconColor: '#FF9500',
    execType: 'command',
    command: 'sync && echo 3 > /proc/sys/vm/drop_caches',
  },
];

export const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note-5',
    title: 'Workstation Setup Checklist',
    text: 'Essential hardware and pipeline configuration',
    completed: false,
    type: 'checklist',
    color: 'emerald',
    createdAt: Date.now() - 1000 * 60 * 30,
    pinned: true,
    checklist: [
      { id: 'chk-1', text: '120Hz display refresh synchronization', completed: true },
      { id: 'chk-2', text: 'Cross-device node mesh discovery', completed: true },
      { id: 'chk-3', text: 'Real-time clipboard synchronization', completed: false },
      { id: 'chk-4', text: 'Low-latency Web Audio buffer test', completed: false },
    ],
  },
  {
    id: 'note-1',
    title: 'Nodus Sprint Tasks',
    text: 'Optimize 120Hz HyperOS gesture pipeline and audio latency buffer',
    completed: false,
    type: 'todo',
    color: 'sapphire',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    dueDate: 'Today, 6:00 PM',
  },
  {
    id: 'note-2',
    title: 'Cluster Verification',
    text: 'Verify cross-device clipboard sync across POCO Pad and RIG-01',
    completed: false,
    type: 'todo',
    color: 'purple',
    createdAt: Date.now() - 1000 * 60 * 120,
    dueDate: 'Tomorrow',
  },
  {
    id: 'note-3',
    title: 'Google Calendar Sync Idea',
    text: 'Upcoming integration: Sync meeting notes and reminders directly into the Nodus Top Widget bar',
    completed: false,
    type: 'note',
    color: 'amber',
    createdAt: Date.now() - 1000 * 60 * 300,
    pinned: false,
  },
  {
    id: 'note-4',
    title: 'Docker Build Container',
    text: 'Update Dockerfile with Node.js 22 LTS base image',
    completed: true,
    type: 'todo',
    color: 'rose',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
];
