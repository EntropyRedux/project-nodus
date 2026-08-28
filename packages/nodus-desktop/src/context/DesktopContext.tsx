import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

interface DesktopContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Devices & Fleet
  devices: DeviceInfo[];
  activeDeviceId: string;
  selectDevice: (id: string) => void;
  activeDevice: DeviceInfo | undefined;
  removeDevice: (id: string) => void;
  connectDeviceManual: (device: { name: string; ip: string; port: number; type: DeviceType; os?: string }) => void;
  
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
  addClipboardItem: (text: string, targetDeviceId?: string) => void;
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
  autoDiscover: true,
  autoStartOnBoot: true,
  broadcastMdns: true,
  encryptionEnabled: true,
  allowedPaths: 'C:\\Projects;C:\\Program Files;C:\\Tools',
  strictSandbox: false,
};

const DEFAULT_HOTCORNER_CONFIG: HotCornerConfig = {
  enabled: true,
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

const INITIAL_DEVICES: DeviceInfo[] = [
  {
    id: 'this-pc',
    name: 'Workstation (This PC)',
    type: 'desktop',
    os: 'Windows 11 Pro',
    status: 'connected',
    ipAddress: '127.0.0.1:9120',
    resolution: `${typeof window !== 'undefined' ? window.screen.width : 1920} × ${typeof window !== 'undefined' ? window.screen.height : 1080}`,
    cpuLoad: 8,
    ramUsage: '12.4 / 32.0 GB',
    battery: undefined,
  },
  {
    id: 'poco-pad',
    name: 'POCO Pad',
    type: 'tablet',
    os: 'Xiaomi HyperOS (Android 14)',
    status: 'online',
    ipAddress: '192.168.1.118:8890',
    resolution: '2560 × 1600 (12.1" 120Hz)',
    battery: 92,
    cpuLoad: 14,
    ramUsage: '3.6 / 8.0 GB',
  },
];

const INITIAL_TRUSTED_DEVICES: TrustedDevice[] = [
  {
    id: 'poco-pad',
    name: 'POCO Pad (Tablet)',
    os: 'android',
    ip: '192.168.1.118',
    fingerprint: 'SHA256:19:FC:83:55:A2:11:66:3D',
    isTrusted: true,
    lastSeen: 'Active Now',
    permissions: {
      remoteExec: true,
      clipboardSync: true,
      processKill: true,
      powerControl: true,
    },
  },
];

const INITIAL_SHORTCUTS: RemoteExecutable[] = [
  {
    id: 'exec-vscode',
    deviceId: 'this-pc',
    deviceName: 'This PC',
    deviceType: 'desktop',
    deviceOs: 'windows',
    name: 'Visual Studio Code',
    description: 'Launch VS Code workspace in C:\\Projects',
    category: 'productivity',
    iconName: 'Code',
    iconColor: '#007ACC',
    execType: 'command',
    commandOrPackage: 'code .',
    workingDir: 'C:\\Workspaces',
    enabled: true,
    pinnedToDrawer: true,
    lastExecuted: '10m ago',
  },
  {
    id: 'exec-terminal',
    deviceId: 'this-pc',
    deviceName: 'This PC',
    deviceType: 'desktop',
    deviceOs: 'windows',
    name: 'Windows Terminal (Admin)',
    description: 'Elevated PowerShell CLI prompt',
    category: 'tools',
    iconName: 'Terminal',
    iconColor: '#4E75F8',
    execType: 'command',
    commandOrPackage: 'wt.exe -p "PowerShell"',
    runAsAdmin: true,
    enabled: true,
    pinnedToDrawer: true,
    lastExecuted: '45m ago',
  },
  {
    id: 'exec-steam',
    deviceId: 'this-pc',
    deviceName: 'This PC',
    deviceType: 'desktop',
    deviceOs: 'windows',
    name: 'Steam Big Picture',
    description: 'Console Gamepad UI for couch gaming',
    category: 'games',
    iconName: 'Gamepad2',
    iconColor: '#1B2838',
    execType: 'url_protocol',
    commandOrPackage: 'steam://open/bigpicture',
    enabled: true,
    pinnedToDrawer: true,
    lastExecuted: 'Yesterday',
  },
  {
    id: 'exec-tablet-camera',
    deviceId: 'poco-pad',
    deviceName: 'POCO Pad',
    deviceType: 'tablet',
    deviceOs: 'android',
    name: 'Tablet Camera Shutter',
    description: 'Trigger remote high-res photo capture',
    category: 'tools',
    iconName: 'Camera',
    iconColor: '#007AFF',
    execType: 'intent',
    commandOrPackage: 'android.media.action.STILL_IMAGE_CAMERA',
    enabled: true,
    pinnedToDrawer: true,
    lastExecuted: '1h ago',
  },
];

const DesktopContext = createContext<DesktopContextType | undefined>(undefined);

export const DesktopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('fleet');
  
  // Devices & Fleet
  const [devices, setDevices] = useState<DeviceInfo[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_desktop_devices_v2');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_DEVICES;
  });
  const [activeDeviceId, setActiveDeviceId] = useState<string>('this-pc');
  
  // Processes & Telemetry
  const [processes, setProcesses] = useState<DeviceProcess[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  // Clipboard
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_desktop_clipboard');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  // Remote Executables
  const [remoteExecutables, setRemoteExecutables] = useState<RemoteExecutable[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_desktop_shortcuts');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_SHORTCUTS;
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

  useEffect(() => {
    try {
      localStorage.setItem('nodus_desktop_clipboard', JSON.stringify(clipboardItems));
    } catch (_) {}
  }, [clipboardItems]);

  const selectDevice = useCallback((id: string) => {
    setActiveDeviceId(id);
  }, []);

  const removeDevice = useCallback((id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    if (activeDeviceId === id) {
      setActiveDeviceId('this-pc');
    }
  }, [activeDeviceId]);

  const connectDeviceManual = useCallback((newDev: { name: string; ip: string; port: number; type: DeviceType; os?: string }) => {
    const id = `node-${newDev.ip.replace(/\./g, '-')}`;
    const device: DeviceInfo = {
      id,
      name: newDev.name || `Node (${newDev.ip})`,
      type: newDev.type,
      os: newDev.os || (newDev.type === 'tablet' ? 'Android 14 (HyperOS)' : 'Unknown OS'),
      status: 'connected',
      ipAddress: `${newDev.ip}:${newDev.port}`,
      resolution: newDev.type === 'tablet' ? '2560 × 1600' : '1920 × 1080',
      battery: newDev.type === 'tablet' ? 92 : undefined,
      cpuLoad: 10,
      ramUsage: '3.5 / 8.0 GB',
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
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const pocoNode: DeviceInfo = {
        id: 'poco-pad-live',
        name: 'POCO Pad (Discovered)',
        type: 'tablet',
        os: 'Xiaomi HyperOS (Android 14)',
        status: 'online',
        ipAddress: '192.168.1.118:8890',
        resolution: '2560 × 1600 (12.1" 120Hz)',
        battery: 94,
        cpuLoad: 12,
        ramUsage: '3.4 / 8.0 GB',
      };
      setDevices((prev) => {
        const exists = prev.some((d) => d.id === 'poco-pad-live' || d.id === 'poco-pad');
        if (exists) {
          return prev.map((d) => (d.id === 'poco-pad' ? pocoNode : d));
        }
        return [...prev, pocoNode];
      });
    } finally {
      setIsDiscovering(false);
    }
  }, []);

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

  const activeDevice = devices.find((d) => d.id === activeDeviceId) || devices[0];

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
  const addClipboardItem = useCallback((text: string, targetDeviceId = 'this-pc') => {
    if (!text.trim()) return;
    const isUrl = /^https?:\/\//i.test(text.trim());
    const isCode = /[{};<>()=>]/.test(text) && text.includes('\n');

    const newItem: ClipboardItem = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      deviceId: targetDeviceId,
      deviceName: targetDeviceId === 'this-pc' ? 'This PC' : 'POCO Pad',
      deviceType: targetDeviceId === 'this-pc' ? 'desktop' : 'tablet',
      deviceColor: targetDeviceId === 'this-pc' ? '#FF9500' : '#007AFF',
      type: isUrl ? 'link' : isCode ? 'code' : 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pinned: false,
    };

    setClipboardItems((prev) => [newItem, ...prev.filter((item) => item.text !== text)]);
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
      const stats = await TauriService.getSystemStats();
      if (stats) setSystemStats(stats);
    };

    updateStats();
    refreshProcesses();

    const interval = setInterval(updateStats, 5000);

    // Watch host clipboard changes
    let lastClip = '';
    const clipInterval = setInterval(async () => {
      const current = await TauriService.getClipboardText();
      if (current && current !== lastClip && current.trim().length > 0) {
        lastClip = current;
        addClipboardItem(current, 'this-pc');
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(clipInterval);
    };
  }, [refreshProcesses, addClipboardItem]);

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
