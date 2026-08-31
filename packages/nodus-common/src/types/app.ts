// ─── App & UI Types ───────────────────────────────────────────
// Shared app, folder, and notification types for Nodus Home and overlays

export interface AppItem {
  id: string;
  name: string;
  iconName: string;
  color: string;
  category: 'system' | 'productivity' | 'media' | 'tools' | 'social' | 'games';
  badgeCount?: number;
  customIcon?: string;
  isRemovable?: boolean;
  folderId?: string | null;
  pageIndex: number;
  order: number;
  packageName?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  color: string;
  pageIndex: number;
  order: number;
  appIds: string[];
}

export interface NotificationItem {
  id: string;
  appId: string;
  appName: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  iconName: string;
  color: string;
}

export interface IconPackInfo {
  packageName: string;
  name: string;
  icon?: string;
}
