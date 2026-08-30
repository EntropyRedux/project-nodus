/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { LauncherProvider, useLauncher } from './context/LauncherContext';
import { DesktopLauncherShell } from './components/layout/DesktopLauncherShell';
import { PhoneFrame } from './components/layout/PhoneFrame';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const LauncherContent: React.FC = () => {
  const { settings, setSearchOpen, isSearchOpen, toggleSidebar } = useLauncher();

  // Global keyboard shortcuts:
  // - Ctrl+Space / Cmd+Space: Universal Search
  // - Escape: Close search / active popups
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  if (settings.deviceFrame) {
    return <PhoneFrame />;
  }

  return <DesktopLauncherShell />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <LauncherProvider>
        <LauncherContent />
      </LauncherProvider>
    </ErrorBoundary>
  );
}
