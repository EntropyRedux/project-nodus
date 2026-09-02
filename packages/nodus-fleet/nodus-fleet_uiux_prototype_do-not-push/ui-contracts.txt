// Nodus Fleet — UI Component Contracts & Presentational Props
// These strict contracts decouple UI/UX components (from AI Studio / Figma) from Context & Native Bridge.

import { DeviceInfo, DeviceProcess, ClipboardItem } from '@nodus/common';

export interface DeviceCardProps {
  device: DeviceInfo;
  color?: string;
  isLocal?: boolean;
  onSelect?: (deviceId: string) => void;
  onOpenControls?: (device: DeviceInfo) => void;
  onReboot?: (deviceId: string) => void;
  onRemove?: (deviceId: string) => void;
}

export interface RemoteControlPadProps {
  device: DeviceInfo;
  statusMessage?: string | null;
  isLoading?: boolean;
  onMediaAction: (action: 'play_pause' | 'prev' | 'next' | 'volume_up' | 'volume_down' | 'volume_mute') => void;
  onHotkey: (keys: string[]) => void;
  onInjectText: (text: string) => void;
  onLockSystem: () => void;
  onClose: () => void;
}

export interface ProcessMonitorProps {
  device: DeviceInfo;
  processes: DeviceProcess[] | Array<{ pid: number; name: string; memory_kb: number }>;
  isLoading?: boolean;
  onRefresh: () => void;
  onKillProcess: (pid: number) => void;
}

export interface UniversalClipboardFeedProps {
  items: ClipboardItem[];
  onCopyItem?: (text: string) => void;
  onClearHistory?: () => void;
  onSyncText?: (text: string) => void;
}

export interface MeshTopologyVisualizerProps {
  devices: DeviceInfo[];
  activeDeviceId?: string;
  onSelectDevice?: (deviceId: string) => void;
}

export interface QuickActionsBarProps {
  onRescanMesh: () => void;
  onOpenHome?: () => void;
  isHomeInstalled?: boolean;
  connectedCount: number;
}
