/**
 * @nodus/common — Canonical Shared Contracts & Types for Project Nodus
 * Single source of truth across Nodus Desktop, Nodus Fleet, and Nodus Home.
 */

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'tablet' | 'desktop' | 'phone' | 'laptop';
  os: 'android' | 'windows' | 'linux' | 'macos' | 'ios';
  ipAddress: string;
  port?: number;
  httpPort?: number;
  status: 'online' | 'connected' | 'idle' | 'offline' | 'rebooting';
  isLocal?: boolean;
  batteryPercent?: number;
  lastSeen?: string | number;
  ramTotalMb?: number;
  ramUsedMb?: number;
  cpuUsagePercent?: number;
  latencyMs?: number;
  resolution?: string;
  model?: string;
  manufacturer?: string;
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
  timestamp: string | number;
  deviceId?: string;
  deviceType?: 'tablet' | 'desktop' | 'phone' | 'laptop';
  deviceColor?: string;
  type?: 'text' | 'link' | 'code' | 'image' | string;
  pinned?: boolean;
  imageData?: string; // base64 PNG data
  sourceDevice?: string;
}

export interface AutoExportSettings {
  enabled: boolean;
  threshold: number;
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

export interface TrustedEntry {
  nickname?: string;
  trusted: boolean;
  firstSeen?: number;
  mac?: string;
}

export interface ScannedPeer {
  ip: string;
  port: number;
  hostname?: string;
  nickname?: string;
  hasAgent: boolean;
  isInFleet?: boolean;
  isTrusted?: boolean;
  isUnknown?: boolean;
  deviceType?: 'desktop' | 'laptop' | 'tablet' | 'phone';
  os?: string;
  latencyMs?: number;
  mac?: string;
}

export type TerminalLineType = 'input' | 'output' | 'error' | 'system' | 'warn' | 'success';

export interface TerminalLine {
  id: string;
  type: TerminalLineType;
  content: string;
  timestamp: number;
}

export interface TerminalSession {
  id: string;
  targetDevice: DeviceInfo;
  title: string;
  lines: TerminalLine[];
  ptySessionId?: string;
  isConPty?: boolean;
  offset?: number;
  connected?: boolean;
  status: 'connected' | 'connecting' | 'disconnected';
  createdAt: number;
}

export interface SharedApp {
  id: string;
  name: string;
  category: 'productivity' | 'communication' | 'media' | 'tools' | 'dev' | 'utility';
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'tablet' | 'phone';
  deviceColor: string;
  deviceIp?: string;
  path?: string;
  description?: string;
  icon_base64?: string;
  iconBase64?: string;
  sharedBy?: 'me' | 'peer';
  enabled: boolean;
}

export interface PairingRequestPayload {
  deviceId: string;
  name: string;
  deviceType?: string;
  os?: string;
  ipAddress?: string;
  httpPort?: number;
  action?: 'request' | 'ack' | 'confirm';
  isAck?: boolean;
}

export interface PairingResponsePayload {
  status: 'pending_approval' | 'approved' | 'rejected' | 'success';
  ok: boolean;
  accepted?: boolean;
  message?: string;
  authToken?: string;
  token?: string;
  deviceId?: string;
  name?: string;
}

export const DEVICE_COLORS: Record<string, string> = {
  local: '#9ECAFF',
  'poco-pad': '#007AFF',
  'this-pc': '#34C759',
  'dev-pc': '#82D5A5',
  'macbook-pro': '#D4AAFF',
  'livingroom-tv': '#FFD87A',
  'pixel-fold': '#FFB4AB',
};
