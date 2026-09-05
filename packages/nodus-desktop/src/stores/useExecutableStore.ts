import { create } from 'zustand';
import { RemoteExecutable } from '../types/desktop';
import { TauriService } from '../services/TauriCommands';

interface ExecutableState {
  executables: RemoteExecutable[];
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
