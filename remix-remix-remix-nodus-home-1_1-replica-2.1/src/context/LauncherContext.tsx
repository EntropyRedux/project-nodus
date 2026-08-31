import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppItem,
  Folder,
  DeviceInfo,
  ProcessInfo,
  ClipboardItem,
  NotificationItem,
  MusicTrack,
  DrawerTab,
  RemoteExecutable,
  SettingsState,
  QuickSettingsState,
  AppContextMenuState,
  ConfirmDialogState,
  AppLaunchMode,
  NoteItem,
  NoteCategory,
  NoteColor,
  ChecklistItem,
} from '../types/launcher';
import {
  INITIAL_APPS,
  INITIAL_DEVICES,
  INITIAL_PROCESSES,
  INITIAL_CLIPBOARD,
  INITIAL_MUSIC_TRACK,
  REMOTE_EXECUTABLES,
  INITIAL_NOTES,
} from '../utils/constants';
import { audio } from '../utils/audio';

interface LauncherContextType {
  // Apps & Navigation
  apps: AppItem[];
  setApps: React.Dispatch<React.SetStateAction<AppItem[]>>;
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  dockAppIds: string[];
  activeAppId: string | null;
  runningApps: string[];
  recentApps: string[];
  floatingApps: string[];
  launchApp: (id: string, modeOverride?: AppLaunchMode) => void;
  launchAppFloating: (id: string) => void;
  closeActiveApp: () => void;
  killApp: (id: string) => void;
  toggleAppTask: (id: string) => void;
  uninstallApp: (id: string) => void;
  moveApp: (draggedId: string, targetId: string) => void;

  // Pages & Workspace
  currentPageIndex: number;
  totalPages: number;
  setCurrentPageIndex: (idx: number) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;

  // Folder Operations
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  createFolder: (name?: string, initialAppIdsOrPage?: string[] | number, pageIdx?: number) => void;
  createFolderFromApps: (appId1: string, appId2: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  addAppToFolder: (folderId: string, appId: string) => void;
  removeAppFromFolder: (folderId: string, appId: string) => void;

  // Drag & Drop State
  draggedAppId: string | null;
  setDraggedAppId: (id: string | null) => void;
  dragPosition: { x: number; y: number } | null;
  setDragPosition: (pos: { x: number; y: number } | null) => void;
  hoverTargetAppId: string | null;
  setHoverTargetAppId: (id: string | null) => void;

  // Multi-Device Node Mesh
  devices: DeviceInfo[];
  activeDeviceId: string;
  activeDevice: DeviceInfo;
  selectDevice: (id: string) => void;
  moveDeviceUp: (id: string) => void;
  moveDeviceDown: (id: string) => void;
  addDevice: (device: Omit<DeviceInfo, 'id'>) => void;
  removeDevice: (id: string) => void;
  updateDeviceAvatar: (id: string, avatarUrl: string) => void;
  rebootDevice: (id: string) => void;
  lockDevice: (id: string) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Remote Process Inspector
  deviceProcesses: Record<string, ProcessInfo[]>;
  processModalDeviceId: string | null;
  openProcessManager: (deviceId: string) => void;
  closeProcessManager: () => void;
  killProcess: (deviceId: string, pid: number) => void;
  killProcessGroup: (deviceId: string, pids: number[], appName?: string) => void;
  killAllUserProcesses: (deviceId: string) => void;

  // Cross-Device Clipboard
  clipboardItems: ClipboardItem[];
  isClipboardOpen: boolean;
  setClipboardOpen: (open: boolean) => void;
  toggleClipboardPanel: () => void;
  addClipboardItem: (text: string, category?: ClipboardItem['category']) => void;
  removeClipboardItem: (id: string) => void;
  togglePinClipboardItem: (id: string) => void;
  clearClipboardHistory: () => void;
  copyClipboardItem: (item: ClipboardItem) => void;

  // Universal Search & Remote Executables
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  remoteExecutables: RemoteExecutable[];
  executeRemoteApp: (exec: RemoteExecutable) => void;

  // Settings & Customization
  settings: SettingsState;
  updateSettings: (newSettings: Partial<SettingsState>) => void;

  // Notifications & Quick Settings Shade
  notifications: NotificationItem[];
  totalUnreadNotifications: number;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'time'>) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  quickSettings: QuickSettingsState;
  setQuickSettings: React.Dispatch<React.SetStateAction<QuickSettingsState>>;
  toggleQuickSetting: (key: keyof QuickSettingsState) => void;
  isQuickSettingsOpen: boolean;
  setQuickSettingsOpen: (open: boolean) => void;
  toggleQuickSettings: () => void;

