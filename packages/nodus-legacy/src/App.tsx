import React, { useMemo } from 'react';
import { LauncherProvider } from './context/LauncherContext';
import { DesktopLauncherShell } from './components/layout/DesktopLauncherShell';
import { ClipboardOverlayStandalone } from './components/overlay/ClipboardOverlayStandalone';
import { DeviceSwitcherOverlayStandalone } from './components/overlay/DeviceSwitcherOverlayStandalone';
import { TaskbarOverlayStandalone } from './components/overlay/TaskbarOverlayStandalone';

export default function App() {
  const overlayMode = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const searchParam = new URLSearchParams(window.location.search).get('overlay');
    if (searchParam) return searchParam;
    const hash = window.location.hash.replace('#', '').replace('overlay=', '');
    if (['clipboard', 'devices', 'taskbar'].includes(hash)) return hash;
    return null;
  }, []);

  return (
    <LauncherProvider>
      {overlayMode === 'clipboard' && <ClipboardOverlayStandalone />}
      {overlayMode === 'devices' && <DeviceSwitcherOverlayStandalone />}
      {overlayMode === 'taskbar' && <TaskbarOverlayStandalone />}
      {!overlayMode && <DesktopLauncherShell />}
    </LauncherProvider>
  );
}

