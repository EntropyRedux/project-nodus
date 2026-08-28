import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DeviceInfo,
  ClipboardItem,
  ThemeSettings,
  DEFAULT_ACCENT_COLOR
} from '@nodus/common';

export interface OverlayAppItem {
  id: string;
  packageName: string;
  name: string;
  label: string;
  icon?: string;
  isSystemApp?: boolean;
}

interface AssistiveContextType {
  // Modules detected
  isHomeInstalled: boolean;
  isFleetInstalled: boolean;

  // Settings & Theme (from Home or default)
  themeSettings: ThemeSettings;

  // Fleet data
  devices: DeviceInfo[];
  clipboardItems: ClipboardItem[];
  activeDeviceId: string;

  // Apps & Multitasking
  installedApps: OverlayAppItem[];
  recentApps: OverlayAppItem[];
  launchMode: 'fullscreen' | 'floating';
  setLaunchMode: (mode: 'fullscreen' | 'floating') => void;
  toggleLaunchMode: () => void;

  // Overlay panel visibility
  isClipboardOpen: boolean;
  isDevicesOpen: boolean;
  isStartMenuOpen: boolean;
  setClipboardOpen: (open: boolean) => void;
  setDevicesOpen: (open: boolean) => void;
  setStartMenuOpen: (open: boolean) => void;
  toggleClipboardPanel: () => void;
  toggleSidebar: () => void; // Device switcher toggle
  toggleStartMenu: () => void;
  closeOverlay: () => void;
  launchApp: (packageName: string, mode?: 'fullscreen' | 'floating') => void;
  copyToClipboard: (text: string) => void;
}

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  themeMode: 'dark',
  accentColor: DEFAULT_ACCENT_COLOR,
  taskbarOpacity: 85,
  soundEffects: true
};

const AssistiveContext = createContext<AssistiveContextType | null>(null);

export const AssistiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHomeInstalled, setIsHomeInstalled] = useState<boolean>(false);
  const [isFleetInstalled, setIsFleetInstalled] = useState<boolean>(false);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('local');
  const [installedApps, setInstalledApps] = useState<OverlayAppItem[]>([]);
  const [recentApps, setRecentApps] = useState<OverlayAppItem[]>([]);
  const [launchMode, setLaunchMode] = useState<'fullscreen' | 'floating'>('floating');

  const [isClipboardOpen, setClipboardOpen] = useState<boolean>(false);
  const [isDevicesOpen, setDevicesOpen] = useState<boolean>(false);
  const [isStartMenuOpen, setStartMenuOpen] = useState<boolean>(false);

  const refreshData = useCallback(() => {
    const bridge = (window as any).NodusNativeBridge;
    if (!bridge) return;

    const home = typeof bridge.isHomeInstalled === 'function' ? bridge.isHomeInstalled() : false;
    const fleet = typeof bridge.isFleetInstalled === 'function' ? bridge.isFleetInstalled() : false;

    setIsHomeInstalled(home);
    setIsFleetInstalled(fleet);

    // Query Home settings
    if (home && typeof bridge.queryHomeSettings === 'function') {
      try {
        const raw = bridge.queryHomeSettings();
        if (raw) {
          const parsed = JSON.parse(raw);
          setThemeSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.warn('Failed to parse home settings', e);
      }
    }

    // Query Fleet devices and clipboard
    if (fleet) {
      if (typeof bridge.queryFleetDevices === 'function') {
        try {
          const raw = bridge.queryFleetDevices();
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setDevices(parsed);
          }
        } catch (e) {
          console.warn('Failed to parse fleet devices', e);
        }
      }

      if (typeof bridge.queryFleetClipboard === 'function') {
        try {
          const raw = bridge.queryFleetClipboard();
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setClipboardItems(parsed);
          }
        } catch (e) {
          console.warn('Failed to parse fleet clipboard', e);
        }
      }
    }

    // Query installed apps
    if (typeof bridge.getInstalledApps === 'function') {
      try {
        const rawApps = bridge.getInstalledApps();
        if (rawApps) {
          const parsed = JSON.parse(rawApps);
          if (Array.isArray(parsed)) {
            setInstalledApps(parsed);
            if (recentApps.length === 0) {
              setRecentApps(parsed.slice(0, 5));
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse installed apps', e);
      }
    }
  }, [recentApps.length]);

  useEffect(() => {
    refreshData();

    const onStateChanged = () => refreshData();
    window.addEventListener('fleet-state-changed', onStateChanged);
    window.addEventListener('fleet-clipboard-changed', onStateChanged);
    window.addEventListener('home-settings-changed', onStateChanged);

    return () => {
      window.removeEventListener('fleet-state-changed', onStateChanged);
      window.removeEventListener('fleet-clipboard-changed', onStateChanged);
      window.removeEventListener('home-settings-changed', onStateChanged);
    };
  }, [refreshData]);

  const toggleClipboardPanel = useCallback(() => {
    setClipboardOpen(prev => !prev);
    setDevicesOpen(false);
    setStartMenuOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setDevicesOpen(prev => !prev);
    setClipboardOpen(false);
    setStartMenuOpen(false);
  }, []);

  const toggleStartMenu = useCallback(() => {
    setStartMenuOpen(prev => !prev);
    setClipboardOpen(false);
    setDevicesOpen(false);
  }, []);

  const toggleLaunchMode = useCallback(() => {
    setLaunchMode(prev => (prev === 'floating' ? 'fullscreen' : 'floating'));
  }, []);

  const closeOverlay = useCallback(() => {
    setClipboardOpen(false);
    setDevicesOpen(false);
    setStartMenuOpen(false);
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.closeOverlay === 'function') {
      bridge.closeOverlay();
    }
  }, []);

  const launchApp = useCallback((packageName: string, mode?: 'fullscreen' | 'floating') => {
    const targetMode = mode || launchMode;
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.launchApp === 'function') {
      bridge.launchApp(packageName, targetMode);
    }
    // Update recents
    const found = installedApps.find(a => a.packageName === packageName);
    if (found) {
      setRecentApps(prev => [found, ...prev.filter(a => a.packageName !== packageName)].slice(0, 6));
    }
    closeOverlay();
  }, [launchMode, installedApps, closeOverlay]);

  const copyToClipboard = useCallback((text: string) => {
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.copyToClipboard === 'function') {
      bridge.copyToClipboard(text);
    }
  }, []);

  return (
    <AssistiveContext.Provider
      value={{
        isHomeInstalled,
        isFleetInstalled,
        themeSettings,
        devices,
        clipboardItems,
        activeDeviceId,
        installedApps,
        recentApps,
        launchMode,
        setLaunchMode,
        toggleLaunchMode,
        isClipboardOpen,
        isDevicesOpen,
        isStartMenuOpen,
        setClipboardOpen,
        setDevicesOpen,
        setStartMenuOpen,
        toggleClipboardPanel,
        toggleSidebar,
        toggleStartMenu,
        closeOverlay,
        launchApp,
        copyToClipboard
      }}
    >
      {children}
    </AssistiveContext.Provider>
  );
};

export const useAssistive = () => {
  const ctx = useContext(AssistiveContext);
  if (!ctx) throw new Error('useAssistive must be used within AssistiveProvider');
  return ctx;
};
