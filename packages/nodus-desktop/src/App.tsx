import React, { useEffect } from 'react';
import { DesktopAppShell } from './components/layout/DesktopAppShell';
import { DaemonManager } from './services/DaemonManager';
import { useFleetStore } from './stores/useFleetStore';

export default function App() {
  const serverConfig = useFleetStore((state) => state.serverConfig);

  // Headless background worker bootstrap
  useEffect(() => {
    const token = serverConfig?.auth_token || serverConfig?.pairingSecret || 'NODUS-FLEET-SECURE';
    DaemonManager.start(token);
    return () => DaemonManager.stop();
  }, [serverConfig]);

  return <DesktopAppShell />;
}
