import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DeviceInfo,
  DeviceProcess,
  RemoteExecutable,
  TrustedDevice,
} from '../types/launcher';
import {
  INITIAL_DEVICES,
  INITIAL_DEVICE_PROCESSES,
  INITIAL_REMOTE_EXECUTABLES,
  INITIAL_TRUSTED_DEVICES,
  getDeviceColor,
} from '../utils/constants';
import { audio } from '../utils/audio';
import { simulateBridgeRpc } from '../utils/bridgeProtocol';
import { universalNetworkFetch } from '../services/FleetDirectClient';
import { useSystemSettings } from './SystemSettingsContext';

export interface FleetContextType {
  devices: DeviceInfo[];
  activeDeviceId: string;
  activeDevice: DeviceInfo;
  selectDevice: (id: string) => void;
  reorderDevices: (newDevices: DeviceInfo[]) => void;
  moveDeviceUp: (id: string) => void;
  moveDeviceDown: (id: string) => void;
  addDevice: (device: Omit<DeviceInfo, 'id'>) => void;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, partial: Partial<DeviceInfo>) => void;
  updateDeviceAvatar: (id: string, avatarUrl: string) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (val: boolean) => void;
  toggleSidebar: () => void;

  // Remote Executables
  remoteExecutables: RemoteExecutable[];
  addRemoteExecutable: (item: Omit<RemoteExecutable, 'id'>) => void;
  updateRemoteExecutable: (id: string, partial: Partial<RemoteExecutable>) => void;
  deleteRemoteExecutable: (id: string) => void;
  toggleRemoteExecutable: (id: string) => void;
  executeRemoteApp: (executable: RemoteExecutable) => Promise<{ success: boolean; message: string }>;

  // Trusted Devices
  trustedDevices: TrustedDevice[];
  toggleTrustDevice: (id: string) => void;
  removeTrustedDevice: (id: string) => void;
  updateDevicePermissions: (id: string, permissions: Partial<TrustedDevice['permissions']>) => void;

  // Process Management & Telemetry
  deviceProcesses: Record<string, DeviceProcess[]>;
  processModalDeviceId: string | null;
  openProcessManager: (deviceId: string) => void;
  closeProcessManager: () => void;
  fetchDeviceProcesses: (deviceId: string) => Promise<void>;
  killProcess: (deviceId: string, pid: number) => void;
  killAllUserProcesses: (deviceId: string) => void;
  rebootDevice: (deviceId: string) => void;
  lockDevice: (deviceId?: string) => void;
}

