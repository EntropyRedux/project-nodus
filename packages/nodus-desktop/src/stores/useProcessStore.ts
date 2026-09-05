import { create } from 'zustand';
import { DeviceInfo, DeviceProcess, SystemStats } from '../types/desktop';
import { TauriService } from '../services/TauriCommands';

interface ProcessState {
  processes: DeviceProcess[];
  systemStats: SystemStats | null;
  isLoading: boolean;
  isPolling: boolean;
  searchQuery: string;
  categoryFilter: string;
  sortBy: 'memory' | 'cpu' | 'name' | 'pid';
  sortDirection: 'asc' | 'desc';
  selectedPid: number | null;
  lastUpdated: number | null;

  loadProcesses: (targetDevice?: DeviceInfo | null) => Promise<void>;
  terminateProcess: (pid: number, targetDevice?: DeviceInfo | null) => Promise<boolean>;
  startAutoPolling: (targetDevice?: DeviceInfo | null, intervalMs?: number) => void;
  stopAutoPolling: () => void;
  setSearchQuery: (q: string) => void;
  setCategoryFilter: (cat: string) => void;
  setSortBy: (sort: 'memory' | 'cpu' | 'name' | 'pid') => void;
  toggleSortDirection: () => void;
  setSelectedPid: (pid: number | null) => void;
}

let pollingTimer: any = null;

export const useProcessStore = create<ProcessState>((set, get) => ({
  processes: [],
  systemStats: null,
  isLoading: false,
  isPolling: false,
  searchQuery: '',
  categoryFilter: 'all',
  sortBy: 'memory',
  sortDirection: 'desc',
  selectedPid: null,
  lastUpdated: null,

  loadProcesses: async (targetDevice?: DeviceInfo | null) => {
    // Only show full loading spinner if processes list is empty
    if (get().processes.length === 0) {
      set({ isLoading: true });
    }

    try {
      const isLocal =
        !targetDevice ||
        targetDevice.isLocal ||
        targetDevice.id === 'this-pc' ||
        targetDevice.id === 'local' ||
        targetDevice.ipAddress === '127.0.0.1' ||
        targetDevice.ipAddress?.startsWith('127.');

      let list: DeviceProcess[] = [];
      let stats: SystemStats | null = null;

      if (isLocal) {
        const [localProcs, localStats] = await Promise.all([
          TauriService.getProcesses(),
          TauriService.getSystemStats().catch(() => null),
        ]);
        list = localProcs;
        stats = localStats;
      } else if (targetDevice && targetDevice.ipAddress) {
        list = await TauriService.getRemoteProcesses(targetDevice.ipAddress, 9120);
      }

      set({
        processes: list,
        systemStats: stats,
        isLoading: false,
        lastUpdated: Date.now(),
      });
    } catch (e) {
      console.error('[useProcessStore] loadProcesses error:', e);
      set({ isLoading: false });
    }
  },

  terminateProcess: async (pid: number, targetDevice?: DeviceInfo | null) => {
    const isLocal =
      !targetDevice ||
      targetDevice.isLocal ||
      targetDevice.id === 'this-pc' ||
      targetDevice.id === 'local' ||
      targetDevice.ipAddress === '127.0.0.1' ||
      targetDevice.ipAddress?.startsWith('127.');

    let success = false;
    if (isLocal) {
      success = await TauriService.killProcess(pid);
    } else if (targetDevice && targetDevice.ipAddress) {
      success = await TauriService.killRemoteProcess(targetDevice.ipAddress, 9120, pid);
    }

    if (success) {
      set((state) => ({
        processes: state.processes.filter((p) => p.pid !== pid),
        selectedPid: state.selectedPid === pid ? null : state.selectedPid,
      }));
    }
    return success;
  },

  startAutoPolling: (targetDevice?: DeviceInfo | null, intervalMs = 3000) => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    set({ isPolling: true });
    get().loadProcesses(targetDevice);
    pollingTimer = setInterval(() => {
      get().loadProcesses(targetDevice);
    }, intervalMs);
  },

  stopAutoPolling: () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    set({ isPolling: false });
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setCategoryFilter: (categoryFilter: string) => set({ categoryFilter }),
  setSortBy: (sortBy: 'memory' | 'cpu' | 'name' | 'pid') => {
    if (get().sortBy === sortBy) {
      get().toggleSortDirection();
    } else {
      set({ sortBy, sortDirection: sortBy === 'name' ? 'asc' : 'desc' });
    }
  },
  toggleSortDirection: () =>
    set((s) => ({ sortDirection: s.sortDirection === 'asc' ? 'desc' : 'asc' })),
  setSelectedPid: (selectedPid: number | null) => set({ selectedPid }),
}));
