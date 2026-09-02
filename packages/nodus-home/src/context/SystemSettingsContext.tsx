import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  LauncherSettings,
  IconPackInfo,
  NotificationItem,
  NetworkServerConfig,
  WindowsBridgeConfig,
  AndroidBridgeConfig,
  ClipboardSyncConfig,
  RemoteExecutable,
  TrustedDevice,
} from '../types/launcher';
import {
  INITIAL_NOTIFICATIONS,
  INITIAL_SERVER_CONFIG,
  INITIAL_WINDOWS_BRIDGE,
  INITIAL_ANDROID_BRIDGE,
  INITIAL_CLIPBOARD_SYNC_CONFIG,
  INITIAL_REMOTE_EXECUTABLES,
  INITIAL_TRUSTED_DEVICES,
} from '../utils/constants';
import { audio } from '../utils/audio';

export interface QuickSettingsState {
  wifi: boolean;
  bluetooth: boolean;
  flashlight: boolean;
  dnd: boolean;
  airplane: boolean;
  autoRotate: boolean;
  brightness: number; // 0 to 100
  volume: number; // 0 to 100
}

const DEFAULT_SETTINGS: LauncherSettings = {
  deviceFrame: false,
  theme: 'material-light',
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
  atAGlanceWidget: false,
  clockWidgetStyle: 'digital-bold',
  enableClockWidget: true,
  enableDeviceNameWidget: false,
  enableBatteryWidget: true,
  enableNotesWidget: false,
  minimalistMode: false,
  leftPanelOpacity: 30,
  taskbarOpacity: 30,
  clipboardPanelOpacity: 30,
  folderOpacity: 30,
  taskbarIconScale: 'medium',
  appLaunchMode: 'floating',
  enableMultiDevice: false,
  enableClipboardPanel: false,
  taskbarMode: 'auto',
  networkServer: INITIAL_SERVER_CONFIG,
  windowsBridge: INITIAL_WINDOWS_BRIDGE,
  androidBridge: INITIAL_ANDROID_BRIDGE,
  clipboardSync: INITIAL_CLIPBOARD_SYNC_CONFIG,
  trustedDevices: INITIAL_TRUSTED_DEVICES,
  remoteExecutables: INITIAL_REMOTE_EXECUTABLES,
  showRemoteAppsInMainDrawer: false,
  showOnlyLocalInDrawer: true,
  enableExperimentalPwaWindows: false,
  preferPwaAlternatives: false,
  enableExperimentalShizukuFreeform: false,
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

export interface SystemSettingsContextType {
  settings: LauncherSettings;
  updateSettings: (partial: Partial<LauncherSettings>) => void;
  updateNetworkServerConfig: (partial: Partial<NetworkServerConfig>) => void;
  updateWindowsBridgeConfig: (partial: Partial<WindowsBridgeConfig>) => void;
  updateAndroidBridgeConfig: (partial: Partial<AndroidBridgeConfig>) => void;
  updateClipboardSyncConfig: (partial: Partial<ClipboardSyncConfig>) => void;

  // Taskbar & Shades
  isTaskbarOpen: boolean;
  setTaskbarOpen: (val: boolean) => void;
  toggleTaskbar: () => void;
  isQuickSettingsOpen: boolean;
  setQuickSettingsOpen: (val: boolean) => void;
  toggleQuickSettings: () => void;
  quickSettings: QuickSettingsState;
  setQuickSettings: React.Dispatch<React.SetStateAction<QuickSettingsState>>;
  toggleQuickSetting: (key: keyof QuickSettingsState) => void;
  openQuickSettings: () => void;

  // Toast & Modals
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
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    isDestructive?: boolean
  ) => void;
  closeConfirm: () => void;

  // Icon Packs
  installedIconPacks: IconPackInfo[];
  applyIconPack: (packageName: string | null) => void;

  // Notifications
  notifications: NotificationItem[];
  appBadges: Record<string, number>;
  totalUnreadNotifications: number;
  isNotificationListenerEnabled: boolean;
  requestNotificationListenerPermission: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markNotificationRead: (id: string) => void;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'time' | 'read'>) => void;

  // Media
  currentTrack: { id: string; title: string; artist: string; coverColor: string };
  isPlayingMusic: boolean;
  toggleMusic: () => void;
  nextTrack: () => void;
}

