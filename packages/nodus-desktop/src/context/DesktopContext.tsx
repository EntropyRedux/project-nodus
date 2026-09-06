import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { 
  DeviceInfo, 
  ClipboardItem, 
  DeviceProcess, 
  RemoteExecutable, 
  SystemStats, 
  ServerConfig, 
  DeviceType,
  TrustedDevice,
  HotCornerConfig,
  ActiveTab
} from '../types/desktop';
import { TauriService } from '../services/TauriCommands';
import { ClipboardBroadcastService } from '../services/ClipboardBroadcastService';
import { INITIAL_SHORTCUTS as FIXTURE_SHORTCUTS } from '../__fixtures__/desktopFixtures';

interface DesktopContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Devices & Fleet
  devices: DeviceInfo[];
  activeDeviceId: string | null;
  selectDevice: (id: string) => void;
  activeDevice: DeviceInfo | undefined;
  removeDevice: (id: string) => void;
  connectDeviceManual: (device: { name: string; ip: string; port: number; type: DeviceType; os?: string }) => void;
  pingDevice: (id: string) => Promise<{ ok: boolean; latencyMs: number }>;
  syncDeviceState: (id: string) => Promise<boolean>;
  
  // Auto-Discovery & Server Config
  isDiscovering: boolean;
  startAutoDiscovery: () => Promise<void>;
  serverConfig: ServerConfig;
  updateServerConfig: (partial: Partial<ServerConfig>) => void;

  // Trusted Devices Security Allowlist
  trustedDevices: TrustedDevice[];
  toggleTrustDevice: (id: string) => void;
  removeTrustedDevice: (id: string) => void;
  updateDevicePermissions: (id: string, permissions: Partial<TrustedDevice['permissions']>) => void;

  // Hot Corners & Gestures
  hotCornerConfig: HotCornerConfig;
  updateHotCornerConfig: (partial: Partial<HotCornerConfig>) => void;

  // Processes
  processes: DeviceProcess[];
  refreshProcesses: () => Promise<void>;
  killProcess: (pid: number) => Promise<boolean>;

  // Clipboard
  clipboardItems: ClipboardItem[];
  addClipboardItem: (text: string, targetDeviceId?: string, imageData?: string) => void;
  removeClipboardItem: (id: string) => void;
  togglePinClipboardItem: (id: string) => void;
  clearClipboardHistory: () => void;

  // Remote Executables & Shortcuts
  remoteExecutables: RemoteExecutable[];
  addRemoteExecutable: (item: Omit<RemoteExecutable, 'id'>) => void;
  updateRemoteExecutable: (id: string, partial: Partial<RemoteExecutable>) => void;
  deleteRemoteExecutable: (id: string) => void;
  executeShortcut: (shortcut: RemoteExecutable) => Promise<void>;

  // System Control & Telemetry
  lockWorkstation: () => Promise<void>;
  controlMedia: (action: string) => Promise<boolean>;
  systemStats: SystemStats | null;
}

const DEFAULT_SERVER_CONFIG: ServerConfig = {
  host: '0.0.0.0',
  port: 9120,
  status: 'running',
  pairingSecret: 'NODUS-FLEET-SECURE',
  auth_token: 'NODUS-FLEET-SECURE',
  autoDiscover: true,
  autoStartOnBoot: true,
  broadcastMdns: true,
  encryptionEnabled: true,
  allowedPaths: 'C:\\Projects;C:\\Program Files;C:\\Tools',
  strictSandbox: false,
};

const DEFAULT_HOTCORNER_CONFIG: HotCornerConfig = {
  enabled: false,
  dwellTimeMs: 180,
  marginPx: 8,
  disableInFullscreen: true,
  corners: {
    topLeft: 'fleet',
    topRight: 'clipboard',
    bottomLeft: 'shortcuts',
    bottomRight: 'lock',
  },
};

const INITIAL_DEVICES: DeviceInfo[] = [];

