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
  type?: string;
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
