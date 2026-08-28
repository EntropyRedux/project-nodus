import { useState, useEffect, useCallback } from 'react';
import { DeviceInfo, ClipboardItem } from '../types/launcher';

export interface FleetDetectionState {
  isFleetInstalled: boolean;
  isTouchInstalled: boolean;
  fleetDevices: DeviceInfo[];
  fleetClipboard: ClipboardItem[];
  refresh: () => void;
}

export function useFleetDetection(): FleetDetectionState {
  const [isFleetInstalled, setIsFleetInstalled] = useState<boolean>(false);
  const [isTouchInstalled, setIsTouchInstalled] = useState<boolean>(false);
  const [fleetDevices, setFleetDevices] = useState<DeviceInfo[]>([]);
  const [fleetClipboard, setFleetClipboard] = useState<ClipboardItem[]>([]);

  const checkStatus = useCallback(() => {
    if (typeof window === 'undefined') return;
    const bridge = (window as any).NodusNativeBridge;
    if (!bridge) return;

    try {
      const fleet = Boolean(
        bridge.isFleetInstalled?.() || 
        bridge.isPackageInstalled?.('com.nodus.fleet')
      );
      const touch = Boolean(
        bridge.isAssistiveInstalled?.() || 
        bridge.isPackageInstalled?.('com.nodus.assistive')
      );
      setIsFleetInstalled(fleet);
      setIsTouchInstalled(touch);

      if (fleet && bridge.queryFleetDevices) {
        const rawDevices = bridge.queryFleetDevices();
        if (rawDevices && rawDevices.startsWith('[')) {
          const parsed = JSON.parse(rawDevices);
          if (Array.isArray(parsed)) setFleetDevices(parsed);
        }
      }

      if (fleet && bridge.queryFleetClipboard) {
        const rawClip = bridge.queryFleetClipboard();
        if (rawClip && rawClip.startsWith('[')) {
          const parsed = JSON.parse(rawClip);
          if (Array.isArray(parsed)) setFleetClipboard(parsed);
        }
      }
    } catch (e) {
      console.warn('Error querying Fleet status via bridge:', e);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    const handleFleetChange = () => checkStatus();
    window.addEventListener('fleet-state-changed', handleFleetChange);
    window.addEventListener('nodus-package-changed', handleFleetChange);

    return () => {
      window.removeEventListener('fleet-state-changed', handleFleetChange);
      window.removeEventListener('nodus-package-changed', handleFleetChange);
    };
  }, [checkStatus]);

  return {
    isFleetInstalled,
    isTouchInstalled,
    fleetDevices,
    fleetClipboard,
    refresh: checkStatus,
  };
}