  // Music & Media Player
  currentTrack: MusicTrack | null;
  isPlayingMusic: boolean;
  toggleMusic: () => void;
  nextTrack: () => void;

  // App Badges & Custom Categories
  appBadges: Record<string, number>;
  drawerTabs: DrawerTab[];
  customTabAppMap: Record<string, string[]>;
  addDrawerTab: (name: string) => void;
  removeDrawerTab: (id: string) => void;
  renameDrawerTab: (id: string, name: string) => void;
  assignAppsToTab: (tabName: string, appIds: string[]) => void;
  setAppCategory: (appId: string, category: string) => void;

  // Modals, Menus, Dialogs & Feedback
  appContextMenu: AppContextMenuState | null;
  openAppContextMenu: (appId: string, x: number, y: number) => void;
  closeAppContextMenu: () => void;
  confirmDialog: ConfirmDialogState | null;
  showConfirm: (title: string, message: string, onConfirm: () => void, confirmText?: string, isDestructive?: boolean) => void;
  closeConfirm: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Floating Mode & Assistive Taskbar
  isTaskbarOpen: boolean;
  setTaskbarOpen: (open: boolean) => void;
  toggleTaskbar: () => void;
  isFloatingModeArmed: boolean;
  toggleFloatingMode: () => void;
  isNotificationListenerEnabled: boolean;
  requestNotificationListenerPermission: () => void;

  // Notes & To-Do Widget
  notes: NoteItem[];
  isNotesModalOpen: boolean;
  selectedNoteId: string | null;
  singleViewingNoteId: string | null;
  notesActiveTab: 'all' | 'todo' | 'note' | 'checklist' | 'calendar';
  setNotesModalOpen: (open: boolean) => void;
  setSelectedNoteId: (id: string | null) => void;
  setNotesActiveTab: (tab: 'all' | 'todo' | 'note' | 'checklist' | 'calendar') => void;
  toggleNotesModal: () => void;
  openNotesModal: (noteId?: string, tab?: 'all' | 'todo' | 'note' | 'checklist' | 'calendar') => void;
  openSingleNote: (noteId: string) => void;
  closeSingleNote: () => void;
  addNote: (note: { text: string; title?: string; type?: NoteCategory; color?: NoteColor; dueDate?: string; checklist?: ChecklistItem[] }) => void;
  toggleTodo: (id: string) => void;
  toggleChecklistItem: (noteId: string, itemId: string) => void;
  updateChecklistItem: (noteId: string, itemId: string, text: string) => void;
  addChecklistItemToNote: (noteId: string, text: string) => void;
  removeChecklistItemFromNote: (noteId: string, itemId: string) => void;
  updateNote: (id: string, updates: Partial<NoteItem>) => void;
  deleteNote: (id: string) => void;
  clearCompletedTodos: () => void;
}

const LauncherContext = createContext<LauncherContextType | undefined>(undefined);

const DEFAULT_SETTINGS: SettingsState = {
  theme: 'glassmorphism',
  accentColor: 'sapphire',
  appLaunchMode: 'fullscreen',
  iconSize: 'medium',
  drawerLayout: 'continuous',
  wallpaper: 'alpine',
  iconShape: 'modern',
  iconStyle: 'default',
  iconPack: 'default',
  taskbarOpacity: 92,
  taskbarIconScale: 'medium',
  enableMultiDevice: true,
  enableAssistiveTouch: false,
  deviceFrame: false,
  soundEffects: true,
  showLabels: true,
  notificationBadges: true,
  minimalistMode: false,
  gridColumns: 4,
  folderOpacity: 95,
  leftPanelOpacity: 85,
  clockWidgetStyle: 'digital-bold',
  atAGlanceWidget: true,
  enableClockWidget: true,
  enableDeviceNameWidget: true,
  enableBatteryWidget: true,
  enableNotesWidget: true,
};

const DEFAULT_QUICK_SETTINGS: QuickSettingsState = {
  wifi: true,
  bluetooth: true,
  flashlight: false,
  dnd: false,
  airplane: false,
  autoRotate: true,
  brightness: 85,
  volume: 70,
};

