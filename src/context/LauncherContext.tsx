import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AppItem, 
  FolderItem, 
  NotificationItem, 
  LauncherSettings, 
  WallpaperId, 
  IconStyle,
  DeviceInfo,
  DeviceProcess,
  ClipboardItem,
  NetworkServerConfig,
  WindowsBridgeConfig,
  AndroidBridgeConfig,
  ClipboardSyncConfig,
  RemoteExecutable,
  TrustedDevice
} from '../types/launcher';
import { 
  INITIAL_APPS, 
  DOCK_APP_IDS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_DEVICES,
  INITIAL_DEVICE_PROCESSES,
  INITIAL_CLIPBOARD_ITEMS,
  DEVICE_COLORS,
  INITIAL_SERVER_CONFIG,
  INITIAL_WINDOWS_BRIDGE,
  INITIAL_ANDROID_BRIDGE,
  INITIAL_CLIPBOARD_SYNC_CONFIG,
  INITIAL_REMOTE_EXECUTABLES,
  INITIAL_TRUSTED_DEVICES
} from '../utils/constants';
import { audio } from '../utils/audio';
import { simulateBridgeRpc } from '../utils/bridgeProtocol';

interface QuickSettingsState {
  wifi: boolean;
  bluetooth: boolean;
  flashlight: boolean;
  dnd: boolean;
  airplane: boolean;
  autoRotate: boolean;
  brightness: number; // 0 to 100
  volume: number; // 0 to 100
}

interface LauncherContextType {
  // Device Selection & Sidebar
  devices: DeviceInfo[];
  activeDeviceId: string;
  activeDevice: DeviceInfo;
  selectDevice: (id: string) => void;
  reorderDevices: (newDevices: DeviceInfo[]) => void;
  moveDeviceUp: (id: string) => void;
  moveDeviceDown: (id: string) => void;
  addDevice: (device: Omit<DeviceInfo, 'id'>) => void;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, partial: Partial<DeviceInfo>) => void;
  updateDeviceAvatar: (id: string, avatarUrl: string) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (val: boolean) => void;
  toggleSidebar: () => void;

  // Apps & Layout
  apps: AppItem[];
  folders: FolderItem[];
  dockAppIds: string[];
  currentPageIndex: number;
  totalPages: number;
  setCurrentPageIndex: (page: number) => void;
  launchApp: (appId: string, forceMode?: 'fullscreen' | 'floating') => void;
  launchAppFloating: (appId: string) => void;
  isFloatingModeArmed: boolean;
  setIsFloatingModeArmed: (val: boolean) => void;
  toggleFloatingMode: () => void;
  appContextMenu: { isOpen: boolean; appId: string; x: number; y: number } | null;
  openAppContextMenu: (appId: string, x: number, y: number) => void;
  closeAppContextMenu: () => void;
  closeActiveApp: () => void;
  minimizeActiveApp: () => void;
  toggleAppTask: (appId: string) => void;
  activeAppId: string | null;
  runningApps: string[];
  recentApps: string[];
  killApp: (appId: string) => void;
  clearAllRunningApps: () => void;
  
  // Customization & Edit Mode
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  uninstallApp: (appId: string) => void;
  createFolder: (name: string, appIds: string[], pageIndex: number) => void;
  createFolderFromApps: (sourceAppId: string, targetAppId: string, customName?: string) => void;
  addAppToFolder: (folderId: string, appId: string) => void;
  removeAppFromFolder: (folderId: string, appId: string) => void;
  renameFolder: (folderId: string, newName: string) => void;
  deleteFolder: (folderId: string) => void;
  activeFolderId: string | null;
  setActiveFolderId: (folderId: string | null) => void;
  moveAppToPage: (appId: string, targetPageIndex: number) => void;
  moveApp: (sourceAppId: string, targetAppId: string) => void;
  reorderApps: (newApps: AppItem[]) => void;
  draggedAppId: string | null;
  setDraggedAppId: (id: string | null) => void;
  dragPosition: { x: number; y: number } | null;
  setDragPosition: (pos: { x: number; y: number } | null) => void;
  hoverTargetAppId: string | null;
  setHoverTargetAppId: (id: string | null) => void;
  
  // System Shades & UI
  isQuickSettingsOpen: boolean;
  setQuickSettingsOpen: (val: boolean) => void;
  toggleQuickSettings: () => void;
  quickSettings: QuickSettingsState;
  setQuickSettings: React.Dispatch<React.SetStateAction<QuickSettingsState>>;
  toggleQuickSetting: (key: keyof QuickSettingsState) => void;

  // Toast Notifications & Action Confirmations
  toastMessage: string | null;
  showToast: (message: string, duration?: number) => void;
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDestructive?: boolean;
  } | null;
  showConfirm: (title: string, message: string, onConfirm: () => void, confirmText?: string, isDestructive?: boolean) => void;
  closeConfirm: () => void;

  // Icon Packs
  installedIconPacks: IconPackInfo[];
  applyIconPack: (packageName: string | null) => void;
  
  // Search & Navigation
  isSearchOpen: boolean;
  setSearchOpen: (val: boolean) => void;

  // Drawer Tabs & App Categorization
  drawerTabs: string[];
  customTabAppMap: Record<string, string[]>;
  addDrawerTab: (name: string, initialAppIds?: string[]) => void;
  removeDrawerTab: (name: string) => void;
  renameDrawerTab: (oldName: string, newName: string) => void;
  assignAppsToTab: (tabName: string, appIds: string[]) => void;
  setAppCategory: (appId: string, category: string) => void;
  
  // Notifications & Badges
  notifications: NotificationItem[];
  appBadges: Record<string, number>;
  totalUnreadNotifications: number;
  isNotificationListenerEnabled: boolean;
  requestNotificationListenerPermission: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markNotificationRead: (id: string) => void;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'time' | 'read'>) => void;
  
  // Settings
  settings: LauncherSettings;
  updateSettings: (partial: Partial<LauncherSettings>) => void;
  updateNetworkServerConfig: (partial: Partial<NetworkServerConfig>) => void;
  updateWindowsBridgeConfig: (partial: Partial<WindowsBridgeConfig>) => void;
  updateAndroidBridgeConfig: (partial: Partial<AndroidBridgeConfig>) => void;
  updateClipboardSyncConfig: (partial: Partial<ClipboardSyncConfig>) => void;
  
  // Remote Executables & App Allowlist
  remoteExecutables: RemoteExecutable[];
  addRemoteExecutable: (item: Omit<RemoteExecutable, 'id'>) => void;
  updateRemoteExecutable: (id: string, partial: Partial<RemoteExecutable>) => void;
  deleteRemoteExecutable: (id: string) => void;
  toggleRemoteExecutable: (id: string) => void;
  executeRemoteApp: (executable: RemoteExecutable) => Promise<{ success: boolean; message: string }>;

  // Trusted Devices Fleet
  trustedDevices: TrustedDevice[];
  toggleTrustDevice: (id: string) => void;
  removeTrustedDevice: (id: string) => void;
  updateDevicePermissions: (id: string, permissions: Partial<TrustedDevice['permissions']>) => void;

  // Device Process Management & Remote Ops
  deviceProcesses: Record<string, DeviceProcess[]>;
  processModalDeviceId: string | null;
  openProcessManager: (deviceId: string) => void;
  closeProcessManager: () => void;
  killProcess: (deviceId: string, pid: number) => void;
  killAllUserProcesses: (deviceId: string) => void;
  rebootDevice: (deviceId: string) => void;

  // Universal Clipboard History
  clipboardItems: ClipboardItem[];
  addClipboardItem: (item: { text: string; deviceId?: string; type?: 'text' | 'link' | 'code' | 'snippet' }) => void;
  removeClipboardItem: (id: string) => void;
  togglePinClipboardItem: (id: string) => void;
  clearClipboardHistory: () => void;
  clearFleetClipboard: () => void;
  isClipboardOpen: boolean;
  setClipboardOpen: (val: boolean) => void;
  toggleClipboardPanel: () => void;

  // Quick Open Aliases
  openQuickSettings: () => void;
}