const INITIAL_TRUSTED_DEVICES: TrustedDevice[] = [];

const DesktopContext = createContext<DesktopContextType | undefined>(undefined);

export const DesktopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('topology');
  
  // Devices & Fleet (Strictly active verified connections only)
  const [devices, setDevices] = useState<DeviceInfo[]>(() => {
    // Clear legacy mock cache keys
    try {
      localStorage.removeItem('nodus_desktop_devices');
      localStorage.removeItem('nodus_desktop_devices_v2');
      localStorage.removeItem('nodus_desktop_trusted_devices');
    } catch (_) {}
    return INITIAL_DEVICES;
  });
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  
  // Processes & Telemetry
  const [processes, setProcesses] = useState<DeviceProcess[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  // Clipboard (Starts fresh on app restart)
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);

  // Remote Executables
  const [remoteExecutables, setRemoteExecutables] = useState<RemoteExecutable[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_desktop_shortcuts');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return import.meta.env.DEV ? FIXTURE_SHORTCUTS : [];
  });

  // Server Configuration
  const [serverConfig, setServerConfig] = useState<ServerConfig>(() => {
    try {
      const saved = localStorage.getItem('nodus_desktop_server_config');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_SERVER_CONFIG;
  });

  // Trusted Devices
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_desktop_trusted_devices');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_TRUSTED_DEVICES;
  });

  // Hot Corner Config
  const [hotCornerConfig, setHotCornerConfig] = useState<HotCornerConfig>(() => {
    try {
      const saved = localStorage.getItem('nodus_desktop_hotcorners');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_HOTCORNER_CONFIG;
  });

  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);

  // Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem('nodus_desktop_devices_v2', JSON.stringify(devices));
    } catch (_) {}
  }, [devices]);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_desktop_server_config', JSON.stringify(serverConfig));
    } catch (_) {}
  }, [serverConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_desktop_trusted_devices', JSON.stringify(trustedDevices));
    } catch (_) {}
  }, [trustedDevices]);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_desktop_hotcorners', JSON.stringify(hotCornerConfig));
    } catch (_) {}
  }, [hotCornerConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_desktop_shortcuts', JSON.stringify(remoteExecutables));
    } catch (_) {}
  }, [remoteExecutables]);

  // Real-time Windows Clipboard Watcher & Automatic Mesh Broadcast
  const lastLocalClipRef = React.useRef<string>('');

  useEffect(() => {
    const pollClipboard = async () => {
      try {
        const content = await TauriService.getClipboardContent();
        let newClipText: string | null = null;
        let newClipImage: string | undefined = undefined;

        if ((content.content_type === 'image' || content.image_data) && content.image_data) {
          const imgKey = `img_${content.image_data.length}_${content.image_data.slice(20, 60)}_${content.image_data.slice(-40)}`;
          if (imgKey && imgKey !== lastLocalClipRef.current) {
            lastLocalClipRef.current = imgKey;
            newClipText = content.text || 'Image';
            newClipImage = content.image_data;
            addClipboardItem(newClipText, 'this-pc', newClipImage);
          }
        } else if (content.text) {
          const trimmed = content.text.trim();
          if (trimmed && trimmed !== lastLocalClipRef.current) {
            lastLocalClipRef.current = trimmed;
            newClipText = trimmed;
            addClipboardItem(trimmed, 'this-pc');
          }
        }

        // Automatic Mesh Broadcast to connected remote devices via ClipboardBroadcastService
        if (newClipText || newClipImage) {
          ClipboardBroadcastService.queueBroadcast(
            newClipText || null,
            newClipImage || undefined,
            devices,
            serverConfig?.auth_token || serverConfig?.pairingSecret || 'NODUS-FLEET-SECURE'
          );
        }
      } catch (_) {}
    };

    pollClipboard();
    const interval = setInterval(pollClipboard, 1500);
    return () => clearInterval(interval);
  }, [devices]);

  // Track explicitly removed devices so UDP background discovery does not auto-readd them
  const removedDeviceIdsRef = React.useRef<Set<string>>(new Set());

  // Real-time Fleet Mesh Discovery Polling (Auto-updates connected Android / companion devices)
  useEffect(() => {
    const pollFleetDevices = async () => {
      try {
        const discovered = await TauriService.getDiscoveredDevices();
        if (discovered && discovered.length > 0) {
          setDevices((prev) => {
            const devMap = new Map(prev.map((d) => [d.id, d]));
            let hasChanges = false;

            for (const d of discovered) {
              if (removedDeviceIdsRef.current.has(d.id)) {
                continue; // Skip explicitly deleted nodes
              }

              const existing = devMap.get(d.id);
              const updated: DeviceInfo = {
                id: d.id,
                name: d.name || existing?.name || 'Companion Node',
                type: (d.deviceType || d.type || existing?.type || 'tablet') as DeviceType,
                os: d.os || existing?.os || 'Android 14 (HyperOS)',
                status: d.status === 'online' ? 'connected' : 'offline',
                ipAddress: d.ipAddress || existing?.ipAddress || '',
                resolution: existing?.resolution || '2560 × 1600',
                battery: d.battery ?? existing?.battery,
                cpuLoad: d.cpuLoad ?? existing?.cpuLoad ?? 12,
                ramUsage: d.ramUsage || existing?.ramUsage || '4.0 / 8.0 GB',
              };

              if (!existing || existing.status !== updated.status || existing.battery !== updated.battery) {
                devMap.set(d.id, updated);
                hasChanges = true;
              }
            }

            if (hasChanges) {
              const result = Array.from(devMap.values());
              if (!activeDeviceId && result.length > 0) {
                setActiveDeviceId(result[0].id);
              }
              return result;
            }
            return prev;
          });
        }
      } catch (_) {}
    };

    pollFleetDevices();
    const interval = setInterval(pollFleetDevices, 2000);
    return () => clearInterval(interval);
  }, [activeDeviceId]);

  const selectDevice = useCallback((id: string) => {
    setActiveDeviceId(id);
  }, []);

  const removeDevice = useCallback((id: string) => {
    removedDeviceIdsRef.current.add(id);
    TauriService.unregisterNode(id).catch(() => {});
    setDevices((prev) => {
      const remaining = prev.filter((d) => d.id !== id);
      if (activeDeviceId === id) {
        setActiveDeviceId(remaining[0]?.id || null);
      }
      return remaining;
    });
  }, [activeDeviceId]);

  const connectDeviceManual = useCallback(async (newDev: { name: string; ip: string; port: number; type: DeviceType; os?: string }) => {
    const id = `node-${newDev.ip.replace(/\./g, '-')}`;
    let isReachable = false;
    let fetchedStats: any = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`http://${newDev.ip}:${newDev.port}/api/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        fetchedStats = await res.json();
        isReachable = true;
      }
    } catch (_) {
      isReachable = false;
    }

    const device: DeviceInfo = {
      id,
      name: fetchedStats?.name || newDev.name || `Node (${newDev.ip})`,
      type: newDev.type,
      os: fetchedStats?.os || newDev.os || (newDev.type === 'tablet' ? 'Android 14 (HyperOS)' : 'Remote Station'),
      status: isReachable ? 'connected' : 'offline',
      ipAddress: `${newDev.ip}:${newDev.port}`,
      resolution: fetchedStats?.resolution || (newDev.type === 'tablet' ? '2560 × 1600' : '1920 × 1080'),
      battery: fetchedStats?.battery ?? (newDev.type === 'tablet' ? 90 : undefined),
      cpuLoad: fetchedStats?.cpuLoad ?? 0,
      ramUsage: fetchedStats?.ramUsage ?? '0 / 8.0 GB',
      isCustom: true,
    };

    setDevices((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      return [...filtered, device];
    });
    setActiveDeviceId(id);
  }, []);

  const startAutoDiscovery = useCallback(async () => {
    setIsDiscovering(true);
    try {
      const discovered = await TauriService.getDiscoveredDevices();
      if (discovered && discovered.length > 0) {
        setDevices((prev) => {
          const devMap = new Map(prev.map((d) => [d.id, d]));
          for (const d of discovered) {
            devMap.set(d.id, {
              id: d.id,
              name: d.name || 'Companion Node',
              type: (d.deviceType || d.type || 'tablet') as DeviceType,
              os: d.os || 'Android 14 (HyperOS)',
              status: d.status === 'online' ? 'connected' : 'offline',
              ipAddress: d.ipAddress || '',
              resolution: '2560 × 1600',
              battery: d.battery,
              cpuLoad: d.cpuLoad ?? 12,
              ramUsage: d.ramUsage || '4.0 / 8.0 GB',
            });
          }
          return Array.from(devMap.values());
        });
      }
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  const pingDevice = useCallback(async (id: string): Promise<{ ok: boolean; latencyMs: number }> => {
    const target = devices.find((d) => d.id === id);
    if (!target || !target.ipAddress) return { ok: false, latencyMs: 0 };
    const rawIp = target.ipAddress.trim();
    const ip = rawIp.includes(':') ? rawIp : `${rawIp}:9120`;
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`http://${ip}/api/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);
      return { ok: res.ok, latencyMs };
    } catch (_) {
      return { ok: false, latencyMs: Math.round(performance.now() - start) };
    }
  }, [devices]);

  const syncDeviceState = useCallback(async (id: string): Promise<boolean> => {
    const target = devices.find((d) => d.id === id);
    if (!target || !target.ipAddress) return false;
    const rawIp = target.ipAddress.trim();
    const ip = rawIp.includes(':') ? rawIp : `${rawIp}:9120`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`http://${ip}/api/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const stats = await res.json();
        setDevices((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: 'connected',
                  cpuLoad: stats.cpuLoad ?? stats.cpu_load_percent ?? d.cpuLoad,
                  ramUsage: stats.ramUsage ?? (stats.ram_used_mb ? `${(stats.ram_used_mb / 1024).toFixed(1)} / ${(stats.ram_total_mb / 1024).toFixed(1)} GB` : d.ramUsage),
                  battery: stats.battery ?? d.battery,
                }
              : d
          )
        );
        return true;
      }
    } catch (_) {}
    return false;
  }, [devices]);

  const updateServerConfig = useCallback((partial: Partial<ServerConfig>) => {
    setServerConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const toggleTrustDevice = useCallback((id: string) => {
    setTrustedDevices((prev) =>
      prev.map((td) => (td.id === id ? { ...td, isTrusted: !td.isTrusted } : td))
    );
  }, []);

  const removeTrustedDevice = useCallback((id: string) => {
    setTrustedDevices((prev) => prev.filter((td) => td.id !== id));
  }, []);

  const updateDevicePermissions = useCallback((id: string, permissions: Partial<TrustedDevice['permissions']>) => {
    setTrustedDevices((prev) =>
      prev.map((td) =>
        td.id === id ? { ...td, permissions: { ...td.permissions, ...permissions } } : td
      )
    );
  }, []);

  const updateHotCornerConfig = useCallback((partial: Partial<HotCornerConfig>) => {
    setHotCornerConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const activeDevice = devices.find((d) => d.id === activeDeviceId) || devices[0] || undefined;

  // Refresh processes
  const refreshProcesses = useCallback(async () => {
    const procs = await TauriService.getProcesses();
    setProcesses(procs);
  }, []);

  // Kill a process
  const killProcess = useCallback(async (pid: number): Promise<boolean> => {
    const success = await TauriService.killProcess(pid);
    if (success) {
      setProcesses((prev) => prev.filter((p) => p.pid !== pid));
    }
    return success;
  }, []);

  // Clipboard operations
  const addClipboardItem = useCallback((text: string, targetDeviceId = 'this-pc', imageData?: string) => {
    if (!text.trim() && !imageData) return;
    const isUrl = /^https?:\/\//i.test(text.trim());
    const isCode = /[{};<>()=>]/.test(text) && text.includes('\n');

    const isHost = targetDeviceId === 'this-pc' || targetDeviceId === 'tab-pc' || targetDeviceId === 'main-pc';

    const newItem: ClipboardItem = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: text || (imageData ? 'Image' : ''),
      deviceId: targetDeviceId,
      deviceName: isHost ? 'Windows PC' : 'Companion Device',
      deviceType: isHost ? 'desktop' : 'tablet',
      deviceColor: isHost ? '#34C759' : '#007AFF', // Green for PC, Blue for Companion
      type: imageData ? 'image' : isUrl ? 'link' : isCode ? 'code' : 'text',
      imageData,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pinned: false,
    };

    // Create a brand new distinct clipboard entry at the top, keeping prior historical entries intact
    setClipboardItems((prev) => [newItem, ...prev].slice(0, 100));
  }, []);

  const removeClipboardItem = useCallback((id: string) => {
    setClipboardItems((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const togglePinClipboardItem = useCallback((id: string) => {
    setClipboardItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  }, []);

  const clearClipboardHistory = useCallback(() => {
    setClipboardItems((prev) => prev.filter((c) => c.pinned));
  }, []);

  // Shortcuts Operations
  const addRemoteExecutable = useCallback((item: Omit<RemoteExecutable, 'id'>) => {
    const newExec: RemoteExecutable = {
      ...item,
      id: `exec-${Date.now()}`,
    };
    setRemoteExecutables((prev) => [newExec, ...prev]);
  }, []);

  const updateRemoteExecutable = useCallback((id: string, partial: Partial<RemoteExecutable>) => {
    setRemoteExecutables((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...partial } : e))
    );
  }, []);

  const deleteRemoteExecutable = useCallback((id: string) => {
    setRemoteExecutables((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const executeShortcut = useCallback(async (shortcut: RemoteExecutable) => {
    console.log('[Desktop] Executing shortcut:', shortcut.name, shortcut.commandOrPackage);
    await TauriService.executeLocalCommand(shortcut.commandOrPackage, shortcut.args, shortcut.workingDir);
    updateRemoteExecutable(shortcut.id, { lastExecuted: 'Just now' });
  }, [updateRemoteExecutable]);

  // Media Controls
  const controlMedia = useCallback(async (action: string) => {
    return await TauriService.controlMedia(action);
  }, []);

  // Lock workstation
  const lockWorkstation = useCallback(async () => {
    await TauriService.lockWorkstation();
  }, []);

  // Initial stats, process polling & background clipboard watcher
  useEffect(() => {
    const updateStats = async () => {
      try {
        const stats = await TauriService.getSystemStats();
        if (stats) setSystemStats(stats);
      } catch (_) {}
    };

    // Non-blocking deferred initial calls
    const initialStatsTimer = setTimeout(updateStats, 100);
    const initialProcsTimer = setTimeout(() => {
      refreshProcesses().catch(() => {});
    }, 500);

    const interval = setInterval(updateStats, 5000);

    // Poll locally registered peers from HTTP daemon
    const fleetInterval = setInterval(async () => {
      try {
        const res = await fetch('http://127.0.0.1:9120/api/fleet/devices');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.devices) && data.devices.length > 0) {
            setDevices((prev) => {
              let updated = [...prev];
              for (const dev of data.devices) {
                const id = dev.id || `node-${(dev.ip || '').replace(/\./g, '-')}`;
                const existingIndex = updated.findIndex((d) => d.id === id);
                const nodeInfo: DeviceInfo = {
                  id,
                  name: dev.name || 'Discovered Peer',
                  type: (dev.type as DeviceType) || 'tablet',
                  os: dev.os || 'Companion Node',
                  status: 'connected',
                  ipAddress: `${dev.ip || '192.168.1.35'}:${dev.port || 9120}`,
                  resolution: dev.resolution || '2560 × 1600',
                  battery: dev.battery ?? 90,
                  cpuLoad: dev.cpu_load ?? 12,
                  ramUsage: dev.ram_usage || '3.5 / 8.0 GB',
                  isCustom: true,
                };
                if (existingIndex >= 0) {
                  updated[existingIndex] = { ...updated[existingIndex], ...nodeInfo, status: 'connected' };
                } else {
                  updated.push(nodeInfo);
                }
              }
              return updated;
            });
          }
        }
      } catch (_) {}
    }, 2500);

    // Tauri Event Listeners (Hot Corners & System Tray Panel Openers)
    let unlistenCorner: (() => void) | undefined;
    let unlistenPanel: (() => void) | undefined;

    const setupEventListeners = async () => {
      try {
        unlistenCorner = await listen<{ corner: string; timestamp: number }>('corner_triggered', (event) => {
          const corner = event.payload.corner;
          let action = 'none';
          if (corner === 'top-left') action = hotCornerConfig.corners.topLeft;
          else if (corner === 'top-right') action = hotCornerConfig.corners.topRight;
          else if (corner === 'bottom-left') action = hotCornerConfig.corners.bottomLeft;
          else if (corner === 'bottom-right') action = hotCornerConfig.corners.bottomRight;

          if (
            action === 'fleet' ||
            action === 'clipboard' ||
            action === 'shortcuts' ||
            action === 'remotedeck' ||
            action === 'processes'
          ) {
            setActiveTab(action as ActiveTab);
          } else if (action === 'lock') {
            lockWorkstation();
          }
        });

        unlistenPanel = await listen<string>('open_panel', (event) => {
          const panel = event.payload;
          if (
            panel === 'fleet' ||
            panel === 'clipboard' ||
            panel === 'shortcuts' ||
            panel === 'remotedeck' ||
            panel === 'processes'
          ) {
            setActiveTab(panel as ActiveTab);
          }
        });
      } catch (err) {
        console.warn('[DesktopContext] Tauri event listening not available in web preview mode:', err);
      }
    };

    setupEventListeners();

    return () => {
      clearTimeout(initialStatsTimer);
      clearTimeout(initialProcsTimer);
      clearInterval(interval);
      clearInterval(fleetInterval);
      if (unlistenCorner) unlistenCorner();
      if (unlistenPanel) unlistenPanel();
    };
  }, [refreshProcesses, addClipboardItem, hotCornerConfig, lockWorkstation]);

  return (
    <DesktopContext.Provider
      value={{
        activeTab,
        setActiveTab,
        devices,
        activeDeviceId,
        selectDevice,
        activeDevice,
        removeDevice,
        connectDeviceManual,
        pingDevice,
        syncDeviceState,
        isDiscovering,
        startAutoDiscovery,
        serverConfig,
        updateServerConfig,
        trustedDevices,
        toggleTrustDevice,
        removeTrustedDevice,
        updateDevicePermissions,
        hotCornerConfig,
        updateHotCornerConfig,
        processes,
        refreshProcesses,
        killProcess,
        clipboardItems,
        addClipboardItem,
        removeClipboardItem,
        togglePinClipboardItem,
        clearClipboardHistory,
        remoteExecutables,
        addRemoteExecutable,
        updateRemoteExecutable,
        deleteRemoteExecutable,
        executeShortcut,
        lockWorkstation,
        controlMedia,
        systemStats,
      }}
    >
      {children}
    </DesktopContext.Provider>
  );
};

export const useDesktop = () => {
  const context = useContext(DesktopContext);
  if (!context) {
    throw new Error('useDesktop must be used within a DesktopProvider');
  }
  return context;
};
