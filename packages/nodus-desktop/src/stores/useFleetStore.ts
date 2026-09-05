import { create } from 'zustand';
import { DeviceInfo, DeviceType, ServerConfig, SystemStats } from '../types/desktop';
import { ScannedPeer, TrustedEntry } from '../types/ui-contracts';
import { TauriService } from '../services/TauriCommands';

interface FleetState {
  devices: DeviceInfo[];
  selectedDeviceId: string | null;
  activeDeviceId: string | null;
  isScanning: boolean;
  scanProgress: number;
  subnet: string;
  scannedPeers: ScannedPeer[];
  trustedDevices: Record<string, TrustedEntry>;
  lanDeviceCount: number;
  serverConfig: ServerConfig;
  systemStats: SystemStats | null;
  isServerRunning: boolean;
  fetchServerStatus: () => Promise<void>;
  toggleServer: () => Promise<void>;
  refreshLanCount: () => Promise<void>;
  setDeviceNickname: (ip: string, nickname: string, trusted?: boolean) => void;
  selectDevice: (id: string | null) => void;
  setDevices: (devices: DeviceInfo[]) => void;
  setDiscoveredNodes: (nodes: any[]) => void;
  removeDevice: (id: string) => void;
  setSubnet: (subnet: string) => void;
  scanSubnet: (subnet: string) => Promise<void>;
  connectDeviceManual: (device: { name: string; ip: string; port: number; type: DeviceType; os?: string }) => void;
  pingDevice: (id: string) => Promise<{ ok: boolean; latencyMs: number }>;
  syncDeviceState: (id: string) => Promise<boolean>;
  setScanning: (isScanning: boolean) => void;
  lockWorkstation: () => Promise<boolean>;
}

const DEFAULT_SERVER_CONFIG: ServerConfig = {
  host: '0.0.0.0',
  port: 9120,
  status: 'running',
  pairingSecret: 'NODUS-FLEET-SECURE',
  auth_token: 'NODUS-FLEET-SECURE',
  autoDiscover: true,
  autoStartOnBoot: true,
  broadcastMdns: true,
  encryptionEnabled: true,
  allowedPaths: 'C:\\Projects;C:\\Program Files;C:\\Tools',
  strictSandbox: false,
};

const DEFAULT_LOCAL_HOST: DeviceInfo = {
  id: 'this-pc',
  name: 'Host Workstation PC',
  type: 'desktop',
  os: 'windows',
  status: 'online',
  ipAddress: '127.0.0.1',
  resolution: '1920x1080',
  isLocal: true,
  cpuLoad: 8,
  battery: 100,
};

