import { DeviceProcess, SystemStats, RemoteExecutable, ClipboardItem } from '../types/desktop';

export const MOCK_PROCESSES: DeviceProcess[] = [
  { pid: 4820, name: 'code.exe', memoryMb: 820, cpu: 3.4, category: 'user', user: 'Developer', status: 'running', description: 'Visual Studio Code IDE' },
  { pid: 8192, name: 'chrome.exe', memoryMb: 1450, cpu: 5.2, category: 'user', user: 'Developer', status: 'running', description: 'Google Chrome Browser' },
  { pid: 1204, name: 'node.exe', memoryMb: 340, cpu: 1.8, category: 'user', user: 'Developer', status: 'running', description: 'Node.js Runtime Worker' },
  { pid: 9120, name: 'nodus-hub.exe', memoryMb: 128, cpu: 0.6, category: 'daemon', user: 'SYSTEM', status: 'running', description: 'Nodus Fleet Bridge Daemon' },
  { pid: 6540, name: 'spotify.exe', memoryMb: 260, cpu: 0.9, category: 'user', user: 'Developer', status: 'running', description: 'Spotify Music Streaming' },
  { pid: 3120, name: 'explorer.exe', memoryMb: 195, cpu: 0.4, category: 'system', user: 'SYSTEM', status: 'running', description: 'Windows Desktop Shell' },
];

export const MOCK_SYSTEM_STATS: SystemStats = {
  hostname: 'Nodus-Workstation-PC',
  os: 'Windows 11 Pro 23H2 (x64)',
  cpu_load_percent: 18,
  ram_used_mb: 8420,
  ram_total_mb: 32768,
  uptime_seconds: 43200,
};

export const INITIAL_SHORTCUTS: RemoteExecutable[] = [
  {
    id: 'exec-1',
    deviceId: 'this-pc',
    deviceName: 'This Workstation',
    deviceType: 'desktop',
    deviceOs: 'windows',
    name: 'VS Code IDE',
    description: 'Launch Visual Studio Code in current repo',
    category: 'productivity',
    iconName: 'Code',
    iconColor: '#38BDF8',
    execType: 'native_app',
    commandOrPackage: 'code',
    args: '.',
    workingDir: 'C:\\Projects',
    runAsAdmin: false,
    enabled: true,
    pinnedToDrawer: true,
    lastExecuted: '10 mins ago',
  },
  {
    id: 'exec-2',
    deviceId: 'this-pc',
    deviceName: 'This Workstation',
    deviceType: 'desktop',
    deviceOs: 'windows',
    name: 'Windows Terminal',
    description: 'Elevated PowerShell 7 Admin Console',
    category: 'tools',
    iconName: 'Terminal',
    iconColor: '#4ADE80',
    execType: 'command',
    commandOrPackage: 'wt.exe',
    args: '-d C:\\Projects',
    workingDir: 'C:\\Projects',
    runAsAdmin: true,
    enabled: true,
    pinnedToDrawer: true,
    lastExecuted: '1 hour ago',
  },
];
