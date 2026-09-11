import { create } from 'zustand';
import { RemoteExecutable } from '../types/desktop';
import { TauriService } from '../services/TauriCommands';

interface ExecutableState {
  executables: RemoteExecutable[];
  loadShortcuts: () => Promise<void>;
  addExecutable: (item: Omit<RemoteExecutable, 'id'>) => void;
  updateExecutable: (id: string, partial: Partial<RemoteExecutable>) => void;
  deleteExecutable: (id: string) => void;
  executeShortcut: (shortcut: RemoteExecutable) => Promise<boolean>;
}

export const useExecutableStore = create<ExecutableState>((set, get) => ({
  executables: (() => {
    try {
      const stored = localStorage.getItem('nodus_desktop_shortcuts');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return [];
  })(),

  loadShortcuts: async () => {
    try {
      const current = get().executables;
      if (current.length === 0) {
        const shared = await TauriService.getSharedShortcuts();
        if (Array.isArray(shared) && shared.length > 0) {
          const mapped: RemoteExecutable[] = shared.map((s: any) => ({
            id: s.id || `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            deviceId: 'this-pc',
            deviceName: 'Host Workstation PC',
            deviceType: 'desktop',
            deviceOs: 'windows',
            name: s.name,
            description: s.description || '',
            category: s.category || 'tools',
            iconName: s.icon_name || 'Code',
            iconColor: s.icon_color || '#0EA5E9',
            icon_base64: s.icon_base64,
            execType: 'command',
            commandOrPackage: s.path_or_appid || s.path || s.commandOrPackage || s.name,
            enabled: s.enabled ?? true,
            pinnedToDrawer: true,
          }));
          set({ executables: mapped });
          try {
            localStorage.setItem('nodus_desktop_shortcuts', JSON.stringify(mapped));
          } catch (_) {}
        }
      }
    } catch (_) {}
  },

  addExecutable: (item) => {
    const newExec: RemoteExecutable = {
      ...item,
      id: `exec-${Date.now()}`,
    };
    const updated = [newExec, ...get().executables];
    try {
      localStorage.setItem('nodus_desktop_shortcuts', JSON.stringify(updated));
    } catch (_) {}
    set({ executables: updated });
  },

  updateExecutable: (id, partial) => {
    const updated = get().executables.map((e) =>
      e.id === id ? { ...e, ...partial } : e
    );
    try {
      localStorage.setItem('nodus_desktop_shortcuts', JSON.stringify(updated));
    } catch (_) {}
    set({ executables: updated });
  },

  deleteExecutable: (id) => {
    const updated = get().executables.filter((e) => e.id !== id);
    try {
      localStorage.setItem('nodus_desktop_shortcuts', JSON.stringify(updated));
    } catch (_) {}
    set({ executables: updated });
  },

  executeShortcut: async (shortcut) => {
    try {
      await TauriService.executeLocalCommand(
        shortcut.commandOrPackage,
        shortcut.args,
        shortcut.workingDir
      );
      get().updateExecutable(shortcut.id, { lastExecuted: 'Just now' });
      return true;
    } catch (e) {
      console.error('[useExecutableStore] executeShortcut error:', e);
      return false;
    }
  },
}));
