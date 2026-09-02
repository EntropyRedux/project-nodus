import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { DeviceProcess, SystemStats } from '../types/desktop';

export interface HotCornerConfig {
  enabled: boolean;
  hotspot_size: number;
  dwell_time_ms: number;
  cooldown_ms: number;
}

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
};

const MOCK_PROCESSES: DeviceProcess[] = [
  { pid: 4820, name: 'code.exe', memoryMb: 820, cpu: 3.4, category: 'user', user: 'Developer', status: 'running', description: 'Visual Studio Code IDE' },
  { pid: 8192, name: 'chrome.exe', memoryMb: 1450, cpu: 5.2, category: 'user', user: 'Developer', status: 'running', description: 'Google Chrome Browser' },
  { pid: 1204, name: 'node.exe', memoryMb: 340, cpu: 1.8, category: 'user', user: 'Developer', status: 'running', description: 'Node.js Runtime Worker' },
  { pid: 9120, name: 'nodus-hub.exe', memoryMb: 128, cpu: 0.6, category: 'daemon', user: 'SYSTEM', status: 'running', description: 'Nodus Fleet Bridge Daemon' },
  { pid: 6540, name: 'spotify.exe', memoryMb: 260, cpu: 0.9, category: 'user', user: 'Developer', status: 'running', description: 'Spotify Music Streaming' },
  { pid: 3120, name: 'explorer.exe', memoryMb: 195, cpu: 0.4, category: 'system', user: 'SYSTEM', status: 'running', description: 'Windows Desktop Shell' },
];

const MOCK_SYSTEM_STATS: SystemStats = {
  hostname: 'Nodus-Workstation-PC',
  os: 'Windows 11 Pro 23H2 (x64)',
  cpu_load_percent: 18,
  ram_used_mb: 8420,
  ram_total_mb: 32768,
  uptime_seconds: 43200,
};

