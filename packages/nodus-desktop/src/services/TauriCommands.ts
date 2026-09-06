import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
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

export const TauriService = {
  async getProcesses(): Promise<DeviceProcess[]> {
    if (!isTauri()) {
      return [];
    }
    try {
      const raw = await invoke<{
        pid: number;
        parent_pid?: number;
        parent_name?: string;
        name: string;
        memory_kb: number;
        category?: string;
        user?: string;
        cpu?: number;
      }[]>('get_processes');
      return raw.map((p) => ({
        pid: p.pid,
        parentPid: p.parent_pid,
        parentName: p.parent_name,
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
      return false;
    }
    try {
      return await invoke<boolean>('kill_process', { pid });
    } catch (e) {
      console.error(`[TauriService] killProcess(${pid}) error:`, e);
      return false;
    }
  },

  async getRemoteProcesses(ip: string, port = 9120, token = 'NODUS-FLEET-SECURE'): Promise<DeviceProcess[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`http://${ip}:${port}/api/processes`, {
        method: 'GET',
        headers: {
          'X-Nodus-Auth-Token': token,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const raw = data.processes || [];
        return raw.map((p: any) => ({
          pid: p.pid,
          parentPid: p.parent_pid,
          parentName: p.parent_name,
          name: p.name,
          memoryMb: p.memory_kb ? Math.round(p.memory_kb / 1024) : (p.memoryMb || 0),
          category: (p.category as any) || 'user',
          user: p.user || 'User',
          cpu: p.cpu || 0,
          status: 'running' as const,
        }));
      }
    } catch (e) {
      console.warn(`[TauriService] getRemoteProcesses(${ip}:${port}) failed:`, e);
    }
    return [];
  },

  async killRemoteProcess(ip: string, port = 9120, pid: number, token = 'NODUS-FLEET-SECURE'): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`http://${ip}:${port}/api/process/kill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nodus-Auth-Token': token,
        },
        body: JSON.stringify({ pid }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return data.status === 'success';
      }
    } catch (e) {
      console.warn(`[TauriService] killRemoteProcess(${ip}:${port}, pid=${pid}) error:`, e);
    }
    return false;
  },

  async lockWorkstation(): Promise<boolean> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://127.0.0.1:9120/api/system/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ action: 'lock' }),
        });
        return res.ok;
      } catch (_) {
        return false;
      }
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
      return null;
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
      try {
        const res = await fetch('http://127.0.0.1:9120/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ action }),
        });
        return res.ok;
      } catch (_) {
        return true;
      }
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
      try {
        const res = await fetch('http://127.0.0.1:9120/api/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ command_or_path: commandOrPath, args, working_dir: workingDir }),
        });
        return res.ok;
      } catch (_) {
        return true;
      }
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
    if (!isTauri()) {
      try {
        const res = await fetch('http://127.0.0.1:9120/api/input/mouse/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ dx, dy }),
        });
        return res.ok;
      } catch (_) {
        return true;
      }
    }
    try {
      return await invoke<boolean>('simulate_mouse_move', { dx, dy });
    } catch (e) {
      return false;
    }
  },

  async simulateMouseClick(button: string): Promise<boolean> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://127.0.0.1:9120/api/input/mouse/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ button }),
        });
        return res.ok;
      } catch (_) {
        return true;
      }
    }
    try {
      return await invoke<boolean>('simulate_mouse_click', { button });
    } catch (e) {
      return false;
    }
  },

  async simulateMouseScroll(dx?: number, dy?: number): Promise<boolean> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://127.0.0.1:9120/api/input/mouse/scroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ dx, dy }),
        });
        return res.ok;
      } catch (_) {
        return true;
      }
    }
    try {
      return await invoke<boolean>('simulate_mouse_scroll', { dx, dy });
    } catch (e) {
      return false;
    }
  },

  async simulateHotkey(keys: string[]): Promise<boolean> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://127.0.0.1:9120/api/input/keyboard/hotkey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ keys }),
        });
        return res.ok;
      } catch (_) {
        return true;
      }
    }
    try {
      return await invoke<boolean>('simulate_hotkey', { keys });
    } catch (e) {
      return false;
    }
  },

  async simulateText(text: string): Promise<boolean> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://127.0.0.1:9120/api/input/keyboard/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
          body: JSON.stringify({ text }),
        });
        return res.ok;
      } catch (_) {
        return true;
      }
    }
    try {
      return await invoke<boolean>('simulate_text', { text });
    } catch (e) {
      return false;
    }
  },

  async extractAppIcon(path: string): Promise<string | null> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://localhost:9120/api/shortcuts/icon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.icon || null;
        }
      } catch (_) {}
      return null;
    }
    try {
      return await invoke<string>('extract_app_icon', { path });
    } catch (e) {
      return null;
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
    if (!isTauri()) {
      try {
        const res = await fetch('http://localhost:9120/api/shortcuts/watched/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.watched_folders || [];
        }
      } catch (_) {}
      return [];
    }
    try {
      return await invoke<string[]>('remove_watched_folder', { path });
    } catch (e) {
      console.error(`[TauriService] removeWatchedFolder(${path}) error:`, e);
      return [];
    }
  },

  async rescanWatchedFolders(): Promise<any[]> {
    if (!isTauri()) {
      try {
        const res = await fetch('http://localhost:9120/api/shortcuts/watched/rescan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          return data.shortcuts || [];
        }
      } catch (_) {}
      return [];
    }
    try {
      return await invoke<any[]>('rescan_all_watched_folders');
    } catch (e) {
      console.error('[TauriService] rescanWatchedFolders error:', e);
      return [];
    }
  },

  async listenShortcutsUpdated(callback: (shortcuts: any[]) => void): Promise<UnlistenFn> {
    if (!isTauri()) return () => {};
    return await listen<any[]>('shortcuts_updated', (event) => {
      callback(event.payload);
    });
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

  async unregisterNode(id: string): Promise<boolean> {
    if (!isTauri()) return true;
    try {
      return await invoke<boolean>('unregister_node', { id });
    } catch (e) {
      console.error(`[TauriService] unregisterNode(${id}) error:`, e);
      return false;
    }
  },

  async scanSubnet(subnetBase: string): Promise<any[]> {
    if (!isTauri()) {
      return [];
    }
    try {
      return await invoke<any[]>('scan_subnet', { subnetBase });
    } catch (e) {
      console.error('[TauriService] scanSubnet error:', e);
      return [];
    }
  },

  async getLanDeviceCount(subnetBase?: string): Promise<number> {
    if (!isTauri()) {
      return 0;
    }
    try {
      return await invoke<number>('get_lan_device_count', { subnetBase });
    } catch (e) {
      console.error('[TauriService] getLanDeviceCount error:', e);
      return 0;
    }
  },

  async getServerStatus(): Promise<{ running: boolean; port: number }> {
    if (!isTauri()) return { running: true, port: 9120 };
    try {
      return await invoke<{ running: boolean; port: number }>('get_server_status');
    } catch (e) {
      console.error('[TauriService] getServerStatus error:', e);
      return { running: false, port: 9120 };
    }
  },

  async setServerRunning(running: boolean, port?: number): Promise<boolean> {
    if (!isTauri()) return running;
    try {
      return await invoke<boolean>('set_server_running', { running, port });
    } catch (e) {
      console.error('[TauriService] setServerRunning error:', e);
      return false;
    }
  },

  async getDefaultWorkingDir(): Promise<string> {
    if (!isTauri()) return 'C:\\Users\\Workstation';
    try {
      return await invoke<string>('get_default_working_dir');
    } catch {
      return 'C:\\';
    }
  },

  async runTerminalCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exit_code: number; success: boolean; cwd?: string }> {
    if (!isTauri()) {
      return {
        stdout: `Simulated local command output for '${command}'`,
        stderr: '',
        exit_code: 0,
        success: true,
        cwd,
      };
    }
    try {
      return await invoke<{ stdout: string; stderr: string; exit_code: number; success: boolean; cwd?: string }>('run_terminal_command', {
        command,
        cwd,
      });
    } catch (e: any) {
      return {
        stdout: '',
        stderr: String(e || 'Command execution error'),
        exit_code: 1,
        success: false,
        cwd,
      };
    }
  },

  async runRemoteTerminalCommand(
    ip: string,
    port = 9120,
    command: string,
    cwd?: string,
    token = 'NODUS-FLEET-SECURE'
  ): Promise<{ stdout: string; stderr: string; exit_code: number; success: boolean; cwd?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`http://${ip}:${port}/api/terminal/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nodus-Auth-Token': token,
        },
        body: JSON.stringify({ command, cwd }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return {
          stdout: data.stdout || '',
          stderr: data.stderr || '',
          exit_code: data.exit_code ?? 0,
          success: data.success ?? true,
          cwd: data.cwd || cwd,
        };
      }
      const errText = await res.text();
      return {
        stdout: '',
        stderr: `Remote execution failed HTTP ${res.status}: ${errText}`,
        exit_code: res.status,
        success: false,
        cwd,
      };
    } catch (e: any) {
      return {
        stdout: '',
        stderr: `Remote connection error: ${e?.message || e}`,
        exit_code: -1,
        success: false,
        cwd,
      };
    }
  },

  // Interactive ConPTY / PTY Streaming Engine
  async spawnPty(
    sessionId: string,
    cols = 80,
    rows = 24,
    cwd?: string,
    shell?: string
  ): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      return await invoke<boolean>('spawn_pty', {
        req: {
          session_id: sessionId,
          cols,
          rows,
          cwd,
          shell,
        },
      });
    } catch (e) {
      console.error(`[TauriService] spawnPty(${sessionId}) error:`, e);
      return false;
    }
  },

  async writePty(sessionId: string, data: string): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      return await invoke<boolean>('write_pty', {
        sessionId,
        data,
      });
    } catch (e) {
      console.error(`[TauriService] writePty(${sessionId}) error:`, e);
      return false;
    }
  },

  async resizePty(sessionId: string, cols: number, rows: number): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      return await invoke<boolean>('resize_pty', {
        sessionId,
        cols,
        rows,
      });
    } catch (e) {
      return false;
    }
  },

  async killPty(sessionId: string): Promise<boolean> {
    if (!isTauri()) return true;
    try {
      return await invoke<boolean>('kill_pty', { sessionId });
    } catch (e) {
      return false;
    }
  },

  async listenPtyData(sessionId: string, callback: (data: string) => void): Promise<UnlistenFn> {
    if (!isTauri()) return () => {};
    return await listen<string>(`pty:data:${sessionId}`, (event) => {
      callback(event.payload);
    });
  },

  async listenPtyExit(sessionId: string, callback: () => void): Promise<UnlistenFn> {
    if (!isTauri()) return () => {};
    return await listen(`pty:exit:${sessionId}`, () => {
      callback();
    });
  },
};



