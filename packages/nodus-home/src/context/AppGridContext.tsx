import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppItem,
  FolderItem,
  FloatingWindow,
} from '../types/launcher';
import {
  INITIAL_APPS,
  DOCK_APP_IDS,
  PWA_APP_REGISTRY,
} from '../utils/constants';
import { audio } from '../utils/audio';
import { simulateBridgeRpc } from '../utils/bridgeProtocol';
import { useSystemSettings } from './SystemSettingsContext';
import { useFleet } from './FleetContext';

export interface AppGridContextType {
  apps: AppItem[];
  folders: FolderItem[];
  dockAppIds: string[];
  currentPageIndex: number;
  totalPages: number;
  setCurrentPageIndex: (page: number) => void;

  // Multi-Window Floating Canvas State & Actions
  floatingWindows: FloatingWindow[];
  focusedWindowId: string | null;
  openFloatingWindow: (appId: string, customProps?: Partial<FloatingWindow>) => void;
  closeFloatingWindow: (windowId: string) => void;
  minimizeFloatingWindow: (windowId: string) => void;
  maximizeFloatingWindow: (windowId: string) => void;
  focusFloatingWindow: (windowId: string) => void;
  updateFloatingWindowBounds: (windowId: string, bounds: Partial<FloatingWindow>) => void;

  // App Lifecycle & Launching
  launchApp: (appId: string, forceMode?: 'fullscreen' | 'floating') => void;
  launchAppFloating: (appId: string) => void;
  isFloatingModeArmed: boolean;
  setIsFloatingModeArmed: (val: boolean) => void;
  toggleFloatingMode: () => void;
  appContextMenu: { isOpen: boolean; appId: string; x: number; y: number } | null;
  openAppContextMenu: (appId: string, x: number, y: number) => void;
  closeAppContextMenu: () => void;
  closeActiveApp: () => void;
  minimizeActiveApp: (appId?: string) => void;
  toggleAppTask: (appId: string) => void;
  activeAppId: string | null;
  foregroundAppId: string | null;
  minimizedAppIds: string[];
  runningApps: string[];
  recentApps: string[];
  killApp: (appId: string) => void;
  clearAllRunningApps: () => void;

  // Grid Customization & Folders
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  uninstallApp: (appId: string) => void;
  createFolder: (name: string, appIdsOrPageIndex?: string[] | number, maybePageIndex?: number) => void;
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
  folderCombineArmedId: string | null;
  setFolderCombineArmedId: (id: string | null) => void;

  // Search & Drawer Categories
  isSearchOpen: boolean;
  setSearchOpen: (val: boolean) => void;
  drawerTabs: string[];
  customTabAppMap: Record<string, string[]>;
  addDrawerTab: (name: string, initialAppIds?: string[]) => void;
  removeDrawerTab: (name: string) => void;
  renameDrawerTab: (oldName: string, newName: string) => void;
  assignAppsToTab: (tabName: string, appIds: string[]) => void;
  setAppCategory: (appId: string, category: string) => void;
}

export const AppGridContext = createContext<AppGridContextType | null>(null);

