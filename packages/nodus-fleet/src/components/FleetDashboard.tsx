import React, { useState, useEffect } from 'react';
import {
  DeviceInfo,
  DeviceProcess,
  ClipboardItem,
  DEVICE_COLORS
} from '../nodus-common';
import {
  Server,
  Smartphone,
  Monitor,
  Tablet,
  Laptop,
  Clipboard,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Send,
  Plus,
  Terminal,
  Cpu,
  Grid,
  Radio,
  Wifi,
  Activity,
  Layers,
  Sparkles,
  Check,
  Copy,
  Trash2,
  Lock,
  Battery,
  HardDrive,
  Search,
  Filter,
  Play,
  Pause,
  Download,
  FileJson,
  FileText,
  FileCode,
  Settings
} from 'lucide-react';

import { MeshTopologyVisualizer } from './MeshTopologyVisualizer';
import { RemoteControlTab } from './RemoteControlTab';
import { ProcessMonitorTable } from './ProcessMonitorTable';
import { RemoteTerminal } from './RemoteTerminal';
import { DevicePairingModal } from './DevicePairingModal';
import { IncomingPairModal, IncomingPairRequest } from './IncomingPairModal';
import { RemoteAppShortcuts } from './RemoteAppShortcuts';
import { ClipboardDrawer } from './ClipboardDrawer';
import { SettingsTab } from './SettingsTab';
import { SharedApp, ScannedPeer, TrustedEntry } from '../types/ui-contracts';
import { ThemePicker, Theme } from './ThemePicker';

import { universalNetworkFetch } from '../services/FleetDirectClient';

// Initial Fleet Devices (populated dynamically via native bridge & subnet scanner)
const INITIAL_DEVICES: DeviceInfo[] = [];

// Empty fallback clipboard (populated dynamically via context)
const INITIAL_CLIPBOARD: ClipboardItem[] = [];

import { useFleet } from '../context/FleetContext';

