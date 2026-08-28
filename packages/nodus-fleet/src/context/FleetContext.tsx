import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DeviceInfo,
  ClipboardItem,
  NetworkServerConfig,
  DEVICE_COLORS
} from '@nodus/common';

interface FleetContextType {
  devices: DeviceInfo[];
  clipboardItems: ClipboardItem[];
  serverConfig: NetworkServerConfig;
  isHomeInstalled: boolean;
  isConnected: boolean;
  activeDeviceId: string;
  selectDevice: (id: string) => void;
  removeDevice: (id: string) => void;
  rebootDevice: (id: string) => void;
  clearClipboard: () => void;
  openInHome: () => void;
  refreshState: () => void;
}

const DEFAULT_SERVER_CONFIG: NetworkServerConfig = {
  role: 'host',
  serverPort: 8765,
  serverHost: '0.0.0.0',
  autoDiscover: true,
  heartbeatIntervalMs: 5000,
  pairingSecret: 'NODUS-FLEET-SECURE',
  encryptionEnabled: true,
  autoStartOnBoot: true,
  broadcastMdns: true,
  serverStatus: 'running'
};

const FleetContext = createContext<FleetContextType | null>(null);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [serverConfig, setServerConfig] = useState<NetworkServerConfig>(DEFAULT_SERVER_CONFIG);
  const [isHomeInstalled, setIsHomeInstalled] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('local');

  const refreshState = useCallback(() => {
    const bridge = (window as any).NodusNativeBridge;
    if (!bridge) {
      // Browser mock fallback
      setIsHomeInstalled(true);
      setDevices([
        {
          id: 'poco-pad',
          name: 'POCO Pad',
          type: 'tablet',
          os: 'android',
          status: 'online',
          ipAddress: '127.0.0.1',
          resolution: '2560x1600',
          battery: 85,
          cpuLoad: 14,
          ramUsage: '3.4 / 8.0 GB'
        },
        {
          id: 'workstation-pc',
          name: 'Workstation RTX',
          type: 'desktop',
          os: 'windows',
          status: 'connected',
          ipAddress: '192.168.1.100',
          resolution: '3840x2160',
          battery: 100,
          cpuLoad: 24,
          ramUsage: '14.2 / 32.0 GB'
        }
      ]);
      setClipboardItems([
        {
          id: 'clip-1',
          text: 'https://github.com/EntropyRedux/project-nodus',
          deviceId: 'workstation-pc',
          deviceName: 'Workstation RTX',
          deviceType: 'desktop',
          deviceColor: '#007AFF',
          type: 'link',
          timestamp: '12:45'
        },
        {
          id: 'clip-2',
          text: 'adb shell am start -n com.nodus.home/.HomeActivity',
          deviceId: 'poco-pad',
          deviceName: 'POCO Pad',
          deviceType: 'tablet',
          deviceColor: '#34C759',
          type: 'text',
          timestamp: '12:30'
        }
      ]);
      return;
    }

    if (typeof bridge.isHomeInstalled === 'function') {
      setIsHomeInstalled(bridge.isHomeInstalled());
    }

    if (typeof bridge.getDevices === 'function') {
      try {
        const raw = bridge.getDevices();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setDevices(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse devices from bridge', e);
      }
    }

    if (typeof bridge.getClipboardHistory === 'function') {
      try {
        const raw = bridge.getClipboardHistory();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setClipboardItems(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse clipboard from bridge', e);
      }
    }
  }, []);

  useEffect(() => {
    refreshState();

    const onStateChanged = () => refreshState();
    window.addEventListener('fleet-state-changed', onStateChanged);
    return () => window.removeEventListener('fleet-state-changed', onStateChanged);
  }, [refreshState]);

  const selectDevice = useCallback((id: string) => {
    setActiveDeviceId(id);
  }, []);

  const removeDevice = useCallback((id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  }, []);

  const rebootDevice = useCallback((id: string) => {
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.rebootDevice === 'function') {
      bridge.rebootDevice(id);
    }
  }, []);

  const clearClipboard = useCallback(() => {
    setClipboardItems([]);
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.clearClipboard === 'function') {
      bridge.clearClipboard();
    }
  }, []);

  const openInHome = useCallback(() => {
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.openInHome === 'function') {
      bridge.openInHome();
    }
  }, []);

  return (
    <FleetContext.Provider
      value={{
        devices,
        clipboardItems,
        serverConfig,
        isHomeInstalled,
        isConnected,
        activeDeviceId,
        selectDevice,
        removeDevice,
        rebootDevice,
        clearClipboard,
        openInHome,
        refreshState
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error('useFleet must be used within FleetProvider');
  return ctx;
};