export const AppGridProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings, showToast, showConfirm, addNotification } = useSystemSettings();
  const { activeDeviceId, activeDevice, executeRemoteApp } = useFleet();

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

      const saved = localStorage.getItem('nodus_home_v5_apps') || localStorage.getItem('nova_launcher_v4_apps');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const OBSOLETE_APP_IDS = new Set(['studio', 'terminal', 'monitor', 'files', 'network', 'clipboard']);
            const cleaned = parsed
              .filter((a: any) => !OBSOLETE_APP_IDS.has(a.id))
              .map((a: any) => {
                const { badgeCount: _unused, ...rest } = a;
                return rest;
              });
            const existingIds = new Set(cleaned.map((a: any) => a.id));
            const missing = INITIAL_APPS.filter((a) => !existingIds.has(a.id));
            if (missing.length > 0) {
              return [...cleaned, ...missing];
            }
            return cleaned;
          }
        } catch (e) {}
      }
    }
    return INITIAL_APPS;
  });

  const [folders, setFolders] = useState<FolderItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_launcher_folders');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [dockAppIds] = useState<string[]>(DOCK_APP_IDS);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [foregroundAppId, setForegroundAppId] = useState<string | null>(null);
  const [minimizedAppIds, setMinimizedAppIds] = useState<string[]>([]);
  const [isFloatingModeArmed, setIsFloatingModeArmed] = useState<boolean>(() => settings.appLaunchMode === 'floating');

  useEffect(() => {
    setIsFloatingModeArmed(settings.appLaunchMode === 'floating');
  }, [settings.appLaunchMode]);
  const [appContextMenu, setAppContextMenu] = useState<{ isOpen: boolean; appId: string; x: number; y: number } | null>(null);

  const [runningApps, setRunningApps] = useState<string[]>([]);
  const [floatingApps, setFloatingApps] = useState<string[]>([]);
  const [recentApps, setRecentApps] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_launcher_recents');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && !parsed.includes('browser')) return parsed;
        } catch (e) {}
      }
    }
    return ['settings', 'studio', 'terminal', 'monitor', 'network', 'clipboard'];
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoverTargetAppId, setHoverTargetAppId] = useState<string | null>(null);
  const [folderCombineArmedId, setFolderCombineArmedId] = useState<string | null>(null);
  const [isSearchOpen, setSearchOpen] = useState<boolean>(false);

  const SYSTEM_TAB_NAMES = ['all', 'recents', 'running', 'productivity', 'media', 'tools', 'social', 'games', 'system'];

  const [drawerTabs, setDrawerTabs] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nodus_drawer_tabs');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((t: string) => typeof t === 'string' && !SYSTEM_TAB_NAMES.includes(t.toLowerCase()));
          }
        } catch (_) {}
      }
    }
    return [];
  });

  const [customTabAppMap, setCustomTabAppMap] = useState<Record<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nodus_custom_tab_apps');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_) {}
      }
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_recents', JSON.stringify(recentApps));
    } catch (_) {}
  }, [recentApps]);

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_v4_apps', JSON.stringify(apps));
    } catch (_) {}
  }, [apps]);

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_folders', JSON.stringify(folders));
    } catch (_) {}
  }, [folders]);

  const syncNativeInstalledApps = useCallback(() => {
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.getInstalledApps) {
        const raw = bridge.getInstalledApps();
        if (raw && typeof raw === 'string' && raw.startsWith('[')) {
          const list: Array<{ packageName: string; label: string; icon?: string; isSystemApp?: boolean }> = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const builtInApps = INITIAL_APPS.filter((a) => !a.packageName);
            const palette = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6', '#64D2FF', '#FFCC00'];

            // Dynamic APPS_PER_PAGE capacity calculation based on grid columns & icon scale
            const cols = settings.gridColumns || 5;
            const APPS_PER_PAGE = Math.max(48, cols * 8); // 48 apps per page capacity for rich desktop tablet grids

            setApps((prevApps) => {
              const OBSOLETE_APP_IDS = new Set(['studio', 'terminal', 'monitor', 'files', 'network', 'clipboard']);
              const cleanedPrev = prevApps.filter((a) => !OBSOLETE_APP_IDS.has(a.id));
              const existingMap = new Map(cleanedPrev.map((a) => [a.id, a]));

              const mergedBuiltIns = builtInApps.map((b) => {
                const ex = existingMap.get(b.id);
                return ex ? { ...b, folderId: ex.folderId ?? null } : b;
              });

              const nativeApps: AppItem[] = list.map((item, idx) => {
                const appId = `pkg_${item.packageName}`;
                const existing = existingMap.get(appId);
                return {
                  id: appId,
                  name: item.label,
                  packageName: item.packageName,
                  customIcon: item.icon || undefined,
                  iconName: 'Smartphone',
                  color: palette[idx % palette.length],
                  category: item.isSystemApp ? 'system' : 'productivity',
                  isRemovable: !item.isSystemApp,
                  pageIndex: existing?.pageIndex ?? 0,
                  order: existing?.order ?? idx,
                  folderId: existing?.folderId ?? null,
                };
              });

              const allUnsorted = [...mergedBuiltIns, ...nativeApps];

              // Filter out items inside folders
              const unassignedApps = allUnsorted.filter((a) => !a.folderId);

              // Continuous Sequential Repacking: 1st page must be completely filled first
              let currentSlot = 0;
              const repacked = unassignedApps.map((app) => {
                const pageIndex = Math.floor(currentSlot / APPS_PER_PAGE);
                const order = currentSlot % APPS_PER_PAGE;
                currentSlot++;
                return { ...app, pageIndex, order };
              });

              const folderedApps = allUnsorted.filter((a) => a.folderId);
              const merged = [...repacked, ...folderedApps];
              localStorage.setItem('nodus_home_v5_apps', JSON.stringify(merged));
              return merged;
            });
          }
        }
      }
    } catch (err) {
      console.error('[Nodus] Failed to sync installed apps from native bridge:', err);
    }
  }, []);

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
  }, [syncNativeInstalledApps, showToast]);

  const toggleFloatingMode = useCallback(() => {
    if (settings.soundEffects) audio.playTap();
    const nextFloating = !isFloatingModeArmed;
    setIsFloatingModeArmed(nextFloating);
    updateSettings({ appLaunchMode: nextFloating ? 'floating' : 'fullscreen' });
    showToast(nextFloating ? 'Floating Window Mode: ON' : 'Floating Window Mode: OFF');
  }, [settings.soundEffects, isFloatingModeArmed, updateSettings, showToast]);

  const openAppContextMenu = useCallback((appId: string, x: number, y: number) => {
    if (settings.soundEffects) audio.playTap();
    setAppContextMenu({ isOpen: true, appId, x, y });
  }, [settings.soundEffects]);

  const closeAppContextMenu = useCallback(() => {
    setAppContextMenu(null);
  }, []);

  const minimizeActiveApp = useCallback((appId?: string) => {
    if (settings.soundEffects) audio.playTap();
    const idToMinimize = appId || foregroundAppId || activeAppId;
    const targetApp = idToMinimize ? apps.find((a) => a.id === idToMinimize) : null;
    if (idToMinimize) {
      setMinimizedAppIds((prev) => (prev.includes(idToMinimize) ? prev : [...prev, idToMinimize]));
      if (foregroundAppId === idToMinimize) setForegroundAppId(null);
      if (activeAppId === idToMinimize) setActiveAppId(null);
    }

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
  }, [activeAppId, foregroundAppId, apps, settings.soundEffects]);

  const closeActiveApp = useCallback(() => {
    if (settings.soundEffects) audio.playTap();
    minimizeActiveApp();
  }, [settings.soundEffects, minimizeActiveApp]);

  const [floatingWindows, setFloatingWindows] = useState<FloatingWindow[]>([]);
  const [focusedWindowId, setFocusedWindowId] = useState<string | null>(null);

  const focusFloatingWindow = useCallback((windowId: string) => {
    setFocusedWindowId(windowId);
    setFloatingWindows((prev) => {
      const maxZ = prev.reduce((max, w) => Math.max(max, w.zIndex), 30);
      return prev.map((w) => (w.id === windowId ? { ...w, zIndex: maxZ + 1, minimized: false } : w));
    });
  }, []);

  const openFloatingWindow = useCallback((appId: string, customProps?: Partial<FloatingWindow>) => {
    if (settings.soundEffects) audio.playAppOpen();
    const existing = floatingWindows.find((w) => w.appId === appId || (customProps?.id && w.id === customProps.id));
    if (existing) {
      focusFloatingWindow(existing.id);
      return;
    }

    const targetApp = apps.find((a) => a.id === appId);
    const pwaInfo = PWA_APP_REGISTRY[targetApp?.packageName || ''] || PWA_APP_REGISTRY[appId];
    const windowId = customProps?.id || `win_${appId}_${Date.now()}`;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const cascadeOffset = (floatingWindows.length % 5) * 28;
    const defaultWidth = Math.min(840, Math.floor(screenWidth * 0.72));
    const defaultHeight = Math.min(580, Math.floor(screenHeight * 0.75));
    const defaultX = Math.max(20, Math.floor((screenWidth - defaultWidth) / 2) + cascadeOffset);
    const defaultY = Math.max(20, Math.floor((screenHeight - defaultHeight) / 2) + cascadeOffset);

    const newWindow: FloatingWindow = {
      id: windowId,
      appId,
      title: customProps?.title || targetApp?.name || pwaInfo?.name || 'Application',
      iconName: customProps?.iconName || targetApp?.iconName || pwaInfo?.iconName || 'AppWindow',
      customIcon: customProps?.customIcon || targetApp?.customIcon,
      color: customProps?.color || targetApp?.color || pwaInfo?.color || '#38BDF8',
      webUrl: customProps?.webUrl || targetApp?.pwaDesktopUrl || targetApp?.webUrl || pwaInfo?.url,
      type: customProps?.type || (customProps?.webUrl || targetApp?.pwaDesktopUrl || targetApp?.webUrl || pwaInfo?.url ? 'web_pwa' : 'internal'),
      x: customProps?.x ?? defaultX,
      y: customProps?.y ?? defaultY,
      width: customProps?.width ?? defaultWidth,
      height: customProps?.height ?? defaultHeight,
      minimized: false,
      maximized: false,
      zIndex: 35 + floatingWindows.length,
      ...customProps,
    };

    setFloatingWindows((prev) => [...prev, newWindow]);
    setFocusedWindowId(windowId);
    setRunningApps((prev) => (prev.includes(appId) ? prev : [appId, ...prev]));
  }, [settings.soundEffects, floatingWindows, apps, focusFloatingWindow]);

  const closeFloatingWindow = useCallback((windowId: string) => {
    if (settings.soundEffects) audio.playTap();
    setFloatingWindows((prev) => {
      const closingWin = prev.find((w) => w.id === windowId);
      if (closingWin) {
        setRunningApps((r) => r.filter((id) => id !== closingWin.appId));
      }
      return prev.filter((w) => w.id !== windowId);
    });
    if (focusedWindowId === windowId) {
      setFocusedWindowId(null);
    }
  }, [settings.soundEffects, focusedWindowId]);

  const minimizeFloatingWindow = useCallback((windowId: string) => {
    if (settings.soundEffects) audio.playTap();
    setFloatingWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, minimized: true } : w)));
    if (focusedWindowId === windowId) {
      setFocusedWindowId(null);
    }
  }, [settings.soundEffects, focusedWindowId]);

  const maximizeFloatingWindow = useCallback((windowId: string) => {
    if (settings.soundEffects) audio.playTap();
    setFloatingWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, maximized: !w.maximized } : w)));
    focusFloatingWindow(windowId);
  }, [settings.soundEffects, focusFloatingWindow]);

  const updateFloatingWindowBounds = useCallback((windowId: string, bounds: Partial<FloatingWindow>) => {
    setFloatingWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, ...bounds } : w)));
  }, []);

  const launchApp = useCallback((appId: string, forceMode?: 'fullscreen' | 'floating') => {
    if (settings.soundEffects) audio.playAppOpen();

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

    setSearchOpen(false);

    const pwaInfo = PWA_APP_REGISTRY[targetApp?.packageName || ''] || PWA_APP_REGISTRY[appId];
    const hasPwaUrl = Boolean(targetApp?.pwaDesktopUrl || targetApp?.webUrl || pwaInfo?.url);

    // 1. Experimental PWA routing for rich desktop multitasking
    if (settings.enableExperimentalPwaWindows && settings.preferPwaAlternatives && hasPwaUrl) {
      openFloatingWindow(appId, {
        webUrl: targetApp?.pwaDesktopUrl || targetApp?.webUrl || pwaInfo?.url,
        title: targetApp?.name || pwaInfo?.name,
        iconName: targetApp?.iconName || pwaInfo?.iconName,
        color: targetApp?.color || pwaInfo?.color,
        type: 'web_pwa',
      });
      return;
    }

    if (!targetApp?.packageName) {
      if (settings.enableExperimentalPwaWindows) {
        openFloatingWindow(appId, {
          title: appId === 'settings' ? 'Settings & Hub' : 'Sticky Notes',
          iconName: appId === 'settings' ? 'Settings' : 'StickyNote',
          type: 'internal',
        });
        return;
      }
      setActiveAppId(appId);
    } else {
      setActiveAppId(null);
    }

    setForegroundAppId(appId);
    setMinimizedAppIds((prev) => prev.filter((id) => id !== appId));

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

    const shouldFloat = forceMode === 'floating' || (forceMode !== 'fullscreen' && (isFloatingModeArmed || settings.appLaunchMode === 'floating'));

    if (shouldFloat && targetApp?.packageName) {
      setFloatingApps((prev) => {
        const activeNativeFloating = prev.filter((id) => {
          const item = apps.find((a) => a.id === id);
          return item?.packageName && !minimizedAppIds.includes(id);
        });

        // Smart Stash: If device OS has 2-window floating limit (HyperOS/MIUI/etc), auto-stash oldest active app into Taskbar
        if (activeNativeFloating.length >= 2) {
          const oldestNativeId = activeNativeFloating[0];
          if (oldestNativeId && oldestNativeId !== appId) {
            const oldestApp = apps.find((a) => a.id === oldestNativeId);
            setMinimizedAppIds((mPrev) => (mPrev.includes(oldestNativeId) ? mPrev : [...mPrev, oldestNativeId]));
            showToast(`Auto-stashed ${oldestApp?.name || 'app'} to Taskbar`);
          }
        }

        return prev.includes(appId) ? prev : [...prev, appId];
      });
    } else if (shouldFloat) {
      setFloatingApps((prev) => (prev.includes(appId) ? prev : [...prev, appId]));
    } else {
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

      if (bridge?.launchApp) {
        const launched = bridge.launchApp(targetApp.packageName);
        if (launched) return;
      }

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
  }, [settings.soundEffects, settings.remoteExecutables, settings.appLaunchMode, apps, executeRemoteApp, isFloatingModeArmed, showToast, activeDeviceId, activeDevice.name, addNotification, minimizedAppIds]);

  const launchAppFloating = useCallback((appId: string) => {
    if (settings.soundEffects) audio.playAppOpen();
    const targetApp = apps.find((a) => a.id === appId);

    if (targetApp?.packageName) {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.launchAppFloating) {
        const launched = bridge.launchAppFloating(targetApp.packageName);
        if (launched) {
          showToast(`Opened ${targetApp.name} in floating window`);
          setRunningApps((prev) => (prev.includes(appId) ? prev : [appId, ...prev]));
          return;
        }
      }
    }
    launchApp(appId, 'floating');
  }, [settings.soundEffects, apps, showToast, launchApp]);

  const toggleAppTask = useCallback((appId: string) => {
    if (settings.soundEffects) audio.playTap();

    const targetApp = apps.find((a) => a.id === appId);
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    const existingWin = floatingWindows.find((w) => w.appId === appId);

    const isForeground = (foregroundAppId === appId && !minimizedAppIds.includes(appId)) || 
                         (activeAppId === appId) || 
                         (Boolean(existingWin && focusedWindowId === existingWin.id && !existingWin.minimized));

    // 1. If the app is ALREADY IN THE FOREGROUND -> Trigger Simulated Minimize
    if (isForeground) {
      if (targetApp?.packageName) {
        if (bridge?.minimizeApp) {
          bridge.minimizeApp(targetApp.packageName);
        } else if (bridge?.bringLauncherToFront) {
          bridge.bringLauncherToFront();
        }
      } else if (existingWin) {
        minimizeFloatingWindow(existingWin.id);
      } else if (activeAppId === appId) {
        setActiveAppId(null);
      }
      setMinimizedAppIds((prev) => (prev.includes(appId) ? prev : [...prev, appId]));
      setForegroundAppId(null);
      return;
    }

    // 2. If the app is NOT in the foreground (minimized or background) -> Put in foreground in floating mode
    setMinimizedAppIds((prev) => prev.filter((id) => id !== appId));
    setForegroundAppId(appId);

    if (existingWin) {
      focusFloatingWindow(existingWin.id);
      return;
    }

    if (!targetApp?.packageName) {
      setActiveAppId(appId);
      return;
    }

    // Real Android Package -> Re-launch / Convert to Floating Mode on Top
    if (bridge?.launchAppFloating) {
      const launched = bridge.launchAppFloating(targetApp.packageName);
      if (launched) return;
    }

    launchApp(appId, 'floating');
  }, [settings.soundEffects, foregroundAppId, minimizedAppIds, activeAppId, floatingWindows, focusedWindowId, apps, focusFloatingWindow, minimizeFloatingWindow, launchApp]);

  const killApp = useCallback((appId: string) => {
    if (settings.soundEffects) audio.playTap();
    setRunningApps((prev) => prev.filter((id) => id !== appId));
    setFloatingApps((prev) => prev.filter((id) => id !== appId));
    setMinimizedAppIds((prev) => prev.filter((id) => id !== appId));
    if (foregroundAppId === appId) setForegroundAppId(null);
    if (activeAppId === appId) {
      minimizeActiveApp();
    }
  }, [settings.soundEffects, foregroundAppId, activeAppId, minimizeActiveApp]);

  const clearAllRunningApps = useCallback(() => {
    setRunningApps([]);
    setFloatingApps([]);
    minimizeActiveApp();
  }, [minimizeActiveApp]);

  const addDrawerTab = useCallback((name: string, initialAppIds: string[] = []) => {
    if (settings.soundEffects) audio.playTap();
    const clean = name.trim().toLowerCase();
    if (!clean) return;
    if (SYSTEM_TAB_NAMES.includes(clean)) {
      showToast(`"${clean}" is already a system tab`);
      return;
    }
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
  }, [settings.soundEffects, drawerTabs, showToast]);

  const removeDrawerTab = useCallback((name: string) => {
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
  }, [settings.soundEffects, drawerTabs, showToast]);

  const renameDrawerTab = useCallback((oldName: string, newName: string) => {
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
  }, [settings.soundEffects, drawerTabs, showToast]);

  const assignAppsToTab = useCallback((tabName: string, appIds: string[]) => {
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
  }, [settings.soundEffects, showToast]);

  const setAppCategory = useCallback((appId: string, category: string) => {
    if (settings.soundEffects) audio.playTap();
    const clean = category.trim().toLowerCase();
    setApps((prev) => {
      const next = prev.map((a) => (a.id === appId ? { ...a, category: clean as any } : a));
      try {
        localStorage.setItem('nova_launcher_apps', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, [settings.soundEffects]);

  const uninstallApp = useCallback((appId: string) => {
    if (settings.soundEffects) audio.playTap();
    const targetApp = apps.find((a) => a.id === appId);
    if (!targetApp) return;

    if (activeAppId === appId) setActiveAppId(null);
    setRunningApps((prev) => prev.filter((id) => id !== appId));

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
      setFolders((prev) =>
        prev.map((f) => ({ ...f, appIds: f.appIds.filter((id) => id !== appId) }))
      );
      showToast(`Removed ${targetApp.name}`);
    }
  }, [settings.soundEffects, apps, showToast, syncNativeInstalledApps, activeAppId]);

  const createFolder = useCallback((name: string, appIdsOrPageIndex?: string[] | number, maybePageIndex?: number) => {
    let appIds: string[] = [];
    let pageIndex = 0;

    if (Array.isArray(appIdsOrPageIndex)) {
      appIds = appIdsOrPageIndex;
      pageIndex = typeof maybePageIndex === 'number' ? maybePageIndex : 0;
    } else if (typeof appIdsOrPageIndex === 'number') {
      pageIndex = appIdsOrPageIndex;
      appIds = [];
    }

    const newFolder: FolderItem = {
      id: `folder-${Date.now()}`,
      name: name || 'Folder',
      color: '#34C759',
      pageIndex,
      order: folders.filter((f) => f.pageIndex === pageIndex).length,
      appIds,
    };
    setFolders((prev) => [...prev, newFolder]);
    if (appIds.length > 0) {
      setApps((prev) =>
        prev.map((app) =>
          appIds.includes(app.id) ? { ...app, folderId: newFolder.id } : app
        )
      );
    }
    if (settings.soundEffects) audio.playTap();
    showToast(`Created folder "${newFolder.name}"`);
  }, [folders, settings.soundEffects, showToast]);

  const createFolderFromApps = useCallback((sourceAppId: string, targetAppId: string, customName?: string) => {
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
  }, [apps, settings.soundEffects]);

  const addAppToFolder = useCallback((folderId: string, appId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder || folder.appIds.includes(appId)) return;

    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, appIds: [...f.appIds, appId] } : f))
    );
    setApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, folderId: folderId } : app))
    );
    if (settings.soundEffects) audio.playTap();
  }, [folders, settings.soundEffects]);

  const removeAppFromFolder = useCallback((folderId: string, appId: string) => {
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
  }, []);

  const renameFolder = useCallback((folderId: string, newName: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f))
    );
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setApps((prev) =>
      prev.map((app) => (app.folderId === folderId ? { ...app, folderId: null } : app))
    );
    setActiveFolderId(null);
  }, []);

  const moveAppToPage = useCallback((appId: string, targetPageIndex: number) => {
    setApps((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, pageIndex: targetPageIndex } : app
      )
    );
  }, []);

  const moveApp = useCallback((sourceAppId: string, targetAppId: string) => {
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
  }, [settings.soundEffects]);

  const reorderApps = useCallback((newApps: AppItem[]) => {
    setApps(newApps);
    try {
      localStorage.setItem('nova_launcher_apps_order', JSON.stringify(newApps.map((a) => a.id)));
    } catch (_) {}
  }, []);

  const maxPageIndex = Math.max(
    0,
    ...apps.map((a) => a.pageIndex || 0),
    ...folders.map((f) => f.pageIndex || 0)
  );
  const totalPages = maxPageIndex + 1;

  return (
    <AppGridContext.Provider
      value={{
        apps,
        folders,
        dockAppIds,
        currentPageIndex,
        totalPages,
        setCurrentPageIndex,

        // Multi-Window Floating Canvas State & Actions
        floatingWindows,
        focusedWindowId,
        openFloatingWindow,
        closeFloatingWindow,
        minimizeFloatingWindow,
        maximizeFloatingWindow,
        focusFloatingWindow,
        updateFloatingWindowBounds,

        launchApp,
        launchAppFloating,
        isFloatingModeArmed,
        setIsFloatingModeArmed,
        toggleFloatingMode,
        appContextMenu,
        openAppContextMenu,
        closeAppContextMenu,
        closeActiveApp,
        minimizeActiveApp,
        toggleAppTask,
        activeAppId,
        foregroundAppId,
        minimizedAppIds,
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
        folderCombineArmedId,
        setFolderCombineArmedId,
        isSearchOpen,
        setSearchOpen,
        drawerTabs,
        customTabAppMap,
        addDrawerTab,
        removeDrawerTab,
        renameDrawerTab,
        assignAppsToTab,
        setAppCategory,
      }}
    >
      {children}
    </AppGridContext.Provider>
  );
};

export const useAppGrid = () => {
  const context = useContext(AppGridContext);
  if (!context) {
    throw new Error('useAppGrid must be used within an AppGridProvider');
  }
  return context;
};
