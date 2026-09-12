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
  removeDevice: (id: string, notifyRemote?: boolean) => void;
  setSubnet: (subnet: string) => void;
  scanSubnet: (subnet: string) => Promise<void>;
  connectDeviceManual: (device: { id?: string; name: string; ip: string; port?: number; type: DeviceType; os?: string; authToken?: string; token?: string }) => void;
  resetAllFleetData: () => void;
  pingDevice: (id: string) => Promise<{ ok: boolean; latencyMs: number }>;
  syncDeviceState: (id: string) => Promise<boolean>;
  pollRemoteDevices: () => Promise<void>;
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
  devices: (() => {
    try {
      const saved = localStorage.getItem('nodus_desktop_paired_devices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasHost = parsed.some((d) => d.id === 'this-pc' || d.isLocal);
          return hasHost ? parsed : [DEFAULT_LOCAL_HOST, ...parsed];
        }
      }
    } catch (_) {}
    return [DEFAULT_LOCAL_HOST];
  })(),
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
      const devices = await TauriService.getLanDevices(get().subnet);
      if (devices && devices.length > 0) {
        set({ lanDeviceCount: devices.length });

        const existing = get().scannedPeers;
        const trusted = get().trustedDevices;
        const currentDevices = get().devices;

        const enriched: ScannedPeer[] = devices.map((peer: ScannedPeer) => {
          const trustInfo = trusted[peer.ip];
          const isTrusted = Boolean(trustInfo && trustInfo.trusted);
          const isUnknown = !trustInfo;
          const cleanPeerIp = (peer.ip || '').split(':')[0].trim();
          const isInFleet = currentDevices.some((d) => {
            if (d.isLocal || d.id === 'this-pc' || d.id === 'local') return false;
            if (d.status !== 'connected' && d.status !== 'online') return false;
            return (d.ipAddress || '').split(':')[0].trim() === cleanPeerIp;
          });
          const existingPeer = existing.find((p) => (p.ip || '').split(':')[0].trim() === cleanPeerIp);

          return {
            ...peer,
            ...(existingPeer || {}),
            isInFleet,
            nickname: trustInfo?.nickname || existingPeer?.nickname,
            isTrusted,
            isUnknown,
          };
        });

        // Retain any existing peers not found in the current ARP table
        for (const ex of existing) {
          const cleanIp = (ex.ip || '').split(':')[0].trim();
          if (!enriched.some((e) => (e.ip || '').split(':')[0].trim() === cleanIp)) {
            enriched.push(ex);
          }
        }

        set({ scannedPeers: enriched });
      } else {
        const count = await TauriService.getLanDeviceCount(get().subnet);
        if (count > 0 || get().lanDeviceCount === 0) {
          set({ lanDeviceCount: count });
        }
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

    if (!target) {
      // Stopping server: Notify all connected companion devices and drop connections
      const remoteDevices = get().devices.filter((d) => !d.isLocal && d.id !== 'this-pc' && d.id !== 'local');
      for (const d of remoteDevices) {
        const cleanIp = (d.ipAddress || '').split(':')[0].trim();
        const peerPort = (d as any).port || (d as any).httpPort || 9120;
        const token = (d as any).authToken || (d as any).token || get().serverConfig.auth_token || 'NODUS-FLEET-SECURE';
        if (cleanIp && cleanIp !== '127.0.0.1') {
          fetch(`http://${cleanIp}:${peerPort}/api/fleet/unpair`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Nodus-Auth-Token': token,
            },
            body: JSON.stringify({
              id: 'desktop-host',
              deviceId: 'desktop-host',
              name: 'Redux (PC)',
              ipAddress: '192.168.1.177',
              action: 'server_stopped',
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        }
        TauriService.unregisterNode(d.id);
        if (cleanIp) TauriService.unregisterNode(cleanIp);
      }

      const localOnly = get().devices.filter((d) => d.isLocal || d.id === 'this-pc' || d.id === 'local')
        .map((d) => ({ ...d, status: 'offline' as const }));

      set({
        isServerRunning: false,
        devices: localOnly,
        activeDeviceId: 'local',
        scannedPeers: [],
      });

      try {
        localStorage.setItem('nodus_desktop_paired_devices', JSON.stringify(localOnly));
      } catch (_) {}

      await TauriService.setServerRunning(false, port);
    } else {
      const result = await TauriService.setServerRunning(true, port);
      set({ isServerRunning: result });
      set((state) => ({
        devices: state.devices.map((d) =>
          d.isLocal || d.id === 'this-pc' || d.id === 'local'
            ? { ...d, status: 'online' as const }
            : d
        ),
      }));
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
      const currentDevices = get().devices;
      const enrichedResults: ScannedPeer[] = (results || []).map((peer) => {
        const trustInfo = trusted[peer.ip];
        const isTrusted = Boolean(trustInfo && trustInfo.trusted);
        const isUnknown = !trustInfo;
        const cleanPeerIp = (peer.ip || '').split(':')[0].trim();
        const isInFleet = currentDevices.some((d) => {
          if (d.isLocal || d.id === 'this-pc' || d.id === 'local') return false;
          if (d.status !== 'connected' && d.status !== 'online') return false;
          return (d.ipAddress || '').split(':')[0].trim() === cleanPeerIp;
        });

        return {
          ...peer,
          isInFleet,
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
    const trusted = get().trustedDevices;

    // Filter out local node / loopback self
    const remoteNodes = (nodes || []).filter((n) => {
      if (n.isLocal || n.is_local) return false;
      const ip = (n.ipAddress || n.ip_address || '').split(':')[0].trim();
      return ip !== '127.0.0.1' && ip !== '::1' && ip !== 'localhost' && ip !== '0.0.0.0';
    });

    // Update scanned peers for the Pairing Modal
    const discoveredPeers: ScannedPeer[] = remoteNodes.map((n) => {
      const ip = (n.ipAddress || n.ip_address || '').split(':')[0].trim();
      const trustInfo = trusted[ip];
      return {
        ip,
        port: n.httpPort || n.http_port || 9120,
        hostname: n.name || n.hostname || `Node (${ip})`,
        nickname: trustInfo?.nickname,
        hasAgent: true,
        isInFleet: current.some(
          (d) => !d.isLocal && (d.status === 'connected' || d.status === 'online') && (((d.ipAddress || '').split(':')[0].trim() === ip) || d.id === n.id)
        ),
        isTrusted: Boolean(trustInfo && trustInfo.trusted),
        isUnknown: !trustInfo,
        deviceType: (n.deviceType || n.device_type || 'tablet') as any,
        os: n.os || 'android',
        latencyMs: 12,
      };
    });

    // Only update telemetry of devices that ALREADY exist in the user's paired fleet
    const updatedDevices = current.map((existing) => {
      if (existing.isLocal) return existing;
      const existingCleanIp = (existing.ipAddress || '').split(':')[0].trim();
      const match = remoteNodes.find(
        (n) =>
          n.id === existing.id ||
          ((n.ipAddress || n.ip_address) &&
            (n.ipAddress || n.ip_address || '').split(':')[0].trim() === existingCleanIp)
      );
      if (match) {
        return {
          ...existing,
          battery: match.battery ?? existing.battery,
          cpuLoad: match.cpuLoad ?? match.cpu_load ?? existing.cpuLoad,
          ramUsage: match.ramUsage || existing.ramUsage,
          status: 'connected' as const,
        };
      }
      return existing;
    });

    // Intelligent merge for scannedPeers:
    // If we already have scanned peers (from subnet sweep / ARP), NEVER wipe them out.
    // Instead, enrich existing scanned peers with active agent metadata, and append new discovered nodes.
    const existingScanned = get().scannedPeers;
    let nextScannedPeers: ScannedPeer[];

    if (existingScanned.length === 0) {
      nextScannedPeers = discoveredPeers;
    } else {
      const updated = existingScanned.map((scanned) => {
        const cleanIp = (scanned.ip || '').split(':')[0].trim();
        const match = discoveredPeers.find((d) => (d.ip || '').split(':')[0].trim() === cleanIp);
        if (match) {
          return {
            ...scanned,
            ...match,
            nickname: scanned.nickname || match.nickname,
            isInFleet: scanned.isInFleet || match.isInFleet,
          };
        }
        return scanned;
      });

      for (const disc of discoveredPeers) {
        const cleanIp = (disc.ip || '').split(':')[0].trim();
        if (!updated.some((s) => (s.ip || '').split(':')[0].trim() === cleanIp)) {
          updated.push(disc);
        }
      }
      nextScannedPeers = updated;
    }

    set({
      scannedPeers: nextScannedPeers,
      devices: updatedDevices,
    });
  },

  removeDevice: (id, notifyRemote = true) => {
    if (id === 'this-pc' || id === 'local') return; // Protect local host workstation
    const cleanId = id.trim();
    const cleanTarget = cleanId.split(':')[0].trim();
    TauriService.unregisterNode(cleanId);
    if (cleanTarget !== cleanId) {
      TauriService.unregisterNode(cleanTarget);
    }
    const targetDev = get().devices.find((d) =>
      d.id === cleanId ||
      (d.ipAddress && (d.ipAddress.split(':')[0].trim() === cleanTarget || d.ipAddress === cleanId))
    );
    const targetIp = targetDev ? (targetDev.ipAddress || '').split(':')[0].trim() : (cleanTarget.includes('.') ? cleanTarget : '');
    const targetPort = targetDev ? ((targetDev as any).port || (targetDev as any).httpPort || 9120) : 9120;
    const targetToken = targetDev ? ((targetDev as any).authToken || (targetDev as any).token || get().serverConfig.auth_token || get().serverConfig.pairingSecret || 'NODUS-FLEET-SECURE') : 'NODUS-FLEET-SECURE';

    // Dispatch unpair notification to remote peer so it also drops Desktop
    if (notifyRemote && targetIp && targetIp !== '127.0.0.1') {
      fetch(`http://${targetIp}:${targetPort}/api/fleet/unpair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nodus-Auth-Token': targetToken,
        },
        body: JSON.stringify({
          id: 'desktop-host',
          deviceId: 'desktop-host',
          ipAddress: '192.168.1.177',
          action: 'unpair',
        }),
      }).catch(() => {});
    }

    set((state) => {
      const nextDevices = state.devices.filter((d) => {
        if (d.isLocal || d.id === 'this-pc' || d.id === 'local') return true;
        const dIp = (d.ipAddress || '').split(':')[0].trim();
        if (d.id === cleanId) return false;
        if (targetIp && dIp === targetIp) return false;
        if (cleanTarget && (dIp === cleanTarget || d.id === `node-${cleanTarget.replace(/[\.:]/g, '-')}`)) return false;
        return true;
      });
      try {
        localStorage.setItem('nodus_desktop_paired_devices', JSON.stringify(nextDevices));
      } catch (_) {}

      const nextTrusted = { ...state.trustedDevices };
      if (targetIp && nextTrusted[targetIp]) {
        delete nextTrusted[targetIp];
      }
      if (cleanTarget && nextTrusted[cleanTarget]) {
        delete nextTrusted[cleanTarget];
      }
      try {
        localStorage.setItem('nodus_trusted_devices', JSON.stringify(nextTrusted));
      } catch (_) {}

      return {
        devices: nextDevices,
        trustedDevices: nextTrusted,
        scannedPeers: targetIp
          ? state.scannedPeers.map((p) =>
              (p.ip || '').split(':')[0].trim() === targetIp ? { ...p, isInFleet: false } : p
            )
          : state.scannedPeers,
        selectedDeviceId: state.selectedDeviceId === cleanId ? null : state.selectedDeviceId,
        activeDeviceId: state.activeDeviceId === cleanId ? null : state.activeDeviceId,
      };
    });
  },

  connectDeviceManual: (device) => {
    const cleanIp = device.ip.split(':')[0].trim();
    const token = (device as any).authToken || (device as any).token || '';
    const newDevice: DeviceInfo = {
      id: (device as any).id || `node-${cleanIp.replace(/[\.:]/g, '-')}`,
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
      authToken: token,
      token: token,
    };

    set((state) => {
      const filtered = state.devices.filter(
        (d) => (d.ipAddress || '').split(':')[0].trim() !== cleanIp && d.id !== newDevice.id
      );
      const updatedDevices = [...filtered, newDevice];
      try {
        localStorage.setItem('nodus_desktop_paired_devices', JSON.stringify(updatedDevices));
      } catch (_) {}

      const updatedTrusted = {
        ...state.trustedDevices,
        [cleanIp]: {
          nickname: newDevice.name,
          trusted: true,
          addedAt: Date.now(),
        },
      };
      try {
        localStorage.setItem('nodus_trusted_devices', JSON.stringify(updatedTrusted));
      } catch (_) {}

      const updatedPeers = state.scannedPeers.map((p) =>
        (p.ip || '').split(':')[0].trim() === cleanIp
          ? { ...p, isInFleet: true, isTrusted: true, isUnknown: false, nickname: newDevice.name }
          : p
      );
      return {
        devices: updatedDevices,
        trustedDevices: updatedTrusted,
        scannedPeers: updatedPeers,
        selectedDeviceId: newDevice.id,
        activeDeviceId: newDevice.id,
      };
    });
  },

  resetAllFleetData: () => {
    try {
      localStorage.removeItem('nodus_desktop_paired_devices');
      localStorage.removeItem('nodus_trusted_devices');
      localStorage.removeItem('nodus_clipboard_history');
    } catch (_) {}

    TauriService.unregisterAllNodes().catch(() => {});

    set({
      devices: [DEFAULT_LOCAL_HOST],
      trustedDevices: {},
      scannedPeers: [],
      selectedDeviceId: 'this-pc',
      activeDeviceId: 'this-pc',
      lanDeviceCount: 0,
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
    set((state) => ({
      devices: state.devices.map((d) => (d.id === id ? { ...d, status: res.ok ? 'connected' : 'offline', latencyMs: res.latencyMs } : d)),
    }));
    return res.ok;
  },

  pollRemoteDevices: async () => {
    const devices = get().devices;
    const remoteDevices = devices.filter((d) => !d.isLocal);
    if (remoteDevices.length === 0) return;

    let hasChanged = false;
    const updated = await Promise.all(
      devices.map(async (dev) => {
        if (dev.isLocal) return dev;
        const rawIp = (dev.ipAddress || '').split(':')[0].trim();
        if (!rawIp || rawIp === '127.0.0.1' || rawIp === 'localhost') return dev;

        const port = (dev as any).port || (dev as any).httpPort || 9120;
        const token = (dev as any).authToken || (dev as any).token || get().serverConfig.auth_token || get().serverConfig.pairingSecret || 'NODUS-FLEET-SECURE';
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          const start = performance.now();
          const res = await fetch(`http://${rawIp}:${port}/api/status`, {
            headers: { 'X-Nodus-Auth-Token': token },
            signal: controller.signal,
          });
          clearTimeout(timer);
          const latencyMs = Math.round(performance.now() - start);

          if (res.ok) {
            const data = await res.json();
            const nextStatus: 'connected' = 'connected';
            const nextBattery = data.battery ?? dev.battery;
            const nextCpu = data.cpuLoad ?? dev.cpuLoad;
            const nextRam = data.ramUsage ?? dev.ramUsage;
            if (dev.status !== nextStatus || dev.cpuLoad !== nextCpu || dev.battery !== nextBattery) {
              hasChanged = true;
            }
            return {
              ...dev,
              status: nextStatus,
              latencyMs,
              battery: nextBattery,
              cpuLoad: nextCpu,
              ramUsage: nextRam,
            };
          } else {
            if (dev.status !== 'offline') hasChanged = true;
            return { ...dev, status: 'offline' as const, latencyMs: -1 };
          }
        } catch (_) {
          if (dev.status !== 'offline') hasChanged = true;
          return { ...dev, status: 'offline' as const, latencyMs: -1 };
        }
      })
    );

    if (hasChanged) {
      set({ devices: updated });
    }
  },

  setScanning: (isScanning) => set({ isScanning }),

  lockWorkstation: async () => {
    return await TauriService.lockWorkstation();
  },
}));
