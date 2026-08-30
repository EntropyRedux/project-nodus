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
  getDeviceColor,
  INITIAL_SERVER_CONFIG,
  INITIAL_WINDOWS_BRIDGE,
  INITIAL_ANDROID_BRIDGE,
  INITIAL_CLIPBOARD_SYNC_CONFIG,
  INITIAL_REMOTE_EXECUTABLES,
  INITIAL_TRUSTED_DEVICES
} from '../utils/constants';
import { audio } from '../utils/audio';
import { simulateBridgeRpc } from '../utils/bridgeProtocol';
import { universalNetworkFetch } from '../services/FleetDirectClient';

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
  fetchDeviceProcesses: (deviceId: string) => Promise<void>;
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
  isTaskbarOpen: boolean;
  setTaskbarOpen: (val: boolean) => void;
  toggleTaskbar: () => void;
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

  // Music & Media
  currentTrack: { id: string; title: string; artist: string; coverColor: string };
  isPlayingMusic: boolean;
  toggleMusic: () => void;
  nextTrack: () => void;

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
  lockDevice: (deviceId?: string) => void;

  // Universal Clipboard History
  clipboardItems: ClipboardItem[];
  addClipboardItem: (item: { text: string; deviceId?: string; type?: 'text' | 'link' | 'code' | 'snippet' | 'image'; imageData?: string }) => void;
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
  theme: 'glassmorphism',
  themeMode: 'dark',
  accentColor: 'sapphire',
  iconStyle: 'material-you',
  iconShape: 'modern',
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

  // Multi-Device & Extensions Gating (Default: ON)
  enableMultiDevice: true,
  enableClipboardPanel: true,
  taskbarMode: 'auto',

  // Multi-Device Server & Controller Configs
  networkServer: INITIAL_SERVER_CONFIG,
  windowsBridge: INITIAL_WINDOWS_BRIDGE,
  androidBridge: INITIAL_ANDROID_BRIDGE,
  clipboardSync: INITIAL_CLIPBOARD_SYNC_CONFIG,
  trustedDevices: INITIAL_TRUSTED_DEVICES,
  remoteExecutables: INITIAL_REMOTE_EXECUTABLES,
  showRemoteAppsInMainDrawer: false,
  showOnlyLocalInDrawer: true,
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
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nova_launcher_devices');
        localStorage.removeItem('nodus_launcher_devices');
      } catch (_) {}

      try {
        const bridge = (window as any).NodusNativeBridge;
        if (bridge?.queryFleetDevices) {
          const raw = bridge.queryFleetDevices();
          if (raw && typeof raw === 'string' && raw.startsWith('[')) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
              const valid = list.filter((d: any) => !['tab-pc', 'sm-t230nu', 'main-pc'].includes(d.id));
              if (valid.length > 0) return valid;
            }
          }
        }
      } catch (_) {}
    }
    return INITIAL_DEVICES;
  });

  const [activeDeviceId, setActiveDeviceId] = useState<string>(() => {
    const saved = localStorage.getItem('nova_launcher_active_device');
    return (saved && !['tab-pc', 'sm-t230nu', 'main-pc'].includes(saved)) ? saved : 'poco-pad';
  });

  const [isSidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('nova_launcher_sidebar_collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [isTaskbarOpen, setTaskbarOpen] = useState<boolean>(false);
  const toggleTaskbar = useCallback(() => {
    setTaskbarOpen((prev) => !prev);
  }, []);

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
              const APPS_PER_PAGE = 36;
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

    const saved = localStorage.getItem('nodus_home_v5_apps') || localStorage.getItem('nova_launcher_v4_apps');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const OBSOLETE_APP_IDS = new Set(['studio', 'terminal', 'monitor', 'files', 'network', 'clipboard']);
          const cleaned = parsed.filter((a: any) => !OBSOLETE_APP_IDS.has(a.id));
          const existingIds = new Set(cleaned.map((a: any) => a.id));
          const missing = INITIAL_APPS.filter((a) => !existingIds.has(a.id));
          if (missing.length > 0) {
            return [...cleaned, ...missing];
          }
          return cleaned;
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
  const [floatingApps, setFloatingApps] = useState<string[]>([]);
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
        const legacyMockIds = ['tab-pc', 'sm-t230nu', 'main-pc'];
        const cleanTrusted = Array.isArray(parsed.trustedDevices)
          ? parsed.trustedDevices.filter((d: any) => !legacyMockIds.includes(d.id))
          : INITIAL_TRUSTED_DEVICES;
        const cleanExecs = Array.isArray(parsed.remoteExecutables)
          ? parsed.remoteExecutables.filter((e: any) => !legacyMockIds.includes(e.deviceId))
          : INITIAL_REMOTE_EXECUTABLES;
        const cleanWinBridge = parsed.windowsBridge
          ? {
              ...parsed.windowsBridge,
              connectedHost: parsed.windowsBridge.connectedHost === '192.168.1.150' ? '' : (parsed.windowsBridge.connectedHost || ''),
            }
          : DEFAULT_SETTINGS.windowsBridge;

        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          trustedDevices: cleanTrusted,
          remoteExecutables: cleanExecs,
          windowsBridge: cleanWinBridge,
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

  // Universal Cross-Device Clipboard History (Starts fresh on app restart)
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);

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
            const APPS_PER_PAGE = 36;

            setApps((prevApps) => {
              const OBSOLETE_APP_IDS = new Set(['studio', 'terminal', 'monitor', 'files', 'network', 'clipboard']);
              const cleanedPrev = prevApps.filter((a) => !OBSOLETE_APP_IDS.has(a.id));
              const existingMap = new Map(cleanedPrev.map((a) => [a.id, a]));
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
              localStorage.setItem('nodus_home_v5_apps', JSON.stringify(merged));
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

  const syncNotificationBadges = useCallback((detailObj?: any) => {
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.isNotificationListenerEnabled) {
        setIsNotificationListenerEnabled(bridge.isNotificationListenerEnabled());
      }

      if (detailObj) {
        if (detailObj.badges && typeof detailObj.badges === 'object') {
          setAppBadges(detailObj.badges);
        } else if (typeof detailObj === 'object' && !detailObj.badges) {
          setAppBadges(detailObj);
        }

        if (Array.isArray(detailObj.notifications)) {
          setNotifications(detailObj.notifications);
        }
        return;
      }

      if (bridge?.getActiveNotificationBadges) {
        const raw = bridge.getActiveNotificationBadges();
        if (raw && typeof raw === 'string' && raw.startsWith('{')) {
          const map: Record<string, number> = JSON.parse(raw);
          setAppBadges(map);
        }
      }

      if (bridge?.getActiveNotifications) {
        const rawNotifs = bridge.getActiveNotifications();
        if (rawNotifs && typeof rawNotifs === 'string' && rawNotifs.startsWith('[')) {
          const list: NotificationItem[] = JSON.parse(rawNotifs);
          setNotifications(list);
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
    window.addEventListener('android-notification-badges-updated', handleNotifChanged);

    const interval = setInterval(() => {
      syncNotificationBadges();
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('nodus-notifications-changed', handleNotifChanged);
      window.removeEventListener('android-notification-badges-updated', handleNotifChanged);
    };
  }, [syncNotificationBadges]);

  const totalUnreadNotifications = useMemo(() => {
    const badgeTotal = Object.values(appBadges).reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);
    const notifTotal = notifications.filter(n => !n.read).length;
    return Math.max(badgeTotal, notifTotal);
  }, [appBadges, notifications]);

  // Ambient & Media Player State
  const DEFAULT_PLAYLIST = useMemo(() => [
    { id: '1', title: 'Solar Echoes', artist: 'Nodus Ambient', coverColor: '#007AFF' },
    { id: '2', title: 'Cyber Pulse', artist: 'Synth Horizon', coverColor: '#34C759' },
    { id: '3', title: 'Midnight Velocity', artist: 'HyperOS Flow', coverColor: '#AF52DE' },
  ], []);
  const [tracks] = useState(DEFAULT_PLAYLIST);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  const currentTrack = tracks[currentTrackIndex] || DEFAULT_PLAYLIST[0];
  const toggleMusic = useCallback(() => setIsPlayingMusic((prev) => !prev), []);
  const nextTrack = useCallback(() => setCurrentTrackIndex((prev) => (prev + 1) % tracks.length), [tracks.length]);

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

  // Listen for hardware back button & launcher resume from native Android shell
  useEffect(() => {
    const handleNativeBack = () => {
      if (activeAppId) {
        minimizeActiveApp();
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

    const handleLauncherResumed = () => {
      setActiveAppId(null);
    };

    window.addEventListener('hardware-back-pressed', handleNativeBack);
    window.addEventListener('nodus-back-press', handleNativeBack);
    window.addEventListener('nodus_launcher_resumed', handleLauncherResumed);
    return () => {
      window.removeEventListener('hardware-back-pressed', handleNativeBack);
      window.removeEventListener('nodus-back-press', handleNativeBack);
      window.removeEventListener('nodus_launcher_resumed', handleLauncherResumed);
    };
  }, [activeAppId, isSearchOpen, isQuickSettingsOpen, activeFolderId]);

  // Real-time Nodus Fleet Mesh Synchronization
  const syncFleetState = useCallback(() => {
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.queryFleetDevices) {
        const raw = bridge.queryFleetDevices();
        if (raw && typeof raw === 'string' && raw.startsWith('[')) {
          const fleetList: DeviceInfo[] = JSON.parse(raw);
          if (Array.isArray(fleetList) && fleetList.length > 0) {
            setDevices(fleetList);
            localStorage.setItem('nova_launcher_devices', JSON.stringify(fleetList));
          }
        }
      }
    } catch (e) {
      console.warn('[Nodus] Failed to query fleet devices:', e);
    }
  }, []);

  useEffect(() => {
    syncFleetState();
    window.addEventListener('fleet-state-changed', syncFleetState);
    window.addEventListener('fleet-device-connected', syncFleetState);
    window.addEventListener('fleet-device-disconnected', syncFleetState);
    return () => {
      window.removeEventListener('fleet-state-changed', syncFleetState);
      window.removeEventListener('fleet-device-connected', syncFleetState);
      window.removeEventListener('fleet-device-disconnected', syncFleetState);
    };
  }, [syncFleetState]);

  // Dynamic Hardware Node Health & Connection Polling
  const lastRemoteClipRef = React.useRef<string>('');

  useEffect(() => {
    const checkNodes = async () => {
      for (const dev of devices) {
        if (dev.id === 'tab-pc' || dev.ipAddress || dev.isCustom) continue;
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
                    battery: tel.battery ?? d.battery,
                    cpuLoad: typeof tel.cpuLoad === 'number' ? Number(tel.cpuLoad.toFixed(2)) : (typeof d.cpuLoad === 'number' ? Number(d.cpuLoad.toFixed(2)) : d.cpuLoad),
                    ramUsage: tel.ramUsage ?? d.ramUsage,
                  };
                }
                return { ...d, status: isConnected ? 'online' : 'offline' };
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

      // Check remote Windows PC clipboard updates
      for (const dev of devices) {
        if (dev.ipAddress && (dev.type === 'desktop' || dev.type === 'laptop' || dev.id === 'this-pc' || dev.id === 'tab-pc')) {
          try {
            const clipRes = await universalNetworkFetch(`http://${dev.ipAddress}/api/clipboard`, {
              method: 'GET',
              timeoutMs: 2000,
            });
            if (clipRes.ok && clipRes.data) {
              const isImage = clipRes.data.type === 'image' && typeof clipRes.data.imageData === 'string';
              const text = (clipRes.data.text || '').trim();
              const clipKey = isImage ? clipRes.data.imageData.substring(0, 80) : text;

              if (clipKey && clipKey !== lastRemoteClipRef.current) {
                lastRemoteClipRef.current = clipKey;

                let inferredType: 'text' | 'link' | 'code' | 'snippet' | 'image' = isImage ? 'image' : 'text';
                if (!isImage) {
                  if (text.startsWith('http://') || text.startsWith('https://')) {
                    inferredType = 'link';
                  } else if (text.includes(';') || text.includes('&&') || text.startsWith('adb') || text.startsWith('curl') || text.startsWith('git')) {
                    inferredType = 'code';
                  } else if (text.length > 80) {
                    inferredType = 'snippet';
                  }
                }

                const devColor = getDeviceColor(dev.id, dev.type, dev.os);

                const newItem: ClipboardItem = {
                  id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  text: isImage ? 'Image' : text,
                  deviceId: dev.id,
                  deviceName: dev.name,
                  deviceType: dev.type,
                  deviceColor: devColor,
                  type: inferredType,
                  imageData: isImage ? clipRes.data.imageData : undefined,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  pinned: false,
                };
                setClipboardItems((prev) => [newItem, ...prev].slice(0, 100));
              }
            }
          } catch (_) {}
        }
      }
    };

    checkNodes();
    const timer = setInterval(checkNodes, 1500);
    return () => clearInterval(timer);
  }, [activeDeviceId, devices]);

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
    if (settings.soundEffects) audio.playAppOpen();
    const targetDev = devices.find((d) => d.id === executable.deviceId) || devices.find((d) => d.type === 'desktop' || d.type === 'laptop' || d.os?.toLowerCase().includes('windows')) || activeDevice;
    
    updateRemoteExecutable(executable.id, { lastExecuted: 'Just now' });

    addNotification({
      appId: 'terminal',
      appName: 'Remote Execution',
      title: `Triggered: ${executable.name}`,
      message: `Sent ${executable.execType} (${executable.commandOrPackage}) to ${targetDev.name}`,
      iconName: executable.iconName,
      color: executable.iconColor,
    });

    const rawIp = targetDev.ipAddress || activeDevice.ipAddress;
    if (rawIp && targetDev.id !== 'poco-pad') {
      const cleanHost = rawIp.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
      const host = cleanHost.includes(':') ? cleanHost : `${cleanHost}:9120`;

      showToast(`Launching ${executable.name} on ${targetDev.name}...`);
      try {
        const payload = {
          command_or_path: executable.commandOrPackage,
          command: executable.commandOrPackage,
          args: executable.args || undefined,
          working_dir: executable.workingDir || undefined,
          run_as_admin: executable.runAsAdmin || false,
        };

        const res = await universalNetworkFetch(`http://${host}/api/exec`, {
          method: 'POST',
          body: payload,
          timeoutMs: 4500,
        });

        if (res.ok) {
          showToast(`✓ ${executable.name} launched on ${targetDev.name}`);
          return {
            success: true,
            message: `Executed "${executable.commandOrPackage}" on ${targetDev.name} (RPC OK)`,
          };
        } else {
          showToast(`Launch failed: ${res.error || `HTTP ${res.status}`}`);
          return {
            success: false,
            message: `Failed to execute on ${targetDev.name}: HTTP ${res.status}`,
          };
        }
      } catch (err: any) {
        showToast(`Could not reach ${targetDev.name}`);
        return {
          success: false,
          message: `Network error connecting to ${targetDev.name}: ${err?.message || 'timeout'}`,
        };
      }
    }

    // Local tablet execution fallback if target is local Android package
    if (executable.deviceId === 'poco-pad' || targetDev.id === 'poco-pad') {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.launchApp && executable.commandOrPackage) {
        bridge.launchApp(executable.commandOrPackage);
        showToast(`Launched ${executable.name}`);
        return { success: true, message: `Launched ${executable.name} locally` };
      }
    }

    showToast(`Dispatched ${executable.name}`);
    return {
      success: true,
      message: `Dispatched "${executable.commandOrPackage}" (Local Simulation)`,
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
    try {
      localStorage.setItem('nova_launcher_active_device', id);
    } catch (_) {}
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
    };
    setDevices((prev) => {
      const filtered = prev.filter((d) => d.ipAddress !== newDevice.ipAddress);
      return [...filtered, newDevice];
    });

    addNotification({
      appId: 'settings',
      appName: 'Fleet Manager',
      title: `Node Linked: ${newDevice.name}`,
      message: `${newDevice.name} (${newDevice.ipAddress}) connected to mesh.`,
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

  const fetchDeviceProcesses = useCallback(async (deviceId: string) => {
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (deviceId === 'poco-pad' && bridge?.getRunningProcesses) {
        const raw = bridge.getRunningProcesses();
        if (raw && typeof raw === 'string' && raw.startsWith('[')) {
          const list: DeviceProcess[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            setDeviceProcesses((prev) => ({
              ...prev,
              [deviceId]: list,
            }));
          }
        }
        return;
      }

      // Live Windows Companion Process Inspection
      const targetDev = devices.find((d) => d.id === deviceId);
      if (targetDev && targetDev.ipAddress) {
        const res = await universalNetworkFetch(`http://${targetDev.ipAddress}/api/processes`);
        if (res.ok && res.data && Array.isArray(res.data.processes)) {
          const mapped: DeviceProcess[] = res.data.processes.map((p: any) => ({
            pid: p.pid,
            name: p.name,
            user: p.user || 'User',
            cpu: typeof p.cpu === 'number' ? p.cpu : 0.0,
            memoryMb: Math.round((p.memory_kb || 0) / 1024),
            status: 'running',
            category: (p.category as any) || 'user',
            description: p.name,
          }));
          setDeviceProcesses((prev) => ({
            ...prev,
            [deviceId]: mapped,
          }));
        }
      }
    } catch (err) {
      console.warn('[Nodus] Failed to fetch device processes:', err);
    }
  }, [devices]);

  // Power-efficient periodic telemetry poller for connected nodes (every 5 seconds)
  useEffect(() => {
    const pollRemoteStats = async () => {
      for (const dev of devices) {
        if (dev.id !== 'poco-pad' && dev.ipAddress) {
          try {
            const res = await universalNetworkFetch(`http://${dev.ipAddress}/api/status`, { timeoutMs: 2500 });
            if (res.ok && res.data) {
              const data = res.data;
              setDevices((prev) =>
                prev.map((d) =>
                  d.id === dev.id
                    ? {
                        ...d,
                        status: 'connected',
                        cpuLoad: typeof data.cpuLoad === 'number' ? data.cpuLoad : d.cpuLoad,
                        ramUsage: data.ramUsage || d.ramUsage,
                        storage: data.storage || d.storage,
                      }
                    : d
                )
              );
            }
          } catch (_) {}
        }
      }
    };

    pollRemoteStats();
    const interval = setInterval(pollRemoteStats, 5000);
    return () => clearInterval(interval);
  }, [devices.length]);

  // Continuous auto-refresh when process modal is open (every 4 seconds for low battery draw)
  useEffect(() => {
    if (!processModalDeviceId) return;
    fetchDeviceProcesses(processModalDeviceId);
    const interval = setInterval(() => {
      fetchDeviceProcesses(processModalDeviceId);
    }, 4000);
    return () => clearInterval(interval);
  }, [processModalDeviceId, fetchDeviceProcesses]);

  const updateDeviceAvatar = (id: string, avatarUrl: string) => {
    audio.playTap();
    updateDevice(id, { customAvatar: avatarUrl });
    showToast('Device portrait updated');
  };

  const openProcessManager = (deviceId: string) => {
    audio.playTap();
    setProcessModalDeviceId((prev) => {
      const next = prev === deviceId ? null : deviceId;
      if (next) fetchDeviceProcesses(next);
      return next;
    });
  };

  const closeProcessManager = () => {
    audio.playTap();
    setProcessModalDeviceId(null);
  };

  const killProcess = async (deviceId: string, pid: number) => {
    audio.playTap();
    const targetDev = devices.find((d) => d.id === deviceId);
    const targetProcs = deviceProcesses[deviceId] || [];
    const procToKill = targetProcs.find((p) => p.pid === pid);

    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (deviceId === 'poco-pad' && bridge?.killLocalProcess) {
      bridge.killLocalProcess(pid, procToKill?.description);
    } else if (targetDev && targetDev.ipAddress) {
      universalNetworkFetch(`http://${targetDev.ipAddress}/api/process/kill`, {
        method: 'POST',
        body: { pid },
      }).catch((e) => {
        console.warn('[Nodus] Failed to kill remote process:', e);
      });
    }

    setDeviceProcesses((prev) => {
      const procs = prev[deviceId] || [];
      return {
        ...prev,
        [deviceId]: procs.filter((p) => p.pid !== pid),
      };
    });

    if (procToKill && targetDev) {
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

    setTimeout(() => fetchDeviceProcesses(deviceId), 500);
  };

  const killAllUserProcesses = (deviceId: string) => {
    audio.playTap();
    const targetDev = devices.find((d) => d.id === deviceId);
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (deviceId === 'poco-pad' && bridge?.killAllUserProcesses) {
      bridge.killAllUserProcesses();
    }

    setDeviceProcesses((prev) => {
      const procs = prev[deviceId] || [];
      const filtered = procs.filter((p) => p.category === 'system');
      return { ...prev, [deviceId]: filtered };
    });

    if (targetDev) {
      showToast(`Terminated all user processes on ${targetDev.name}`);
    }

    setTimeout(() => fetchDeviceProcesses(deviceId), 600);
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

  const lockDevice = (deviceId?: string) => {
    audio.playTap();
    const targetDev = devices.find((d) => d.id === deviceId) || activeDevice;
    if (targetDev && targetDev.id !== 'poco-pad' && targetDev.ipAddress) {
      fetch(`http://${targetDev.ipAddress}/api/lock`, { method: 'POST' }).catch(() => {});
      showToast(`Locked ${targetDev.name}`);
      return;
    }
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge?.lockScreen) {
      bridge.lockScreen();
    }
    showToast('Screen locked');
  };

  // Universal Cross-Device Clipboard functions
  const addClipboardItem = (item: { text: string; deviceId?: string; type?: 'text' | 'link' | 'code' | 'snippet' | 'image'; imageData?: string }) => {
    if (!item.text.trim() && !item.imageData) return;
    const devId = item.deviceId || activeDeviceId;
    const targetDev = devices.find((d) => d.id === devId) || activeDevice;
    const devColor = getDeviceColor(targetDev.id, targetDev.type, targetDev.os);

    let inferredType: 'text' | 'link' | 'code' | 'snippet' | 'image' = item.type || (item.imageData ? 'image' : 'text');
    if (!item.type && !item.imageData) {
      if (item.text.startsWith('http://') || item.text.startsWith('https://')) {
        inferredType = 'link';
      } else if (item.text.includes(';') || item.text.includes('&&') || item.text.startsWith('adb') || item.text.startsWith('curl') || item.text.startsWith('git')) {
        inferredType = 'code';
      } else if (item.text.length > 80) {
        inferredType = 'snippet';
      }
    }

    const newItem: ClipboardItem = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: item.text.trim() || (item.imageData ? 'Image' : ''),
      deviceId: devId,
      deviceName: targetDev.name,
      deviceType: targetDev.type,
      deviceColor: devColor,
      type: inferredType,
      imageData: item.imageData,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pinned: false,
    };

    // Mark as latest seen clip so the PC polling loop doesn't ingest it back as a duplicate green PC entry
    lastRemoteClipRef.current = newItem.imageData ? newItem.imageData.substring(0, 80) : newItem.text;

    // Create a brand new distinct clipboard entry at the top, keeping prior historical entries intact
    setClipboardItems((prev) => [newItem, ...prev].slice(0, 100));

    // 1. If running on Android tablet native shell, also copy to Android OS primary clipboard
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge) {
        if (newItem.type === 'image' && newItem.imageData && typeof bridge.copyImageToClipboard === 'function') {
          bridge.copyImageToClipboard(newItem.imageData);
        } else if (newItem.text && typeof bridge.copyToClipboard === 'function') {
          bridge.copyToClipboard(newItem.text);
        }
      }
    } catch (_) {}

    // 2. Broadcast clipboard text or image to connected Windows PC companion nodes
    for (const dev of devices) {
      if (dev.ipAddress && (dev.type === 'desktop' || dev.type === 'laptop' || dev.id === 'this-pc' || dev.id === 'tab-pc')) {
        universalNetworkFetch(`http://${dev.ipAddress}/api/clipboard`, {
          method: 'POST',
          body: { 
            text: newItem.text,
            image_data: newItem.imageData,
          },
          timeoutMs: 2500,
        }).catch(() => {});
      }
    }

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

    // 1. Intercept Remote Workstation Shortcuts (do NOT open local window modal)
    if (appId.startsWith('remote_')) {
      const rawId = appId.replace(/^remote_/, '');
      const exec = (settings.remoteExecutables || []).find(
        (e) => e.id === rawId || e.id === appId || `remote_${e.id}` === appId
      );
      if (exec) {
        executeRemoteApp(exec);
        return;
      }
    }

    const targetApp = apps.find((a) => a.id === appId);

    if (targetApp?.isRemote && targetApp.remoteExecutableId) {
      const exec = (settings.remoteExecutables || []).find((e) => e.id === targetApp.remoteExecutableId);
      if (exec) {
        executeRemoteApp(exec);
        return;
      }
    }

    // Track active foreground app ONLY for local applications
    setActiveAppId(appId);
    setSearchOpen(false);

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

    const shouldFloat = forceMode === 'floating' || (!forceMode && (isFloatingModeArmed || settings.appLaunchMode === 'floating' || floatingApps.includes(appId)));

    if (shouldFloat) {
      setFloatingApps((prev) => (prev.includes(appId) ? prev : [...prev, appId]));
    } else if (forceMode === 'fullscreen') {
      setFloatingApps((prev) => prev.filter((id) => id !== appId));
    }

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
  };

  const closeActiveApp = () => {
    if (settings.soundEffects) audio.playTap();
    minimizeActiveApp();
  };

  const minimizeActiveApp = (appId?: string) => {
    if (settings.soundEffects) audio.playTap();
    const idToMinimize = appId || activeAppId;
    const targetApp = idToMinimize ? apps.find((a) => a.id === idToMinimize) : null;
    setActiveAppId(null);

    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge) {
      if (targetApp?.packageName && bridge.minimizeApp) {
        bridge.minimizeApp(targetApp.packageName);
      } else if (bridge.minimizeActiveWindow) {
        bridge.minimizeActiveWindow();
      } else if (bridge.bringLauncherToFront) {
        bridge.bringLauncherToFront();
      }
    }
  };

  const toggleAppTask = (appId: string) => {
    if (settings.soundEffects) audio.playTap();

    // 1. If this app is ALREADY active in foreground -> Minimize it
    if (activeAppId === appId) {
      minimizeActiveApp(appId);
      return;
    }

    // 2. Otherwise -> Restore / launch
    // If floating mode is armed or app was previously launched floating, restore as floating
    const shouldFloat = isFloatingModeArmed || settings.appLaunchMode === 'floating' || floatingApps.includes(appId);
    if (shouldFloat) {
      launchApp(appId, 'floating');
    } else {
      launchApp(appId);
    }
  };

  const killApp = (appId: string) => {
    if (settings.soundEffects) audio.playTap();
    setRunningApps((prev) => prev.filter((id) => id !== appId));
    setFloatingApps((prev) => prev.filter((id) => id !== appId));
    if (activeAppId === appId) {
      minimizeActiveApp();
    }
  };

  const clearAllRunningApps = () => {
    setRunningApps([]);
    setFloatingApps([]);
    minimizeActiveApp();
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
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.dismissNotification) {
        bridge.dismissNotification(id);
      }
    } catch (_) {}
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.clearAllNotifications) {
        bridge.clearAllNotifications();
      }
    } catch (_) {}
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
        isNotificationListenerEnabled,
        requestNotificationListenerPermission,
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
        fetchDeviceProcesses,
        killProcess,
        killAllUserProcesses,
        rebootDevice,
        lockDevice,
        clipboardItems,
        addClipboardItem,
        removeClipboardItem,
        togglePinClipboardItem,
        clearClipboardHistory,
        clearFleetClipboard,
        isClipboardOpen,
        setClipboardOpen,
        toggleClipboardPanel,
        isTaskbarOpen,
        setTaskbarOpen,
        toggleTaskbar,
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
        currentTrack,
        isPlayingMusic,
        toggleMusic,
        nextTrack,
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
