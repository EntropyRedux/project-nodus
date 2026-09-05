import { create } from 'zustand';
import { HotCornerConfig } from '../types/desktop';
import { TauriService } from '../services/TauriCommands';

interface HotCornerState {
  config: HotCornerConfig;
  updateConfig: (partial: Partial<HotCornerConfig>) => void;
  syncWithDaemon: () => Promise<void>;
}

const DEFAULT_HOTCORNER_CONFIG: HotCornerConfig = {
  enabled: false,
  dwellTimeMs: 180,
  marginPx: 8,
  disableInFullscreen: true,
  corners: {
    topLeft: 'fleet',
    topRight: 'clipboard',
    bottomLeft: 'shortcuts',
    bottomRight: 'lock',
  },
};

export const useHotCornerStore = create<HotCornerState>((set, get) => ({
  config: (() => {
    try {
      const saved = localStorage.getItem('nodus_desktop_hotcorners');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_HOTCORNER_CONFIG;
  })(),

  updateConfig: (partial) => {
    set((state) => {
      const next = { ...state.config, ...partial };
      try {
        localStorage.setItem('nodus_desktop_hotcorners', JSON.stringify(next));
      } catch (_) {}
      if (partial.enabled !== undefined) {
        TauriService.setHotCornerEnabled(partial.enabled);
      }
      return { config: next };
    });
  },

  syncWithDaemon: async () => {
    const remote = await TauriService.getHotCornerConfig();
    if (remote) {
      get().updateConfig({
        enabled: remote.enabled,
        dwellTimeMs: remote.dwell_time_ms,
        marginPx: remote.hotspot_size,
      });
    }
  },
}));
