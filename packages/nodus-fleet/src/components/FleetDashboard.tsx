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
  FileCode
} from 'lucide-react';

import { MeshTopologyVisualizer } from './MeshTopologyVisualizer';
import { RemoteControlTab } from './RemoteControlTab';
import { ProcessMonitorTable } from './ProcessMonitorTable';
import { RemoteTerminal } from './RemoteTerminal';
import { DevicePairingModal } from './DevicePairingModal';
import { RemoteAppShortcuts } from './RemoteAppShortcuts';
import { SharedApp, ScannedPeer } from '../types/ui-contracts';

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

  // Navigation tabs: 'Topology' | 'Control Deck' | 'Processes' | 'Terminal' | 'Shortcuts'
  const [activeTab, setActiveTab] = useState<'topology' | 'control' | 'processes' | 'terminal' | 'shortcuts'>('topology');

  // Multi-device state hooked to live Context with fallback
  const devices = liveDevices.length > 0 ? liveDevices : INITIAL_DEVICES;
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('local');
  const clipboardItems = liveClipboard.length > 0 ? liveClipboard : [];
  const [deviceProcesses, setDeviceProcesses] = useState<Record<string, DeviceProcess[]>>({});
  const [isProcLoading, setIsProcLoading] = useState(false);

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

  // Subnet pairing modal state
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [subnetInput, setSubnetInput] = useState('192.168.1');
  const [isScanningSubnet, setIsScanningSubnet] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedPeers, setScannedPeers] = useState<ScannedPeer[]>([]);

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
    triggerHaptic(10);
    if (!targetDevice) return;
    setIsProcLoading(true);
    try {
      const url = `http://${targetDevice.ipAddress}:9120/api/processes`;
      const res = await universalNetworkFetch<{ processes?: Array<{ pid: number; name: string; memory_kb: number }> }>(url);
      if (res && res.data?.processes && Array.isArray(res.data.processes)) {
        const mapped: DeviceProcess[] = res.data.processes.map((p: { pid: number; name: string; memory_kb: number }) => ({
          pid: p.pid,
          name: p.name,
          user: 'SYSTEM',
          cpu: 0,
          memoryMb: Math.round((p.memory_kb / 1024) * 10) / 10,
          status: 'running' as const,
          category: 'system'
        }));
        setDeviceProcesses(prev => ({
          ...prev,
          [selectedDeviceId]: mapped
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch processes from target device', err);
    } finally {
      setIsProcLoading(false);
    }
  };

  // Auto-fetch processes on tab select or target device change
  useEffect(() => {
    if (activeTab === 'processes' && targetDevice) {
      handleRefreshProcesses();
    }
  }, [activeTab, selectedDeviceId]);

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

  // Subnet Scanning native call
  const handleStartScan = async (targetSubnet: string) => {
    setIsScanningSubnet(true);
    setScanProgress(10);
    setScannedPeers([]);

    const cleanSubnet = targetSubnet.trim().replace(/\.+$/, '');
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;

    if (bridge && typeof bridge.scanSubnetNative === 'function') {
      try {
        setScanProgress(40);
        const rawJson = bridge.scanSubnetNative(cleanSubnet);
        setScanProgress(90);
        if (rawJson && rawJson.startsWith('[')) {
          const list: ScannedPeer[] = JSON.parse(rawJson);
          const mapped = list.map(p => ({
            ...p,
            isInFleet: devices.some(d => d.ipAddress === p.ip)
          }));
          setScannedPeers(mapped);
        }
      } catch (e) {
        console.warn('Native scan failed', e);
      } finally {
        setScanProgress(100);
        setIsScanningSubnet(false);
      }
      return;
    }

    // Web simulation fallback
    setIsScanningSubnet(false);
    setScanProgress(100);
  };

  const handlePairDevice = (ip: string, port: number, token: string) => {
    const peer = scannedPeers.find(p => p.ip === ip);
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge && typeof bridge.addPairedDevice === 'function') {
      bridge.addPairedDevice(ip, port, peer?.hostname || '');
    }
    if (fleetContext && typeof fleetContext.refreshState === 'function') {
      fleetContext.refreshState();
    }
    setShowPairingModal(false);
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
    navigator.clipboard.writeText(item.text).catch(() => {});
    setCopiedClipId(item.id);
    setTimeout(() => setCopiedClipId(null), 2000);
  };

  const handleDeleteClipboardItem = (id: string) => {
    if (fleetContext && typeof fleetContext.deleteClipboardItem === 'function') {
      fleetContext.deleteClipboardItem(id);
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
        md += `### ${item.timestamp} · ${item.deviceName || 'Device'}\n\n\`\`\`text\n${item.text}\n\`\`\`\n\n---\n\n`;
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
        txt += `[${item.timestamp}] ${item.deviceName || 'Device'}\n${item.text}\n`;
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
    <div className="h-screen h-dvh w-full bg-[#111318] text-[#E2E2E9] font-sans overflow-hidden flex flex-col relative selection:bg-[#0842A0] selection:text-[#D3E3FD]">
      {/* ── Google Material 3 Top App Bar with Android Safe-Area Inset ── */}
      <header className="pt-safe border-b border-white/5 bg-[#111318]/90 backdrop-blur-xl flex items-center justify-between px-3 sm:px-6 min-h-[3.75rem] sm:min-h-[4.25rem] py-1.5 sm:py-2 z-20 shrink-0">
        {/* Brand & M3 Emblem */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0842A0] text-[#D3E3FD] flex items-center justify-center shadow-md shadow-blue-950/30 shrink-0">
            <Server className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-white">
                Nodus <span className="text-[#A8C7FA] font-light">Fleet</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-[#0F5223] text-[#C4EED0] border border-[#6DD58C]/20 text-[10px] font-medium tracking-wide">
                Mesh Active
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:block">
              Cross-Device Control Hub
            </span>
          </div>
        </div>

        {/* Integrated Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[#1D2024] hover:bg-[#282A2F] focus-within:bg-[#282A2F] border border-white/5 focus-within:border-[#A8C7FA] transition-all text-xs">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search fleet nodes, IP, OS..."
              className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white text-[11px] px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Telemetry, Host Node Chip & Clock */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#1D2024] border border-white/5 text-xs text-slate-300">
            <Smartphone size={14} className="text-[#6DD58C]" />
            <span className="font-medium text-white">Nodus Tablet Prime</span>
            <span className="text-slate-500">·</span>
            <span className="flex items-center gap-1 text-[#FFDDAF]">
              <Battery size={14} />
              88%
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1D2024] border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6DD58C] animate-pulse" />
              <span className="font-mono text-slate-200">{devices.filter(d => !d.isLocal).length} Peers</span>
            </div>
          </div>

          <div className="text-right shrink-0 pl-1">
            <div className="text-xs sm:text-sm font-mono text-white tracking-wide">{currentTime}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-tight">{currentDate}</div>
          </div>
        </div>
      </header>

      {/* ── Main Application Area: Google M3 Navigation Rail + Workspace ── */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Material 3 Navigation Rail (md and above) */}
        <nav className="hidden md:flex w-20 border-r border-white/5 bg-[#111318] flex-col items-center py-5 gap-5 z-10 shrink-0 select-none">
          {/* Pairing Button */}
          <button
            onClick={() => {
              triggerHaptic(12);
              setShowPairingModal(true);
            }}
            title="Pair New Mesh Node"
            className="w-11 h-11 rounded-lg bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] shadow-md shadow-blue-950/40 transition-all flex items-center justify-center active:scale-95 group mb-2"
          >
            <Plus size={22} className="stroke-[2.5]" />
          </button>

          {/* Navigation Items with clean rounded-lg indicators */}
          {[
            { id: 'topology', label: 'Topology', icon: Grid },
            { id: 'control', label: 'Control', icon: Sliders },
            { id: 'processes', label: 'Processes', icon: Cpu },
            { id: 'terminal', label: 'Terminal', icon: Terminal },
            { id: 'shortcuts', label: 'Shortcuts', icon: Radio },
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
                      ? 'bg-[#0842A0] text-[#D3E3FD] shadow-sm'
                      : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-white/5'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <span
                  className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                    isActive ? 'text-[#D3E3FD] font-semibold' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Bottom Rail Utility: Universal Clipboard */}
          <div className="mt-auto flex flex-col items-center">
            <button
              onClick={() => {
                triggerHaptic(12);
                setShowClipboardDrawer(!showClipboardDrawer);
              }}
              title="Universal Mesh Clipboard"
              className="flex flex-col items-center group focus:outline-none"
            >
              <div
                className={`w-12 h-8 rounded-lg flex items-center justify-center transition-all duration-200 relative ${
                  showClipboardDrawer
                    ? 'bg-[#0F5223] text-[#C4EED0]'
                    : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-white/5'
                }`}
              >
                <Clipboard size={18} />
                {clipboardItems.length > 0 && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#6DD58C] ring-2 ring-[#111318]" />
                )}
              </div>
              <span className="text-[11px] font-medium tracking-tight mt-1 text-slate-400 group-hover:text-slate-200">
                Clipboard
              </span>
            </button>
          </div>
        </nav>

        {/* ── Active Tab Workspace (responsive containers tailored for orientation & screen size) ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-[#111318]">
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
                            ? 'bg-[#A8C7FA] text-[#062E6F] shadow-sm font-semibold'
                            : 'bg-[#1D2024] hover:bg-[#282A2F] text-slate-300 border border-white/5'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs font-mono text-slate-400">
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
                        className={`bg-[#1D2024] hover:bg-[#282A2F] border rounded-xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${
                          isSelected
                            ? 'border-[#A8C7FA] ring-1 ring-[#A8C7FA]/50 bg-[#282A2F]'
                            : 'border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#282A2F] border border-white/5 flex items-center justify-center text-[#A8C7FA] shrink-0">
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
                              <div className="text-sm font-semibold text-white">
                                {device.name}
                              </div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                ID: {device.id} · {device.ipAddress} · {device.os.toUpperCase()}
                              </div>
                            </div>
                          </div>

                          {device.isLocal ? (
                            <span
                              className="text-[11px] px-2.5 py-0.5 rounded-md font-medium tracking-wide flex items-center gap-1.5"
                              style={{
                                backgroundColor: isServerRunning
                                  ? 'rgba(11, 87, 208, 0.18)'
                                  : 'rgba(255, 180, 171, 0.12)',
                                color: isServerRunning ? '#A8C7FA' : '#FFB4AB',
                                border: isServerRunning
                                  ? '1px solid rgba(168, 199, 250, 0.35)'
                                  : '1px solid rgba(255, 180, 171, 0.25)'
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
                              className="text-[11px] px-2.5 py-0.5 rounded-md font-medium"
                              style={{
                                backgroundColor:
                                  device.status === 'online'
                                    ? 'rgba(109, 213, 140, 0.15)'
                                    : device.status === 'connected'
                                    ? 'rgba(168, 199, 250, 0.15)'
                                    : 'rgba(255, 221, 175, 0.15)',
                                color:
                                  device.status === 'online'
                                    ? '#6DD58C'
                                    : device.status === 'connected'
                                    ? '#A8C7FA'
                                    : '#FFDDAF',
                                border:
                                  device.status === 'online'
                                    ? '1px solid rgba(109, 213, 140, 0.3)'
                                    : device.status === 'connected'
                                    ? '1px solid rgba(168, 199, 250, 0.3)'
                                    : '1px solid rgba(255, 221, 175, 0.3)'
                              }}
                            >
                              {device.status === 'online' ? 'Stable' : device.status}
                            </span>
                          )}
                        </div>

                        {/* CPU Usage Linear Progress Indicator */}
                        <div className="space-y-1.5">
                          <div className="h-1.5 w-full bg-[#111318] rounded-md overflow-hidden">
                            <div
                              className="h-full bg-[#A8C7FA] transition-all duration-500 rounded-md"
                              style={{ width: `${device.cpuUsagePercent || 25}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] font-mono text-slate-400">
                            <span>CPU Workload</span>
                            <span className="text-slate-200 font-semibold">{device.cpuUsagePercent || 25}%</span>
                          </div>
                        </div>

                        {/* Telemetry Metrics Row */}
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-500 block text-[10px]">LATENCY</span>
                            <span className="text-[#6DD58C] font-semibold">{device.latencyMs} ms</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">BATTERY</span>
                            <span className="text-slate-200 font-semibold">{device.batteryPercent}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">ROLE</span>
                            <span className="text-[#A8C7FA] font-semibold">
                              {device.isLocal ? 'HOST' : 'REMOTE'}
                            </span>
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                          {device.isLocal ? (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                triggerHaptic(12);
                                toggleServer();
                              }}
                              title={isServerRunning ? 'Stop Server & Unregister from Mesh' : 'Start Server & Broadcast to Mesh'}
                              className={`h-8 px-2.5 rounded-lg text-xs font-medium transition-colors border active:scale-95 inline-flex items-center justify-center gap-1.5 ${
                                isServerRunning
                                  ? 'bg-[#3A1D1D] hover:bg-[#5C2424] text-[#FFB4AB] border-red-500/20'
                                  : 'bg-[#0F5223] hover:bg-[#1B6D36] text-[#C4EED0] border-[#6DD58C]/20'
                              }`}
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
                              className="h-8 px-2.5 rounded-lg bg-[#3A1D1D] hover:bg-[#5C2424] text-xs font-medium text-[#FFB4AB] transition-colors border border-red-500/20 active:scale-95 inline-flex items-center justify-center touch-manipulation gap-1"
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
                            className="h-8 px-3.5 rounded-lg bg-[#282A2F] hover:bg-[#33353A] text-xs font-medium text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-white/5 active:scale-95 inline-flex items-center justify-center touch-manipulation"
                          >
                            Control Deck
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedDeviceId(device.id);
                              setActiveTab('processes');
                            }}
                            className="h-8 px-3.5 rounded-lg bg-[#282A2F] hover:bg-[#33353A] text-xs font-medium text-slate-200 transition-colors border border-white/5 active:scale-95 inline-flex items-center justify-center touch-manipulation"
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
        </div>
      </main>

      {/* ── Google Material 3 Status Footer (Desktop & Tablet) ── */}
      <footer className="hidden md:flex h-8 bg-[#191C20] border-t border-white/5 items-center px-6 justify-between text-[11px] font-mono text-slate-400 z-20 shrink-0 select-none">
        <div className="flex gap-4 items-center">
          <span className="text-[#6DD58C] flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6DD58C]" />
            Latency: {targetDevice?.latencyMs !== undefined ? `${targetDevice.latencyMs}ms` : '12ms'}
          </span>
          <span className="flex items-center gap-1">● Signal: Excellent</span>
          <span className="hidden sm:flex items-center gap-1">● Encryption: AES-256</span>
          <span className="hidden md:flex items-center gap-1 text-slate-300">● Node: {targetDevice?.name}</span>
        </div>
        <div className="text-slate-500 font-mono text-[10px]">Build v4.0.2 · Material You</div>
      </footer>

      {/* ── Google Material 3 Mobile Navigation Bar (In-Flow Flex item, never blocks workspace content) ── */}
      <nav className="md:hidden shrink-0 z-30 pb-safe bg-[#111318]/95 backdrop-blur-2xl border-t border-white/5 px-2 py-1.5 flex items-center justify-around select-none shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
        {[
          { id: 'topology', label: 'Topology', icon: Grid },
          { id: 'control', label: 'Control', icon: Sliders },
          { id: 'processes', label: 'Processes', icon: Cpu },
          { id: 'terminal', label: 'Terminal', icon: Terminal },
          { id: 'shortcuts', label: 'Shortcuts', icon: Radio },
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
                    ? 'bg-[#0842A0] text-[#D3E3FD] shadow-sm'
                    : 'bg-transparent text-slate-400'
                }`}
              >
                <Icon size={19} />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap ${
                  isActive ? 'text-[#D3E3FD] font-semibold' : 'text-slate-400'
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
                ? 'bg-[#0F5223] text-[#C4EED0]'
                : 'bg-transparent text-slate-400'
            }`}
          >
            <Clipboard size={18} />
            {clipboardItems.length > 0 && (
              <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[#6DD58C] ring-2 ring-[#111318]" />
            )}
          </div>
          <span
            className={`text-[10px] font-medium tracking-tight mt-1 ${
              showClipboardDrawer ? 'text-[#C4EED0] font-semibold' : 'text-slate-400'
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
          title="Pair New Node"
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 min-h-[50px] transition duration-150 focus:outline-none"
        >
          <div className="w-12 h-8 rounded-lg transition-all flex items-center justify-center bg-[#A8C7FA]/15 text-[#A8C7FA]">
            <Plus size={19} className="stroke-[2.2]" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-1 text-[#A8C7FA]">
            Pair
          </span>
        </button>
      </nav>

      {/* ── Universal Clipboard Drawer ── */}
      {showClipboardDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#1D2024] border-l border-white/10 shadow-2xl p-6 pt-safe pb-safe flex flex-col gap-4 animate-in slide-in-from-right duration-200 rounded-l-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0F5223] text-[#C4EED0] flex items-center justify-center">
                <Clipboard className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Universal Mesh Clipboard</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Quick Export Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={clipboardItems.length === 0}
                  title="Export clipboard history"
                  className="w-8 h-8 rounded-lg bg-[#282A2F] hover:bg-[#33353A] text-slate-300 hover:text-white flex items-center justify-center transition text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Download size={14} />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#282A2F] border border-white/10 rounded-lg shadow-2xl py-1 z-50 text-xs flex flex-col">
                    <button
                      onClick={() => handleExportClipboard('json')}
                      className="px-3 py-2 text-left hover:bg-[#33353A] flex items-center gap-2 text-white"
                    >
                      <FileJson size={14} className="text-amber-400" />
                      <span>JSON Backup</span>
                    </button>
                    <button
                      onClick={() => handleExportClipboard('md')}
                      className="px-3 py-2 text-left hover:bg-[#33353A] flex items-center gap-2 text-white"
                    >
                      <FileCode size={14} className="text-blue-400" />
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      onClick={() => handleExportClipboard('txt')}
                      className="px-3 py-2 text-left hover:bg-[#33353A] flex items-center gap-2 text-white"
                    >
                      <FileText size={14} className="text-emerald-400" />
                      <span>Plain Text (.txt)</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowClipboardDrawer(false)}
                className="w-8 h-8 rounded-lg bg-[#282A2F] hover:bg-[#33353A] text-slate-300 hover:text-white flex items-center justify-center transition text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Broadcast Input Container */}
          <form onSubmit={handleBroadcastClipboard} className="space-y-2">
            <span className="text-[11px] text-slate-400 font-medium">Broadcast snippet to mesh nodes:</span>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={broadcastInput}
                onChange={e => setBroadcastInput(e.target.value)}
                placeholder="Type or paste text..."
                className="flex-1 px-3.5 py-2 rounded-lg bg-[#111318] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#A8C7FA]"
              />
              <button
                type="submit"
                disabled={!broadcastInput.trim()}
                className="w-9 h-9 rounded-lg bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] disabled:opacity-50 flex items-center justify-center transition shadow-sm shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </form>

          {/* Drawer Sub-Header: Feed Stats & Clear Action */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 py-1 px-1 border-b border-white/5">
            <span>{clipboardItems.length} snippet{clipboardItems.length === 1 ? '' : 's'}</span>
            {exportFeedback ? (
              <span className="text-emerald-400 font-medium">{exportFeedback}</span>
            ) : (
              clipboardItems.length > 0 && (
                confirmClearAll ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleClearClipboard}
                      className="text-red-400 font-bold hover:underline"
                    >
                      Confirm Clear
                    </button>
                    <button
                      onClick={() => setConfirmClearAll(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearAll(true)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    Clear History
                  </button>
                )
              )
            )}
          </div>

          {/* Clipboard History Feed */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {clipboardItems.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">Clipboard history is empty</div>
            ) : (
              clipboardItems.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-lg bg-[#282A2F] border border-white/5 space-y-2 hover:border-white/10 transition"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="text-[#A8C7FA] font-medium">{item.deviceName || 'Device'}</span>
                    <span>{item.timestamp}</span>
                  </div>
                  <p className="text-xs font-mono text-slate-200 break-all select-all leading-relaxed">
                    {item.text}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <button
                      onClick={() => handleDeleteClipboardItem(item.id)}
                      className="flex items-center gap-1 h-7 px-2 rounded-md bg-[#1D2024] hover:bg-red-500/20 text-xs font-medium text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition active:scale-95"
                      title="Delete entry"
                    >
                      <Trash2 size={12} />
                    </button>

                    <button
                      onClick={() => handleCopyClipboardItem(item)}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[#1D2024] hover:bg-[#111318] text-xs font-medium text-[#6DD58C] border border-[#6DD58C]/20 transition active:scale-95"
                    >
                      {copiedClipId === item.id ? (
                        <>
                          <Check size={13} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy snippet</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Subnet Pairing Modal ── */}
      <DevicePairingModal
        isOpen={showPairingModal}
        isScanning={isScanningSubnet}
        scanProgress={scanProgress}
        subnet={subnetInput}
        scannedPeers={scannedPeers}
        onClose={() => setShowPairingModal(false)}
        onStartScan={handleStartScan}
        onSubnetChange={s => setSubnetInput(s)}
        onPair={handlePairDevice}
      />
    </div>
  );
};
