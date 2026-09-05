import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DeviceInfo,
  ClipboardItem,
  NetworkServerConfig,
  DEVICE_COLORS
} from '../nodus-common';

interface FleetContextType {
  devices: DeviceInfo[];
  clipboardItems: ClipboardItem[];
  serverConfig: NetworkServerConfig;
  isHomeInstalled: boolean;
  isConnected: boolean;
  activeDeviceId: string;
  isServerRunning: boolean;
  toggleServer: () => void;
  selectDevice: (id: string) => void;
  removeDevice: (id: string) => void;
  rebootDevice: (id: string) => void;
  clearClipboard: () => void;
  setClipboardText: (text: string) => void;
  copyToClipboard: (text: string) => void;
  openInHome: () => void;
  refreshState: () => void;
}

const DEFAULT_LOCAL_TABLET: DeviceInfo = {
  id: 'poco-pad',
  name: 'POCO Pad',
  type: 'tablet',
  os: 'android',
  status: 'online',
  ipAddress: '127.0.0.1',
  batteryPercent: 85,
  cpuUsagePercent: 12,
  isLocal: true,
  latencyMs: 1,
};

const DEFAULT_SERVER_CONFIG: NetworkServerConfig = {
  role: 'host',
  serverPort: 8765,
  serverHost: '0.0.0.0',
  autoDiscover: true,
  heartbeatIntervalMs: 5000,
  pairingSecret: '',
  encryptionEnabled: true,
  autoStartOnBoot: true,
  broadcastMdns: true,
  serverStatus: 'running'
};

const FleetContext = createContext<FleetContextType | null>(null);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([DEFAULT_LOCAL_TABLET]);
  const [isServerRunning, setIsServerRunning] = useState<boolean>(true);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [serverConfig, setServerConfig] = useState<NetworkServerConfig>(DEFAULT_SERVER_CONFIG);
  const [isHomeInstalled, setIsHomeInstalled] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('local');

  const refreshState = useCallback(() => {
    const bridge = (window as any).NodusNativeBridge;
    if (!bridge) {
      // Browser mock fallback
      setIsHomeInstalled(false);
      setDevices([DEFAULT_LOCAL_TABLET]);
      setClipboardItems([]);
      return;
    }

    if (typeof bridge.isDaemonRunning === 'function') {
      try {
        setIsServerRunning(bridge.isDaemonRunning());
      } catch (_) {}
    }

    if (typeof bridge.isHomeInstalled === 'function') {
      setIsHomeInstalled(bridge.isHomeInstalled());
    }

    if (typeof bridge.getDevices === 'function') {
      try {
        const raw = bridge.getDevices();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const hasLocal = parsed.some(d => d.isLocal || d.id === 'poco-pad' || d.id === 'local');
            setDevices(hasLocal ? parsed : [DEFAULT_LOCAL_TABLET, ...parsed]);
          }
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

  const toggleServer = useCallback(() => {
    setIsServerRunning(prev => {
      const next = !prev;
      const bridge = (window as any).NodusNativeBridge;
      if (bridge && typeof bridge.setDaemonRunning === 'function') {
        bridge.setDaemonRunning(next);
      }
      setDevices(current =>
        current.map(d =>
          d.isLocal || d.id === 'poco-pad'
            ? {
                ...d,
                status: next ? 'online' : 'offline',
              }
            : d
        )
      );
      return next;
    });
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
    if (id === 'poco-pad' || id === 'local') return; // Protect local tablet
    setDevices(prev => prev.filter(d => d.id !== id));
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.removeDevice === 'function') {
      bridge.removeDevice(id);
    }
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

  const setClipboardText = useCallback((text: string) => {
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.setClipboardText === 'function') {
      bridge.setClipboardText(text);
    }
    refreshState();
  }, [refreshState]);

  const copyToClipboard = useCallback((text: string) => {
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.copyToClipboard === 'function') {
      bridge.copyToClipboard(text);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    refreshState();
  }, [refreshState]);

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
        isServerRunning,
        toggleServer,
        selectDevice,
        removeDevice,
        rebootDevice,
        clearClipboard,
        setClipboardText,
        copyToClipboard,
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