export const FleetDashboard: React.FC = () => {
  const fleetContext = useFleet();
  const liveDevices = fleetContext?.devices || [];
  const liveClipboard = fleetContext?.clipboardItems || [];
  const isServerRunning = fleetContext?.isServerRunning ?? true;
  const toggleServer = fleetContext?.toggleServer || (() => {});

  // Navigation tabs: 'Topology' | 'Control Deck' | 'Processes' | 'Terminal' | 'Shortcuts' | 'Settings'
  const [activeTab, setActiveTab] = useState<'topology' | 'control' | 'processes' | 'terminal' | 'shortcuts' | 'settings'>('topology');

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('nodus_fleet_theme') as Theme;
      if (saved === 'midnight' || saved === 'light' || saved === 'obsidian') return saved;
      return 'midnight';
    } catch (_) {
      return 'midnight';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nodus_fleet_theme', theme);
      if (typeof document !== 'undefined') {
        document.documentElement.className = `theme-${theme}`;
        document.body.className = `theme-${theme} bg-[var(--app-bg)] text-[var(--text-body)] antialiased select-none`;
      }
    } catch (_) {}
  }, [theme]);

  const lockRemoteWorkstation = async () => {
    triggerHaptic(15);
    const target = devices.find(d => !d.isLocal && d.ipAddress) || targetDevice;
    if (target && target.ipAddress) {
      try {
        await universalNetworkFetch(`http://${target.ipAddress}:9120/api/system/control`, {
          method: 'POST',
          body: JSON.stringify({ action: 'lock' }),
        });
      } catch (_) {}
    }
  };

  // Multi-device state hooked to live Context with fallback
  const devices = liveDevices.length > 0 ? liveDevices : INITIAL_DEVICES;
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('local');
  const clipboardItems = liveClipboard.length > 0 ? liveClipboard : [];
  const [deviceProcesses, setDeviceProcesses] = useState<Record<string, DeviceProcess[]>>({});
  const [isProcLoading, setIsProcLoading] = useState(false);

  // Granular Feature & Polling Preferences
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nodus_fleet_monitoring_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  const [procRefreshIntervalMs, setProcRefreshIntervalMs] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nodus_fleet_proc_interval');
      return saved ? parseInt(saved, 10) || 3000 : 3000;
    } catch (_) {
      return 3000;
    }
  });

  const [procLimitTopN, setProcLimitTopN] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nodus_fleet_proc_limit');
      return saved ? parseInt(saved, 10) || 35 : 35;
    } catch (_) {
      return 35;
    }
  });

  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nodus_fleet_haptics_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  const [procSystemMetrics, setProcSystemMetrics] = useState<any>(null);

  // Active processes for the currently selected device
  const activeProcesses = deviceProcesses[selectedDeviceId] || [];

  // Universal clipboard quick drawer
  const [showClipboardDrawer, setShowClipboardDrawer] = useState(false);
  const [broadcastInput, setBroadcastInput] = useState('');
  const [copiedClipId, setCopiedClipId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Live clock & uppercase date for Immersive UI header
  const [currentTime, setCurrentTime] = useState<string>('14:42:08');
  const [currentDate, setCurrentDate] = useState<string>('24 OCT 2026');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toTimeString().split(' ')[0] ||
        now.toLocaleTimeString('en-US', { hour12: false })
      );
      const day = String(now.getDate()).padStart(2, '0');
      const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = now.getFullYear();
      setCurrentDate(`${day} ${month} ${year}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Trusted devices & inline nickname registry
  const [trustedDevices, setTrustedDevices] = useState<Record<string, TrustedEntry>>(() => {
    try {
      const raw = localStorage.getItem('nodus_trusted_devices');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {};
  });

  // Live LAN device count (similar to Nodus Desktop)
  const [lanDeviceCount, setLanDeviceCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nodus_lan_device_count');
      if (saved) return parseInt(saved, 10) || 0;
    } catch (_) {}
    return 0;
  });

  // Subnet pairing modal state
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [subnetInput, setSubnetInput] = useState('192.168.1');
  const [isScanningSubnet, setIsScanningSubnet] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedPeers, setScannedPeers] = useState<ScannedPeer[]>([]);

  // Incoming Pair Request Confirmation Dialog State
  const [incomingPairRequest, setIncomingPairRequest] = useState<IncomingPairRequest | null>(null);

  useEffect(() => {
    const handleIncomingPair = (e: any) => {
      const detail = e.detail;
      if (detail) {
        const cleanIp = (detail.ipAddress || detail.ip || '').trim();
        setIncomingPairRequest({
          id: detail.id || detail.deviceId || `node-${cleanIp.replace(/\./g, '-')}`,
          name: detail.name || detail.hostname || 'Remote Workstation',
          deviceType: detail.type || detail.deviceType || 'desktop',
          os: detail.os || 'windows',
          ipAddress: cleanIp || '127.0.0.1',
          httpPort: detail.httpPort || detail.port || 9120,
          token: detail.token,
        });
        triggerHaptic([30, 50, 30]);
      }
    };
    window.addEventListener('incoming-pair-request', handleIncomingPair);
    return () => window.removeEventListener('incoming-pair-request', handleIncomingPair);
  }, []);

  useEffect(() => {
    if (scannedPeers.length > 0) {
      setLanDeviceCount(prev => Math.max(prev, scannedPeers.length));
    }
  }, [scannedPeers.length]);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_lan_device_count', String(lanDeviceCount));
    } catch (_) {}
  }, [lanDeviceCount]);

  const refreshLanCount = React.useCallback(() => {
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge && typeof bridge.getLanDeviceCount === 'function') {
      try {
        const count = bridge.getLanDeviceCount(subnetInput);
        if (count > 0) {
          setLanDeviceCount(prev => Math.max(prev, count, scannedPeers.length));
        }
      } catch (_) {}
    }
  }, [subnetInput, scannedPeers.length]);

  useEffect(() => {
    refreshLanCount();
    const interval = setInterval(refreshLanCount, 5000);
    return () => clearInterval(interval);
  }, [refreshLanCount]);

  const setDeviceNickname = (ip: string, nickname: string, trusted = true) => {
    const cleanIp = ip.trim();
    const cleanNick = nickname.trim();
    const updated = {
      ...trustedDevices,
      [cleanIp]: {
        nickname: cleanNick,
        trusted,
        firstSeen: trustedDevices[cleanIp]?.firstSeen || Date.now(),
      },
    };

    try {
      localStorage.setItem('nodus_trusted_devices', JSON.stringify(updated));
    } catch (_) {}

    setTrustedDevices(updated);

    setScannedPeers(prev =>
      prev.map(p =>
        p.ip === cleanIp
          ? {
              ...p,
              nickname: cleanNick || undefined,
              isTrusted: trusted,
              isUnknown: !trusted,
            }
          : p
      )
    );
  };

  // Remote app shortcuts (dynamically loaded from local storage & connected peer daemon)
  const [myApps, setMyApps] = useState<SharedApp[]>(() => {
    try {
      const saved = localStorage.getItem('nodus_fleet_my_apps');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  const [peerApps, setPeerApps] = useState<SharedApp[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('nodus_fleet_my_apps', JSON.stringify(myApps));
    } catch (_) {}
  }, [myApps]);

  // Target device resolution
  const targetDevice =
    devices.find(d => d.id === selectedDeviceId) ||
    devices.find(d => !d.isLocal) ||
    devices[0];

  // Dynamically load shared shortcuts from target workstation
  useEffect(() => {
    if (!targetDevice || !targetDevice.ipAddress || targetDevice.ipAddress === '127.0.0.1') return;
    const fetchPeerShortcuts = async () => {
      try {
        const url = `http://${targetDevice.ipAddress}:9120/api/shortcuts`;
        const res = await universalNetworkFetch<any>(url);
        if (res && res.data) {
          const raw = res.data.shortcuts || res.data.apps || [];
          const remoteDevice = res.data.device || {};
          const devName = remoteDevice.name || targetDevice.name || 'Remote Host';
          const devType = remoteDevice.type || targetDevice.type || 'desktop';
          const devColor = remoteDevice.color || '#A8C7FA';
          const devIp = targetDevice.ipAddress;

          if (Array.isArray(raw)) {
            setPeerApps(
              raw.map((a: any) => ({
                id: a.id || `peer-${a.name}`,
                name: a.name,
                category: a.category || 'productivity',
                deviceId: a.deviceId || targetDevice.id,
                deviceName: a.deviceName || devName,
                deviceType: a.deviceType || devType,
                deviceColor: a.deviceColor || devColor,
                deviceIp: a.deviceIp || devIp,
                path: a.path_or_appid || a.path || a.commandOrPackage || a.name,
                description: a.description,
                icon_base64: a.icon_base64 || a.icon,
                sharedBy: 'peer' as const,
                enabled: a.enabled ?? true,
              }))
            );
          }
        }
      } catch (_) {}
    };
    fetchPeerShortcuts();
  }, [targetDevice?.id, targetDevice?.ipAddress, activeTab]);

  // Material 3 Fleet Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'desktop' | 'laptop' | 'tablet' | 'online'>('all');

  // Android Haptic Feedback Helper
  const triggerHaptic = (pattern: number | number[] = 12) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Safe fallback
    }
  };

  // Refresh process list via real API
  const handleRefreshProcesses = async () => {
    if (!targetDevice) return;
    triggerHaptic(10);
    setIsProcLoading(true);
    try {
      const url = `http://${targetDevice.ipAddress}:9120/api/processes`;
      const res = await universalNetworkFetch<{
        processes?: Array<{ pid: number; name: string; memory_kb?: number; memoryMb?: number; cpu?: number; user?: string }>;
        system?: any;
      }>(url);
      if (res && res.data) {
        if (res.data.system) {
          setProcSystemMetrics(res.data.system);
        }
        if (res.data.processes && Array.isArray(res.data.processes)) {
          const rawProcs = procLimitTopN > 0 ? res.data.processes.slice(0, procLimitTopN) : res.data.processes;
          const mapped: DeviceProcess[] = rawProcs.map((p: any) => ({
            pid: p.pid,
            name: p.name,
            user: p.user || 'SYSTEM',
            cpu: typeof p.cpu === 'number' ? Math.round(p.cpu * 10) / 10 : 0,
            memoryMb: typeof p.memoryMb === 'number' ? p.memoryMb : Math.round(((p.memory_kb || 0) / 1024) * 10) / 10,
            status: 'running' as const,
            category: 'system'
          }));
          setDeviceProcesses(prev => ({
            ...prev,
            [selectedDeviceId]: mapped
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch processes from target device', err);
    } finally {
      setIsProcLoading(false);
    }
  };

  // Tab Lifecycle Polling Guard for Process Monitor
  useEffect(() => {
    if (activeTab === 'processes' && targetDevice && isMonitoringEnabled) {
      handleRefreshProcesses();
      if (procRefreshIntervalMs > 0) {
        const timer = setInterval(() => {
          handleRefreshProcesses();
        }, procRefreshIntervalMs);
        return () => clearInterval(timer);
      }
    }
  }, [activeTab, selectedDeviceId, isMonitoringEnabled, procRefreshIntervalMs]);

  // Kill process action via real API
  const handleKillProcess = async (pid: number) => {
    triggerHaptic([20, 30, 20]);
    if (targetDevice) {
      try {
        const url = `http://${targetDevice.ipAddress}:9120/api/process/kill`;
        await universalNetworkFetch(url, {
          method: 'POST',
          body: JSON.stringify({ pid })
        });
      } catch (err) {
        console.warn('Failed to kill process on target device', err);
      }
    }
    setDeviceProcesses(prev => ({
      ...prev,
      [selectedDeviceId]: (prev[selectedDeviceId] || []).filter(p => p.pid !== pid)
    }));
  };

  // Subnet Scanning native call & web fallback with smooth visual feedback
  const handleStartScan = async (targetSubnet: string) => {
    triggerHaptic(15);
    setIsScanningSubnet(true);
    setScanProgress(10);
    setScannedPeers([]);

    // Smooth progress ticker
    const progressInterval = setInterval(() => {
      setScanProgress(prev => (prev >= 90 ? 90 : prev + 15));
    }, 200);

    // Yield to the JS event loop to force immediate DOM repaint of the "Probing..." button & spinner
    await new Promise(resolve => setTimeout(resolve, 80));

    const cleanSubnet = targetSubnet.trim().replace(/\.+$/, '');
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;

    try {
      if (bridge && typeof bridge.scanSubnetNative === 'function') {
        const rawJson = bridge.scanSubnetNative(cleanSubnet);
        if (rawJson && rawJson.startsWith('[')) {
          const list: ScannedPeer[] = JSON.parse(rawJson);
          const mapped: ScannedPeer[] = list.map(p => {
            const cleanPeerIp = (p.ip || '').split(':')[0].trim();
            const trustInfo = trustedDevices[cleanPeerIp];
            const isTrusted = trustInfo ? trustInfo.trusted : p.hasAgent;
            return {
              ...p,
              nickname: trustInfo?.nickname || undefined,
              isTrusted,
              isUnknown: !isTrusted,
              isInFleet: devices.some(d => !d.isLocal && (d.ipAddress || '').split(':')[0].trim() === cleanPeerIp),
            };
          });
          setScannedPeers(mapped);
          if (mapped.length > 0) {
            setLanDeviceCount(mapped.length);
          }
        }
      } else {
        // Web simulation / HTTP probing fallback
        const discovered: ScannedPeer[] = [];
        const probes = [];

        for (let i = 1; i <= 254; i++) {
          const ip = `${cleanSubnet}.${i}`;
          probes.push(
            (async () => {
              try {
                const url = `http://${ip}:9120/api/status`;
                const res = await universalNetworkFetch<{ name?: string; hostname?: string; os?: string; deviceType?: string }>(url, { timeoutMs: 600 });
                if (res && res.ok) {
                  const trustInfo = trustedDevices[ip];
                  discovered.push({
                    ip,
                    port: 9120,
                    hostname: res.data?.name || res.data?.hostname || `Nodus Node (${ip})`,
                    nickname: trustInfo?.nickname,
                    hasAgent: true,
                    isTrusted: trustInfo ? trustInfo.trusted : true,
                    isUnknown: trustInfo ? !trustInfo.trusted : false,
                    isInFleet: devices.some(d => !d.isLocal && (d.ipAddress || '').split(':')[0].trim() === ip),
                    deviceType: (res.data?.deviceType as any) || 'desktop',
                    os: res.data?.os || 'windows',
                  });
                }
              } catch (_) {}
            })()
          );
        }

        await Promise.all(probes);
        setScannedPeers(discovered);
        if (discovered.length > 0) {
          setLanDeviceCount(discovered.length);
        }
      }
    } catch (err) {
      console.warn('Scan failed', err);
    } finally {
      clearInterval(progressInterval);
      setScanProgress(100);
      setIsScanningSubnet(false);
    }
  };

  const handlePairDevice = (ip: string, port: number, token: string, peer?: ScannedPeer) => {
    const cleanIp = ip.trim();
    const cleanName = peer?.nickname || peer?.hostname || `Device (${cleanIp})`;
    const deviceType = peer?.deviceType || (cleanName.toLowerCase().includes('tab') ? 'tablet' : 'desktop');
    const os = peer?.os || (deviceType === 'desktop' ? 'windows' : 'android');

    // 1. Persist trusted registry
    setDeviceNickname(cleanIp, cleanName, true);

    // 2. Add to live FleetContext
    if (fleetContext?.addPairedDevice) {
      fleetContext.addPairedDevice({
        ipAddress: cleanIp,
        port,
        name: cleanName,
        type: deviceType as any,
        os: os as any,
        status: 'connected',
      });
    }

    // 3. Dispatch to Android Native Bridge
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge && typeof bridge.addPairedDevice === 'function') {
      bridge.addPairedDevice(cleanIp, port, cleanName);
    }

    // 4. Send initial pair-request to target workstation so it prompts with confirmation modal
    universalNetworkFetch(`http://${cleanIp}:${port}/api/fleet/pair-request`, {
      method: 'POST',
      body: JSON.stringify({
        id: 'poco-pad',
        deviceId: 'poco-pad',
        name: 'POCO Pad',
        deviceType: 'tablet',
        type: 'tablet',
        os: 'Android 14 (HyperOS)',
        ipAddress: '192.168.1.35',
        httpPort: 9120,
        port: 9120,
        token: 'NODUS-FLEET-SECURE',
        isAck: false,
      }),
    }).catch(() => {});

    if (fleetContext && typeof fleetContext.refreshState === 'function') {
      fleetContext.refreshState();
    }

    setShowPairingModal(false);
  };

  const handleAcceptIncomingPair = (req: IncomingPairRequest) => {
    triggerHaptic(15);
    const cleanIp = req.ipAddress.trim();
    const port = req.httpPort || 9120;
    const cleanName = req.name || `Host (${cleanIp})`;
    const deviceType = req.deviceType || (cleanName.toLowerCase().includes('tab') ? 'tablet' : 'desktop');
    const os = req.os || 'windows';

    // 1. Save to trusted devices registry
    setDeviceNickname(cleanIp, cleanName, true);

    // 2. Add to live FleetContext
    if (fleetContext?.addPairedDevice) {
      fleetContext.addPairedDevice({
        ipAddress: cleanIp,
        port,
        name: cleanName,
        type: deviceType as any,
        os: os as any,
        status: 'connected',
      });
    }

    // 3. Dispatch to Android Native Bridge
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge && typeof bridge.addPairedDevice === 'function') {
      bridge.addPairedDevice(cleanIp, port, cleanName);
    }

    // 4. Send HTTP confirmation / bidirectional pair-confirm (ACK) back to sender
    universalNetworkFetch(`http://${cleanIp}:${port}/api/fleet/pair-confirm`, {
      method: 'POST',
      body: JSON.stringify({
        id: 'poco-pad',
        deviceId: 'poco-pad',
        name: 'POCO Pad',
        deviceType: 'tablet',
        type: 'tablet',
        os: 'Android 14 (HyperOS)',
        ipAddress: '192.168.1.35',
        httpPort: 9120,
        port: 9120,
        token: 'NODUS-FLEET-SECURE',
        isAck: true,
        action: 'confirm',
      }),
    }).catch(() => {});

    if (fleetContext && typeof fleetContext.refreshState === 'function') {
      fleetContext.refreshState();
    }

    setIncomingPairRequest(null);
  };

  const handleDeclineIncomingPair = () => {
    triggerHaptic(10);
    if (incomingPairRequest && fleetContext?.removeDevice) {
      fleetContext.removeDevice(incomingPairRequest.id);
    }
    setIncomingPairRequest(null);
  };

  // Universal clipboard broadcasting & actions
  const handleBroadcastClipboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;

    if (fleetContext && typeof fleetContext.setClipboardText === 'function') {
      fleetContext.setClipboardText(broadcastInput.trim());
    }
    setBroadcastInput('');
  };

  const handleCopyClipboardItem = (item: ClipboardItem) => {
    if (fleetContext && typeof fleetContext.copyToClipboard === 'function') {
      fleetContext.copyToClipboard(item.text || 'Image', item.imageData);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(item.text || '').catch(() => {});
    }
    setCopiedClipId(item.id);
    setTimeout(() => setCopiedClipId(null), 2000);
  };

  const handleDeleteClipboardItem = (id: string) => {
    if (fleetContext && typeof fleetContext.deleteClipboardItem === 'function') {
      fleetContext.deleteClipboardItem(id);
    }
  };

  const handleTogglePinClipboardItem = (id: string) => {
    if (fleetContext && typeof fleetContext.toggleClipboardPin === 'function') {
      fleetContext.toggleClipboardPin(id);
    }
  };

  const handleClearUnpinnedClipboard = () => {
    const unpinned = clipboardItems.filter(i => !i.pinned);
    for (const item of unpinned) {
      if (fleetContext && typeof fleetContext.deleteClipboardItem === 'function') {
        fleetContext.deleteClipboardItem(item.id);
      }
    }
  };

  const handleClearClipboard = () => {
    if (fleetContext && typeof fleetContext.clearClipboard === 'function') {
      fleetContext.clearClipboard();
    }
    setConfirmClearAll(false);
  };

  const handleExportClipboard = (format: 'json' | 'txt' | 'md' = 'json') => {
    if (clipboardItems.length === 0) return;
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'json') {
      const payload = {
        app: 'Nodus Fleet Companion',
        version: '1.1.1',
        exportedAt: new Date().toISOString(),
        totalItems: clipboardItems.length,
        items: clipboardItems,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nodus-fleet-clipboard-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (format === 'md') {
      let md = `# Nodus Fleet Universal Clipboard History Export\n\n*Exported on ${new Date().toLocaleString()} · Total items: ${clipboardItems.length}*\n\n---\n\n`;
      for (const item of clipboardItems) {
        md += `### [${(item.type || 'TEXT').toUpperCase()}] ${item.timestamp} · ${item.deviceName || 'Device'}${item.pinned ? ' 📌' : ''}\n\n`;
        if (item.type === 'image' && item.imageData) {
          md += `![Clipboard Image](${item.imageData})\n\n`;
        } else {
          md += `\`\`\`text\n${item.text}\n\`\`\`\n\n`;
        }
        md += `---\n\n`;
      }
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nodus-fleet-clipboard-${dateStr}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      let txt = `=======================================================\n`;
      txt += `NODUS FLEET CLIPBOARD HISTORY EXPORT\n`;
      txt += `Export Date: ${new Date().toLocaleString()}\n`;
      txt += `Total Items: ${clipboardItems.length}\n`;
      txt += `=======================================================\n\n`;
      for (const item of clipboardItems) {
        txt += `[${item.timestamp}] ${item.deviceName || 'Device'} (${(item.type || 'TEXT').toUpperCase()})${item.pinned ? ' [PINNED]' : ''}\n`;
        if (item.type === 'image') {
          txt += `[Image Payload: ${item.imageData ? Math.round(item.imageData.length * 0.75 / 1024) + ' KB' : 'None'}]\n`;
        } else {
          txt += `${item.text}\n`;
        }
        txt += `-------------------------------------------------------\n`;
      }
      const blob = new Blob([txt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nodus-fleet-clipboard-${dateStr}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    setShowExportMenu(false);
    setExportFeedback(`Exported .${format.toUpperCase()}`);
    setTimeout(() => setExportFeedback(null), 2000);
  };

  // Filtered devices based on Material 3 Search and Filter Chips
  const filteredDevices = devices.filter(dev => {
    const matchesSearch =
      !searchQuery.trim() ||
      dev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dev.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dev.os.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (deviceFilter === 'all') return true;
    if (deviceFilter === 'online') return dev.status === 'online' || dev.status === 'connected';
    return dev.type === deviceFilter;
  });

  return (
    <div className={`theme-${theme} flex flex-col h-screen h-dvh w-full overflow-hidden bg-[var(--app-bg)] text-[var(--text-body)] antialiased select-none relative selection:bg-[var(--accent-container)] selection:text-[var(--accent-on-container)]`}>
      {/* ── Top Application Header (1:1 with Nodus Desktop) ── */}
      <header className="pt-safe border-b border-[var(--border-subtle)] bg-[var(--surface-header)] backdrop-blur-xl flex items-center justify-between px-3 sm:px-6 min-h-[3.75rem] sm:min-h-[4.25rem] py-1.5 sm:py-2 z-20 shrink-0">
        {/* Brand & M3 Emblem */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0842A0] text-[#D3E3FD] flex items-center justify-center shadow-md shadow-blue-950/30 shrink-0">
            <Server className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-[var(--text-heading)]">
                Nodus <span className="text-[var(--accent-primary)] font-light">Fleet</span>
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-[var(--surface-container)] text-[var(--accent-primary)] font-mono text-[10px] font-semibold border border-[var(--border-subtle)]">
                Android
              </span>
              <button
                onClick={() => {
                  triggerHaptic(12);
                  toggleServer();
                }}
                title={isServerRunning ? 'Mesh Active (Click to Pause)' : 'Mesh Paused (Click to Activate)'}
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-medium tracking-wide transition border active:scale-95 ${
                  isServerRunning
                    ? 'bg-[#0F5223] hover:bg-[#1B6D36] text-[#C4EED0] border-[#6DD58C]/30'
                    : 'bg-[#3A1D1D] hover:bg-[#5C2424] text-[#FFB4AB] border-red-500/30'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isServerRunning ? 'bg-[#6DD58C] animate-pulse' : 'bg-[#FFB4AB]'}`} />
                <span>{isServerRunning ? 'Mesh Active' : 'Mesh Paused'}</span>
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <span>Cross-Device Companion & Control Hub</span>
            </div>
          </div>
        </div>

        {/* Integrated Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-elevated)] focus-within:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] focus-within:border-[var(--border-active)] transition-all text-xs">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search fleet nodes, IP, OS..."
              className="flex-1 bg-transparent text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[var(--text-muted)] hover:text-[var(--text-heading)] text-[11px] px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right Controls: Lock Workstation + ThemePicker + Clock */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={lockRemoteWorkstation}
            className="h-8 px-2.5 sm:px-3 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-elevated)] text-[var(--text-body)] hover:text-[var(--text-heading)] text-xs font-mono flex items-center gap-1.5 transition border border-[var(--border-subtle)] active:scale-95"
            title="Lock Connected Desktop Workstation"
          >
            <Lock size={14} style={{ color: 'var(--btn-danger-text)' }} />
            <span className="hidden sm:inline">Lock PC</span>
          </button>

          <ThemePicker current={theme} onChange={setTheme} />

          <div className="text-right shrink-0 pl-1">
            <div className="text-xs sm:text-sm font-mono text-[var(--text-heading)] tracking-wide">{currentTime}</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-tight">{currentDate}</div>
          </div>
        </div>
      </header>

      {/* ── Main Application Area: Navigation Rail + Workspace ── */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Navigation Rail (md and above) */}
        <nav className="hidden md:flex w-20 border-r border-[var(--border-subtle)] bg-[var(--surface-base)] flex-col items-center py-5 gap-4 z-10 shrink-0 select-none">
          {/* Pairing Button */}
          <button
            onClick={() => {
              triggerHaptic(12);
              setShowPairingModal(true);
            }}
            title={`Pair New Mesh Node (${lanDeviceCount || 0} active LAN devices detected)`}
            className="w-11 h-11 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] shadow-md shadow-blue-950/20 transition-all flex items-center justify-center active:scale-95 group mb-1 relative"
          >
            <Plus size={22} className="stroke-[2.5]" />
            {lanDeviceCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shadow-md border border-[var(--surface-base)] flex items-center justify-center min-w-[18px] h-[18px] bg-[var(--accent-container)] text-[var(--accent-on-container)] transition-transform animate-in zoom-in-75"
                title={`${lanDeviceCount} active device${lanDeviceCount === 1 ? '' : 's'} on WiFi`}
              >
                {lanDeviceCount}
              </span>
            )}
          </button>

          {/* Navigation Items */}
          {[
            { id: 'topology', label: 'Topology', icon: Grid },
            { id: 'control', label: 'Control', icon: Sliders },
            { id: 'processes', label: 'Processes', icon: Cpu },
            { id: 'terminal', label: 'Terminal', icon: Terminal },
            { id: 'shortcuts', label: 'Shortcuts', icon: Radio },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic(12);
                  setActiveTab(tab.id as any);
                }}
                className="flex flex-col items-center group w-full py-1 focus:outline-none"
              >
                <div
                  className={`w-12 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] shadow-sm'
                      : 'text-[var(--text-muted)] group-hover:text-[var(--text-heading)] group-hover:bg-[var(--surface-container)]'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <span
                  className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                    isActive ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-muted)] group-hover:text-[var(--text-heading)]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Bottom Rail Utility: Universal Clipboard */}
          <div className="mt-auto flex flex-col items-center w-full">
            <button
              onClick={() => {
                triggerHaptic(12);
                setShowClipboardDrawer(!showClipboardDrawer);
              }}
              title="Universal Mesh Clipboard"
              className="flex flex-col items-center group focus:outline-none w-full py-1"
            >
              <div
                className={`w-12 h-8 rounded-lg flex items-center justify-center transition-all duration-200 relative ${
                  showClipboardDrawer
                    ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)]'
                    : 'text-[var(--text-muted)] group-hover:text-[var(--text-heading)] group-hover:bg-[var(--surface-container)]'
                }`}
              >
                <Clipboard size={18} />
                {clipboardItems.length > 0 && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--surface-base)]" />
                )}
              </div>
              <span className="text-[11px] font-medium tracking-tight mt-1 text-[var(--text-muted)] group-hover:text-[var(--text-heading)]">
                Clipboard
              </span>
            </button>
          </div>
        </nav>

        {/* ── Active Tab Workspace ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-[var(--app-bg)]">
          {/* TAB 1: MESH TOPOLOGY VISUALIZER */}
          {activeTab === 'topology' && (
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 pb-6 space-y-6">
              <div className="flex flex-col gap-6">
                {/* Interactive SVG Graph */}
                <MeshTopologyVisualizer
                  devices={devices}
                  activeDeviceId={selectedDeviceId}
                  onSelectDevice={id => {
                    setSelectedDeviceId(id);
                  }}
                />

                {/* Filter Chips Bar */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mr-1 shrink-0">
                      <Filter size={13} />
                      Filter:
                    </span>
                    {[
                      { id: 'all', label: `All (${devices.length})` },
                      { id: 'desktop', label: 'Workstations' },
                      { id: 'laptop', label: 'Laptops' },
                      { id: 'tablet', label: 'Tablets' },
                      { id: 'online', label: 'Online' },
                    ].map(chip => (
                      <button
                        key={chip.id}
                        onClick={() => {
                          triggerHaptic(8);
                          setDeviceFilter(chip.id as any);
                        }}
                        className={`h-8 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap inline-flex items-center justify-center shrink-0 touch-manipulation ${
                          deviceFilter === chip.id
                            ? 'bg-[var(--accent-primary)] text-[var(--accent-container-text,#062E6F)] shadow-sm font-semibold'
                            : 'bg-[var(--chip-bg)] hover:bg-[var(--surface-elevated)] text-[var(--chip-text)] border border-[var(--border-subtle)]'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    Showing {filteredDevices.length} of {devices.length} nodes
                  </span>
                </div>

                {/* Connected Device Overview Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredDevices.map(device => {
                    const isSelected = selectedDeviceId === device.id;
                    const isOnline = device.status !== 'offline';

                    return (
                      <div
                        key={device.id}
                        onClick={() => setSelectedDeviceId(device.id)}
                        className={`bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border rounded-xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${
                          isSelected
                            ? 'border-[var(--accent-primary)] ring-1 ring-[var(--border-active)] bg-[var(--surface-elevated)]'
                            : 'border-[var(--border-subtle)] hover:border-[var(--border-active)]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                              {device.type === 'tablet' ? (
                                <Tablet size={20} />
                              ) : device.type === 'laptop' ? (
                                <Laptop size={20} />
                              ) : device.type === 'phone' ? (
                                <Smartphone size={20} />
                              ) : (
                                <Monitor size={20} />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-[var(--text-heading)]">
                                {device.name}
                              </div>
                              <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                                ID: {device.id} · {device.ipAddress} · {device.os.toUpperCase()}
                              </div>
                            </div>
                          </div>

                          {device.isLocal ? (
                            <span
                              className="text-[11px] px-2.5 py-0.5 rounded-md font-medium tracking-wide flex items-center gap-1.5 border"
                              style={{
                                backgroundColor: isServerRunning ? 'var(--status-online-bg)' : 'var(--status-offline-bg)',
                                color: isServerRunning ? 'var(--status-online-text)' : 'var(--status-offline-text)',
                                borderColor: isServerRunning ? 'var(--status-online-border)' : 'var(--status-offline-border)',
                              }}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isServerRunning ? 'bg-[#6DD58C] animate-pulse' : 'bg-[#FFB4AB]'
                                }`}
                              />
                              {isServerRunning ? 'DAEMON ACTIVE' : 'SERVER STOPPED'}
                            </span>
                          ) : (
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium border ${
                                device.status === 'online'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                  : 'bg-blue-500/10 text-[var(--accent-primary)] border-[var(--border-active)]'
                              }`}
                            >
                              {device.status === 'online' ? 'Stable' : device.status}
                            </span>
                          )}
                        </div>

                        {/* CPU Usage Linear Progress Indicator */}
                        <div className="space-y-1.5">
                          <div className="h-1.5 w-full bg-[var(--surface-container)] rounded-md overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent-primary)] transition-all duration-500 rounded-md"
                              style={{ width: `${device.cpuUsagePercent || 25}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] font-mono text-[var(--text-muted)]">
                            <span>CPU Workload</span>
                            <span className="text-[var(--text-body)] font-semibold">{device.cpuUsagePercent || 25}%</span>
                          </div>
                        </div>

                        {/* Telemetry Metrics Row */}
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-subtle)] text-[11px] font-mono">
                          <div>
                            <span className="text-[var(--text-muted)] block text-[10px]">LATENCY</span>
                            <span className="text-emerald-500 font-semibold">{device.latencyMs} ms</span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)] block text-[10px]">BATTERY</span>
                            <span className="text-[var(--text-body)] font-semibold">{device.batteryPercent}%</span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)] block text-[10px]">ROLE</span>
                            <span className="text-[var(--accent-primary)] font-semibold">
                              {device.isLocal ? 'HOST' : 'REMOTE'}
                            </span>
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                          {device.isLocal ? (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                triggerHaptic(12);
                                toggleServer();
                              }}
                              title={isServerRunning ? 'Stop Server & Unregister from Mesh' : 'Start Server & Broadcast to Mesh'}
                              className="h-8 px-2.5 rounded-lg text-xs font-medium transition-colors border active:scale-95 inline-flex items-center justify-center gap-1.5"
                              style={{
                                backgroundColor: isServerRunning ? 'var(--btn-danger-bg)' : 'var(--btn-success-bg)',
                                color: isServerRunning ? 'var(--btn-danger-text)' : 'var(--btn-success-text)',
                                borderColor: isServerRunning ? 'var(--btn-danger-border)' : 'var(--btn-success-border)',
                              }}
                            >
                              {isServerRunning ? <Pause size={13} /> : <Play size={13} />}
                              <span>{isServerRunning ? 'Stop Server' : 'Start Server'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (fleetContext?.removeDevice) {
                                  fleetContext.removeDevice(device.id);
                                }
                              }}
                              title="Remove Node from Fleet"
                              className="h-8 px-2.5 rounded-lg text-xs font-medium transition-colors border active:scale-95 inline-flex items-center justify-center gap-1"
                              style={{
                                backgroundColor: 'var(--btn-danger-bg)',
                                color: 'var(--btn-danger-text)',
                                borderColor: 'var(--btn-danger-border)',
                              }}
                            >
                              <Trash2 size={13} />
                              <span>Remove</span>
                            </button>
                          )}

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedDeviceId(device.id);
                              setActiveTab('control');
                            }}
                            disabled={device.isLocal}
                            className="h-8 px-3.5 rounded-lg bg-[var(--control-btn-bg)] hover:bg-[var(--control-btn-hover)] text-xs font-medium text-[var(--control-btn-text)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-[var(--border-subtle)] active:scale-95 inline-flex items-center justify-center touch-manipulation"
                          >
                            Control Deck
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedDeviceId(device.id);
                              setActiveTab('processes');
                            }}
                            className="h-8 px-3.5 rounded-lg bg-[var(--control-btn-bg)] hover:bg-[var(--control-btn-hover)] text-xs font-medium text-[var(--control-btn-text)] transition-colors border border-[var(--border-subtle)] active:scale-95 inline-flex items-center justify-center touch-manipulation"
                          >
                            Processes
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REMOTE CONTROL DECK & VIRTUAL TRACKPAD */}
          {activeTab === 'control' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden pb-6 lg:pb-0">
              <RemoteControlTab
                devices={devices}
                targetDeviceId={selectedDeviceId}
                onSelectDevice={id => setSelectedDeviceId(id)}
              />
            </div>
          )}

          {/* TAB 3: REMOTE PROCESS MONITOR TABLE */}
          {activeTab === 'processes' && targetDevice && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden p-2 sm:p-4 md:p-5 pb-6 md:pb-5">
              <ProcessMonitorTable
                device={targetDevice}
                devices={devices}
                onSelectDevice={id => setSelectedDeviceId(id)}
                processes={activeProcesses}
                isLoading={isProcLoading}
                isMonitoringEnabled={isMonitoringEnabled}
                onToggleMonitoring={() => {
                  setIsMonitoringEnabled(prev => {
                    const next = !prev;
                    localStorage.setItem('nodus_fleet_monitoring_enabled', String(next));
                    return next;
                  });
                }}
                refreshIntervalMs={procRefreshIntervalMs}
                onChangeInterval={interval => {
                  setProcRefreshIntervalMs(interval);
                  localStorage.setItem('nodus_fleet_proc_interval', String(interval));
                }}
                systemMetrics={procSystemMetrics}
                onRefresh={handleRefreshProcesses}
                onKillProcess={handleKillProcess}
              />
            </div>
          )}

          {/* TAB 4: REMOTE TERMINAL SHELL */}
          {activeTab === 'terminal' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden p-2 sm:p-4 md:p-5 pb-6 md:pb-5">
              <RemoteTerminal
                availableDevices={devices}
                theme={theme}
              />
            </div>
          )}

          {/* TAB 5: REMOTE APP SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden p-2 sm:p-4 md:p-5 pb-6 md:pb-5">
              <RemoteAppShortcuts
                myApps={myApps}
                peerApps={peerApps}
                onToggleMyApp={(id, enabled) => {
                  setMyApps(prev => prev.map(a => (a.id === id ? { ...a, enabled } : a)));
                }}
                onLaunchPeerApp={async app => {
                  const peerIp = app.deviceIp || targetDevice?.ipAddress;
                  if (!peerIp) return;
                  triggerHaptic([15, 25, 15]);
                  try {
                    const url = `http://${peerIp}:9120/api/shortcuts/launch`;
                    await universalNetworkFetch(url, {
                      method: 'POST',
                      body: JSON.stringify({ command_or_path: app.path || app.name })
                    });
                  } catch (err) {
                    console.warn('Failed to launch shortcut on remote peer', err);
                  }
                }}
                onAddMyApp={() => {
                  const name = prompt('Enter shortcut application name:');
                  if (!name) return;
                  setMyApps(prev => [
                    ...prev,
                    {
                      id: `app-${Date.now()}`,
                      name,
                      category: 'utility',
                      deviceId: 'local',
                      deviceName: 'Nodus Tablet Prime',
                      deviceType: 'tablet',
                      deviceColor: '#9ECAFF',
                      sharedBy: 'me',
                      enabled: true
                    }
                  ]);
                }}
              />
            </div>
          )}

          {/* TAB 6: FLEET SETTINGS & SYSTEM CONFIGURATION */}
          {activeTab === 'settings' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden p-2 sm:p-4 md:p-5 pb-6 md:pb-5">
              <SettingsTab
                currentTheme={theme}
                onThemeChange={setTheme}
                isMonitoringEnabled={isMonitoringEnabled}
                onToggleMonitoring={enabled => {
                  setIsMonitoringEnabled(enabled);
                  localStorage.setItem('nodus_fleet_monitoring_enabled', String(enabled));
                }}
                refreshIntervalMs={procRefreshIntervalMs}
                onChangeInterval={(interval: number) => {
                  setProcRefreshIntervalMs(interval);
                  localStorage.setItem('nodus_fleet_proc_interval', String(interval));
                }}
                limitTopN={procLimitTopN}
                onChangeLimitTopN={(limit: number) => {
                  setProcLimitTopN(limit);
                  localStorage.setItem('nodus_fleet_proc_limit', String(limit));
                }}
                hapticsEnabled={hapticsEnabled}
                onToggleHaptics={enabled => {
                  setHapticsEnabled(enabled);
                  localStorage.setItem('nodus_fleet_haptics_enabled', String(enabled));
                }}
                subnetInput={subnetInput}
                onChangeSubnet={setSubnetInput}
                onResetAllData={() => {
                  localStorage.removeItem('nodus_fleet_monitoring_enabled');
                  localStorage.removeItem('nodus_fleet_proc_interval');
                  localStorage.removeItem('nodus_fleet_proc_limit');
                  localStorage.removeItem('nodus_fleet_haptics_enabled');
                  localStorage.removeItem('nodus_trusted_devices');
                  localStorage.removeItem('nodus_last_subnet');
                  localStorage.removeItem('nodus_my_shortcuts');
                  window.location.reload();
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* ── Status Footer (Desktop & Tablet) ── */}
      <footer className="hidden md:flex h-8 bg-[var(--surface-base)] border-t border-[var(--border-subtle)] items-center px-6 justify-between text-[11px] font-mono text-[var(--text-muted)] z-20 shrink-0 select-none">
        <div className="flex gap-4 items-center">
          <span className="text-emerald-500 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Latency: {targetDevice?.latencyMs !== undefined ? `${targetDevice.latencyMs}ms` : '12ms'}
          </span>
          <span className="flex items-center gap-1">● Mesh: Secure</span>
          <span className="hidden sm:flex items-center gap-1">● Peer: {targetDevice?.name || 'Mesh Node'}</span>
        </div>
        <div className="text-[var(--text-muted)] font-mono text-[10px]">Nodus Fleet v1.1.2 (Companion)</div>
      </footer>

      {/* ── Mobile Navigation Bar (In-Flow Flex item, never blocks workspace content) ── */}
      <nav className="md:hidden shrink-0 z-30 pb-safe bg-[var(--surface-base)]/95 backdrop-blur-2xl border-t border-[var(--border-subtle)] px-2 py-1.5 flex items-center justify-around select-none shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
        {[
          { id: 'topology', label: 'Topology', icon: Grid },
          { id: 'control', label: 'Control', icon: Sliders },
          { id: 'processes', label: 'Processes', icon: Cpu },
          { id: 'terminal', label: 'Terminal', icon: Terminal },
          { id: 'shortcuts', label: 'Shortcuts', icon: Radio },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic(12);
                setActiveTab(tab.id as any);
              }}
              className="flex-1 flex flex-col items-center justify-center py-1 px-1 min-h-[50px] transition duration-150 focus:outline-none"
            >
              <div
                className={`w-12 h-8 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] shadow-sm'
                    : 'bg-transparent text-[var(--text-muted)]'
                }`}
              >
                <Icon size={19} />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap ${
                  isActive ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-muted)]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Quick Clipboard Trigger */}
        <button
          onClick={() => {
            triggerHaptic(12);
            setShowClipboardDrawer(!showClipboardDrawer);
          }}
          title="Universal Clipboard"
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 min-h-[50px] transition duration-150 relative focus:outline-none"
        >
          <div
            className={`w-12 h-8 rounded-lg transition-all duration-200 flex items-center justify-center relative ${
              showClipboardDrawer
                ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)]'
                : 'bg-transparent text-[var(--text-muted)]'
            }`}
          >
            <Clipboard size={18} />
            {clipboardItems.length > 0 && (
              <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--surface-base)]" />
            )}
          </div>
          <span
            className={`text-[10px] font-medium tracking-tight mt-1 ${
              showClipboardDrawer ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-muted)]'
            }`}
          >
            Sync
          </span>
        </button>

        {/* Quick Pair FAB Trigger */}
        <button
          onClick={() => {
            triggerHaptic(12);
            setShowPairingModal(true);
          }}
          title={`Pair New Node (${lanDeviceCount || 0} active LAN devices detected)`}
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 min-h-[50px] transition duration-150 focus:outline-none relative"
        >
          <div className="w-12 h-8 rounded-lg transition-all flex items-center justify-center bg-[var(--accent-container)]/20 text-[var(--accent-primary)] relative">
            <Plus size={19} className="stroke-[2.2]" />
            {lanDeviceCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold shadow-sm flex items-center justify-center min-w-[16px] h-[16px] bg-[var(--accent-container)] text-[var(--accent-on-container)] border border-[var(--surface-base)] animate-in zoom-in-75"
                title={`${lanDeviceCount} active device${lanDeviceCount === 1 ? '' : 's'} on WiFi`}
              >
                {lanDeviceCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-1 text-[var(--accent-primary)]">
            Pair
          </span>
        </button>
      </nav>

      {/* ── Universal Clipboard Drawer ── */}
      <ClipboardDrawer
        isOpen={showClipboardDrawer}
        onClose={() => setShowClipboardDrawer(false)}
        items={clipboardItems}
        isSyncEnabled={fleetContext?.isClipboardSyncEnabled ?? true}
        onToggleSync={fleetContext?.toggleClipboardSync}
        onBroadcast={text => {
          if (fleetContext && typeof fleetContext.setClipboardText === 'function') {
            fleetContext.setClipboardText(text);
          }
        }}
        onCopyItem={item => handleCopyClipboardItem(item)}
        onDeleteItem={id => handleDeleteClipboardItem(id)}
        onTogglePin={id => handleTogglePinClipboardItem(id)}
        onClearUnpinned={() => handleClearUnpinnedClipboard()}
        onClearAll={() => handleClearClipboard()}
        onExport={format => handleExportClipboard(format)}
      />

      {/* ── Subnet Pairing Modal ── */}
      <DevicePairingModal
        isOpen={showPairingModal}
        isScanning={isScanningSubnet}
        scanProgress={scanProgress}
        subnet={subnetInput}
        scannedPeers={scannedPeers}
        devices={devices}
        trustedDevices={trustedDevices}
        lanDeviceCount={Math.max(lanDeviceCount, scannedPeers.length)}
        isServerRunning={isServerRunning}
        onStartServer={toggleServer}
        onUpdateNickname={setDeviceNickname}
        onClose={() => setShowPairingModal(false)}
        onStartScan={handleStartScan}
        onSubnetChange={s => setSubnetInput(s)}
        onPair={handlePairDevice}
      />

      {/* ── Incoming Pairing Confirmation Dialog ── */}
      {incomingPairRequest && (
        <IncomingPairModal
          request={incomingPairRequest}
          onAccept={handleAcceptIncomingPair}
          onDecline={handleDeclineIncomingPair}
        />
      )}
    </div>
  );
};
