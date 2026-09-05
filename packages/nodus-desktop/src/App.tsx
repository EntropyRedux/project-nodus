import React, { useEffect } from 'react';
import { DesktopProvider, useDesktop } from './context/DesktopContext';
import { DesktopAppShell } from './components/layout/DesktopAppShell';
import { useHotCorners } from './hooks/useHotCorners';
import { DaemonManager } from './services/DaemonManager';

function DesktopContent() {
  const { setActiveTab, serverConfig } = useDesktop();

  // Headless background worker bootstrap
  useEffect(() => {
    const token = serverConfig?.auth_token || serverConfig?.pairingSecret || 'NODUS-FLEET-SECURE';
    DaemonManager.start(token);
    return () => DaemonManager.stop();
  }, [serverConfig]);

  // Listen to hot-corner and tray triggers
  useHotCorners((tab) => {
    setActiveTab(tab);
  });

  return <DesktopAppShell />;
}

export default function App() {
  return (
    <DesktopProvider>
      <DesktopContent />
    </DesktopProvider>
  );
}
