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
  isClipboardSyncEnabled: boolean;
  toggleServer: () => void;
  toggleClipboardSync: () => void;
  selectDevice: (id: string) => void;
  removeDevice: (id: string) => void;
  rebootDevice: (id: string) => void;
  addPairedDevice?: (device: Partial<DeviceInfo>) => void;
  clearClipboard: () => void;
  deleteClipboardItem: (id: string) => void;
  toggleClipboardPin?: (id: string) => void;
  setClipboardText: (text: string, imageData?: string) => void;
  copyToClipboard: (text: string, imageData?: string) => void;
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
  batteryPercent: undefined,
  cpuUsagePercent: undefined,
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
  const [isClipboardSyncEnabled, setIsClipboardSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nodus_clipboard_sync_enabled');
      if (saved !== null) return JSON.parse(saved);
    } catch (_) {}
    return true;
  });
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

    if (typeof bridge.isClipboardSyncEnabled === 'function') {
      try {
        setIsClipboardSyncEnabled(bridge.isClipboardSyncEnabled());
      } catch (_) {}
    }

    if (typeof bridge.isDaemonRunning === 'function') {
      try {
        setIsServerRunning(bridge.isDaemonRunning());
      } catch (_) {}
    }

    if (typeof bridge.isHomeInstalled === 'function') {
      setIsHomeInstalled(bridge.isHomeInstalled());
    }

    let rawDevicesStr: string | null = null;
    let rawPeersStr: string | null = null;
    if (typeof bridge.getDevices === 'function') {
      try { rawDevicesStr = bridge.getDevices(); } catch (_) {}
    }
    if (typeof bridge.getDiscoveredPeers === 'function') {
      try { rawPeersStr = bridge.getDiscoveredPeers(); } catch (_) {}
    }

    if (rawDevicesStr || rawPeersStr) {
      try {
        const devList: any[] = rawDevicesStr ? JSON.parse(rawDevicesStr) : [];
        const peerList: any[] = rawPeersStr ? JSON.parse(rawPeersStr) : [];
        const all = [...(Array.isArray(devList) ? devList : []), ...(Array.isArray(peerList) ? peerList : [])];

        if (all.length > 0) {
          const deduplicated: DeviceInfo[] = [];
          const seenIps = new Set<string>();
          for (const d of all) {
            const cleanIp = (d.ipAddress || d.ip || '').split(':')[0].trim();
            if (d.isLocal || d.id === 'poco-pad' || d.id === 'local' || cleanIp === '127.0.0.1') {
              if (!seenIps.has('local')) {
                seenIps.add('local');
                deduplicated.push({
                  ...DEFAULT_LOCAL_TABLET,
                  ...d,
                  isLocal: true,
                });
              }
            } else if (cleanIp && !seenIps.has(cleanIp)) {
              seenIps.add(cleanIp);
              deduplicated.push({
                id: d.id || `node-${cleanIp.replace(/\./g, '-')}`,
                name: d.name || d.hostname || `Remote Node (${cleanIp})`,
                type: (d.type || d.deviceType || 'desktop') as any,
                os: (d.os || 'windows') as any,
                status: (d.status || 'online') as any,
                ipAddress: cleanIp,
                batteryPercent: d.batteryPercent ?? d.battery ?? 100,
                cpuUsagePercent: d.cpuUsagePercent ?? d.cpuLoad ?? 10,
                isLocal: false,
                latencyMs: d.latencyMs ?? 5,
              });
            }
          }
          const hasLocal = deduplicated.some(d => d.isLocal || d.id === 'poco-pad' || d.id === 'local');
          setDevices(hasLocal ? deduplicated : [DEFAULT_LOCAL_TABLET, ...deduplicated]);
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
          if (Array.isArray(parsed)) {
            const sanitized = parsed.map((item: any) => ({
              ...item,
              imageData: item.imageData === 'null' || item.imageData === 'undefined' ? undefined : item.imageData,
              type: item.imageData && item.imageData !== 'null' ? 'image' : item.type === 'image' ? 'text' : item.type
            }));
            setClipboardItems(sanitized);
          }
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
    const onClipboardChanged = (e: any) => {
      if (e.detail) {
        const item = { ...e.detail };
        if (item.imageData === 'null' || item.imageData === 'undefined') {
          delete item.imageData;
          if (item.type === 'image') item.type = 'text';
        }
        setClipboardItems(prev => {
          const filtered = prev.filter(i => {
            if (item.imageData && i.imageData) return i.imageData !== item.imageData;
            return i.text !== item.text;
          });
          return [item, ...filtered].slice(0, 100);
        });
      }
    };

    window.addEventListener('fleet-state-changed', onStateChanged);
    window.addEventListener('clipboard-changed', onClipboardChanged);
    const pollTimer = setInterval(refreshState, 3000);

    return () => {
      window.removeEventListener('fleet-state-changed', onStateChanged);
      window.removeEventListener('clipboard-changed', onClipboardChanged);
      clearInterval(pollTimer);
    };
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

  const addPairedDevice = useCallback((device: Partial<DeviceInfo>) => {
    const ip = device.ipAddress || (device as any).ip;
    if (!ip) return;
    const cleanIp = ip.split(':')[0].trim();
    const id = device.id || `node-${cleanIp.replace(/\./g, '-')}`;
    const newDev: DeviceInfo = {
      id,
      name: device.name || `Remote Node (${cleanIp})`,
      type: device.type || 'desktop',
      os: device.os || 'windows',
      status: 'connected',
      ipAddress: cleanIp,
      batteryPercent: device.batteryPercent ?? 100,
      cpuUsagePercent: device.cpuUsagePercent ?? 0,
      isLocal: false,
      latencyMs: device.latencyMs ?? 5,
    };

    setDevices(prev => {
      const filtered = prev.filter(d => {
        if (d.isLocal || d.id === 'poco-pad' || d.id === 'local') return true;
        const existingIp = (d.ipAddress || '').split(':')[0].trim();
        return existingIp !== cleanIp && d.id !== id;
      });
      return [...filtered, newDev];
    });
    setActiveDeviceId(id);

    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.addPairedDevice === 'function') {
      bridge.addPairedDevice(cleanIp, (device as any).port || 9120, newDev.name);
    }
  }, []);

  const clearClipboard = useCallback(() => {
    setClipboardItems([]);
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.clearClipboard === 'function') {
      bridge.clearClipboard();
    }
  }, []);

  const toggleClipboardSync = useCallback(() => {
    setIsClipboardSyncEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('nodus_clipboard_sync_enabled', JSON.stringify(next));
      } catch (_) {}
      const bridge = (window as any).NodusNativeBridge;
      if (bridge && typeof bridge.setClipboardSyncEnabled === 'function') {
        bridge.setClipboardSyncEnabled(next);
      }
      return next;
    });
  }, []);

  const deleteClipboardItem = useCallback((id: string) => {
    setClipboardItems(prev => prev.filter(i => i.id !== id));
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.deleteClipboardItem === 'function') {
      bridge.deleteClipboardItem(id);
    }
  }, []);

  const toggleClipboardPin = useCallback((id: string) => {
    setClipboardItems(prev =>
      prev.map(i => (i.id === id ? { ...i, pinned: !i.pinned } : i))
    );
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.toggleClipboardPin === 'function') {
      bridge.toggleClipboardPin(id);
    }
  }, []);

  const setClipboardText = useCallback((text: string, imageData?: string) => {
    const bridge = (window as any).NodusNativeBridge;
    if (bridge) {
      if (imageData && typeof bridge.copyImageToClipboard === 'function') {
        bridge.copyImageToClipboard(imageData, text || 'Image');
      } else if (imageData && typeof bridge.setClipboardTextWithImage === 'function') {
        bridge.setClipboardTextWithImage(text || 'Image', imageData);
      } else if (typeof bridge.setClipboardText === 'function') {
        bridge.setClipboardText(text);
      }
    }
    refreshState();
  }, [refreshState]);

  const copyToClipboard = useCallback((text: string, imageData?: string) => {
    const bridge = (window as any).NodusNativeBridge;
    if (bridge) {
      if (imageData && typeof bridge.copyImageToClipboard === 'function') {
        bridge.copyImageToClipboard(imageData, text || 'Image');
      } else if (imageData && typeof bridge.copyToClipboardWithImage === 'function') {
        bridge.copyToClipboardWithImage(text || 'Image', imageData);
      } else if (typeof bridge.copyToClipboard === 'function') {
        bridge.copyToClipboard(text);
      }
    } else if (navigator.clipboard) {
      if (text) navigator.clipboard.writeText(text).catch(() => {});
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
        isClipboardSyncEnabled,
        toggleServer,
        toggleClipboardSync,
        selectDevice,
        removeDevice,
        rebootDevice,
        addPairedDevice,
        clearClipboard,
        deleteClipboardItem,
        toggleClipboardPin,
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
