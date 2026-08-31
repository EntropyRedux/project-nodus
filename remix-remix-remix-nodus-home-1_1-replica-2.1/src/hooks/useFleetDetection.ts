import { useState, useEffect } from 'react';

export function useFleetDetection() {
  const [isFleetInstalled, setIsFleetInstalled] = useState(true);
  const [isTouchInstalled, setIsTouchInstalled] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).NodusNativeBridge) {
        const bridge = (window as any).NodusNativeBridge;
        if (typeof bridge.isPackageInstalled === 'function') {
          setIsFleetInstalled(bridge.isPackageInstalled('com.nodus.fleet'));
          setIsTouchInstalled(bridge.isPackageInstalled('com.nodus.touch'));
        }
      }
    } catch (_) {}
  }, []);

  return { isFleetInstalled, isTouchInstalled };
}
