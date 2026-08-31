// ─── Clipboard Types ──────────────────────────────────────────
// Shared clipboard-related types for cross-device clipboard sync

import { DeviceType } from './device';

export interface ClipboardItem {
  id: string;
  text: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  deviceColor: string;
  type: 'text' | 'link' | 'code' | 'snippet';
  timestamp: string;
  pinned?: boolean;
}

export interface ClipboardSyncConfig {
  enabled: boolean;
  syncMode: 'bidirectional' | 'send_only' | 'receive_only' | 'manual';
  historyLimit: number;       // 10, 25, 50, 100
  retentionHours: number;     // 1, 24, 168 (7d), 0 (unlimited)
  filterPasswords: boolean;
  syncImages: boolean;
  maxPayloadSizeKb: number;
  autoClearSensitiveMinutes: number;
}
