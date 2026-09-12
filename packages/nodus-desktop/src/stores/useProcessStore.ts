import { create } from 'zustand';
import { DeviceInfo, DeviceProcess, SystemStats } from '../types/desktop';
import { TauriService, getStoredAuthToken } from '../services/TauriCommands';

interface ProcessState {
  processes: DeviceProcess[];
  systemStats: SystemStats | null;
  isLoading: boolean;
  isPolling: boolean;
  isMonitoringEnabled: boolean;
  refreshIntervalMs: number;
  limitTopN: number;
  searchQuery: string;
  categoryFilter: string;
  sortBy: 'memory' | 'cpu' | 'name' | 'pid';
  sortDirection: 'asc' | 'desc';
  selectedPid: number | null;
  lastUpdated: number | null;

  loadProcesses: (targetDevice?: DeviceInfo | null, force?: boolean) => Promise<void>;
  terminateProcess: (pid: number, targetDevice?: DeviceInfo | null) => Promise<boolean>;
  startAutoPolling: (targetDevice?: DeviceInfo | null, intervalMs?: number) => void;
  stopAutoPolling: () => void;
  setMonitoringEnabled: (enabled: boolean) => void;
  setRefreshIntervalMs: (ms: number) => void;
  setLimitTopN: (limit: number) => void;
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
  isMonitoringEnabled: (() => {
    try {
      const saved = localStorage.getItem('nodus_process_monitoring_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  })(),
  refreshIntervalMs: (() => {
    try {
      const saved = localStorage.getItem('nodus_process_refresh_interval');
      return saved ? parseInt(saved, 10) || 4000 : 4000;
    } catch (_) {
      return 4000;
    }
  })(),
  limitTopN: (() => {
    try {
      const saved = localStorage.getItem('nodus_process_limit_top_n');
      return saved ? parseInt(saved, 10) || 40 : 40;
    } catch (_) {
      return 40;
    }
  })(),
  searchQuery: '',
  categoryFilter: 'all',
  sortBy: 'memory',
  sortDirection: 'desc',
  selectedPid: null,
  lastUpdated: null,

  loadProcesses: async (targetDevice?: DeviceInfo | null, force = false) => {
    if (!get().isMonitoringEnabled && !force) {
      return;
    }

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
        const devToken = targetDevice.authToken || targetDevice.token || getStoredAuthToken();
        const [remoteProcs, remoteStats] = await TauriService.getRemoteProcessesWithStats(targetDevice.ipAddress, 9120, devToken);
        list = remoteProcs;
        stats = remoteStats;
      }

      // Slice top-N if configured and not searching
      const limit = get().limitTopN;
      const query = get().searchQuery.trim();
      const finalProcs = limit > 0 && !query && list.length > limit ? list.slice(0, limit) : list;

      set({
        processes: finalProcs,
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
      const devToken = targetDevice.authToken || targetDevice.token || getStoredAuthToken();
      const targetProc = get().processes.find((p) => p.pid === pid);
      success = await TauriService.killRemoteProcess(targetDevice.ipAddress, 9120, pid, devToken, targetProc?.name);
    }

    if (success) {
      set((state) => ({
        processes: state.processes.filter((p) => p.pid !== pid),
        selectedPid: state.selectedPid === pid ? null : state.selectedPid,
      }));
    }
    return success;
  },

  startAutoPolling: (targetDevice?: DeviceInfo | null, intervalMs?: number) => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }

    if (!get().isMonitoringEnabled) {
      set({ isPolling: false });
      return;
    }

    const interval = intervalMs || get().refreshIntervalMs;
    if (interval <= 0) {
      set({ isPolling: false });
      get().loadProcesses(targetDevice, true);
      return;
    }

    set({ isPolling: true });
    get().loadProcesses(targetDevice);
    pollingTimer = setInterval(() => {
      get().loadProcesses(targetDevice);
    }, interval);
  },

  stopAutoPolling: () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    set({ isPolling: false });
  },

  setMonitoringEnabled: (enabled: boolean) => {
    try {
      localStorage.setItem('nodus_process_monitoring_enabled', String(enabled));
    } catch (_) {}
    set({ isMonitoringEnabled: enabled });
    if (!enabled) {
      get().stopAutoPolling();
    }
  },

  setRefreshIntervalMs: (ms: number) => {
    try {
      localStorage.setItem('nodus_process_refresh_interval', String(ms));
    } catch (_) {}
    set({ refreshIntervalMs: ms });
    if (get().isPolling && ms > 0) {
      get().startAutoPolling(null, ms);
    } else if (ms <= 0) {
      get().stopAutoPolling();
    }
  },

  setLimitTopN: (limit: number) => {
    try {
      localStorage.setItem('nodus_process_limit_top_n', String(limit));
    } catch (_) {}
    set({ limitTopN: limit });
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
