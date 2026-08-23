import React, { useMemo } from 'react';
import { LauncherProvider } from './context/LauncherContext';
import { DesktopLauncherShell } from './components/layout/DesktopLauncherShell';
import { ClipboardOverlayStandalone } from './components/overlay/ClipboardOverlayStandalone';
import { DeviceSwitcherOverlayStandalone } from './components/overlay/DeviceSwitcherOverlayStandalone';
import { TaskbarOverlayStandalone } from './components/overlay/TaskbarOverlayStandalone';

export default function App() {
  const overlayMode = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('overlay');
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

