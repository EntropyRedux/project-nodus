// @nodus/common type definitions & shared constants

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'tablet' | 'desktop' | 'phone' | 'laptop';
  os: 'android' | 'windows' | 'linux' | 'macos' | 'ios';
  ipAddress: string;
  port?: number;
  status: 'online' | 'connected' | 'idle' | 'offline' | 'rebooting';
  isLocal?: boolean;
  batteryPercent?: number;
  lastSeen?: string | number;
  ramTotalMb?: number;
  ramUsedMb?: number;
  cpuUsagePercent?: number;
  latencyMs?: number;
  resolution?: string;
}

export interface DeviceProcess {
  pid: number;
  name: string;
  subTitle?: string;
  user?: string;
  cpu: number;
  memoryMb: number;
  status?: 'running' | 'sleeping' | 'suspended';
  category?: 'browser' | 'dev' | 'media' | 'system' | 'productivity' | 'utility' | 'game' | 'user' | 'service' | 'daemon';
}

export interface ClipboardItem {
  id: string;
  text: string;
  deviceName: string;
  timestamp: string;
  deviceId?: string;
  deviceType?: 'tablet' | 'desktop' | 'phone' | 'laptop';
  deviceColor?: string;
  type?: 'text' | 'link' | 'code' | 'image' | string;
  pinned?: boolean;
  imageData?: string; // base64 PNG data
}

export interface AutoExportSettings {
  enabled: boolean;
  threshold: number; // Number of clips (e.g. 25, 50, 100) before auto-saving
  format: 'json' | 'txt' | 'md';
  lastAutoExportedAt: string | null;
  totalAutoExports: number;
}

export interface SystemStats {
  cpu_load_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
  hostname: string;
}

export interface NetworkServerConfig {
  role: 'host' | 'client';
  serverPort: number;
  serverHost: string;
  autoDiscover: boolean;
  heartbeatIntervalMs: number;
  pairingSecret: string;
  encryptionEnabled: boolean;
  autoStartOnBoot: boolean;
  broadcastMdns: boolean;
  serverStatus: 'running' | 'stopped' | 'error';
}

export const DEVICE_COLORS: Record<string, string> = {
  local: '#9ECAFF',
  'dev-pc': '#82D5A5',
  'macbook-pro': '#D4AAFF',
  'livingroom-tv': '#FFD87A',
  'pixel-fold': '#FFB4AB',
};
