// ─── Network & Bridge Types ───────────────────────────────────
// Multi-device networking, bridge configs, remote executables, trusted devices

import { DeviceType, DeviceOS, NodeRole } from './device';

export interface NetworkServerConfig {
  role: NodeRole;
  serverPort: number;
  serverHost: string;
  autoDiscover: boolean;
  heartbeatIntervalMs: number;
  pairingSecret: string;
  encryptionEnabled: boolean;
  autoStartOnBoot: boolean;
  broadcastMdns: boolean;
  serverStatus: 'running' | 'connecting' | 'connected' | 'stopped' | 'error';
}

export interface WindowsBridgeConfig {
  agentInstalled: boolean;
  bridgePort: number;
  authToken: string;
  allowRemotePower: boolean;
  allowProcessTermination: boolean;
  allowElevatedCommands: boolean;
  allowedExecutablesPath: string;
  syncVolumeAndMedia: boolean;
  connectedHost: string;
}

export interface AndroidBridgeConfig {
  companionInstalled: boolean;
  accessibilityServiceGranted: boolean;
  notificationSync: boolean;
  allowIntentBroadcasts: boolean;
  allowDeviceActions: boolean;
  syncBatteryAndSensors: boolean;
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
