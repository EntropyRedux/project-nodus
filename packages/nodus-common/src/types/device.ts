// ─── Device Types ─────────────────────────────────────────────
// Shared device-related types used across Nodus Home, Fleet, and Assistive Touch

export type DeviceType = 'tablet' | 'desktop' | 'phone' | 'laptop';

export type DeviceOS = 'android' | 'windows' | 'linux' | 'macos';

export type NodeRole = 'host' | 'client' | 'standalone';

export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  os: string;
  status: 'online' | 'connected' | 'idle' | 'offline' | 'rebooting';
  ipAddress: string;
  resolution: string;
  port?: number;
  battery?: number;
  cpuLoad?: number;
  ramUsage?: string;
  storage?: string;
  isCustom?: boolean;
  isLocal?: boolean;
  isRebooting?: boolean;
  isPaired?: boolean;
  lastSeen?: number;
  customAvatar?: string;
  avatar?: string;
  color?: string;
}

export interface DeviceProcess {
  pid: number;
  name: string;
  user: string;
  cpu: number;       // percentage e.g. 4.2
  memoryMb: number;  // MB
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  category: 'system' | 'user' | 'service' | 'daemon';
  description?: string;
}
