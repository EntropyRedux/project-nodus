import React from 'react';
import { DesktopProvider, useDesktop } from './context/DesktopContext';
import { DesktopAppShell } from './components/layout/DesktopAppShell';
import { useHotCorners } from './hooks/useHotCorners';

function DesktopContent() {
  const { setActiveTab } = useDesktop();

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