export const LauncherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Core App State with localStorage persistence
  const [apps, setApps] = useState<AppItem[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_apps');
      return saved ? JSON.parse(saved) : INITIAL_APPS;
    } catch {
      return INITIAL_APPS;
    }
  });

  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_folders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dockAppIds, setDockAppIds] = useState<string[]>(['browser', 'files', 'notes', 'music', 'settings']);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [runningApps, setRunningApps] = useState<string[]>(['browser', 'notes']);
  const [recentApps, setRecentApps] = useState<string[]>(['terminal', 'gallery', 'camera']);
  const [floatingApps, setFloatingApps] = useState<string[]>([]);
  const [isFloatingModeArmed, setIsFloatingModeArmed] = useState<boolean>(false);

  // 2. Multi-page navigation & editing
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // 3. Drag-and-drop state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoverTargetAppId, setHoverTargetAppId] = useState<string | null>(null);

  // 4. Multi-device node cluster
  const [devices, setDevices] = useState<DeviceInfo[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_devices');
      return saved ? JSON.parse(saved) : INITIAL_DEVICES;
    } catch {
      return INITIAL_DEVICES;
    }
  });
  const [activeDeviceId, setActiveDeviceId] = useState<string>('dev-tablet');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);

  // 5. Remote Process Manager
  const [deviceProcesses, setDeviceProcesses] = useState<Record<string, ProcessInfo[]>>(INITIAL_PROCESSES);
  const [processModalDeviceId, setProcessModalDeviceId] = useState<string | null>(null);

  // 6. Settings & Preferences
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem('nodus_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // 7. Cross-Device Clipboard
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_clipboard');
      return saved ? JSON.parse(saved) : INITIAL_CLIPBOARD;
    } catch {
      return INITIAL_CLIPBOARD;
    }
  });
  const [isClipboardOpen, setClipboardOpenState] = useState<boolean>(false);

  // Auto-close clipboard history panel if Nodus Fleet is disabled
  useEffect(() => {
    if (!settings.enableMultiDevice && isClipboardOpen) {
      setClipboardOpenState(false);
    }
  }, [settings.enableMultiDevice, isClipboardOpen]);

  const setClipboardOpen = useCallback((open: boolean) => {
    if (open && !settings.enableMultiDevice) {
      return;
    }
    setClipboardOpenState(open);
  }, [settings.enableMultiDevice]);

  // 8. Universal Search & Executables
  const [isSearchOpen, setSearchOpen] = useState<boolean>(false);
  const [remoteExecutables, setRemoteExecutables] = useState<RemoteExecutable[]>(REMOTE_EXECUTABLES);

  // 9. Notifications & Quick Settings
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n-1',
      appId: 'mail',
      appName: 'Mail',
      title: 'Cluster Deploy Ready',
      message: 'Node Rig-01 finished building 120Hz HyperOS kernel.',
      time: '12m ago',
      iconName: 'Mail',
      color: '#007AFF',
      read: false,
    },
    {
      id: 'n-2',
      appId: 'discord',
      appName: 'Discord',
      title: '#nodus-core',
      message: 'Dev: Cross-device clipboard sync active across 4 nodes.',
      time: '34m ago',
      iconName: 'MessageCircle',
      color: '#5865F2',
      read: false,
    },
  ]);
  const [quickSettings, setQuickSettings] = useState<QuickSettingsState>(DEFAULT_QUICK_SETTINGS);
  const [isQuickSettingsOpen, setQuickSettingsOpen] = useState<boolean>(false);

  // 10. Music Player
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(INITIAL_MUSIC_TRACK);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);

  // 11. Custom Categories & Drawer Tabs
  const [drawerTabs, setDrawerTabs] = useState<DrawerTab[]>([]);
  const [customTabAppMap, setCustomTabAppMap] = useState<Record<string, string[]>>({});
  const [appBadges, setAppBadges] = useState<Record<string, number>>({});

  // 12. Feedback & Dialogs
  const [appContextMenu, setAppContextMenu] = useState<AppContextMenuState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTaskbarOpen, setTaskbarOpen] = useState<boolean>(false);
  const [isNotificationListenerEnabled, setIsNotificationListenerEnabled] = useState<boolean>(true);

  // 13. To-Do & Quick Sticky Notes Widget State
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_notes');
      return saved ? JSON.parse(saved) : INITIAL_NOTES;
    } catch {
      return INITIAL_NOTES;
    }
  });
  const [isNotesModalOpen, setNotesModalOpen] = useState<boolean>(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [singleViewingNoteId, setSingleViewingNoteId] = useState<string | null>(null);
  const [notesActiveTab, setNotesActiveTab] = useState<'all' | 'todo' | 'note' | 'checklist' | 'calendar'>('all');

  // Persist state updates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nodus_notes', JSON.stringify(notes));
    } catch (_) {}
  }, [notes]);

  // Persist state updates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nodus_apps', JSON.stringify(apps));
    } catch (_) {}
  }, [apps]);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_folders', JSON.stringify(folders));
    } catch (_) {}
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_devices', JSON.stringify(devices));
    } catch (_) {}
  }, [devices]);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_clipboard', JSON.stringify(clipboardItems));
    } catch (_) {}
  }, [clipboardItems]);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_settings', JSON.stringify(settings));
    } catch (_) {}
    audio.setEnabled(settings.soundEffects);
  }, [settings]);

  // Derived state
  const totalPages = useMemo(() => {
    const maxAppPage = apps.reduce((max, a) => Math.max(max, a.pageIndex ?? 0), 0);
    const maxFolderPage = folders.reduce((max, f) => Math.max(max, f.pageIndex ?? 0), 0);
    return Math.max(maxAppPage, maxFolderPage, 0) + 1;
  }, [apps, folders]);

  const activeDevice = useMemo(() => {
    return devices.find((d) => d.id === activeDeviceId) || devices[0] || INITIAL_DEVICES[0];
  }, [devices, activeDeviceId]);

  const totalUnreadNotifications = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Toast feedback helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  }, []);

  // Launch App
  const launchApp = useCallback((id: string, modeOverride?: AppLaunchMode) => {
    audio.playAppOpen();
    const effectiveMode = modeOverride || (isFloatingModeArmed ? 'floating' : settings.appLaunchMode);

    if (effectiveMode === 'floating') {
      setFloatingApps((prev) => (prev.includes(id) ? prev : [...prev, id]));
      showToast(`Floating window opened`);
    } else {
      setActiveAppId(id);
    }

    setRunningApps((prev) => (prev.includes(id) ? prev : [id, ...prev]));
    setRecentApps((prev) => [id, ...prev.filter((item) => item !== id)].slice(0, 10));
    setSearchOpen(false);
    setQuickSettingsOpen(false);
  }, [isFloatingModeArmed, settings.appLaunchMode, showToast]);

  const launchAppFloating = useCallback((id: string) => {
    launchApp(id, 'floating');
  }, [launchApp]);

  const closeActiveApp = useCallback(() => {
    audio.playTap();
    setActiveAppId(null);
  }, []);

  const killApp = useCallback((id: string) => {
    audio.playTap();
    setRunningApps((prev) => prev.filter((appId) => appId !== id));
    setFloatingApps((prev) => prev.filter((appId) => appId !== id));
    if (activeAppId === id) {
      setActiveAppId(null);
    }
  }, [activeAppId]);

  const toggleAppTask = useCallback((id: string) => {
    audio.playTap();
    if (activeAppId === id) {
      setActiveAppId(null); // minimize
    } else {
      setActiveAppId(id); // restore/focus
    }
  }, [activeAppId]);

  const uninstallApp = useCallback((id: string) => {
    audio.playTap();
    setApps((prev) => prev.filter((a) => a.id !== id));
    setFolders((prev) =>
      prev.map((f) => ({
        ...f,
        appIds: f.appIds.filter((appId) => appId !== id),
      }))
    );
    killApp(id);
    showToast('App removed');
  }, [killApp, showToast]);

  const moveApp = useCallback((draggedId: string, targetId: string) => {
    setApps((prev) => {
      const draggedIdx = prev.findIndex((a) => a.id === draggedId);
      const targetIdx = prev.findIndex((a) => a.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return prev;

      const next = [...prev];
      const [item] = next.splice(draggedIdx, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
  }, []);

  // Folder management
  const createFolder = useCallback((name = 'New Folder', initialAppIdsOrPage?: string[] | number, pageIdx?: number) => {
    audio.playTap();
    let initialAppIds: string[] = [];
    let targetPage = 0;

    if (Array.isArray(initialAppIdsOrPage)) {
      initialAppIds = initialAppIdsOrPage;
      targetPage = typeof pageIdx === 'number' ? pageIdx : currentPageIndex;
    } else if (typeof initialAppIdsOrPage === 'number') {
      targetPage = initialAppIdsOrPage;
    } else {
      targetPage = currentPageIndex;
    }

    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      appIds: initialAppIds,
      pageIndex: targetPage,
    };

    setFolders((prev) => [...prev, newFolder]);
    if (initialAppIds.length > 0) {
      setApps((prev) =>
        prev.map((a) => (initialAppIds.includes(a.id) ? { ...a, folderId: newFolder.id } : a))
      );
    }
    setActiveFolderId(newFolder.id);
  }, [currentPageIndex]);

  const createFolderFromApps = useCallback((appId1: string, appId2: string) => {
    audio.playTap();
    const folderId = `folder-${Date.now()}`;
    const newFolder: Folder = {
      id: folderId,
      name: 'Folder',
      appIds: [appId1, appId2],
      pageIndex: currentPageIndex,
    };
    setFolders((prev) => [...prev, newFolder]);
    setApps((prev) =>
      prev.map((a) => (a.id === appId1 || a.id === appId2 ? { ...a, folderId } : a))
    );
  }, [currentPageIndex]);

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    audio.playTap();
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setApps((prev) =>
      prev.map((a) => (a.folderId === id ? { ...a, folderId: null } : a))
    );
    setActiveFolderId(null);
  }, []);

  const addAppToFolder = useCallback((folderId: string, appId: string) => {
    audio.playTap();
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === folderId) {
          return {
            ...f,
            appIds: f.appIds.includes(appId) ? f.appIds : [...f.appIds, appId],
          };
        }
        return f;
      })
    );
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, folderId } : a))
    );
  }, []);

  const removeAppFromFolder = useCallback((folderId: string, appId: string) => {
    audio.playTap();
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId ? { ...f, appIds: f.appIds.filter((id) => id !== appId) } : f
      )
    );
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, folderId: null } : a)));
  }, []);

  // Multi-Device node operations
  const selectDevice = useCallback((id: string) => {
    audio.playTap();
    setActiveDeviceId(id);
    const dev = devices.find((d) => d.id === id);
    if (dev) {
      showToast(`Switched active node to ${dev.name}`);
    }
  }, [devices, showToast]);

  const moveDeviceUp = useCallback((id: string) => {
    setDevices((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDeviceDown = useCallback((id: string) => {
    setDevices((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const addDevice = useCallback((deviceData: Omit<DeviceInfo, 'id'>) => {
    audio.playSuccess();
    const newDev: DeviceInfo = {
      ...deviceData,
      id: `dev-custom-${Date.now()}`,
    };
    setDevices((prev) => [...prev, newDev]);
    showToast(`Added node: ${newDev.name}`);
  }, [showToast]);

  const removeDevice = useCallback((id: string) => {
    audio.playTap();
    setDevices((prev) => prev.filter((d) => d.id !== id));
    if (activeDeviceId === id) {
      setActiveDeviceId(devices[0]?.id || 'dev-tablet');
    }
    showToast('Device removed');
  }, [activeDeviceId, devices, showToast]);

  const updateDeviceAvatar = useCallback((id: string, avatarUrl: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, customAvatar: avatarUrl } : d))
    );
    showToast('Device portrait updated');
  }, [showToast]);

  const rebootDevice = useCallback((id: string) => {
    audio.playTap();
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isRebooting: true } : d))
    );
    showToast(`Rebooting node...`);
    setTimeout(() => {
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, isRebooting: false } : d))
      );
      audio.playSuccess();
      showToast(`Node back online`);
    }, 2800);
  }, [showToast]);

  const lockDevice = useCallback((id: string) => {
    audio.playTap();
    const dev = devices.find((d) => d.id === id);
    showToast(`Sent lock signal to ${dev?.name || 'node'}`);
  }, [devices, showToast]);

  const toggleSidebar = useCallback(() => {
    audio.playTap();
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  // Process management
  const openProcessManager = useCallback((deviceId: string) => {
    audio.playTap();
    setProcessModalDeviceId(deviceId);
  }, []);

  const closeProcessManager = useCallback(() => {
    audio.playTap();
    setProcessModalDeviceId(null);
  }, []);

  const killProcess = useCallback((deviceId: string, pid: number) => {
    audio.playTap();
    setDeviceProcesses((prev) => ({
      ...prev,
      [deviceId]: (prev[deviceId] || []).filter((p) => p.pid !== pid),
    }));
    showToast(`Killed PID ${pid}`);
  }, [showToast]);

  const killProcessGroup = useCallback((deviceId: string, pids: number[], appName?: string) => {
    audio.playTap();
    const pidSet = new Set(pids);
    setDeviceProcesses((prev) => ({
      ...prev,
      [deviceId]: (prev[deviceId] || []).filter((p) => !pidSet.has(p.pid)),
    }));
    showToast(`Ended task: ${appName || `${pids.length} processes`}`);
  }, [showToast]);

  const killAllUserProcesses = useCallback((deviceId: string) => {
    audio.playTap();
    setDeviceProcesses((prev) => ({
      ...prev,
      [deviceId]: (prev[deviceId] || []).filter((p) => p.category !== 'user'),
    }));
    showToast(`Cleared background tasks. Free RAM recovered.`);
  }, [showToast]);

  // Cross-device clipboard
  const toggleClipboardPanel = useCallback(() => {
    if (!settings.enableMultiDevice) {
      showToast('Nodus Fleet is disabled in Ecosystem settings');
      return;
    }
    audio.playTap();
    setClipboardOpenState((prev) => !prev);
  }, [settings.enableMultiDevice, showToast]);

  const addClipboardItem = useCallback((text: string, category: ClipboardItem['category'] = 'text') => {
    if (!text.trim()) return;
    audio.playSuccess();
    const newItem: ClipboardItem = {
      id: `clip-${Date.now()}`,
      text: text.trim(),
      sourceDevice: activeDeviceId,
      deviceName: activeDevice.name,
      timestamp: Date.now(),
      isPinned: false,
      category,
    };
    setClipboardItems((prev) => [newItem, ...prev]);
    showToast('Copied to Nodus Clipboard Mesh');
  }, [activeDeviceId, activeDevice.name, showToast]);

  const removeClipboardItem = useCallback((id: string) => {
    audio.playTap();
    setClipboardItems((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const togglePinClipboardItem = useCallback((id: string) => {
    audio.playTap();
    setClipboardItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
  }, []);

  const clearClipboardHistory = useCallback(() => {
    audio.playTap();
    setClipboardItems((prev) => prev.filter((c) => c.isPinned));
    showToast('Clipboard history cleared (pins kept)');
  }, [showToast]);

  const copyClipboardItem = useCallback((item: ClipboardItem) => {
    audio.playTap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(item.text).catch(() => {});
    }
    showToast('Copied to active clipboard');
  }, [showToast]);

  // Remote Executables
  const executeRemoteApp = useCallback((exec: RemoteExecutable) => {
    audio.playAppOpen();
    showToast(`Dispatched: ${exec.name} on ${exec.deviceName}`);
  }, [showToast]);

  // Settings
  const updateSettings = useCallback((newSettings: Partial<SettingsState>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      if (newSettings.enableMultiDevice === false) {
        setClipboardOpenState(false);
      }
      return next;
    });
  }, []);

  // Notifications
  const addNotification = useCallback((notif: Omit<NotificationItem, 'id' | 'time'>) => {
    audio.playNotification();
    const newN: NotificationItem = {
      ...notif,
      id: `n-${Date.now()}`,
      time: 'Just now',
      read: false,
    };
    setNotifications((prev) => [newN, ...prev]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    audio.playTap();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    audio.playTap();
    setNotifications([]);
    showToast('Cleared all notifications');
  }, [showToast]);

  const toggleQuickSetting = useCallback((key: keyof QuickSettingsState) => {
    audio.playTap();
    setQuickSettings((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
  }, []);

  const toggleQuickSettings = useCallback(() => {
    audio.playTap();
    setQuickSettingsOpen((prev) => !prev);
  }, []);

  // Music controls
  const toggleMusic = useCallback(() => {
    audio.playTap();
    setIsPlayingMusic((prev) => !prev);
  }, []);

  const nextTrack = useCallback(() => {
    audio.playTap();
    setCurrentTrack({
      id: `track-${Date.now()}`,
      title: 'Neural Drift (Lossless 24-bit)',
      artist: 'Nodus Sound Architecture',
      durationSec: 312,
      coverColor: '#007AFF',
    });
  }, []);

  // Categories & Tabs
  const addDrawerTab = useCallback((name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return;
    setDrawerTabs((prev) => [...prev, { id: `tab-${Date.now()}`, name: trimmed, isCustom: true }]);
  }, []);

  const removeDrawerTab = useCallback((id: string) => {
    setDrawerTabs((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const renameDrawerTab = useCallback((id: string, name: string) => {
    setDrawerTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const assignAppsToTab = useCallback((tabName: string, appIds: string[]) => {
    setCustomTabAppMap((prev) => ({ ...prev, [tabName]: appIds }));
  }, []);

  const setAppCategory = useCallback((appId: string, category: string) => {
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, category } : a)));
  }, []);

  // Context Menu
  const openAppContextMenu = useCallback((appId: string, x: number, y: number) => {
    audio.playTap();
    setAppContextMenu({ isOpen: true, appId, x, y });
  }, []);

  const closeAppContextMenu = useCallback(() => {
    setAppContextMenu(null);
  }, []);

  // Confirm Modal
  const showConfirm = useCallback(
    (title: string, message: string, onConfirm: () => void, confirmText = 'Confirm', isDestructive = false) => {
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
    },
    []
  );

  const closeConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const toggleTaskbar = useCallback(() => {
    audio.playTap();
    setTaskbarOpen((prev) => !prev);
  }, []);

  const toggleFloatingMode = useCallback(() => {
    audio.playTap();
    setIsFloatingModeArmed((prev) => {
      const next = !prev;
      showToast(next ? 'Floating Window Mode Armed' : 'Standard Window Mode');
      return next;
    });
  }, [showToast]);

  const requestNotificationListenerPermission = useCallback(() => {
    setIsNotificationListenerEnabled(true);
    showToast('Notification sync enabled');
  }, [showToast]);

  // Notes & To-Do handlers
  const toggleNotesModal = useCallback(() => {
    audio.playTap();
    setNotesModalOpen((prev) => !prev);
  }, []);

  const openNotesModal = useCallback((noteId?: string, tab?: 'all' | 'todo' | 'note' | 'calendar') => {
    audio.playTap();
    setSingleViewingNoteId(null);
    if (noteId) {
      setSelectedNoteId(noteId);
    } else {
      setSelectedNoteId(null);
    }
    if (tab) {
      setNotesActiveTab(tab);
    }
    setNotesModalOpen(true);
  }, []);

  const openSingleNote = useCallback((noteId: string) => {
    audio.playTap();
    setNotesModalOpen(false);
    setSelectedNoteId(noteId);
    setSingleViewingNoteId(noteId);
  }, []);

  const closeSingleNote = useCallback(() => {
    audio.playTap();
    setSingleViewingNoteId(null);
  }, []);

  const addNote = useCallback((noteData: { text: string; title?: string; type?: NoteCategory; color?: NoteColor; dueDate?: string; checklist?: ChecklistItem[] }) => {
    const isChecklist = noteData.type === 'checklist';
    const items = noteData.checklist || [];
    if (!noteData.text.trim() && items.length === 0 && !noteData.title?.trim()) return;
    audio.playTap();
    const allDone = items.length > 0 && items.every((i) => i.completed);

    const newNote: NoteItem = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: noteData.title?.trim() || undefined,
      text: noteData.text.trim() || (isChecklist ? `${items.length} items` : 'Untitled'),
      completed: isChecklist ? allDone : false,
      type: noteData.type || 'note',
      color: noteData.color || (isChecklist ? 'emerald' : 'amber'),
      createdAt: Date.now(),
      dueDate: noteData.dueDate?.trim() || undefined,
      pinned: false,
      checklist: isChecklist ? items : undefined,
    };
    setNotes((prev) => [newNote, ...prev]);
    showToast(
      newNote.type === 'todo'
        ? 'Task added to checklist'
        : newNote.type === 'checklist'
        ? 'Checklist created'
        : 'Sticky note saved'
    );
  }, [showToast]);

  const toggleTodo = useCallback((id: string) => {
    audio.playTap();
    setNotes((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextCompleted = !item.completed;
          if (nextCompleted) {
            showToast('Task marked as complete');
          }
          return { ...item, completed: nextCompleted };
        }
        return item;
      })
    );
  }, [showToast]);

  const toggleChecklistItem = useCallback((noteId: string, itemId: string) => {
    audio.playTap();
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId || !note.checklist) return note;
        const updatedChecklist = note.checklist.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        const allCompleted = updatedChecklist.length > 0 && updatedChecklist.every((item) => item.completed);
        return {
          ...note,
          checklist: updatedChecklist,
          completed: allCompleted,
        };
      })
    );
  }, []);

  const updateChecklistItem = useCallback((noteId: string, itemId: string, text: string) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId || !note.checklist) return note;
        const updatedChecklist = note.checklist.map((item) =>
          item.id === itemId ? { ...item, text } : item
        );
        return {
          ...note,
          checklist: updatedChecklist,
        };
      })
    );
  }, []);

  const addChecklistItemToNote = useCallback((noteId: string, text: string) => {
    if (!text.trim()) return;
    audio.playTap();
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) return note;
        const newItem: ChecklistItem = {
          id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          text: text.trim(),
          completed: false,
        };
        const updatedChecklist = [...(note.checklist || []), newItem];
        return {
          ...note,
          checklist: updatedChecklist,
          completed: false,
        };
      })
    );
  }, []);

  const removeChecklistItemFromNote = useCallback((noteId: string, itemId: string) => {
    audio.playTap();
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId || !note.checklist) return note;
        const updatedChecklist = note.checklist.filter((item) => item.id !== itemId);
        const allCompleted = updatedChecklist.length > 0 && updatedChecklist.every((item) => item.completed);
        return {
          ...note,
          checklist: updatedChecklist,
          completed: allCompleted,
        };
      })
    );
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<NoteItem>) => {
    setNotes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    audio.playTap();
    setNotes((prev) => prev.filter((item) => item.id !== id));
    showToast('Item deleted');
  }, [showToast]);

  const clearCompletedTodos = useCallback(() => {
    audio.playTap();
    setNotes((prev) => prev.filter((item) => !item.completed));
    showToast('Completed tasks cleared');
  }, [showToast]);

  const value = {
    apps,
    setApps,
    folders,
    setFolders,
    dockAppIds,
    activeAppId,
    runningApps,
    recentApps,
    floatingApps,
    launchApp,
    launchAppFloating,
    closeActiveApp,
    killApp,
    toggleAppTask,
    uninstallApp,
    moveApp,
    currentPageIndex,
    totalPages,
    setCurrentPageIndex,
    isEditing,
    setIsEditing,
    activeFolderId,
    setActiveFolderId,
    createFolder,
    createFolderFromApps,
    renameFolder,
    deleteFolder,
    addAppToFolder,
    removeAppFromFolder,
    draggedAppId,
    setDraggedAppId,
    dragPosition,
    setDragPosition,
    hoverTargetAppId,
    setHoverTargetAppId,
    devices,
    activeDeviceId,
    activeDevice,
    selectDevice,
    moveDeviceUp,
    moveDeviceDown,
    addDevice,
    removeDevice,
    updateDeviceAvatar,
    rebootDevice,
    lockDevice,
    isSidebarCollapsed,
    toggleSidebar,
    deviceProcesses,
    processModalDeviceId,
    openProcessManager,
    closeProcessManager,
    killProcess,
    killProcessGroup,
    killAllUserProcesses,
    clipboardItems,
    isClipboardOpen,
    setClipboardOpen,
    toggleClipboardPanel,
    addClipboardItem,
    removeClipboardItem,
    togglePinClipboardItem,
    clearClipboardHistory,
    copyClipboardItem,
    isSearchOpen,
    setSearchOpen,
    remoteExecutables,
    executeRemoteApp,
    settings,
    updateSettings,
    notifications,
    totalUnreadNotifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    quickSettings,
    setQuickSettings,
    toggleQuickSetting,
    isQuickSettingsOpen,
    setQuickSettingsOpen,
    toggleQuickSettings,
    currentTrack,
    isPlayingMusic,
    toggleMusic,
    nextTrack,
    appBadges,
    drawerTabs,
    customTabAppMap,
    addDrawerTab,
    removeDrawerTab,
    renameDrawerTab,
    assignAppsToTab,
    setAppCategory,
    appContextMenu,
    openAppContextMenu,
    closeAppContextMenu,
    confirmDialog,
    showConfirm,
    closeConfirm,
    toastMessage,
    showToast,
    isTaskbarOpen,
    setTaskbarOpen,
    toggleTaskbar,
    isFloatingModeArmed,
    toggleFloatingMode,
    isNotificationListenerEnabled,
    requestNotificationListenerPermission,
    notes,
    isNotesModalOpen,
    selectedNoteId,
    singleViewingNoteId,
    notesActiveTab,
    setNotesModalOpen,
    setSelectedNoteId,
    setNotesActiveTab,
    toggleNotesModal,
    openNotesModal,
    openSingleNote,
    closeSingleNote,
    addNote,
    toggleTodo,
    toggleChecklistItem,
    updateChecklistItem,
    addChecklistItemToNote,
    removeChecklistItemFromNote,
    updateNote,
    deleteNote,
    clearCompletedTodos,
  };

  return <LauncherContext.Provider value={value}>{children}</LauncherContext.Provider>;
};

export const useLauncher = () => {
  const context = useContext(LauncherContext);
  if (!context) {
    throw new Error('useLauncher must be used within a LauncherProvider');
  }
  return context;
};