const DEFAULT_SETTINGS: LauncherSettings = {
  deviceFrame: false, // Default full desktop PC experience
  themeMode: 'dark',
  accentColor: '#34C759',
  iconStyle: 'material-you',
  iconSize: 'medium',
  drawerLayout: 'continuous',
  showLabels: true,
  gridColumns: 5,
  wallpaper: 'alpine-horizon',
  soundEffects: true,
  hapticFeedback: true,
  notificationBadges: true,
  atAGlanceWidget: true,
  clockWidgetStyle: 'digital-bold',
  minimalistMode: false,
  leftPanelOpacity: 85,
  taskbarOpacity: 92,
  clipboardPanelOpacity: 85,
  folderOpacity: 95,
  taskbarIconScale: 'medium',

  // Multi-Device Server & Controller Configs
  networkServer: INITIAL_SERVER_CONFIG,
  windowsBridge: INITIAL_WINDOWS_BRIDGE,
  androidBridge: INITIAL_ANDROID_BRIDGE,
  clipboardSync: INITIAL_CLIPBOARD_SYNC_CONFIG,
  trustedDevices: INITIAL_TRUSTED_DEVICES,
  remoteExecutables: INITIAL_REMOTE_EXECUTABLES,
  showRemoteAppsInMainDrawer: true,
  showOnlyLocalInDrawer: false,
};

const DEFAULT_QUICK_SETTINGS: QuickSettingsState = {
  wifi: true,
  bluetooth: true,
  flashlight: false,
  dnd: false,
  airplane: false,
  autoRotate: true,
  brightness: 90,
  volume: 75,
};

const LauncherContext = createContext<LauncherContextType | undefined>(undefined);

