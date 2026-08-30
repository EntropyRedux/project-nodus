import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { DeviceProcess, SystemStats } from '../types/desktop';

export interface HotCornerConfig {
  enabled: boolean;
  hotspot_size: number;
  dwell_time_ms: number;
  cooldown_ms: number;
}

export const TauriService = {
  async getProcesses(): Promise<DeviceProcess[]> {
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
      console.warn('[TauriService] getProcesses error:', e);
      return [];
    }
  },

  async killProcess(pid: number): Promise<boolean> {
    try {
      return await invoke<boolean>('kill_process', { pid });
    } catch (e) {
      console.error(`[TauriService] killProcess(${pid}) error:`, e);
      return false;
    }
  },

  async lockWorkstation(): Promise<boolean> {
    try {
      return await invoke<boolean>('lock_workstation');
    } catch (e) {
      console.error('[TauriService] lockWorkstation error:', e);
      return false;
    }
  },

  async getSystemStats(): Promise<SystemStats | null> {
    try {
      return await invoke<SystemStats>('get_system_stats');
    } catch (e) {
      console.warn('[TauriService] getSystemStats error:', e);
      return null;
    }
  },

  async getHotCornerConfig(): Promise<HotCornerConfig | null> {
    try {
      return await invoke<HotCornerConfig>('get_hotcorner_config');
    } catch (e) {
      console.warn('[TauriService] getHotCornerConfig error:', e);
      return null;
    }
  },

  async setHotCornerEnabled(enabled: boolean): Promise<void> {
    try {
      await invoke('set_hotcorner_enabled', { enabled });
    } catch (e) {
      console.error('[TauriService] setHotCornerEnabled error:', e);
    }
  },

  async setClickThrough(ignore: boolean): Promise<void> {
    try {
      const win = getCurrentWindow();
      await win.setIgnoreCursorEvents(ignore);
    } catch (e) {
      // In web-browser dev mode this might fail safely
    }
  },

  async controlMedia(action: string): Promise<boolean> {
    try {
      return await invoke<boolean>('control_media', { action });
    } catch (e) {
      console.error(`[TauriService] controlMedia(${action}) error:`, e);
      return false;
    }
  },

  async getClipboardText(): Promise<string> {
    try {
      return await invoke<string>('get_clipboard_text');
    } catch (e) {
      console.warn('[TauriService] getClipboardText error:', e);
      return '';
    }
  },

  async setClipboardText(text: string): Promise<boolean> {
    try {
      return await invoke<boolean>('set_clipboard_text', { text });
    } catch (e) {
      console.error('[TauriService] setClipboardText error:', e);
      return false;
    }
  },

  async executeLocalCommand(commandOrPath: string, args?: string, workingDir?: string): Promise<boolean> {
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
    try {
      return await invoke<boolean>('simulate_mouse_move', { dx, dy });
    } catch (e) {
      console.error('[TauriService] simulateMouseMove error:', e);
      return false;
    }
  },

  async simulateMouseClick(button: string): Promise<boolean> {
    try {
      return await invoke<boolean>('simulate_mouse_click', { button });
    } catch (e) {
      console.error(`[TauriService] simulateMouseClick(${button}) error:`, e);
      return false;
    }
  },

  async simulateMouseScroll(dx?: number, dy?: number): Promise<boolean> {
    try {
      return await invoke<boolean>('simulate_mouse_scroll', { dx, dy });
    } catch (e) {
      console.error('[TauriService] simulateMouseScroll error:', e);
      return false;
    }
  },

  async simulateHotkey(keys: string[]): Promise<boolean> {
    try {
      return await invoke<boolean>('simulate_hotkey', { keys });
    } catch (e) {
      console.error(`[TauriService] simulateHotkey(${keys.join('+')}) error:`, e);
      return false;
    }
  },

  async simulateText(text: string): Promise<boolean> {
    try {
      return await invoke<boolean>('simulate_text', { text });
    } catch (e) {
      console.error('[TauriService] simulateText error:', e);
      return false;
    }
  },
};
