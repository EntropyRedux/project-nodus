import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ActiveTab } from '../types/desktop';

interface CornerEventPayload {
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  timestamp: number;
}

export function useHotCorners(onTabChange: (tab: ActiveTab) => void) {
  useEffect(() => {
    let isSubscribed = true;
    let unlistenCorner: (() => void) | undefined;
    let unlistenTray: (() => void) | undefined;

    // Listen to background Rust hot-corner detector
    listen<CornerEventPayload>('corner_triggered', (event) => {
      if (!isSubscribed) return;
      const { corner } = event.payload;

      switch (corner) {
        case 'top-left':
          onTabChange('fleet');
          break;
        case 'top-right':
          onTabChange('clipboard');
          break;
        case 'bottom-left':
          onTabChange('shortcuts');
          break;
        case 'bottom-right':
          onTabChange('processes');
          break;
        default:
          break;
      }
    }).then((unsub) => {
      unlistenCorner = unsub;
    }).catch(() => {});

    // Listen to tray menu item clicks
    listen<string>('open_panel', (event) => {
      if (!isSubscribed) return;
      const target = event.payload;
      if (['fleet', 'clipboard', 'shortcuts', 'hotcorners', 'processes', 'config'].includes(target)) {
        onTabChange(target as ActiveTab);
      } else if (target === 'taskbar') {
        onTabChange('shortcuts');
      }
    }).then((unsub) => {
      unlistenTray = unsub;
    }).catch(() => {});

    return () => {
      isSubscribed = false;
      if (unlistenCorner) unlistenCorner();
      if (unlistenTray) unlistenTray();
    };
  }, [onTabChange]);
}
