// Client bridge interface to native Android/Windows bridge or mock layer
export interface NativeBridge {
  getInstalledIconPacks?: () => string;
  openAppSettings?: (packageName: string) => boolean;
  openNotifications?: () => boolean;
  launchNotification?: (id: string) => boolean;
  launchApp?: (packageName: string) => boolean;
  hasNotificationListenerPermission?: () => boolean;
  requestNotificationListenerPermission?: () => boolean;
  copyToNativeClipboard?: (text: string) => boolean;
  copyImageToClipboard?: (base64Image: string) => boolean;
  readNativeClipboard?: () => string;
  triggerHapticFeedback?: (type: string) => void;
  rebootSystem?: () => boolean;
  lockSystem?: () => boolean;
}

export function getNativeBridge(): NativeBridge | null {
  if (typeof window !== 'undefined' && (window as any).NodusNativeBridge) {
    return (window as any).NodusNativeBridge as NativeBridge;
  }
  return null;
}

/**
 * Universal safe execution wrapper with graceful degradation
 */
export const nativeBridgeUtils = {
  copyText: (text: string): boolean => {
    const bridge = getNativeBridge();
    if (bridge?.copyToNativeClipboard) {
      try {
        return bridge.copyToNativeClipboard(text);
      } catch (err) {
        console.warn('Native clipboard copy failed, falling back to browser API:', err);
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
      return true;
    }
    return false;
  },

  copyImage: (base64Data: string): boolean => {
    const bridge = getNativeBridge();
    if (bridge?.copyImageToClipboard) {
      try {
        return bridge.copyImageToClipboard(base64Data);
      } catch (err) {
        console.warn('Native image copy failed:', err);
      }
    }
    return false;
  },

  getInstalledIconPacks: (): Array<{ packageName: string; label: string }> => {
    const bridge = getNativeBridge();
    if (bridge?.getInstalledIconPacks) {
      try {
        const raw = bridge.getInstalledIconPacks();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) {
        console.warn('Failed parsing native icon packs:', err);
      }
    }
    return [];
  },

  launchApp: (packageName: string): boolean => {
    const bridge = getNativeBridge();
    if (bridge?.launchApp) {
      try {
        return bridge.launchApp(packageName);
      } catch (err) {
        console.warn(`Native launchApp failed for ${packageName}:`, err);
      }
    }
    return false;
  },

  openNotifications: (): boolean => {
    const bridge = getNativeBridge();
    if (bridge?.openNotifications) {
      try {
        return bridge.openNotifications();
      } catch (err) {
        console.warn('Native openNotifications failed:', err);
      }
    }
    return false;
  },

  triggerHaptic: (type: 'tick' | 'click' | 'heavy' | 'selection' = 'click') => {
    const bridge = getNativeBridge();
    if (bridge?.triggerHapticFeedback) {
      try {
        bridge.triggerHapticFeedback(type);
        return;
      } catch (err) {
        console.warn('Native triggerHapticFeedback failed:', err);
      }
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(type === 'heavy' ? 40 : 15);
      } catch (_) {}
    }
  },
};