export const SystemSettingsContext = createContext<SystemSettingsContextType | null>(null);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<LauncherSettings>(() => {
    if (typeof window !== 'undefined') {
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
    }
    return DEFAULT_SETTINGS;
  });

  const [isTaskbarOpen, setTaskbarOpen] = useState<boolean>(false);
  const toggleTaskbar = useCallback(() => setTaskbarOpen((prev) => !prev), []);

  const [isQuickSettingsOpen, setQuickSettingsOpen] = useState<boolean>(false);
  const [quickSettings, setQuickSettings] = useState<QuickSettingsState>(DEFAULT_QUICK_SETTINGS);

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

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [appBadges, setAppBadges] = useState<Record<string, number>>({});
  const [isNotificationListenerEnabled, setIsNotificationListenerEnabled] = useState<boolean>(false);

  // Sync settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_v3_settings', JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

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

  const showToast = useCallback((message: string, duration = 3000) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, duration);
  }, []);

  const showConfirm = useCallback((
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
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const updateSettings = useCallback((partial: Partial<LauncherSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateNetworkServerConfig = useCallback((partial: Partial<NetworkServerConfig>) => {
    setSettings((prev) => ({
      ...prev,
      networkServer: { ...prev.networkServer, ...partial },
    }));
  }, []);

  const updateWindowsBridgeConfig = useCallback((partial: Partial<WindowsBridgeConfig>) => {
    setSettings((prev) => ({
      ...prev,
      windowsBridge: { ...prev.windowsBridge, ...partial },
    }));
  }, []);

  const updateAndroidBridgeConfig = useCallback((partial: Partial<AndroidBridgeConfig>) => {
    setSettings((prev) => ({
      ...prev,
      androidBridge: { ...prev.androidBridge, ...partial },
    }));
  }, []);

  const updateClipboardSyncConfig = useCallback((partial: Partial<ClipboardSyncConfig>) => {
    setSettings((prev) => ({
      ...prev,
      clipboardSync: { ...prev.clipboardSync, ...partial },
    }));
  }, []);

  const toggleQuickSetting = useCallback((key: keyof QuickSettingsState) => {
    if (settings.soundEffects) audio.playTap();
    setQuickSettings((prev) => {
      if (typeof prev[key] === 'boolean') {
        return { ...prev, [key]: !prev[key] };
      }
      return prev;
    });
  }, [settings.soundEffects]);

  const toggleQuickSettings = useCallback(() => {
    if (settings.soundEffects) audio.playTap();
    setQuickSettingsOpen((prev) => !prev);
  }, [settings.soundEffects]);

  const openQuickSettings = useCallback(() => {
    if (settings.soundEffects) audio.playTap();
    setQuickSettingsOpen(true);
  }, [settings.soundEffects]);

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
      syncNotificationBadges(e?.detail);
    };

    window.addEventListener('nodus-notifications-changed', handleNotifChanged);
    window.addEventListener('android-notification-badges-updated', handleNotifChanged);

    const interval = setInterval(syncNotificationBadges, 2500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('nodus-notifications-changed', handleNotifChanged);
      window.removeEventListener('android-notification-badges-updated', handleNotifChanged);
    };
  }, [syncNotificationBadges]);

  const totalUnreadNotifications = useMemo(() => {
    const badgeTotal = Object.values(appBadges).reduce((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);
    const notifTotal = notifications.filter((n) => !n.read).length;
    return Math.max(badgeTotal, notifTotal);
  }, [appBadges, notifications]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.dismissNotification) {
        bridge.dismissNotification(id);
      }
    } catch (_) {}
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.clearAllNotifications) {
        bridge.clearAllNotifications();
      }
    } catch (_) {}
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const addNotification = useCallback((notif: Omit<NotificationItem, 'id' | 'time' | 'read'>) => {
    if (settings.soundEffects) {
      audio.playNotification();
    }
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}`,
      time: 'Just now',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, [settings.soundEffects]);

  const applyIconPack = useCallback((packageName: string | null) => {
    updateSettings({ selectedIconPackPackage: packageName || undefined });
    showToast(packageName ? `Applied ${packageName}` : 'Restored default icons');
  }, [updateSettings, showToast]);

  // Ambient Media Playlist
  const DEFAULT_PLAYLIST = useMemo(
    () => [
      { id: '1', title: 'Solar Echoes', artist: 'Nodus Ambient', coverColor: '#007AFF' },
      { id: '2', title: 'Cyber Pulse', artist: 'Synth Horizon', coverColor: '#34C759' },
      { id: '3', title: 'Midnight Velocity', artist: 'HyperOS Flow', coverColor: '#AF52DE' },
    ],
    []
  );
  const [tracks] = useState(DEFAULT_PLAYLIST);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  const currentTrack = tracks[currentTrackIndex] || DEFAULT_PLAYLIST[0];
  const toggleMusic = useCallback(() => setIsPlayingMusic((prev) => !prev), []);
  const nextTrack = useCallback(() => setCurrentTrackIndex((prev) => (prev + 1) % tracks.length), [tracks.length]);

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateNetworkServerConfig,
        updateWindowsBridgeConfig,
        updateAndroidBridgeConfig,
        updateClipboardSyncConfig,
        isTaskbarOpen,
        setTaskbarOpen,
        toggleTaskbar,
        isQuickSettingsOpen,
        setQuickSettingsOpen,
        toggleQuickSettings,
        quickSettings,
        setQuickSettings,
        toggleQuickSetting,
        openQuickSettings,
        toastMessage,
        showToast,
        confirmDialog,
        showConfirm,
        closeConfirm,
        installedIconPacks,
        applyIconPack,
        notifications,
        appBadges,
        totalUnreadNotifications,
        isNotificationListenerEnabled,
        requestNotificationListenerPermission,
        dismissNotification,
        clearAllNotifications,
        markNotificationRead,
        addNotification,
        currentTrack,
        isPlayingMusic,
        toggleMusic,
        nextTrack,
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
};
