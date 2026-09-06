import { DeviceInfo, DeviceProcess, ClipboardItem } from './desktop';

// 1. Mesh Topology Visualizer (Interactive SVG Graph)
export interface MeshTopologyVisualizerProps {
  devices: DeviceInfo[];
  activeDeviceId?: string;
  onSelectDevice?: (deviceId: string) => void;
}

// 2. Remote Control Deck & Virtual Trackpad
export interface RemoteControlTabProps {
  devices: DeviceInfo[];
  targetDeviceId: string | null;
  onSelectDevice: (id: string) => void;
}

// 3. Remote Process Monitor Table
export interface ProcessMonitorProps {
  device: DeviceInfo;
  devices?: DeviceInfo[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (id: string) => void;
  processes: Array<{ pid: number; name: string; memory_kb: number }> | DeviceProcess[];
  isLoading?: boolean;
  isPolling?: boolean;
  onTogglePolling?: () => void;
  systemStats?: any;
  onRefresh: () => void;
  onKillProcess: (pid: number) => void;
}

export interface RemoteTerminalProps {
  sessions?: TerminalSession[];
  activeSessionId?: string | null;
  availableDevices: DeviceInfo[];
  scannedPeers?: ScannedPeer[];
  isLoading?: boolean;
  isExecuting?: boolean;
  theme?: string;
  onSendCommand?: (sessionId: string, command: string) => void;
  onCreateSession?: (device: DeviceInfo) => void;
  onCloseSession?: (sessionId: string) => void;
  onSetActiveSession?: (sessionId: string) => void;
  onClearBuffer?: (sessionId: string) => void;
}

// 5. Subnet Pairing Modal
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

export interface DevicePairingModalProps {
  isOpen: boolean;
  isScanning: boolean;
  scanProgress: number;
  subnet: string;
  scannedPeers: any[];
  trustedDevices?: Record<string, TrustedEntry>;
  lanDeviceCount?: number;
  isServerRunning?: boolean;
  onStartServer?: () => void;
  onUpdateNickname?: (ip: string, nickname: string, trusted: boolean) => void;
  onClose: () => void;
  onStartScan: (subnet: string) => void;
  onSubnetChange: (subnet: string) => void;
  onPair: (ip: string, port: number, token: string, peer?: ScannedPeer) => void;
}

// Terminal line and session types
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
  lines: TerminalLine[];
  isConnected: boolean;
  cwd: string;
}

// Remote App Shortcuts Types
export type AppCategory = 'browser' | 'media' | 'dev' | 'productivity' | 'system' | 'game' | 'utility';

export interface SharedApp {
  id: string;
  name: string;
  category: AppCategory;
  deviceId: string;
  deviceName: string;
  deviceType: 'tablet' | 'desktop' | 'phone' | 'laptop';
  deviceColor: string;
  path?: string;
  description?: string;
  sharedBy: 'me' | 'peer';
  enabled: boolean;
}

export interface RemoteAppShortcutsProps {
  myApps: SharedApp[];
  peerApps: SharedApp[];
  onToggleMyApp: (id: string, enabled: boolean) => void;
  onLaunchPeerApp: (app: SharedApp) => void;
  onLaunchMyApp?: (app: SharedApp) => void;
  onDeleteMyApp?: (id: string) => void;
  onRegisterApp?: (app: { name: string; path: string; category: AppCategory; description?: string }) => void;
  onAddMyApp?: () => void;
}