export const TauriService = {
  async getProcesses(): Promise<DeviceProcess[]> {
    if (!isTauri()) {
      return MOCK_PROCESSES;
    }
    try {
      const raw = await invoke<{ pid: number; name: string; memory_kb: number; category?: string; user?: string; cpu?: number }[]>('get_processes');
      return raw.map((p) => ({
        pid: p.pid,
        name: p.name,
        memoryMb: Math.round(p.memory_kb / 1024),
        category: (p.category as any) || 'user',
        user: p.user || 'User',
        cpu: p.cpu || 0,
        status: 'running' as const,
      }));
    } catch (e) {
      console.error('[TauriService] getProcesses error:', e);
      return [];
    }
  },

  async killProcess(pid: number): Promise<boolean> {
    if (!isTauri()) {
      console.log(`[WebPreview] Simulated process kill: ${pid}`);
      return true;
    }
    try {
      return await invoke<boolean>('kill_process', { pid });
    } catch (e) {
      console.error(`[TauriService] killProcess(${pid}) error:`, e);
      return false;
    }
  },

  async lockWorkstation(): Promise<boolean> {
    if (!isTauri()) {
      console.log('[WebPreview] Simulated lock workstation');
      return true;
    }
    try {
      return await invoke<boolean>('lock_workstation');
    } catch (e) {
      console.error('[TauriService] lockWorkstation error:', e);
      return false;
    }
  },

  async getSystemStats(): Promise<SystemStats | null> {
    if (!isTauri()) {
      return MOCK_SYSTEM_STATS;
    }
    try {
      return await invoke<SystemStats>('get_system_stats');
    } catch (e) {
      console.error('[TauriService] getSystemStats error:', e);
      return null;
    }
  },

  async getHotCornerConfig(): Promise<HotCornerConfig | null> {
    if (!isTauri()) {
      return { enabled: true, hotspot_size: 8, dwell_time_ms: 180, cooldown_ms: 500 };
    }
    try {
      return await invoke<HotCornerConfig>('get_hotcorner_config');
    } catch (e) {
      console.warn('[TauriService] getHotCornerConfig error:', e);
      return { enabled: true, hotspot_size: 8, dwell_time_ms: 180, cooldown_ms: 500 };
    }
  },

  async setHotCornerEnabled(enabled: boolean): Promise<void> {
    if (!isTauri()) return;
    try {
      await invoke('set_hotcorner_enabled', { enabled });
    } catch (e) {
      console.error('[TauriService] setHotCornerEnabled error:', e);
    }
  },

  async setClickThrough(ignore: boolean): Promise<void> {
    if (!isTauri()) return;
    try {
      const win = getCurrentWindow();
      await win.setIgnoreCursorEvents(ignore);
    } catch (e) {
      // Safe fallback
    }
  },

  async controlMedia(action: string): Promise<boolean> {
    if (!isTauri()) {
      console.log(`[WebPreview] Simulated media control: ${action}`);
      return true;
    }
    try {
      return await invoke<boolean>('control_media', { action });
    } catch (e) {
      console.error(`[TauriService] controlMedia(${action}) error:`, e);
      return false;
    }
  },

  async getClipboardText(): Promise<string> {
    if (!isTauri()) {
      return 'Nodus Companion live clipboard sync ready.';
    }
    try {
      return await invoke<string>('get_clipboard_text');
    } catch (e) {
      console.warn('[TauriService] getClipboardText error:', e);
      return '';
    }
  },

  async setClipboardText(text: string): Promise<boolean> {
    if (!isTauri()) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      return true;
    }
    try {
      return await invoke<boolean>('set_clipboard_text', { text });
    } catch (e) {
      console.error('[TauriService] setClipboardText error:', e);
      return false;
    }
  },

  async getClipboardImage(): Promise<string | null> {
    if (!isTauri()) return null;
    try {
      return await invoke<string | null>('get_clipboard_image');
    } catch (e) {
      return null;
    }
  },

  async setClipboardImage(base64Png: string): Promise<boolean> {
    if (!isTauri()) return true;
    try {
      return await invoke<boolean>('set_clipboard_image', { base64Png });
    } catch (e) {
      console.error('[TauriService] setClipboardImage error:', e);
      return false;
    }
  },

  async getClipboardContent(): Promise<{ content_type: string; text?: string; image_data?: string }> {
    if (!isTauri()) {
      return { content_type: 'text', text: 'Simulated clipboard payload' };
    }
    try {
      return await invoke<{ content_type: string; text?: string; image_data?: string }>('get_clipboard_content');
    } catch (e) {
      return { content_type: 'text', text: '' };
    }
  },

  async executeLocalCommand(commandOrPath: string, args?: string, workingDir?: string): Promise<boolean> {
    if (!isTauri()) {
      console.log(`[WebPreview] Simulated local execution: ${commandOrPath} ${args || ''}`);
      return true;
    }
    try {
      return await invoke<boolean>('execute_local_command', {
        req: {
          command_or_path: commandOrPath,
          args,
          working_dir: workingDir,
        },
      });
    } catch (e) {
      console.error(`[TauriService] executeLocalCommand(${commandOrPath}) error:`, e);
      return false;
    }
  },

  async simulateMouseMove(dx: number, dy: number): Promise<boolean> {
    if (!isTauri()) return true;
    try {
      return await invoke<boolean>('simulate_mouse_move', { dx, dy });
    } catch (e) {
      return false;
    }
  },

  async simulateMouseClick(button: string): Promise<boolean> {
    if (!isTauri()) return true;
    try {
      return await invoke<boolean>('simulate_mouse_click', { button });
    } catch (e) {
      return false;
    }
  },

  async simulateMouseScroll(dx?: number, dy?: number): Promise<boolean> {
    if (!isTauri()) return true;
    try {
      return await invoke<boolean>('simulate_mouse_scroll', { dx, dy });
    } catch (e) {
      return false;
    }
  },

  async simulateHotkey(keys: string[]): Promise<boolean> {
    if (!isTauri()) {
      console.log(`[WebPreview] Simulated hotkey: ${keys.join('+')}`);
      return true;
    }
    try {
      return await invoke<boolean>('simulate_hotkey', { keys });
    } catch (e) {
      return false;
    }
  },

  async simulateText(text: string): Promise<boolean> {
    if (!isTauri()) return true;
    try {
      return await invoke<boolean>('simulate_text', { text });
    } catch (e) {
      return false;
    }
  },

  async getInstalledApps(): Promise<any[]> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://localhost:9120/api/shortcuts/installed');
        if (res.ok) {
          const data = await res.json();
          return data.apps || [];
        }
      } catch (_) {}
      return [];
    }
    try {
      return await invoke<any[]>('get_installed_windows_apps');
    } catch (e) {
      console.error('[TauriService] getInstalledApps error:', e);
      return [];
    }
  },

  async scanShortcutsFolder(folderPath: string): Promise<any[]> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://localhost:9120/api/shortcuts/folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: folderPath }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.apps || [];
        }
      } catch (_) {}
      return [];
    }
    try {
      return await invoke<any[]>('scan_shortcuts_folder', { folderPath });
    } catch (e) {
      console.error(`[TauriService] scanShortcutsFolder(${folderPath}) error:`, e);
      return [];
    }
  },

  async getSharedShortcuts(): Promise<any[]> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://localhost:9120/api/shortcuts');
        if (res.ok) {
          const data = await res.json();
          return data.apps || data.shortcuts || [];
        }
      } catch (_) {}
      return [];
    }
    try {
      return await invoke<any[]>('get_shared_shortcuts');
    } catch (e) {
      console.error('[TauriService] getSharedShortcuts error:', e);
      return [];
    }
  },

  async setSharedShortcuts(shortcuts: any[]): Promise<void> {
    if (!isTauri()) {
      try {
        await fetch('http://localhost:9120/api/shortcuts/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shortcuts),
        });
      } catch (_) {}
      return;
    }
    try {
      await invoke('set_shared_shortcuts', { shortcuts });
    } catch (e) {
      console.error('[TauriService] setSharedShortcuts error:', e);
    }
  },

  async addWatchedFolder(path: string): Promise<any[]> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://localhost:9120/api/shortcuts/watched/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.apps || [];
        }
      } catch (_) {}
      return [];
    }
    try {
      return await invoke<any[]>('add_watched_folder', { path });
    } catch (e) {
      console.error(`[TauriService] addWatchedFolder(${path}) error:`, e);
      return [];
    }
  },

  async getWatchedFolders(): Promise<string[]> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://localhost:9120/api/shortcuts/watched');
        if (res.ok) {
          const data = await res.json();
          return data.watched_folders || [];
        }
      } catch (_) {}
      return [];
    }
    try {
      return await invoke<string[]>('get_watched_folders');
    } catch (e) {
      console.error('[TauriService] getWatchedFolders error:', e);
      return [];
    }
  },

  async removeWatchedFolder(path: string): Promise<string[]> {
    if (!isTauri()) return [];
    try {
      return await invoke<string[]>('remove_watched_folder', { path });
    } catch (e) {
      console.error(`[TauriService] removeWatchedFolder(${path}) error:`, e);
      return [];
    }
  },

  async getDiscoveredDevices(): Promise<any[]> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://localhost:9120/api/fleet/devices');
        if (res.ok) {
          const data = await res.json();
          return data.devices || [];
        }
      } catch (_) {}
      return [];
    }
    try {
      return await invoke<any[]>('get_discovered_devices');
    } catch (e) {
      console.error('[TauriService] getDiscoveredDevices error:', e);
      return [];
    }
  },
};

