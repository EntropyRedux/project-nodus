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

  // Global scroll activity detector: reveals scrollbar thumb only when actively scrolling
  useEffect(() => {
    const timerMap = new WeakMap<Element, number>();
    let globalTimer: number | null = null;

    const handleScroll = (e: Event) => {
      const target = e.target;
      if (target && target instanceof Element) {
        target.setAttribute('data-scrolling', 'true');
        const existing = timerMap.get(target);
        if (existing) {
          window.clearTimeout(existing);
        }
        const timer = window.setTimeout(() => {
          target.removeAttribute('data-scrolling');
          timerMap.delete(target);
        }, 900);
        timerMap.set(target, timer);
      }

      document.body.setAttribute('data-any-scrolling', 'true');
      if (globalTimer) {
        window.clearTimeout(globalTimer);
      }
      globalTimer = window.setTimeout(() => {
        document.body.removeAttribute('data-any-scrolling');
        globalTimer = null;
      }, 900);
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

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
