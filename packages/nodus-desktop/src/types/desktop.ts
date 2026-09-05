// Nodus Desktop -- Core Type Definitions

export type DeviceType = 'tablet' | 'desktop' | 'phone' | 'laptop';
export type DeviceOS = 'android' | 'windows' | 'linux' | 'macos';

export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  os: string;
  status: 'online' | 'connected' | 'idle' | 'offline' | 'rebooting';
  ipAddress: string;
  resolution?: string;
  battery?: number;
  batteryPercent?: number;
  cpuLoad?: number;
  cpuUsagePercent?: number;
  ramUsage?: string;
  ramTotalMb?: number;
  storage?: string;
  isCustom?: boolean;
  isLocal?: boolean;
  latencyMs?: number;
}

export interface DeviceProcess {
  pid: number;
  parentPid?: number;
  parentName?: string;
  name: string;
  user?: string;
  cpu?: number;
  memoryMb?: number;
  status?: 'running' | 'sleeping' | 'stopped' | 'zombie';
  category?: 'user' | 'daemon' | 'system' | 'service' | 'browser' | 'dev' | 'media' | 'productivity';
  description?: string;
}

export interface ClipboardItem {
  id: string;
  text: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  deviceColor: string;
  type: 'text' | 'link' | 'code' | 'snippet' | 'image';
  timestamp: string;
  pinned?: boolean;
  imageData?: string;
}

export interface RemoteExecutable {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  deviceOs: DeviceOS;
  name: string;
  description?: string;
  category: 'tools' | 'productivity' | 'games' | 'media' | 'system' | 'custom';
  iconName: string;
  iconColor: string;
  execType: 'native_app' | 'command' | 'url_protocol' | 'script' | 'intent';
  commandOrPackage: string;
  args?: string;
  workingDir?: string;
  runAsAdmin?: boolean;
  enabled: boolean;
  pinnedToDrawer: boolean;
  lastExecuted?: string;
}

export interface SystemStats {
  hostname: string;
  os: string;
  cpu_load_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
  uptime_seconds: number;
}

export interface ServerConfig {
  host: string;
  port: number;
  status: 'running' | 'idle' | 'scanning';
  pairingSecret: string;
  auth_token?: string;
  autoDiscover: boolean;
  autoStartOnBoot: boolean;
  broadcastMdns: boolean;
  encryptionEnabled: boolean;
  allowedPaths: string;
  strictSandbox: boolean;
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

export interface HotCornerAction {
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  action: 'fleet' | 'clipboard' | 'shortcuts' | 'processes' | 'lock' | 'none';
  enabled: boolean;
}

export interface HotCornerConfig {
  enabled: boolean;
  dwellTimeMs: number;
  marginPx: number;
  disableInFullscreen: boolean;
  corners: Record<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', string>;
}

export type ActiveTab =
  | 'fleet'
  | 'topology'
  | 'control'
  | 'terminal'
  | 'clipboard'
  | 'shortcuts'
  | 'remotedeck'
  | 'processes'
  | 'config'
  | 'hotcorners';
