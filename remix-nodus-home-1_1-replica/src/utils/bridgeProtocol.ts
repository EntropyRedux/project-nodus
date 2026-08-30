// Client bridge interface to native Android/Windows bridge or mock layer
export interface NativeBridge {
  getInstalledIconPacks?: () => string;
  openAppSettings?: (packageName: string) => boolean;
  openNotifications?: () => boolean;
  launchNotification?: (id: string) => boolean;
  hasNotificationListenerPermission?: () => boolean;
  requestNotificationListenerPermission?: () => boolean;
  copyToNativeClipboard?: (text: string) => boolean;
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