export const useFleetStore = create<FleetState>((set, get) => ({
  devices: [DEFAULT_LOCAL_HOST],
  selectedDeviceId: 'this-pc',
  activeDeviceId: 'this-pc',
  isScanning: false,
  scanProgress: 100,
  subnet: '192.168.1',
  scannedPeers: [],
  trustedDevices: (() => {
    try {
      const saved = localStorage.getItem('nodus_trusted_devices');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {};
  })(),
  lanDeviceCount: 0,
  isServerRunning: true,
  serverConfig: (() => {
    try {
      const saved = localStorage.getItem('nodus_desktop_server_config');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_SERVER_CONFIG;
  })(),
  systemStats: null,

  fetchServerStatus: async () => {
    try {
      const status = await TauriService.getServerStatus();
      set({ isServerRunning: status.running });
      set((state) => ({
        devices: state.devices.map((d) =>
          d.isLocal
            ? {
                ...d,
                status: status.running ? 'online' : 'offline',
              }
            : d
        ),
      }));

      // Retrieve initial LAN device count
      get().refreshLanCount();

      // Also retrieve system stats to name the host machine accurately
      const stats = await TauriService.getSystemStats();
      if (stats && stats.hostname) {
        set((state) => ({
          systemStats: stats,
          devices: state.devices.map((d) =>
            d.isLocal
              ? {
                  ...d,
                  name: `${stats.hostname} (Host PC)`,
                  cpuLoad: stats.cpu_load_percent || d.cpuLoad,
                }
              : d
          ),
        }));
      }
    } catch (_) {}
  },

  refreshLanCount: async () => {
    try {
      const count = await TauriService.getLanDeviceCount(get().subnet);
      if (count > 0 || get().lanDeviceCount === 0) {
        set({ lanDeviceCount: count });
      }
    } catch (_) {}
  },

  setDeviceNickname: (ip: string, nickname: string, trusted = true) => {
    const cleanIp = ip.trim();
    const updated = {
      ...get().trustedDevices,
      [cleanIp]: {
        nickname: nickname.trim(),
        trusted,
        firstSeen: get().trustedDevices[cleanIp]?.firstSeen || Date.now(),
      },
    };

    try {
      localStorage.setItem('nodus_trusted_devices', JSON.stringify(updated));
    } catch (_) {}

    set({
      trustedDevices: updated,
      scannedPeers: get().scannedPeers.map((p) =>
        p.ip === cleanIp
          ? {
              ...p,
              nickname: nickname.trim() || undefined,
              isTrusted: trusted,
              isUnknown: !trusted,
            }
          : p
      ),
      devices: get().devices.map((d) =>
        d.ipAddress === cleanIp && nickname.trim()
          ? { ...d, name: nickname.trim() }
          : d
      ),
    });
  },

  toggleServer: async () => {
    const current = get().isServerRunning;
    const target = !current;
    const port = get().serverConfig.port || 9120;
    const result = await TauriService.setServerRunning(target, port);
    set({ isServerRunning: result });
    set((state) => ({
      devices: state.devices.map((d) =>
        d.isLocal
          ? {
              ...d,
              status: result ? 'online' : 'offline',
            }
          : d
      ),
    }));
    if (result) {
      get().refreshLanCount();
    }
  },

  setSubnet: (subnet) => {
    set({ subnet });
    get().refreshLanCount();
  },

  scanSubnet: async (subnet) => {
    if (!get().isServerRunning) {
      console.warn('[useFleetStore] scanSubnet blocked: local server is stopped.');
      return;
    }

    set({ isScanning: true, scanProgress: 15, subnet });
    const progressTimer = setInterval(() => {
      set((s) => ({ scanProgress: Math.min(s.scanProgress + 18, 92) }));
    }, 250);

    try {
      const results = await TauriService.scanSubnet(subnet);
      clearInterval(progressTimer);

      const trusted = get().trustedDevices;
      const enrichedResults: ScannedPeer[] = (results || []).map((peer) => {
        const trustInfo = trusted[peer.ip];
        const isTrusted = Boolean(peer.hasAgent || (trustInfo && trustInfo.trusted));
        const isUnknown = !peer.hasAgent && !trustInfo;

        return {
          ...peer,
          nickname: trustInfo?.nickname,
          isTrusted,
          isUnknown,
        };
      });

      set({
        scannedPeers: enrichedResults,
        lanDeviceCount: enrichedResults.length,
        isScanning: false,
        scanProgress: 100,
      });
    } catch (e) {
      clearInterval(progressTimer);
      console.error('[useFleetStore] scanSubnet error:', e);
      set({ isScanning: false, scanProgress: 100 });
    }
  },

  selectDevice: (id) => set({ selectedDeviceId: id, activeDeviceId: id }),
  setDevices: (devices) => set({ devices }),
  setDiscoveredNodes: (nodes) => {
    const current = get().devices;
    const mapped: DeviceInfo[] = nodes.map((n) => {
      const isLocal = Boolean(n.isLocal || n.is_local || n.id === 'this-pc' || n.id === 'local');
      const ip = n.ipAddress || n.ip_address || '';
      return {
        id: isLocal ? 'this-pc' : (n.id || `node-${ip.replace(/[\.:]/g, '-')}`),
        name: n.name || n.hostname || (isLocal ? 'Host Workstation PC' : 'Discovered Peer'),
        type: (n.deviceType || n.device_type || (isLocal ? 'desktop' : 'tablet')) as any,
        os: (n.os || (isLocal ? 'windows' : 'android')) as any,
        status: 'connected',
        ipAddress: ip || (isLocal ? '127.0.0.1' : ''),
        resolution: n.resolution || '1920x1080',
        lastSeen: 'Just now',
        isLocal,
        cpuLoad: n.cpuLoad ?? n.cpu_load ?? (isLocal ? 8 : 12),
        battery: n.battery ?? 100,
      };
    });

    // Merge by id preserving existing verified states
    const merged = [...current];
    for (const node of mapped) {
      const idx = merged.findIndex((d) => d.id === node.id || (node.ipAddress && d.ipAddress === node.ipAddress));
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...node, isLocal: merged[idx].isLocal || node.isLocal, status: 'connected' };
      } else {
        merged.push(node);
      }
    }
    set({ devices: merged });
  },

  removeDevice: (id) => {
    if (id === 'this-pc' || id === 'local') return; // Protect local host workstation
    TauriService.unregisterNode(id);
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== id),
      selectedDeviceId: state.selectedDeviceId === id ? null : state.selectedDeviceId,
      activeDeviceId: state.activeDeviceId === id ? null : state.activeDeviceId,
    }));
  },

  connectDeviceManual: (device) => {
    const cleanIp = device.ip.trim();
    const newDevice: DeviceInfo = {
      id: `node-${cleanIp.replace(/[\.:]/g, '-')}`,
      name: device.name || `Node (${cleanIp})`,
      type: device.type || 'tablet',
      os: (device.os as any) || 'android',
      status: 'connected',
      ipAddress: cleanIp,
      resolution: '2560x1600',
      battery: 90,
      cpuLoad: 12,
      latencyMs: 12,
      isLocal: false,
    };

    set((state) => {
      const filtered = state.devices.filter((d) => d.ipAddress !== cleanIp && d.id !== newDevice.id);
      return {
        devices: [...filtered, newDevice],
        selectedDeviceId: newDevice.id,
        activeDeviceId: newDevice.id,
      };
    });
  },

  pingDevice: async (id: string) => {
    const target = get().devices.find((d) => d.id === id);
    if (!target || !target.ipAddress) {
      return { ok: false, latencyMs: 0 };
    }

    const start = performance.now();
    try {
      const host = target.ipAddress.includes(':') ? target.ipAddress : `${target.ipAddress}:9120`;
      const res = await fetch(`http://${host}/api/status`, {
        method: 'GET',
        headers: {
          'X-Nodus-Auth-Token': get().serverConfig.auth_token || get().serverConfig.pairingSecret,
        },
      });
      const end = performance.now();
      return { ok: res.ok, latencyMs: Math.round(end - start) };
    } catch {
      return { ok: false, latencyMs: 0 };
    }
  },

  syncDeviceState: async (id: string) => {
    const res = await get().pingDevice(id);
    if (res.ok) {
      set((state) => ({
        devices: state.devices.map((d) => (d.id === id ? { ...d, status: 'connected', latencyMs: res.latencyMs } : d)),
      }));
      return true;
    }
    return false;
  },

  setScanning: (isScanning) => set({ isScanning }),

  lockWorkstation: async () => {
    return await TauriService.lockWorkstation();
  },
}));
