import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ClipboardItem } from '../types/launcher';
import { getDeviceColor } from '../utils/constants';
import { audio } from '../utils/audio';
import { universalNetworkFetch } from '../services/FleetDirectClient';
import { useSystemSettings } from './SystemSettingsContext';
import { useFleet } from './FleetContext';

export interface ClipboardContextType {
  clipboardItems: ClipboardItem[];
  addClipboardItem: (item: {
    text: string;
    deviceId?: string;
    type?: 'text' | 'link' | 'code' | 'snippet' | 'image';
    imageData?: string;
  }) => void;
  removeClipboardItem: (id: string) => void;
  togglePinClipboardItem: (id: string) => void;
  clearClipboardHistory: () => void;
  clearFleetClipboard: () => void;
  copyClipboardItem: (item: ClipboardItem) => void;
  isClipboardOpen: boolean;
  setClipboardOpen: (val: boolean) => void;
  toggleClipboardPanel: () => void;
}

export const ClipboardContext = createContext<ClipboardContextType | null>(null);

export const ClipboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification } = useSystemSettings();
  const { devices, activeDeviceId, activeDevice } = useFleet();

  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [isClipboardOpen, setClipboardOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_launcher_clipboard_open');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const lastLocalTabletClipRef = useRef<string>('');
  const lastRemoteClipsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_clipboard_open', JSON.stringify(isClipboardOpen));
    } catch (_) {}
  }, [isClipboardOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_clipboard', JSON.stringify(clipboardItems));
    } catch (_) {}
  }, [clipboardItems]);

  const toggleClipboardPanel = useCallback(() => {
    audio.playTap();
    setClipboardOpen((prev) => !prev);
  }, []);

  const copyClipboardItem = useCallback((item: ClipboardItem) => {
    audio.playTap();
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge) {
        if (item.type === 'image' && item.imageData && typeof bridge.copyImageToClipboard === 'function') {
          bridge.copyImageToClipboard(item.imageData);
        } else if (item.text && typeof bridge.copyToClipboard === 'function') {
          bridge.copyToClipboard(item.text);
        }
      } else if (navigator.clipboard && item.text) {
        navigator.clipboard.writeText(item.text).catch(() => {});
      }
    } catch (_) {}
  }, []);

  const addClipboardItem = useCallback(
    (item: {
      text: string;
      deviceId?: string;
      type?: 'text' | 'link' | 'code' | 'snippet' | 'image';
      imageData?: string;
    }) => {
      if (!item.text.trim() && !item.imageData) return;
      const devId = item.deviceId || activeDeviceId || 'this-tablet';
      const targetDev = devices.find((d) => d.id === devId) || activeDevice || {
        id: 'this-tablet',
        name: 'Tablet (POCO Pad)',
        type: 'tablet' as const,
        os: 'Android 14',
      };
      const devColor = getDeviceColor(targetDev.id || 'tablet', targetDev.type || 'tablet', targetDev.os);

      let inferredType: 'text' | 'link' | 'code' | 'snippet' | 'image' = item.type || (item.imageData ? 'image' : 'text');
      if (!item.type && !item.imageData) {
        if (item.text.startsWith('http://') || item.text.startsWith('https://')) {
          inferredType = 'link';
        } else if (
          item.text.includes(';') ||
          item.text.includes('&&') ||
          item.text.startsWith('adb') ||
          item.text.startsWith('curl') ||
          item.text.startsWith('git')
        ) {
          inferredType = 'code';
        } else if (item.text.length > 80) {
          inferredType = 'snippet';
        }
      }

      const rawKey = item.imageData ? item.imageData.substring(0, 80) : item.text.trim();
      if (devId === 'this-tablet' || devId.includes('tablet')) {
        lastLocalTabletClipRef.current = rawKey;
      } else {
        lastRemoteClipsRef.current[devId] = rawKey;
      }

      const newItem: ClipboardItem = {
        id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        text: item.text.trim() || (item.imageData ? 'Image' : ''),
        deviceId: devId,
        deviceName: targetDev.name || 'Tablet',
        deviceType: targetDev.type || 'tablet',
        deviceColor: devColor,
        type: inferredType,
        imageData: item.imageData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false,
      };

      setClipboardItems((prev) => {
        // Prevent duplicate consecutive entries
        if (prev.length > 0) {
          const first = prev[0];
          if (first.text === newItem.text && first.imageData === newItem.imageData) {
            return prev;
          }
        }
        return [newItem, ...prev].slice(0, 100);
      });

      for (const dev of devices) {
        if (
          dev.ipAddress &&
          (dev.type === 'desktop' || dev.type === 'laptop' || dev.id === 'this-pc' || dev.id === 'tab-pc' || dev.id === 'desktop-pc')
        ) {
          universalNetworkFetch(`http://${dev.ipAddress}/api/clipboard`, {
            method: 'POST',
            body: {
              text: newItem.text,
              image_data: newItem.imageData,
            },
            timeoutMs: 2500,
          }).catch(() => {});
        }
      }

      addNotification({
        appId: 'settings',
        appName: 'Universal Clipboard',
        title: `Synced from ${targetDev.name || 'Device'}`,
        message: `${newItem.text.length > 45 ? newItem.text.substring(0, 45) + '...' : newItem.text}`,
        iconName: 'Clipboard',
        color: devColor,
      });
    },
    [activeDeviceId, devices, activeDevice, addNotification]
  );

  const removeClipboardItem = useCallback((id: string) => {
    audio.playTap();
    setClipboardItems((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const togglePinClipboardItem = useCallback((id: string) => {
    audio.playTap();
    setClipboardItems((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
  }, []);

  const clearClipboardHistory = useCallback(() => {
    audio.playTap();
    setClipboardItems((prev) => prev.filter((c) => c.pinned));
  }, []);

  const clearFleetClipboard = useCallback(() => {
    audio.playTap();
    setClipboardItems([]);
  }, []);

  // Real-time Native Android Clipboard Event Listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__nodusOnNativeClipboardChange = (payload: { type: string; text?: string; imageData?: string }) => {
      if (!payload || payload.type === 'empty') return;
      const isImage = payload.type === 'image' && typeof payload.imageData === 'string';
      const text = (payload.text || '').trim();
      const clipKey = isImage ? payload.imageData.substring(0, 80) : text;

      if (clipKey && clipKey !== lastLocalTabletClipRef.current) {
        lastLocalTabletClipRef.current = clipKey;
        addClipboardItem({
          text: isImage ? 'Image' : text,
          deviceId: 'this-tablet',
          type: isImage ? 'image' : 'text',
          imageData: isImage ? payload.imageData : undefined,
        });
      }
    };

    return () => {
      delete (window as any).__nodusOnNativeClipboardChange;
    };
  }, [addClipboardItem]);

  // Poller for remote Windows PC and local Android tablet clipboard changes
  useEffect(() => {
    const checkClipboard = async () => {
      // 1. Check local Android tablet clipboard
      try {
        const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
        if (bridge && typeof bridge.getPrimaryClipboard === 'function') {
          const raw = bridge.getPrimaryClipboard();
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.type && parsed.type !== 'empty') {
              const isImage = parsed.type === 'image' && typeof parsed.imageData === 'string';
              const text = (parsed.text || '').trim();
              const clipKey = isImage ? parsed.imageData.substring(0, 80) : text;

              if (clipKey && clipKey !== lastLocalTabletClipRef.current) {
                lastLocalTabletClipRef.current = clipKey;
                addClipboardItem({
                  text: isImage ? 'Image' : text,
                  deviceId: 'this-tablet',
                  type: isImage ? 'image' : 'text',
                  imageData: isImage ? parsed.imageData : undefined,
                });
              }
            }
          }
        }
      } catch (_) {}

      // 2. Check remote desktop/laptop nodes
      for (const dev of devices) {
        if (
          dev.ipAddress &&
          (dev.type === 'desktop' || dev.type === 'laptop' || dev.id === 'this-pc' || dev.id === 'tab-pc' || dev.id === 'desktop-pc')
        ) {
          try {
            const clipRes = await universalNetworkFetch(`http://${dev.ipAddress}/api/clipboard`, {
              method: 'GET',
              timeoutMs: 2000,
            });
            if (clipRes.ok && clipRes.data) {
              const rawData = clipRes.data.data || clipRes.data;
              const isImage = (rawData.type === 'image' || rawData.content_type === 'image') && 
                typeof (rawData.imageData || rawData.image_data) === 'string';
              const text = (rawData.text || '').trim();
              const imgData = rawData.imageData || rawData.image_data;
              const clipKey = isImage ? imgData.substring(0, 80) : text;
              const lastRemoteKey = lastRemoteClipsRef.current[dev.id] || '';

              if (clipKey && clipKey !== lastRemoteKey) {
                lastRemoteClipsRef.current[dev.id] = clipKey;

                let inferredType: 'text' | 'link' | 'code' | 'snippet' | 'image' = isImage ? 'image' : 'text';
                if (!isImage) {
                  if (text.startsWith('http://') || text.startsWith('https://')) {
                    inferredType = 'link';
                  } else if (
                    text.includes(';') ||
                    text.includes('&&') ||
                    text.startsWith('adb') ||
                    text.startsWith('curl') ||
                    text.startsWith('git')
                  ) {
                    inferredType = 'code';
                  } else if (text.length > 80) {
                    inferredType = 'snippet';
                  }
                }

                const devColor = getDeviceColor(dev.id, dev.type, dev.os);

                const newItem: ClipboardItem = {
                  id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  text: isImage ? 'Image' : text,
                  deviceId: dev.id,
                  deviceName: dev.name,
                  deviceType: dev.type,
                  deviceColor: devColor,
                  type: inferredType,
                  imageData: isImage ? clipRes.data.imageData : undefined,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  pinned: false,
                };
                setClipboardItems((prev) => {
                  if (prev.length > 0) {
                    const first = prev[0];
                    if (first.text === newItem.text && first.imageData === newItem.imageData) {
                      return prev;
                    }
                  }
                  return [newItem, ...prev].slice(0, 100);
                });
              }
            }
          } catch (_) {}
        }
      }
    };

    const timer = setInterval(checkClipboard, 1000);
    return () => clearInterval(timer);
  }, [devices, addClipboardItem]);

  return (
    <ClipboardContext.Provider
      value={{
        clipboardItems,
        addClipboardItem,
        removeClipboardItem,
        togglePinClipboardItem,
        clearClipboardHistory,
        clearFleetClipboard,
        copyClipboardItem,
        isClipboardOpen,
        setClipboardOpen,
        toggleClipboardPanel,
      }}
    >
      {children}
    </ClipboardContext.Provider>
  );
};

export const useClipboard = () => {
  const context = useContext(ClipboardContext);
  if (!context) {
    throw new Error('useClipboard must be used within a ClipboardProvider');
  }
  return context;
};