export const FleetContext = createContext<FleetContextType | null>(null);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, setSettings, updateSettings, showToast, addNotification } = useSystemSettings() as any;

  const [devices, setDevices] = useState<DeviceInfo[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nova_launcher_devices');
        localStorage.removeItem('nodus_launcher_devices');
      } catch (_) {}

      try {
        const bridge = (window as any).NodusNativeBridge;
        if (bridge?.queryFleetDevices) {
          const raw = bridge.queryFleetDevices();
          if (raw && typeof raw === 'string' && raw.startsWith('[')) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
              const valid = list.filter((d: any) => !['tab-pc', 'sm-t230nu', 'main-pc'].includes(d.id));
              if (valid.length > 0) return valid;
            }
          }
        }
      } catch (_) {}
    }
    return INITIAL_DEVICES;
  });

  const [activeDeviceId, setActiveDeviceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_launcher_active_device');
      return (saved && !['tab-pc', 'sm-t230nu', 'main-pc'].includes(saved)) ? saved : 'poco-pad';
    }
    return 'poco-pad';
  });

  const [isSidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_launcher_sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [deviceProcesses, setDeviceProcesses] = useState<Record<string, DeviceProcess[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_launcher_device_processes');
      return saved ? JSON.parse(saved) : INITIAL_DEVICE_PROCESSES;
    }
    return INITIAL_DEVICE_PROCESSES;
  });

  const [processModalDeviceId, setProcessModalDeviceId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_devices', JSON.stringify(devices));
    } catch (_) {}
  }, [devices]);

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_active_device', activeDeviceId);
    } catch (_) {}
  }, [activeDeviceId]);

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
    } catch (_) {}
  }, [isSidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem('nova_launcher_device_processes', JSON.stringify(deviceProcesses));
    } catch (_) {}
  }, [deviceProcesses]);

  const activeDevice = devices.find((d) => d.id === activeDeviceId) || devices[0] || INITIAL_DEVICES[0];
  const remoteExecutables = settings.remoteExecutables || INITIAL_REMOTE_EXECUTABLES;
  const trustedDevices = settings.trustedDevices || INITIAL_TRUSTED_DEVICES;

  // Sync Fleet state with Android ContentProvider
  const syncFleetState = useCallback(() => {
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.queryFleetDevices) {
        const raw = bridge.queryFleetDevices();
        if (raw && typeof raw === 'string' && raw.startsWith('[')) {
          const fleetList: DeviceInfo[] = JSON.parse(raw);
          if (Array.isArray(fleetList) && fleetList.length > 0) {
            setDevices(fleetList);
            localStorage.setItem('nova_launcher_devices', JSON.stringify(fleetList));
          }
        }
      }
    } catch (e) {
      console.warn('[Nodus] Failed to query fleet devices:', e);
    }
  }, []);

  useEffect(() => {
    syncFleetState();
    window.addEventListener('fleet-state-changed', syncFleetState);
    window.addEventListener('fleet-device-connected', syncFleetState);
    window.addEventListener('fleet-device-disconnected', syncFleetState);
    return () => {
      window.removeEventListener('fleet-state-changed', syncFleetState);
      window.removeEventListener('fleet-device-connected', syncFleetState);
      window.removeEventListener('fleet-device-disconnected', syncFleetState);
    };
  }, [syncFleetState]);

  // Periodic Telemetry poller for remote companion nodes
  useEffect(() => {
    const pollRemoteStats = async () => {
      for (const dev of devices) {
        if (dev.id !== 'poco-pad' && dev.ipAddress) {
          try {
            const res = await universalNetworkFetch(`http://${dev.ipAddress}/api/status`, { timeoutMs: 2500 });
            if (res.ok && res.data) {
              const data = res.data;
              setDevices((prev) =>
                prev.map((d) =>
                  d.id === dev.id
                    ? {
                        ...d,
                        status: 'connected',
                        cpuLoad: typeof data.cpuLoad === 'number' ? data.cpuLoad : d.cpuLoad,
                        ramUsage: data.ramUsage || d.ramUsage,
                        storage: data.storage || d.storage,
                      }
                    : d
                )
              );
            }
          } catch (_) {}
        }
      }
    };

    pollRemoteStats();
    const interval = setInterval(pollRemoteStats, 5000);
    return () => clearInterval(interval);
  }, [devices.length]);

  const selectDevice = useCallback((id: string) => {
    audio.playTap();
    setActiveDeviceId(id);
    try {
      localStorage.setItem('nova_launcher_active_device', id);
    } catch (_) {}
  }, []);

  const toggleSidebar = useCallback(() => {
    audio.playTap();
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const reorderDevices = useCallback((newDevices: DeviceInfo[]) => {
    setDevices(newDevices);
  }, []);

  const moveDeviceUp = useCallback((id: string) => {
    setDevices((prev) => {
      const index = prev.findIndex((d) => d.id === id);
      if (index > 0) {
        audio.playTap();
        const next = [...prev];
        const temp = next[index];
        next[index] = next[index - 1];
        next[index - 1] = temp;
        return next;
      }
      return prev;
    });
  }, []);

  const moveDeviceDown = useCallback((id: string) => {
    setDevices((prev) => {
      const index = prev.findIndex((d) => d.id === id);
      if (index !== -1 && index < prev.length - 1) {
        audio.playTap();
        const next = [...prev];
        const temp = next[index];
        next[index] = next[index + 1];
        next[index + 1] = temp;
        return next;
      }
      return prev;
    });
  }, []);

  const addDevice = useCallback((deviceData: Omit<DeviceInfo, 'id'>) => {
    audio.playTap();
    const newId = `dev-${Date.now()}`;
    const newDevice: DeviceInfo = {
      ...deviceData,
      id: newId,
      isCustom: true,
    };
    setDevices((prev) => {
      const filtered = prev.filter((d) => d.ipAddress !== newDevice.ipAddress);
      return [...filtered, newDevice];
    });

    addNotification({
      appId: 'settings',
      appName: 'Fleet Manager',
      title: `Node Linked: ${newDevice.name}`,
      message: `${newDevice.name} (${newDevice.ipAddress}) connected to mesh.`,
      iconName: 'Smartphone',
      color: '#34C759',
    });
  }, [addNotification]);

  const removeDevice = useCallback((id: string) => {
    audio.playTap();
    setDevices((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      if (activeDeviceId === id && filtered.length > 0) {
        setActiveDeviceId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeDeviceId]);

  const updateDevice = useCallback((id: string, partial: Partial<DeviceInfo>) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...partial } : d)));
  }, []);

  const updateDeviceAvatar = useCallback((id: string, avatarUrl: string) => {
    audio.playTap();
    updateDevice(id, { customAvatar: avatarUrl });
    showToast('Device portrait updated');
  }, [updateDevice, showToast]);

  const fetchDeviceProcesses = useCallback(async (deviceId: string) => {
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (deviceId === 'poco-pad' && bridge?.getRunningProcesses) {
        const raw = bridge.getRunningProcesses();
        if (raw && typeof raw === 'string' && raw.startsWith('[')) {
          const list: DeviceProcess[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            setDeviceProcesses((prev) => ({
              ...prev,
              [deviceId]: list,
            }));
          }
        }
        return;
      }

      const targetDev = devices.find((d) => d.id === deviceId);
      if (targetDev && targetDev.ipAddress) {
        const res = await universalNetworkFetch(`http://${targetDev.ipAddress}/api/processes`);
        if (res.ok && res.data && Array.isArray(res.data.processes)) {
          const mapped: DeviceProcess[] = res.data.processes.map((p: any) => ({
            pid: p.pid,
            name: p.name,
            user: p.user || 'User',
            cpu: typeof p.cpu === 'number' ? p.cpu : 0.0,
            memoryMb: Math.round((p.memory_kb || 0) / 1024),
            status: 'running',
            category: (p.category as any) || 'user',
            description: p.name,
          }));
          setDeviceProcesses((prev) => ({
            ...prev,
            [deviceId]: mapped,
          }));
        }
      }
    } catch (err) {
      console.warn('[Nodus] Failed to fetch device processes:', err);
    }
  }, [devices]);

  const openProcessManager = useCallback((deviceId: string) => {
    audio.playTap();
    setProcessModalDeviceId((prev) => {
      const next = prev === deviceId ? null : deviceId;
      if (next) fetchDeviceProcesses(next);
      return next;
    });
  }, [fetchDeviceProcesses]);

  const closeProcessManager = useCallback(() => {
    audio.playTap();
    setProcessModalDeviceId(null);
  }, []);

  const killProcess = useCallback(async (deviceId: string, pid: number) => {
    audio.playTap();
    const targetDev = devices.find((d) => d.id === deviceId);
    const targetProcs = deviceProcesses[deviceId] || [];
    const procToKill = targetProcs.find((p) => p.pid === pid);

    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (deviceId === 'poco-pad' && bridge?.killLocalProcess) {
      bridge.killLocalProcess(pid, procToKill?.description);
    } else if (targetDev && targetDev.ipAddress) {
      universalNetworkFetch(`http://${targetDev.ipAddress}/api/process/kill`, {
        method: 'POST',
        body: { pid },
      }).catch((e) => {
        console.warn('[Nodus] Failed to kill remote process:', e);
      });
    }

    setDeviceProcesses((prev) => {
      const procs = prev[deviceId] || [];
      return {
        ...prev,
        [deviceId]: procs.filter((p) => p.pid !== pid),
      };
    });

    if (procToKill && targetDev) {
      showToast(`Terminated PID ${pid} (${procToKill.name})`);
      addNotification({
        appId: 'settings',
        appName: 'Process Guard',
        title: `Killed PID ${pid} (${procToKill.name})`,
        message: `Freed ${procToKill.memoryMb} MB RAM on ${targetDev.name}.`,
        iconName: 'Activity',
        color: '#FF3B30',
      });
    }

    setTimeout(() => fetchDeviceProcesses(deviceId), 500);
  }, [devices, deviceProcesses, showToast, addNotification, fetchDeviceProcesses]);

  const killAllUserProcesses = useCallback((deviceId: string) => {
    audio.playTap();
    const targetDev = devices.find((d) => d.id === deviceId);
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (deviceId === 'poco-pad' && bridge?.killAllUserProcesses) {
      bridge.killAllUserProcesses();
    }

    setDeviceProcesses((prev) => {
      const procs = prev[deviceId] || [];
      const filtered = procs.filter((p) => p.category === 'system');
      return { ...prev, [deviceId]: filtered };
    });

    if (targetDev) {
      showToast(`Terminated all user processes on ${targetDev.name}`);
    }

    setTimeout(() => fetchDeviceProcesses(deviceId), 600);
  }, [devices, showToast, fetchDeviceProcesses]);

  const rebootDevice = useCallback((deviceId: string) => {
    audio.playTap();
    const targetDev = devices.find((d) => d.id === deviceId);
    if (!targetDev) return;

    showToast(`Dispatched reboot command to ${targetDev.name}...`);

    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, status: 'rebooting', isRebooting: true, cpuLoad: 99 } : d
      )
    );

    addNotification({
      appId: 'settings',
      appName: 'Remote Power',
      title: `Rebooting ${targetDev.name}...`,
      message: `System restart command sent to ${targetDev.ipAddress}.`,
      iconName: 'RotateCcw',
      color: '#FF9500',
    });

    setTimeout(() => {
      setDeviceProcesses((prev) => ({
        ...prev,
        [deviceId]: INITIAL_DEVICE_PROCESSES[deviceId] || [
          { pid: 1, name: 'init/system', user: 'root', cpu: 1.2, memoryMb: 120, status: 'running', category: 'system', description: 'System Init Core' },
          { pid: 240, name: 'compositor', user: 'system', cpu: 2.5, memoryMb: 90, status: 'running', category: 'system', description: 'Display Compositor' },
          { pid: 850, name: 'shell_host', user: 'user', cpu: 1.0, memoryMb: 60, status: 'running', category: 'user', description: 'Default Shell Interface' },
        ],
      }));

      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId
            ? {
                ...d,
                status: d.type === 'desktop' ? 'online' : 'connected',
                isRebooting: false,
                cpuLoad: Math.floor(Math.random() * 15 + 10),
              }
            : d
        )
      );

      addNotification({
        appId: 'settings',
        appName: 'Remote Power',
        title: `${targetDev.name} is Back Online`,
        message: `Restart complete. All bridge daemons responding.`,
        iconName: 'Check',
        color: '#34C759',
      });
    }, 3500);
  }, [devices, showToast, addNotification]);

  const lockDevice = useCallback((deviceId?: string) => {
    audio.playTap();
    const targetDev = devices.find((d) => d.id === deviceId) || activeDevice;
    if (targetDev && targetDev.id !== 'poco-pad' && targetDev.ipAddress) {
      fetch(`http://${targetDev.ipAddress}/api/lock`, { method: 'POST' }).catch(() => {});
      showToast(`Locked ${targetDev.name}`);
      return;
    }
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge?.lockScreen) {
      bridge.lockScreen();
    }
    showToast('Screen locked');
  }, [devices, activeDevice, showToast]);

  const addRemoteExecutable = useCallback((item: Omit<RemoteExecutable, 'id'>) => {
    audio.playTap();
    const newExec: RemoteExecutable = {
      ...item,
      id: `exec-${Date.now()}`,
    };
    updateSettings({
      remoteExecutables: [newExec, ...(settings.remoteExecutables || [])],
    });
    addNotification({
      appId: 'settings',
      appName: 'Remote Hub',
      title: `Added Executable: ${newExec.name}`,
      message: `Target device: ${newExec.deviceName} (${newExec.commandOrPackage})`,
      iconName: newExec.iconName,
      color: newExec.iconColor,
    });
  }, [settings.remoteExecutables, updateSettings, addNotification]);

  const updateRemoteExecutable = useCallback((id: string, partial: Partial<RemoteExecutable>) => {
    updateSettings({
      remoteExecutables: (settings.remoteExecutables || []).map((e: RemoteExecutable) =>
        e.id === id ? { ...e, ...partial } : e
      ),
    });
  }, [settings.remoteExecutables, updateSettings]);

  const deleteRemoteExecutable = useCallback((id: string) => {
    audio.playTap();
    updateSettings({
      remoteExecutables: (settings.remoteExecutables || []).filter((e: RemoteExecutable) => e.id !== id),
    });
  }, [settings.remoteExecutables, updateSettings]);

  const toggleRemoteExecutable = useCallback((id: string) => {
    audio.playTap();
    updateSettings({
      remoteExecutables: (settings.remoteExecutables || []).map((e: RemoteExecutable) =>
        e.id === id ? { ...e, enabled: !e.enabled } : e
      ),
    });
  }, [settings.remoteExecutables, updateSettings]);

  const executeRemoteApp = useCallback(async (executable: RemoteExecutable): Promise<{ success: boolean; message: string }> => {
    if (settings.soundEffects) audio.playAppOpen();
    const targetDev = devices.find((d) => d.id === executable.deviceId) || devices.find((d) => d.type === 'desktop' || d.type === 'laptop' || d.os?.toLowerCase().includes('windows')) || activeDevice;

    updateRemoteExecutable(executable.id, { lastExecuted: 'Just now' });

    addNotification({
      appId: 'terminal',
      appName: 'Remote Execution',
      title: `Triggered: ${executable.name}`,
      message: `Sent ${executable.execType} (${executable.commandOrPackage}) to ${targetDev.name}`,
      iconName: executable.iconName,
      color: executable.iconColor,
    });

    const rawIp = targetDev.ipAddress || activeDevice.ipAddress;
    if (rawIp && targetDev.id !== 'poco-pad') {
      const cleanHost = rawIp.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
      const host = cleanHost.includes(':') ? cleanHost : `${cleanHost}:9120`;

      showToast(`Launching ${executable.name} on ${targetDev.name}...`);
      try {
        const payload = {
          command_or_path: executable.commandOrPackage,
          command: executable.commandOrPackage,
          args: executable.args || undefined,
          working_dir: executable.workingDir || undefined,
          run_as_admin: executable.runAsAdmin || false,
        };

        const res = await universalNetworkFetch(`http://${host}/api/exec`, {
          method: 'POST',
          body: payload,
          timeoutMs: 4500,
        });

        if (res.ok) {
          showToast(`✓ ${executable.name} launched on ${targetDev.name}`);
          return {
            success: true,
            message: `Executed "${executable.commandOrPackage}" on ${targetDev.name} (RPC OK)`,
          };
        } else {
          showToast(`Launch failed: ${res.error || `HTTP ${res.status}`}`);
          return {
            success: false,
            message: `Failed to execute on ${targetDev.name}: HTTP ${res.status}`,
          };
        }
      } catch (err: any) {
        showToast(`Could not reach ${targetDev.name}`);
        return {
          success: false,
          message: `Network error connecting to ${targetDev.name}: ${err?.message || 'timeout'}`,
        };
      }
    }

    if (executable.deviceId === 'poco-pad' || targetDev.id === 'poco-pad') {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.launchApp && executable.commandOrPackage) {
        bridge.launchApp(executable.commandOrPackage);
        showToast(`Launched ${executable.name}`);
        return { success: true, message: `Launched ${executable.name} locally` };
      }
    }

    showToast(`Dispatched ${executable.name}`);
    return {
      success: true,
      message: `Dispatched "${executable.commandOrPackage}" (Local Simulation)`,
    };
  }, [settings.soundEffects, devices, activeDevice, updateRemoteExecutable, addNotification, showToast]);

  const toggleTrustDevice = useCallback((id: string) => {
    audio.playTap();
    updateSettings({
      trustedDevices: (settings.trustedDevices || []).map((td: TrustedDevice) =>
        td.id === id ? { ...td, isTrusted: !td.isTrusted } : td
      ),
    });
  }, [settings.trustedDevices, updateSettings]);

  const removeTrustedDevice = useCallback((id: string) => {
    audio.playTap();
    updateSettings({
      trustedDevices: (settings.trustedDevices || []).filter((td: TrustedDevice) => td.id !== id),
    });
  }, [settings.trustedDevices, updateSettings]);

  const updateDevicePermissions = useCallback((id: string, permissions: Partial<TrustedDevice['permissions']>) => {
    updateSettings({
      trustedDevices: (settings.trustedDevices || []).map((td: TrustedDevice) =>
        td.id === id ? { ...td, permissions: { ...td.permissions, ...permissions } } : td
      ),
    });
  }, [settings.trustedDevices, updateSettings]);

  return (
    <FleetContext.Provider
      value={{
        devices,
        activeDeviceId,
        activeDevice,
        selectDevice,
        reorderDevices,
        moveDeviceUp,
        moveDeviceDown,
        addDevice,
        removeDevice,
        updateDevice,
        updateDeviceAvatar,
        isSidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        remoteExecutables,
        addRemoteExecutable,
        updateRemoteExecutable,
        deleteRemoteExecutable,
        toggleRemoteExecutable,
        executeRemoteApp,
        trustedDevices,
        toggleTrustDevice,
        removeTrustedDevice,
        updateDevicePermissions,
        deviceProcesses,
        processModalDeviceId,
        openProcessManager,
        closeProcessManager,
        fetchDeviceProcesses,
        killProcess,
        killAllUserProcesses,
        rebootDevice,
        lockDevice,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