export const LauncherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Device list & active device
  const [devices, setDevices] = useState<DeviceInfo[]>(() => {
    const saved = localStorage.getItem('nova_launcher_devices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((d: any) => d.id !== 'tab-pc');
          if (valid.length > 0) return valid;
        }
      } catch (e) {}
    }
    return INITIAL_DEVICES;
  });

  const [activeDeviceId, setActiveDeviceId] = useState<string>(() => {
    const saved = localStorage.getItem('nova_launcher_active_device');
    return saved || 'poco-pad';
  });

  const [isSidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('nova_launcher_sidebar_collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Load saved state or default
  const [apps, setApps] = useState<AppItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const bridge = (window as any).NodusNativeBridge;
        if (bridge?.getInstalledApps) {
          const raw = bridge.getInstalledApps();
          if (raw && typeof raw === 'string' && raw.startsWith('[')) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
              const builtInApps = INITIAL_APPS.filter((a) => !a.packageName);
              const palette = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6', '#64D2FF', '#FFCC00'];
              const APPS_PER_PAGE = 24;
              const nativeApps: AppItem[] = list.map((item: any, idx: number) => {
                const totalSlot = builtInApps.length + idx;
                return {
                  id: `pkg_${item.packageName}`,
                  name: item.label,
                  packageName: item.packageName,
                  customIcon: item.icon || undefined,
                  iconName: 'Smartphone',
                  color: palette[idx % palette.length],
                  category: item.isSystemApp ? 'system' : 'productivity',
                  isRemovable: !item.isSystemApp,
                  pageIndex: Math.floor(totalSlot / APPS_PER_PAGE),
                  order: totalSlot % APPS_PER_PAGE,
                };
              });
              return [...builtInApps, ...nativeApps];
            }
          }
        }
      } catch (_) {}
    }

    const saved = localStorage.getItem('nova_launcher_v4_apps');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((a: any) => a.id));
          const missing = INITIAL_APPS.filter((a) => !existingIds.has(a.id));
          if (missing.length > 0) {
            return [...parsed, ...missing];
          }
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_APPS;
  });

  const [folders, setFolders] = useState<FolderItem[]>(() => {
    const saved = localStorage.getItem('nova_launcher_folders');
    return saved ? JSON.parse(saved) : [];
  });

  const [dockAppIds] = useState<string[]>(DOCK_APP_IDS);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [isFloatingModeArmed, setIsFloatingModeArmed] = useState<boolean>(false);
  const [appContextMenu, setAppContextMenu] = useState<{ isOpen: boolean; appId: string; x: number; y: number } | null>(null);

  const [runningApps, setRunningApps] = useState<string[]>(['settings', 'studio', 'terminal', 'monitor']);
  const [recentApps, setRecentApps] = useState<string[]>(() => {
    const saved = localStorage.getItem('nova_launcher_recents');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.includes('browser')) return parsed;
      } catch (e) {}
    }
    return ['settings', 'studio', 'terminal', 'monitor', 'network', 'clipboard'];
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoverTargetAppId, setHoverTargetAppId] = useState<string | null>(null);

  const [isQuickSettingsOpen, setQuickSettingsOpen] = useState<boolean>(false);
  const [quickSettings, setQuickSettings] = useState<QuickSettingsState>(DEFAULT_QUICK_SETTINGS);
  
  const [isSearchOpen, setSearchOpen] = useState<boolean>(false);

  // Persistent Drawer Category Tabs & Custom App Assignments
  const [drawerTabs, setDrawerTabs] = useState<string[]>(() => {
    const saved = localStorage.getItem('nodus_drawer_tabs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return ['all', 'recents', 'running', 'productivity', 'media', 'tools', 'system'];
  });

  const [customTabAppMap, setCustomTabAppMap] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('nodus_custom_tab_apps');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return {};
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const [settings, setSettings] = useState<LauncherSettings>(() => {
    const saved = localStorage.getItem('nova_launcher_v3_settings') || localStorage.getItem('nova_launcher_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          deviceFrame: false,
          wallpaper: parsed.wallpaper || 'alpine-horizon',
        };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Device Process Manager & Remote Diagnostics
  const [deviceProcesses, setDeviceProcesses] = useState<Record<string, DeviceProcess[]>>(() => {
    const saved = localStorage.getItem('nova_launcher_device_processes');
    return saved ? JSON.parse(saved) : INITIAL_DEVICE_PROCESSES;
  });

  const [processModalDeviceId, setProcessModalDeviceId] = useState<string | null>(null);

  // Universal Cross-Device Clipboard History
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>(() => {
    const saved = localStorage.getItem('nova_launcher_clipboard');
    return saved ? JSON.parse(saved) : INITIAL_CLIPBOARD_ITEMS;
  });

  const [isClipboardOpen, setClipboardOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('nova_launcher_clipboard_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleClipboardPanel = () => {
    audio.playTap();
    setClipboardOpen((prev) => !prev);
  };

  const [installedIconPacks, setInstalledIconPacks] = useState<IconPackInfo[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDestructive?: boolean;
  } | null>(null);

  const showToast = (message: string, duration = 3000) => {
    setToastMessage(message);
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge?.showToast) {
      try {
        bridge.showToast(message, false);
      } catch (e) {}
    }
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, duration);
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Confirm',
    isDestructive = false
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
      confirmText,
      isDestructive,
    });
  };

  const closeConfirm = () => {
    setConfirmDialog(null);
  };

  // Sync to local storage safely
  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_clipboard_open', JSON.stringify(isClipboardOpen));
    } catch (_) {}
  }, [isClipboardOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_recents', JSON.stringify(recentApps));
    } catch (_) {}
  }, [recentApps]);

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_clipboard', JSON.stringify(clipboardItems));
    } catch (_) {}
  }, [clipboardItems]);

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_devices', JSON.stringify(devices));
    } catch (_) {}
  }, [devices]);

  // Query installed icon packs on boot
  useEffect(() => {
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.getInstalledIconPacks) {
        const raw = bridge.getInstalledIconPacks();
        if (raw && raw.startsWith('[')) {
          const list: IconPackInfo[] = JSON.parse(raw);
          setInstalledIconPacks(list);
        }
      }
    } catch (err) {
      console.error('[Nodus] Failed to query installed icon packs:', err);
    }
  }, []);

  const syncNativeInstalledApps = () => {
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.getInstalledApps) {
        const raw = bridge.getInstalledApps();
        if (raw && typeof raw === 'string' && raw.startsWith('[')) {
          const list: Array<{ packageName: string; label: string; icon?: string; isSystemApp?: boolean }> = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const builtInApps = INITIAL_APPS.filter((a) => !a.packageName);
            const palette = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6', '#64D2FF', '#FFCC00'];
            const APPS_PER_PAGE = 24;

            setApps((prevApps) => {
              const existingMap = new Map(prevApps.map((a) => [a.id, a]));
              const nativeApps: AppItem[] = list.map((item, idx) => {
                const appId = `pkg_${item.packageName}`;
                const existing = existingMap.get(appId);
                const totalSlot = builtInApps.length + idx;
                return {
                  id: appId,
                  name: item.label,
                  packageName: item.packageName,
                  customIcon: item.icon || undefined,
                  iconName: 'Smartphone',
                  color: palette[idx % palette.length],
                  category: item.isSystemApp ? 'system' : 'productivity',
                  isRemovable: !item.isSystemApp,
                  pageIndex: existing?.pageIndex ?? Math.floor(totalSlot / APPS_PER_PAGE),
                  order: existing?.order ?? totalSlot % APPS_PER_PAGE,
                  folderId: existing?.folderId ?? null,
                };
              });

              const mergedBuiltIns = builtInApps.map((b) => {
                const ex = existingMap.get(b.id);
                return ex ? { ...b, folderId: ex.folderId ?? null } : b;
              });

              const merged = [...mergedBuiltIns, ...nativeApps];
              localStorage.setItem('nova_launcher_v4_apps', JSON.stringify(merged));
              return merged;
            });
          }
        }
      }
    } catch (err) {
      console.error('[Nodus] Failed to sync installed apps from native bridge:', err);
    }
  };

  // Dynamic local installed apps sync when running in Nodus Android Shell
  useEffect(() => {
    syncNativeInstalledApps();
    const timer = setTimeout(syncNativeInstalledApps, 800);

    const handlePackageChanged = () => {
      syncNativeInstalledApps();
      showToast('Device application list updated');
    };
    window.addEventListener('nodus-package-changed', handlePackageChanged);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('nodus-package-changed', handlePackageChanged);
    };
  }, []);

  // Real OS Notification Badges & Event Listener
  const [appBadges, setAppBadges] = useState<Record<string, number>>({});
  const [isNotificationListenerEnabled, setIsNotificationListenerEnabled] = useState<boolean>(false);

  const syncNotificationBadges = useCallback((detailObj?: Record<string, number>) => {
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.isNotificationListenerEnabled) {
        setIsNotificationListenerEnabled(bridge.isNotificationListenerEnabled());
      }

      if (detailObj && typeof detailObj === 'object') {
        setAppBadges(detailObj);
        return;
      }

      if (bridge?.getActiveNotificationBadges) {
        const raw = bridge.getActiveNotificationBadges();
        if (raw && typeof raw === 'string' && raw.startsWith('{')) {
          const map: Record<string, number> = JSON.parse(raw);
          setAppBadges(map);
        }
      }
    } catch (err) {
      console.error('[Nodus] Failed to sync notification badges:', err);
    }
  }, []);

  const requestNotificationListenerPermission = useCallback(() => {
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge?.requestNotificationListenerPermission) {
      bridge.requestNotificationListenerPermission();
    }
  }, []);

  useEffect(() => {
    syncNotificationBadges();
    const timer = setTimeout(syncNotificationBadges, 1000);

    const handleNotifChanged = (e: any) => {
      const detail = e?.detail;
      syncNotificationBadges(detail);
    };

    window.addEventListener('nodus-notifications-changed', handleNotifChanged);

    const interval = setInterval(() => {
      syncNotificationBadges();
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('nodus-notifications-changed', handleNotifChanged);
    };
  }, [syncNotificationBadges]);

  const totalUnreadNotifications = useMemo(() => {
    return Object.values(appBadges).reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);
  }, [appBadges]);

  const applyIconPack = (packageName: string | null) => {
    updateSettings({ selectedIconPackPackage: packageName || undefined });
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;

    if (!packageName || !bridge?.getIconPackIcons) {
      syncNativeInstalledApps();
      showToast('Restored default system icons');
      return;
    }

    try {
      const raw = bridge.getIconPackIcons(packageName);
      const iconMap: Record<string, string> = JSON.parse(raw || '{}');
      const pack = installedIconPacks.find((p) => p.packageName === packageName);

      setApps((prevApps) => {
        const updated = prevApps.map((app) => {
          if (app.packageName && iconMap[app.packageName]) {
            return { ...app, customIcon: iconMap[app.packageName] };
          }
          return app;
        });
        localStorage.setItem('nova_launcher_v4_apps', JSON.stringify(updated));
        return updated;
      });

      showToast(`Applied ${pack?.name || 'Icon Pack'}`);
    } catch (e) {
      console.error('[Nodus] Failed to apply icon pack:', e);
      showToast('Failed to apply icon pack');
    }
  };

  // Listen for hardware back button from native Android shell
  useEffect(() => {
    const handleNativeBack = () => {
      if (activeAppId) {
        setActiveAppId(null);
        return;
      }
      if (isSearchOpen) {
        setSearchOpen(false);
        return;
      }
      if (isQuickSettingsOpen) {
        setQuickSettingsOpen(false);
        return;
      }
      if (activeFolderId) {
        setActiveFolderId(null);
        return;
      }
    };

    window.addEventListener('nodus-back-press', handleNativeBack);
    return () => window.removeEventListener('nodus-back-press', handleNativeBack);
  }, [activeAppId, isSearchOpen, isQuickSettingsOpen, activeFolderId]);

  // Dynamic Hardware Node Health & Connection Polling
  useEffect(() => {
    const checkNodes = async () => {
      for (const dev of devices) {
        if (dev.id === 'tab-pc') continue;
        try {
          const res = await simulateBridgeRpc('GET_TELEMETRY', dev.id);
          const isConnected = res.response.status === 'OK';
          setDevices((prev) =>
            prev.map((d) => {
              if (d.id === dev.id) {
                if (isConnected && res.response.result) {
                  const tel = res.response.result as any;
                  return {
                    ...d,
                    status: d.id === activeDeviceId ? 'connected' : 'online',
                    cpuLoad: typeof tel.cpuLoadPercent === 'number' ? tel.cpuLoadPercent : d.cpuLoad,
                  };
                }
                return d;
              }
              return d;
            })
          );

          // If active hardware node is reachable, dynamically scan installed apps
          if (dev.id === activeDeviceId && isConnected) {
            try {
              const appRes = await simulateBridgeRpc('GET_INSTALLED_APPS', dev.id);
              if (appRes.response.status === 'OK' && Array.isArray(appRes.response.result)) {
                const scanned: any[] = appRes.response.result;
                setApps((prevApps) => {
                  const existingIds = new Set(prevApps.map((a) => a.id));
                  const newApps: AppItem[] = scanned
                    .filter((item) => !existingIds.has(item.id || item.packageName))
                    .map((item, idx) => ({
                      id: item.id || item.packageName,
                      name: item.name,
                      iconName: item.icon || 'Smartphone',
                      color: item.color || '#007AFF',
                      category: 'tools',
                      pageIndex: 1,
                      order: prevApps.length + idx,
                      packageName: item.packageName || item.id,
                    }));
                  return newApps.length > 0 ? [...prevApps, ...newApps] : prevApps;
                });
              }
            } catch (_) {}
          }
        } catch (e) {
          // Keep active hardware reachable status intact
        }
      }
    };

    checkNodes();
    const timer = setInterval(checkNodes, 6000);
    return () => clearInterval(timer);
  }, [activeDeviceId]);

  useEffect(() => {
    localStorage.setItem('nova_launcher_active_device', activeDeviceId);
  }, [activeDeviceId]);

  useEffect(() => {
    localStorage.setItem('nova_launcher_sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('nova_launcher_device_processes', JSON.stringify(deviceProcesses));
  }, [deviceProcesses]);

  useEffect(() => {
    localStorage.setItem('nova_launcher_v4_apps', JSON.stringify(apps));
  }, [apps]);

  useEffect(() => {
    localStorage.setItem('nova_launcher_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('nova_launcher_v3_settings', JSON.stringify(settings));
  }, [settings]);

  // Current active device object
  const activeDevice = devices.find((d) => d.id === activeDeviceId) || devices[0] || INITIAL_DEVICES[0];

  // Remote Executables and Trusted Devices State
  const remoteExecutables = settings.remoteExecutables || INITIAL_REMOTE_EXECUTABLES;
  const trustedDevices = settings.trustedDevices || INITIAL_TRUSTED_DEVICES;

  // Settings Updater
  const updateSettings = (partial: Partial<LauncherSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const updateNetworkServerConfig = (partial: Partial<NetworkServerConfig>) => {
    setSettings((prev) => ({
      ...prev,
      networkServer: { ...prev.networkServer, ...partial },
    }));
  };

  const updateWindowsBridgeConfig = (partial: Partial<WindowsBridgeConfig>) => {
    setSettings((prev) => ({
      ...prev,
      windowsBridge: { ...prev.windowsBridge, ...partial },
    }));
  };

  const updateAndroidBridgeConfig = (partial: Partial<AndroidBridgeConfig>) => {
    setSettings((prev) => ({
      ...prev,
      androidBridge: { ...prev.androidBridge, ...partial },
    }));
  };

  const updateClipboardSyncConfig = (partial: Partial<ClipboardSyncConfig>) => {
    setSettings((prev) => ({
      ...prev,
      clipboardSync: { ...prev.clipboardSync, ...partial },
    }));
  };

  // Remote Executables management
  const addRemoteExecutable = (item: Omit<RemoteExecutable, 'id'>) => {
    audio.playTap();
    const newExec: RemoteExecutable = {
      ...item,
      id: `exec-${Date.now()}`,
    };
    setSettings((prev) => ({
      ...prev,
      remoteExecutables: [newExec, ...(prev.remoteExecutables || [])],
    }));
    addNotification({
      appId: 'settings',
      appName: 'Remote Hub',
      title: `Added Executable: ${newExec.name}`,
      message: `Target device: ${newExec.deviceName} (${newExec.commandOrPackage})`,
      iconName: newExec.iconName,
      color: newExec.iconColor,
    });
  };

  const updateRemoteExecutable = (id: string, partial: Partial<RemoteExecutable>) => {
    setSettings((prev) => ({
      ...prev,
      remoteExecutables: (prev.remoteExecutables || []).map((e) =>
        e.id === id ? { ...e, ...partial } : e
      ),
    }));
  };

  const deleteRemoteExecutable = (id: string) => {
    audio.playTap();
    setSettings((prev) => ({
      ...prev,
      remoteExecutables: (prev.remoteExecutables || []).filter((e) => e.id !== id),
    }));
  };

  const toggleRemoteExecutable = (id: string) => {
    audio.playTap();
    setSettings((prev) => ({
      ...prev,
      remoteExecutables: (prev.remoteExecutables || []).map((e) =>
        e.id === id ? { ...e, enabled: !e.enabled } : e
      ),
    }));
  };

  const executeRemoteApp = async (executable: RemoteExecutable): Promise<{ success: boolean; message: string }> => {
    audio.playAppOpen();
    const targetDev = devices.find((d) => d.id === executable.deviceId);
    
    updateRemoteExecutable(executable.id, { lastExecuted: 'Just now' });

    addNotification({
      appId: 'terminal',
      appName: 'Remote Execution',
      title: `Triggered: ${executable.name}`,
      message: `Sent ${executable.execType} (${executable.commandOrPackage}) to ${executable.deviceName}`,
      iconName: executable.iconName,
      color: executable.iconColor,
    });

    if (targetDev && targetDev.status === 'offline') {
      return {
        success: false,
        message: `Device ${targetDev.name} is offline. Remote command buffered in queue.`,
      };
    }

    return {
      success: true,
      message: `Executed "${executable.commandOrPackage}" on ${executable.deviceName} (RPC OK)`,
    };
  };

  // Trusted Devices management
  const toggleTrustDevice = (id: string) => {
    audio.playTap();
    setSettings((prev) => ({
      ...prev,
      trustedDevices: (prev.trustedDevices || []).map((td) =>
        td.id === id ? { ...td, isTrusted: !td.isTrusted } : td
      ),
    }));
  };

  const removeTrustedDevice = (id: string) => {
    audio.playTap();
    setSettings((prev) => ({
      ...prev,
      trustedDevices: (prev.trustedDevices || []).filter((td) => td.id !== id),
    }));
  };

  const updateDevicePermissions = (id: string, permissions: Partial<TrustedDevice['permissions']>) => {
    setSettings((prev) => ({
      ...prev,
      trustedDevices: (prev.trustedDevices || []).map((td) =>
        td.id === id ? { ...td, permissions: { ...td.permissions, ...permissions } } : td
      ),
    }));
  };

  // Device management functions
  const selectDevice = (id: string) => {
    audio.playTap();
    setActiveDeviceId(id);
  };

  const toggleSidebar = () => {
    audio.playTap();
    setSidebarCollapsed((prev) => !prev);
  };

  const reorderDevices = (newDevices: DeviceInfo[]) => {
    setDevices(newDevices);
  };

  const moveDeviceUp = (id: string) => {
    const index = devices.findIndex((d) => d.id === id);
    if (index > 0) {
      audio.playTap();
      const newDevices = [...devices];
      const temp = newDevices[index];
      newDevices[index] = newDevices[index - 1];
      newDevices[index - 1] = temp;
      setDevices(newDevices);
    }
  };

  const moveDeviceDown = (id: string) => {
    const index = devices.findIndex((d) => d.id === id);
    if (index !== -1 && index < devices.length - 1) {
      audio.playTap();
      const newDevices = [...devices];
      const temp = newDevices[index];
      newDevices[index] = newDevices[index + 1];
      newDevices[index + 1] = temp;
      setDevices(newDevices);
    }
  };

  const addDevice = (deviceData: Omit<DeviceInfo, 'id'>) => {
    audio.playTap();
    const newId = `dev-${Date.now()}`;
    const newDevice: DeviceInfo = {
      ...deviceData,
      id: newId,
      isCustom: true,
      cpuLoad: Math.floor(Math.random() * 25 + 10),
      ramUsage: '2.4 / 8.0 GB',
      storage: '45 / 128 GB',
    };
    setDevices((prev) => [...prev, newDevice]);

    setDeviceProcesses((prev) => ({
      ...prev,
      [newId]: [
        { pid: 101, name: 'system_server', user: 'system', cpu: 2.1, memoryMb: 140, status: 'running', category: 'system', description: 'Core Services' },
        { pid: 214, name: 'surfaceflinger', user: 'system', cpu: 3.4, memoryMb: 80, status: 'running', category: 'system', description: 'Display Compositor' },
        { pid: 512, name: 'com.android.systemui', user: 'user', cpu: 1.8, memoryMb: 95, status: 'running', category: 'system', description: 'System UI' },
        { pid: 1040, name: 'com.android.launcher', user: 'user', cpu: 0.9, memoryMb: 70, status: 'running', category: 'user', description: 'Cluster Launcher' },
      ],
    }));

    addNotification({
      appId: 'settings',
      appName: 'Fleet Manager',
      title: `Device Connected: ${newDevice.name}`,
      message: `Node ${newDevice.ipAddress} (${newDevice.os}) was added to cluster.`,
      iconName: 'Smartphone',
      color: '#34C759',
    });
  };

  const removeDevice = (id: string) => {
    audio.playTap();
    setDevices((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      if (activeDeviceId === id && filtered.length > 0) {
        setActiveDeviceId(filtered[0].id);
      }
      return filtered;
    });
  };

  const updateDevice = (id: string, partial: Partial<DeviceInfo>) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...partial } : d))
    );
  };

  const updateDeviceAvatar = (id: string, avatarUrl: string) => {
    audio.playTap();
    updateDevice(id, { customAvatar: avatarUrl });
    showToast('Device portrait updated');
  };

  const openProcessManager = (deviceId: string) => {
    audio.playTap();
    setProcessModalDeviceId((prev) => (prev === deviceId ? null : deviceId));
  };

  const closeProcessManager = () => {
    audio.playTap();
    setProcessModalDeviceId(null);
  };

  const killProcess = (deviceId: string, pid: number) => {
    audio.playTap();
    const targetDev = devices.find((d) => d.id === deviceId);
    const targetProcs = deviceProcesses[deviceId] || [];
    const procToKill = targetProcs.find((p) => p.pid === pid);

    setDeviceProcesses((prev) => {
      const procs = prev[deviceId] || [];
      return {
        ...prev,
        [deviceId]: procs.filter((p) => p.pid !== pid),
      };
    });

    if (procToKill && targetDev) {
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id === deviceId) {
            const newCpu = Math.max(5, (d.cpuLoad ?? 20) - Math.round(procToKill.cpu));
            return { ...d, cpuLoad: newCpu };
          }
          return d;
        })
      );

      showToast(`Terminated PID ${pid} (${procToKill.name})`);

      addNotification({
        appId: 'settings',
        appName: 'Process Guard',
        title: `Killed PID ${pid} (${procToKill.name})`,
        message: `Freed ${procToKill.memoryMb} MB RAM on ${targetDev.name}.`,
        iconName: 'Activity',
        color: '#FF3B30',
      });
    }
  };

  const killAllUserProcesses = (deviceId: string) => {
    audio.playTap();
    const targetDev = devices.find((d) => d.id === deviceId);
    setDeviceProcesses((prev) => {
      const procs = prev[deviceId] || [];
      const filtered = procs.filter((p) => p.category === 'system');
      return { ...prev, [deviceId]: filtered };
    });

    if (targetDev) {
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, cpuLoad: 9 } : d))
      );

      showToast(`Cleared background tasks on ${targetDev.name}`);

      addNotification({
        appId: 'settings',
        appName: 'Process Guard',
        title: `Background Tasks Cleared`,
        message: `Terminated non-system background tasks on ${targetDev.name}.`,
        iconName: 'ShieldAlert',
        color: '#34C759',
      });
    }
  };

  const rebootDevice = (deviceId: string) => {
    audio.playTap();
    const targetDev = devices.find((d) => d.id === deviceId);
    if (!targetDev) return;

    showToast(`Dispatched reboot command to ${targetDev.name}...`);

    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, status: 'rebooting', isRebooting: true, cpuLoad: 99 } : d
      )
    );

    addNotification({
      appId: 'settings',
      appName: 'Remote Power',
      title: `Rebooting ${targetDev.name}...`,
      message: `System restart command sent to ${targetDev.ipAddress}.`,
      iconName: 'RotateCcw',
      color: '#FF9500',
    });

    setTimeout(() => {
      setDeviceProcesses((prev) => ({
        ...prev,
        [deviceId]: INITIAL_DEVICE_PROCESSES[deviceId] || [
          { pid: 1, name: 'init/system', user: 'root', cpu: 1.2, memoryMb: 120, status: 'running', category: 'system', description: 'System Init Core' },
          { pid: 240, name: 'compositor', user: 'system', cpu: 2.5, memoryMb: 90, status: 'running', category: 'system', description: 'Display Compositor' },
          { pid: 850, name: 'shell_host', user: 'user', cpu: 1.0, memoryMb: 60, status: 'running', category: 'user', description: 'Default Shell Interface' },
        ],
      }));

      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId
            ? {
                ...d,
                status: d.type === 'desktop' ? 'online' : 'connected',
                isRebooting: false,
                cpuLoad: Math.floor(Math.random() * 15 + 10),
              }
            : d
        )
      );

      addNotification({
        appId: 'settings',
        appName: 'Remote Power',
        title: `${targetDev.name} is Back Online`,
        message: `Restart complete. All bridge daemons responding.`,
        iconName: 'Check',
        color: '#34C759',
      });
    }, 3500);
  };

  // Universal Cross-Device Clipboard functions
  const addClipboardItem = (item: { text: string; deviceId?: string; type?: 'text' | 'link' | 'code' | 'snippet' }) => {
    if (!item.text.trim()) return;
    const devId = item.deviceId || activeDeviceId;
    const targetDev = devices.find((d) => d.id === devId) || activeDevice;
    const devColor = DEVICE_COLORS[devId] || '#34C759';

    let inferredType: 'text' | 'link' | 'code' | 'snippet' = item.type || 'text';
    if (!item.type) {
      if (item.text.startsWith('http://') || item.text.startsWith('https://')) {
        inferredType = 'link';
      } else if (item.text.includes(';') || item.text.includes('&&') || item.text.startsWith('adb') || item.text.startsWith('curl') || item.text.startsWith('git')) {
        inferredType = 'code';
      } else if (item.text.length > 80) {
        inferredType = 'snippet';
      }
    }

    const newItem: ClipboardItem = {
      id: `clip-${Date.now()}`,
      text: item.text.trim(),
      deviceId: devId,
      deviceName: targetDev.name,
      deviceType: targetDev.type,
      deviceColor: devColor,
      type: inferredType,
      timestamp: 'Just now',
      pinned: false,
    };

    setClipboardItems((prev) => {
      const filtered = prev.filter((c) => c.text !== newItem.text);
      return [newItem, ...filtered].slice(0, 100);
    });

    addNotification({
      appId: 'settings',
      appName: 'Universal Clipboard',
      title: `Synced from ${targetDev.name}`,
      message: `${newItem.text.length > 45 ? newItem.text.substring(0, 45) + '...' : newItem.text}`,
      iconName: 'Clipboard',
      color: devColor,
    });
  };

  const removeClipboardItem = (id: string) => {
    audio.playTap();
    setClipboardItems((prev) => prev.filter((c) => c.id !== id));
  };

  const togglePinClipboardItem = (id: string) => {
    audio.playTap();
    setClipboardItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const clearClipboardHistory = () => {
    audio.playTap();
    setClipboardItems((prev) => prev.filter((c) => c.pinned));
  };

  const clearFleetClipboard = () => {
    audio.playTap();
    setClipboardItems([]);
  };

  // Launcher navigation & app launching
  const toggleFloatingMode = () => {
    if (settings.soundEffects) audio.playTap();
    setIsFloatingModeArmed((prev) => {
      const next = !prev;
      showToast(next ? 'Floating Window Mode: ON' : 'Floating Window Mode: OFF');
      return next;
    });
  };

  const openAppContextMenu = (appId: string, x: number, y: number) => {
    if (settings.soundEffects) audio.playTap();
    setAppContextMenu({ isOpen: true, appId, x, y });
  };

  const closeAppContextMenu = () => {
    setAppContextMenu(null);
  };

  const launchAppFloating = (appId: string) => {
    if (settings.soundEffects) audio.playAppOpen();
    const targetApp = apps.find((a) => a.id === appId);
    if (targetApp?.packageName) {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.launchAppFloating) {
        const launched = bridge.launchAppFloating(targetApp.packageName);
        if (launched) {
          showToast(`Opened ${targetApp.name} in floating window`);
          return;
        }
      }
    }
    launchApp(appId, 'floating');
  };

  const launchApp = (appId: string, forceMode?: 'fullscreen' | 'floating') => {
    if (settings.soundEffects) audio.playAppOpen();
    const targetApp = apps.find((a) => a.id === appId);

    // Track in running and recent apps
    setRunningApps((prev) => {
      if (!prev.includes(appId)) return [appId, ...prev.slice(0, 11)];
      return [appId, ...prev.filter((id) => id !== appId)];
    });

    setRecentApps((prev) => {
      const next = [appId, ...prev.filter((id) => id !== appId)].slice(0, 16);
      try {
        localStorage.setItem('nova_launcher_recents', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    const shouldFloat = forceMode === 'floating' || (!forceMode && (isFloatingModeArmed || settings.appLaunchMode === 'floating'));

    if (targetApp?.packageName) {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      
      if (shouldFloat && bridge?.launchAppFloating) {
        const launched = bridge.launchAppFloating(targetApp.packageName);
        if (launched) {
          showToast(`Opened ${targetApp.name} in floating window`);
          return;
        }
      }

      // Standard native launch via Android bridge if available
      if (bridge?.launchApp) {
        const launched = bridge.launchApp(targetApp.packageName);
        if (launched) return;
      }

      // Fallback to cluster RPC intent dispatch for remote nodes
      simulateBridgeRpc('LAUNCH_INTENT', activeDeviceId, { packageName: targetApp.packageName });
      addNotification({
        appId: 'settings',
        appName: 'Intent Dispatcher',
        title: `Launching ${targetApp.name}`,
        message: `Dispatched LAUNCH_INTENT for package ${targetApp.packageName} to ${activeDevice.name}`,
        iconName: 'ExternalLink',
        color: targetApp.color || '#34C759',
      });
      return;
    }

    setActiveAppId(appId);
    setSearchOpen(false);
  };

  const closeActiveApp = () => {
    if (settings.soundEffects) audio.playTap();
    setActiveAppId(null);
  };

  const minimizeActiveApp = () => {
    if (settings.soundEffects) audio.playTap();
    if (activeAppId) {
      setActiveAppId(null);
    } else {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.bringLauncherToFront) {
        bridge.bringLauncherToFront();
      }
    }
  };

  const toggleAppTask = (appId: string) => {
    if (settings.soundEffects) audio.playTap();
    const targetApp = apps.find((a) => a.id === appId);

    // 1. Internal Window App (Settings, Terminal, Studio, etc.)
    if (!targetApp?.packageName) {
      if (activeAppId === appId) {
        // Frontmost -> minimize to taskbar
        setActiveAppId(null);
      } else {
        // Bring to front
        setActiveAppId(appId);
        setRunningApps((prev) => {
          if (!prev.includes(appId)) return [appId, ...prev.slice(0, 11)];
          return [appId, ...prev.filter((id) => id !== appId)];
        });
      }
      return;
    }

    // 2. Native Android App
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge?.bringAppToFront) {
      bridge.bringAppToFront(targetApp.packageName);
      setRunningApps((prev) => {
        if (!prev.includes(appId)) return [appId, ...prev.slice(0, 11)];
        return [appId, ...prev.filter((id) => id !== appId)];
      });
    } else {
      launchApp(appId);
    }
  };

  const killApp = (appId: string) => {
    if (settings.soundEffects) audio.playTap();
    setRunningApps((prev) => prev.filter((id) => id !== appId));
    if (activeAppId === appId) {
      setActiveAppId(null);
    }
  };

  const clearAllRunningApps = () => {
    setRunningApps([]);
    setActiveAppId(null);
  };

  const toggleQuickSetting = (key: keyof QuickSettingsState) => {
    if (settings.soundEffects) audio.playTap();
    setQuickSettings((prev) => {
      if (typeof prev[key] === 'boolean') {
        return { ...prev, [key]: !prev[key] };
      }
      return prev;
    });
  };

  const toggleQuickSettings = () => {
    if (settings.soundEffects) audio.playTap();
    setQuickSettingsOpen((prev) => !prev);
  };

  const addDrawerTab = (name: string, initialAppIds: string[] = []) => {
    if (settings.soundEffects) audio.playTap();
    const clean = name.trim().toLowerCase();
    if (!clean) return;
    if (!drawerTabs.includes(clean)) {
      const next = [...drawerTabs, clean];
      setDrawerTabs(next);
      try {
        localStorage.setItem('nodus_drawer_tabs', JSON.stringify(next));
      } catch (_) {}
    }
    if (initialAppIds.length > 0) {
      setCustomTabAppMap((prev) => {
        const next = { ...prev, [clean]: initialAppIds };
        try {
          localStorage.setItem('nodus_custom_tab_apps', JSON.stringify(next));
        } catch (_) {}
        return next;
      });
    }
    showToast(`Created tab "${clean}"`);
  };

  const removeDrawerTab = (name: string) => {
    if (settings.soundEffects) audio.playTap();
    const clean = name.trim().toLowerCase();
    const next = drawerTabs.filter((t) => t !== clean);
    setDrawerTabs(next);
    try {
      localStorage.setItem('nodus_drawer_tabs', JSON.stringify(next));
    } catch (_) {}
    setCustomTabAppMap((prev) => {
      const copy = { ...prev };
      delete copy[clean];
      try {
        localStorage.setItem('nodus_custom_tab_apps', JSON.stringify(copy));
      } catch (_) {}
      return copy;
    });
    showToast(`Removed tab "${clean}"`);
  };

  const renameDrawerTab = (oldName: string, newName: string) => {
    if (settings.soundEffects) audio.playTap();
    const oldClean = oldName.trim().toLowerCase();
    const newClean = newName.trim().toLowerCase();
    if (!newClean || oldClean === newClean) return;

    const next = drawerTabs.map((t) => (t === oldClean ? newClean : t));
    setDrawerTabs(next);
    try {
      localStorage.setItem('nodus_drawer_tabs', JSON.stringify(next));
    } catch (_) {}

    setCustomTabAppMap((prev) => {
      const copy = { ...prev };
      if (copy[oldClean]) {
        copy[newClean] = copy[oldClean];
        delete copy[oldClean];
      }
      try {
        localStorage.setItem('nodus_custom_tab_apps', JSON.stringify(copy));
      } catch (_) {}
      return copy;
    });
    showToast(`Renamed tab to "${newClean}"`);
  };

  const assignAppsToTab = (tabName: string, appIds: string[]) => {
    if (settings.soundEffects) audio.playTap();
    const clean = tabName.trim().toLowerCase();
    setCustomTabAppMap((prev) => {
      const next = { ...prev, [clean]: appIds };
      try {
        localStorage.setItem('nodus_custom_tab_apps', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    showToast(`Updated apps for "${clean}"`);
  };

  const setAppCategory = (appId: string, category: string) => {
    if (settings.soundEffects) audio.playTap();
    const clean = category.trim().toLowerCase();
    setApps((prev) => {
      const next = prev.map((a) => (a.id === appId ? { ...a, category: clean } : a));
      try {
        localStorage.setItem('nova_launcher_apps', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const uninstallApp = (appId: string) => {
    if (settings.soundEffects) audio.playTap();
    const targetApp = apps.find((a) => a.id === appId);
    if (!targetApp) return;

    if (targetApp.packageName) {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.uninstallApp) {
        bridge.uninstallApp(targetApp.packageName);
      }
      showToast(`Initiating uninstallation for ${targetApp.name}...`);
      setTimeout(syncNativeInstalledApps, 1200);
      setTimeout(syncNativeInstalledApps, 2500);
      setTimeout(syncNativeInstalledApps, 4500);
    } else {
      setApps((prev) => prev.filter((app) => app.id !== appId));
      setRunningApps((prev) => prev.filter((id) => id !== appId));
      setFolders((prev) =>
        prev.map((f) => ({ ...f, appIds: f.appIds.filter((id) => id !== appId) }))
      );
      if (activeAppId === appId) setActiveAppId(null);
      showToast(`Removed ${targetApp.name}`);
    }
  };

  const createFolder = (name: string, appIds: string[], pageIndex: number) => {
    const newFolder: FolderItem = {
      id: `folder-${Date.now()}`,
      name: name || 'Folder',
      color: '#34C759',
      pageIndex,
      order: folders.filter((f) => f.pageIndex === pageIndex).length,
      appIds,
    };
    setFolders((prev) => [...prev, newFolder]);
    setApps((prev) =>
      prev.map((app) =>
        appIds.includes(app.id) ? { ...app, folderId: newFolder.id } : app
      )
    );
  };

  const createFolderFromApps = (sourceAppId: string, targetAppId: string, customName?: string) => {
    if (sourceAppId === targetAppId) return;
    const source = apps.find((a) => a.id === sourceAppId);
    const target = apps.find((a) => a.id === targetAppId);
    if (!source || !target) return;

    let folderName = customName;
    if (!folderName) {
      if (source.category === target.category && source.category !== 'productivity') {
        folderName = source.category.charAt(0).toUpperCase() + source.category.slice(1);
      } else {
        folderName = `${target.name} & More`;
      }
    }

    const folderPageIndex = target.pageIndex ?? 0;
    const newFolder: FolderItem = {
      id: `folder-${Date.now()}`,
      name: folderName,
      color: target.color || '#34C759',
      pageIndex: folderPageIndex,
      order: target.order ?? 0,
      appIds: [targetAppId, sourceAppId],
    };

    setFolders((prev) => [...prev, newFolder]);
    setApps((prev) =>
      prev.map((app) =>
        app.id === sourceAppId || app.id === targetAppId
          ? { ...app, folderId: newFolder.id }
          : app
      )
    );
    if (settings.soundEffects) audio.playTap();
  };

  const addAppToFolder = (folderId: string, appId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder || folder.appIds.includes(appId)) return;

    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, appIds: [...f.appIds, appId] } : f))
    );
    setApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, folderId: folderId } : app))
    );
    if (settings.soundEffects) audio.playTap();
  };

  const removeAppFromFolder = (folderId: string, appId: string) => {
    setFolders((prev) =>
      prev
        .map((f) => {
          if (f.id === folderId) {
            return { ...f, appIds: f.appIds.filter((id) => id !== appId) };
          }
          return f;
        })
        .filter((f) => f.appIds.length > 0)
    );

    setApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, folderId: null } : app))
    );
  };

  const renameFolder = (folderId: string, newName: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f))
    );
  };

  const deleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setApps((prev) =>
      prev.map((app) => (app.folderId === folderId ? { ...app, folderId: null } : app))
    );
    setActiveFolderId(null);
  };

  const moveAppToPage = (appId: string, targetPageIndex: number) => {
    setApps((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, pageIndex: targetPageIndex } : app
      )
    );
  };

  const moveApp = (sourceAppId: string, targetAppId: string) => {
    if (sourceAppId === targetAppId) return;
    setApps((prev) => {
      const sourceIndex = prev.findIndex((a) => a.id === sourceAppId);
      const targetIndex = prev.findIndex((a) => a.id === targetAppId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);

      try {
        localStorage.setItem('nova_launcher_apps_order', JSON.stringify(next.map((a) => a.id)));
      } catch (_) {}

      return next;
    });
    if (settings.soundEffects) audio.playTap();
  };

  const reorderApps = (newApps: AppItem[]) => {
    setApps(newApps);
    try {
      localStorage.setItem('nova_launcher_apps_order', JSON.stringify(newApps.map((a) => a.id)));
    } catch (_) {}
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'time' | 'read'>) => {
    if (settings.soundEffects) {
      audio.playNotificationChime();
    }
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}`,
      time: 'Just now',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const openQuickSettings = () => {
    if (settings.soundEffects) audio.playTap();
    setQuickSettingsOpen(true);
  };

  // Calculate total pages based on apps
  const maxPageIndex = Math.max(
    0,
    ...apps.map((a) => a.pageIndex || 0),
    ...folders.map((f) => f.pageIndex || 0)
  );
  const totalPages = Math.max(2, maxPageIndex + 1);

  return (
    <LauncherContext.Provider
      value={{
        devices,
        activeDeviceId,
        activeDevice,
        selectDevice,
        reorderDevices,
        moveDeviceUp,
        moveDeviceDown,
        addDevice,
        removeDevice,
        updateDevice,
        updateDeviceAvatar,
        isSidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        apps,
        folders,
        dockAppIds,
        currentPageIndex,
        totalPages,
        setCurrentPageIndex,
        launchApp,
        closeActiveApp,
        activeAppId,
        runningApps,
        recentApps,
        killApp,
        clearAllRunningApps,
        isEditing,
        setIsEditing,
        uninstallApp,
        createFolder,
        createFolderFromApps,
        addAppToFolder,
        removeAppFromFolder,
        renameFolder,
        deleteFolder,
        activeFolderId,
        setActiveFolderId,
        moveAppToPage,
        moveApp,
        reorderApps,
        draggedAppId,
        setDraggedAppId,
        dragPosition,
        setDragPosition,
        hoverTargetAppId,
        setHoverTargetAppId,
        isQuickSettingsOpen,
        setQuickSettingsOpen,
        toggleQuickSettings,
        quickSettings,
        setQuickSettings,
        toggleQuickSetting,
        isSearchOpen,
        setSearchOpen,
        notifications,
        dismissNotification,
        clearAllNotifications,
        markNotificationRead,
        addNotification,
        settings,
        updateSettings,
        updateNetworkServerConfig,
        updateWindowsBridgeConfig,
        updateAndroidBridgeConfig,
        updateClipboardSyncConfig,
        remoteExecutables,
        addRemoteExecutable,
        updateRemoteExecutable,
        deleteRemoteExecutable,
        toggleRemoteExecutable,
        executeRemoteApp,
        trustedDevices,
        toggleTrustDevice,
        removeTrustedDevice,
        updateDevicePermissions,
        deviceProcesses,
        processModalDeviceId,
        openProcessManager,
        closeProcessManager,
        killProcess,
        killAllUserProcesses,
        rebootDevice,
        clipboardItems,
        addClipboardItem,
        removeClipboardItem,
        togglePinClipboardItem,
        clearClipboardHistory,
        clearFleetClipboard,
        drawerTabs,
        customTabAppMap,
        addDrawerTab,
        removeDrawerTab,
        renameDrawerTab,
        assignAppsToTab,
        setAppCategory,
        openQuickSettings,
        toastMessage,
        showToast,
        confirmDialog,
        showConfirm,
        closeConfirm,
        installedIconPacks,
        applyIconPack,
        launchAppFloating,
        isFloatingModeArmed,
        setIsFloatingModeArmed,
        toggleFloatingMode,
        appContextMenu,
        openAppContextMenu,
        closeAppContextMenu,
        appBadges,
        totalUnreadNotifications,
        isNotificationListenerEnabled,
        requestNotificationListenerPermission,
        toggleAppTask,
        minimizeActiveApp,
      }}
    >
      {children}
    </LauncherContext.Provider>
  );
};

export const useLauncher = () => {
  const context = useContext(LauncherContext);
  if (!context) {
    throw new Error('useLauncher must be used within a LauncherProvider');
  }
  return context;
};
