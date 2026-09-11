import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DeviceInfo, DeviceProcess } from '../nodus-common';
import { ProcessMonitorProps } from '../types/ui-contracts';
import {
  Search,
  RefreshCw,
  Skull,
  ChevronRight,
  ChevronDown,
  Cpu,
  HardDrive,
  ArrowUpDown,
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  Activity,
  Globe,
  Terminal,
  Check,
  ArrowRightLeft,
  Layers,
  Pause,
  Play,
  Clock,
  ShieldCheck,
  Server
} from 'lucide-react';

type RawProcessItem = { pid: number; name: string; memory_kb: number; cpu?: number };

function normalizeProcessList(rawList: ProcessMonitorProps['processes']): DeviceProcess[] {
  if (!rawList) return [];
  return rawList.map(item => {
    if ('memoryMb' in item && typeof (item as DeviceProcess).memoryMb === 'number') {
      return item as DeviceProcess;
    }
    const raw = item as RawProcessItem;
    return {
      pid: raw.pid,
      name: raw.name,
      user: 'SYSTEM',
      cpu: typeof raw.cpu === 'number' ? Math.round(raw.cpu * 10) / 10 : 0,
      memoryMb: Math.round(((raw.memory_kb || 0) / 1024) * 10) / 10,
      status: 'running' as const,
      category: categorizeProcess(raw.name)
    };
  });
}

function categorizeProcess(name: string): DeviceProcess['category'] {
  const n = name.toLowerCase();
  if (n.includes('chrome') || n.includes('edge') || n.includes('firefox') || n.includes('brave')) return 'browser';
  if (n.includes('code') || n.includes('cursor') || n.includes('node') || n.includes('git') || n.includes('terminal') || n.includes('bash') || n.includes('pwsh') || n.includes('docker')) return 'dev';
  if (n.includes('spotify') || n.includes('plex') || n.includes('vlc') || n.includes('media') || n.includes('audio')) return 'media';
  if (n.includes('steam') || n.includes('game')) return 'game';
  if (n.includes('slack') || n.includes('teams') || n.includes('discord') || n.includes('notion')) return 'productivity';
  return 'system';
}

function cleanAppName(rawName: string): string {
  const base = rawName.replace(/\.exe$/i, '').trim();
  const lower = base.toLowerCase();
  if (lower.includes('chrome')) return 'Google Chrome';
  if (lower.includes('msedge') || lower.includes('edge')) return 'Microsoft Edge';
  if (lower.includes('firefox')) return 'Mozilla Firefox';
  if (lower.includes('code') || lower === 'code') return 'Visual Studio Code';
  if (lower.includes('cursor')) return 'Cursor IDE';
  if (lower.includes('windowsterminal') || lower === 'wt') return 'Windows Terminal';
  if (lower.includes('node')) return 'Node.js Runtime';
  if (lower.includes('explorer')) return 'Windows Explorer';
  if (lower.includes('spotify')) return 'Spotify Music';
  if (lower.includes('slack')) return 'Slack Workstation';
  if (lower.includes('discord')) return 'Discord';
  if (lower.includes('docker') || lower.includes('dockerd') || lower.includes('containerd')) return 'Docker Desktop';
  if (lower.includes('svchost')) return 'Host Process for Windows Services';
  if (lower.includes('dwm')) return 'Desktop Window Manager';
  if (lower.includes('nodus')) return 'Nodus Fleet Mesh Daemon';
  if (lower.includes('plex')) return 'Plex Media Server';
  if (lower.includes('steam')) return 'Steam Big Picture';
  if (lower.includes('nginx')) return 'NGINX Reverse Proxy';
  if (lower.includes('systemd')) return 'Systemd Init';
  if (lower.includes('iterm')) return 'iTerm2 Console';
  if (lower.includes('windowserver')) return 'WindowServer Compositor';
  return base;
}

function getAppIcon(name: string, category?: string) {
  const lower = name.toLowerCase();
  if (lower.includes('chrome') || lower.includes('edge') || lower.includes('firefox') || category === 'browser') {
    return <Globe className="w-3.5 h-3.5 text-[#A8C7FA] shrink-0" />;
  }
  if (lower.includes('code') || lower.includes('cursor') || lower.includes('terminal') || lower.includes('node') || category === 'dev') {
    return <Terminal className="w-3.5 h-3.5 text-[#82D5A5] shrink-0" />;
  }
  if (lower.includes('spotify') || lower.includes('plex') || category === 'media') {
    return <Activity className="w-3.5 h-3.5 text-[#FFD87A] shrink-0" />;
  }
  if (lower.includes('steam') || category === 'game') {
    return <Layers className="w-3.5 h-3.5 text-[#D4AAFF] shrink-0" />;
  }
  if (lower.includes('slack') || lower.includes('discord') || category === 'productivity') {
    return <Layers className="w-3.5 h-3.5 text-[#9ECAFF] shrink-0" />;
  }
  if (lower.includes('explorer')) {
    return <HardDrive className="w-3.5 h-3.5 text-[#FFB4AB] shrink-0" />;
  }
  return <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

interface ProcessGroup {
  key: string;
  name: string;
  category: DeviceProcess['category'];
  items: DeviceProcess[];
  totalMemoryMb: number;
  totalCpu: number;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

function getDeviceIcon(type: DeviceInfo['type'], size = 16) {
  switch (type) {
    case 'tablet':
      return <Tablet size={size} />;
    case 'laptop':
      return <Laptop size={size} />;
    case 'phone':
      return <Smartphone size={size} />;
    case 'desktop':
    default:
      return <Monitor size={size} />;
  }
}

export const ProcessMonitorTable: React.FC<ProcessMonitorProps> = ({
  device,
  devices = [],
  onSelectDevice,
  processes,
  isLoading = false,
  isMonitoringEnabled = true,
  onToggleMonitoring,
  refreshIntervalMs = 3000,
  onChangeInterval,
  onRefresh,
  onKillProcess,
  systemMetrics
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmPid, setConfirmPid] = useState<number | null>(null);
  const [confirmGroupKey, setConfirmGroupKey] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'memory' | 'cpu' | 'name'>('memory');
  const [limitTopN, setLimitTopN] = useState<number>(35);

  // Device dropdown state
  const availableDevices = devices && devices.length > 0 ? devices : [device];
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);

  // Automatic Process Grouping (always active like Windows Task Manager)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set([
      'google chrome',
      'visual studio code',
      'plex media server',
      'steam big picture',
      'slack workstation',
      'node.js runtime',
      'host process for windows services'
    ])
  );

  // Click outside and Escape key handler for device dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(event.target as Node)) {
        setIsDeviceDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDeviceDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Normalize processes
  const normalizedList = useMemo(() => normalizeProcessList(processes), [processes]);

  // Filter processes by search query
  const filteredProcesses = useMemo(() => {
    if (!searchQuery.trim()) return normalizedList;
    const q = searchQuery.toLowerCase().trim();
    return normalizedList.filter(p => {
      return (
        p.name.toLowerCase().includes(q) ||
        (p.subTitle && p.subTitle.toLowerCase().includes(q)) ||
        String(p.pid).includes(q) ||
        cleanAppName(p.name).toLowerCase().includes(q)
      );
    });
  }, [normalizedList, searchQuery]);

  // Group processes by application automatically with Top-N slicing for WebView performance
  const groupedProcesses = useMemo(() => {
    // Slicing top items if not searching to eliminate DOM reflow lag
    const sliced = (!searchQuery.trim() && limitTopN > 0 && filteredProcesses.length > limitTopN)
      ? filteredProcesses.slice(0, limitTopN)
      : filteredProcesses;

    const map = new Map<string, DeviceProcess[]>();
    sliced.forEach(p => {
      const key = cleanAppName(p.name).toLowerCase();
      const existing = map.get(key) || [];
      existing.push(p);
      map.set(key, existing);
    });

    const groups: ProcessGroup[] = Array.from(map.entries()).map(([key, items]) => {
      const totalMemoryMb = items.reduce((sum, item) => sum + item.memoryMb, 0);
      const totalCpu = Math.round(items.reduce((sum, item) => sum + item.cpu, 0) * 10) / 10;
      return {
        key,
        name: cleanAppName(items[0].name),
        category: items[0].category,
        items,
        totalMemoryMb,
        totalCpu
      };
    });

    // Sort groups
    groups.sort((a, b) => {
      if (sortBy === 'memory') return b.totalMemoryMb - a.totalMemoryMb;
      if (sortBy === 'cpu') return b.totalCpu - a.totalCpu;
      return a.name.localeCompare(b.name);
    });

    return groups;
  }, [filteredProcesses, sortBy, limitTopN, searchQuery]);

  // Auto-expand groups when user is searching
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setExpandedGroups(new Set(groupedProcesses.map(g => g.key)));
    }
  }, [searchQuery, groupedProcesses]);

  // Overall RAM calculation
  const isAndroidTarget = device.os?.toLowerCase().includes('android') || device.type === 'tablet';
  const totalAllocatedRamMb = isAndroidTarget && systemMetrics?.usedRamMb
    ? systemMetrics.usedRamMb
    : normalizedList.reduce((sum, p) => sum + p.memoryMb, 0);
  const totalDeviceRamMb = isAndroidTarget && systemMetrics?.totalRamMb
    ? systemMetrics.totalRamMb
    : (device.ramTotalMb || 16384);
  const ramUsagePercent = Math.min(100, Math.round((totalAllocatedRamMb / totalDeviceRamMb) * 100));

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleKillClick = (pid: number) => {
    if (confirmPid === pid) {
      onKillProcess(pid);
      setConfirmPid(null);
    } else {
      setConfirmPid(pid);
      setTimeout(() => {
        setConfirmPid(curr => (curr === pid ? null : curr));
      }, 3500);
    }
  };

  const handleKillGroup = (group: ProcessGroup) => {
    if (confirmGroupKey === group.key) {
      group.items.forEach(p => onKillProcess(p.pid));
      setConfirmGroupKey(null);
    } else {
      setConfirmGroupKey(group.key);
      setTimeout(() => {
        setConfirmGroupKey(curr => (curr === group.key ? null : curr));
      }, 3500);
    }
  };

  const intervalPresets = [
    { label: 'Off', value: 0 },
    { label: '3s', value: 3000 },
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 },
  ];

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[var(--surface-container)] border border-[var(--border-subtle)] rounded-xl shadow-xl text-[var(--text-body)] p-2.5 sm:p-5 md:p-6 select-none">
      {/* Top Header Bar: Device Dropdown + Master Toggle + Interval + Search & Refresh */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Device Selection Dropdown */}
          <div className="relative" ref={deviceDropdownRef}>
            <button
              onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
              className="h-10 px-3 rounded-lg bg-[var(--surface-base)] hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] text-[var(--text-heading)] transition-all flex items-center gap-2.5 shadow-sm text-left touch-manipulation focus:outline-none"
              aria-expanded={isDeviceDropdownOpen}
              aria-haspopup="listbox"
              title="Change device to monitor processes"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {device.status === 'online' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6DD58C] opacity-60" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    device.status === 'online'
                      ? 'bg-[#6DD58C]'
                      : device.status === 'connected'
                      ? 'bg-[var(--accent-primary)]'
                      : 'bg-[var(--text-muted)]'
                  }`}
                />
              </span>

              <span className="text-[var(--accent-primary)] shrink-0">
                {getDeviceIcon(device.type, 15)}
              </span>

              <div className="flex flex-col min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--text-heading)] truncate max-w-[120px] sm:max-w-[180px]">
                    {device.name}
                  </span>
                  {device.isLocal && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--surface-elevated)] text-[var(--text-muted)] font-mono uppercase">
                      Local
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono flex items-center gap-1.5">
                  <span>{device.ipAddress}</span>
                  <span>•</span>
                  <span className="capitalize">{device.type}</span>
                </div>
              </div>

              <ChevronDown
                size={14}
                className={`text-[var(--text-muted)] ml-auto transition-transform duration-200 shrink-0 ${
                  isDeviceDropdownOpen ? 'rotate-180 text-[var(--accent-primary)]' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Popup */}
            {isDeviceDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-[var(--surface-modal)] border border-[var(--border-subtle)] rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in duration-150">
                <div className="px-3 py-2 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                  <span>SELECT DEVICE ({availableDevices.length})</span>
                  <span className="text-[10px] text-[var(--accent-primary)]">
                    {device.type === 'desktop' ? 'Desktop Workstation' : 'Tablet Node'}
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border-subtle)] p-1">
                  {availableDevices.map(d => {
                    const isSelected = d.id === device.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          onSelectDevice?.(d.id);
                          setIsDeviceDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left rounded-lg transition-all flex items-center gap-3 text-xs ${
                          isSelected
                            ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] border border-[var(--border-active)]'
                            : 'text-[var(--text-body)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-heading)]'
                        }`}
                      >
                        <span className={isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}>
                          {getDeviceIcon(d.type, 16)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{d.name}</span>
                            {d.isLocal && (
                              <span className="text-[9px] px-1 rounded bg-[var(--surface-elevated)] text-[var(--text-muted)] font-mono">
                                LOCAL
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            {d.ipAddress} • {d.os}
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-[var(--accent-primary)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Master Monitoring State Toggle */}
          {onToggleMonitoring && (
            <button
              onClick={() => onToggleMonitoring(!isMonitoringEnabled)}
              title={isMonitoringEnabled ? 'Click to Pause Process Monitoring (Eco Mode)' : 'Click to Enable Process Monitoring'}
              className={`h-9 px-3 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition active:scale-95 border ${
                isMonitoringEnabled
                  ? 'bg-[#0F5223] hover:bg-[#1B6D36] text-[#C4EED0] border-[#6DD58C]/30'
                  : 'bg-[#3A1D1D] hover:bg-[#5C2424] text-[#FFB4AB] border-red-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isMonitoringEnabled ? 'bg-[#6DD58C] animate-pulse' : 'bg-[#FFB4AB]'}`} />
              <span>{isMonitoringEnabled ? 'Monitoring ON' : 'Paused (Eco)'}</span>
            </button>
          )}

          {/* Refresh Interval Selector */}
          {onChangeInterval && isMonitoringEnabled && (
            <div className="hidden sm:flex items-center gap-1 bg-[var(--surface-base)] p-1 rounded-lg border border-[var(--border-subtle)]">
              <Clock size={12} className="text-[var(--accent-primary)] ml-1.5 mr-0.5" />
              {intervalPresets.map(pre => (
                <button
                  key={pre.value}
                  onClick={() => onChangeInterval(pre.value)}
                  className={`h-7 px-2 rounded-md text-[11px] font-mono transition ${
                    refreshIntervalMs === pre.value
                      ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-bold shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  {pre.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls: Search & Prominent Refresh Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search app or PID..."
              className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg h-9 pl-9 pr-3 text-xs focus:outline-none focus:border-[var(--border-active)] text-[var(--text-heading)] placeholder:text-[var(--text-muted)] font-mono w-full sm:w-56"
            />
          </div>

          {/* Prominent Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 px-3 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] text-xs font-semibold font-mono flex items-center gap-1.5 transition active:scale-95 border border-[var(--border-subtle)] disabled:opacity-50 shrink-0 shadow-sm"
            title="Refresh Process List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--accent-primary)]' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── PAUSED / ECO MODE BANNER ── */}
      {!isMonitoringEnabled ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#3A1D1D] text-[#FFB4AB] border border-red-500/20 flex items-center justify-center shadow-lg">
            <Pause size={28} />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-[var(--text-heading)]">Process Monitoring is Paused</h3>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
              Background HTTP polling and WebView DOM re-renders are stopped in Eco Mode to conserve battery and eliminate workload.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {onToggleMonitoring && (
              <button
                onClick={() => onToggleMonitoring(true)}
                className="h-9 px-4 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] text-xs font-bold font-mono flex items-center gap-1.5 transition shadow-sm active:scale-95"
              >
                <Play size={14} />
                <span>Resume Monitoring</span>
              </button>
            )}
            <button
              onClick={onRefresh}
              className="h-9 px-3 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-container)] text-[var(--text-body)] text-xs font-mono flex items-center gap-1.5 transition border border-[var(--border-subtle)] active:scale-95"
            >
              <RefreshCw size={13} />
              <span>Refresh Once</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Memory & Resource Telemetry Overview Bar */}
          <div className="px-3 sm:px-4 py-2.5 mb-3 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 font-mono shrink-0">
                <HardDrive className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span className="text-[var(--text-muted)]">RAM:</span>
                <span className="text-[#6DD58C] font-semibold">
                  {formatMemory(totalAllocatedRamMb)}
                </span>
                <span className="text-[var(--text-muted)] hidden xs:inline">
                  / {formatMemory(totalDeviceRamMb)} ({ramUsagePercent}%)
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="flex-1 max-w-xs h-2 bg-[var(--surface-base)] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    ramUsagePercent > 85 ? 'bg-[#FFB4AB]' : ramUsagePercent > 65 ? 'bg-[#FFD87A]' : 'bg-[var(--accent-primary)]'
                  }`}
                  style={{ width: `${ramUsagePercent}%` }}
                />
              </div>
            </div>

            {/* Slicing Counter & Sort Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              {!searchQuery.trim() && filteredProcesses.length > limitTopN && (
                <span className="text-[10px] font-mono text-[var(--text-muted)] hidden sm:inline">
                  Showing Top {limitTopN} of {filteredProcesses.length}
                </span>
              )}
              <button
                onClick={() => {
                  setSortBy(s => (s === 'memory' ? 'cpu' : s === 'cpu' ? 'name' : 'memory'));
                }}
                className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[11px] font-mono font-medium text-[var(--text-body)] hover:text-[var(--text-heading)] transition shrink-0"
              >
                <ArrowUpDown className="w-3 h-3 text-[var(--accent-primary)]" />
                <span className="capitalize">Sort: {sortBy}</span>
              </button>
            </div>
          </div>

          {/* Android Tablet Dedicated System Telemetry Deck */}
          {isAndroidTarget && systemMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">TOTAL SYSTEM RAM</span>
                <span className="font-semibold text-[var(--accent-primary)]">{formatMemory(systemMetrics.totalRamMb || 0)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">AVAILABLE RAM</span>
                <span className="font-semibold text-[#6DD58C]">{formatMemory(systemMetrics.availRamMb || 0)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">NODUS HEAP USED</span>
                <span className="font-semibold text-[var(--text-heading)]">{(systemMetrics.appHeapUsedMb || 0).toFixed(1)} MB</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block">MEMORY PRESSURE</span>
                <span className={`font-semibold ${systemMetrics.lowMemory ? 'text-[#FFB4AB]' : 'text-[#6DD58C]'}`}>
                  {systemMetrics.lowMemory ? 'LOW MEMORY' : 'NORMAL'}
                </span>
              </div>
            </div>
          )}

          {/* Main Table Content Body */}
          <div className="flex-1 overflow-x-auto overflow-y-auto pr-1 min-h-[300px] md:min-h-0 touch-pan-x">
            <table className="w-full min-w-[500px] sm:min-w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase font-mono text-[var(--text-muted)]">
                  <th className="pb-3 pl-3">Application / Process</th>
                  <th className="pb-3">PID / Tasks</th>
                  <th className="pb-3 hidden sm:table-cell">User</th>
                  <th className="pb-3">CPU %</th>
                  <th className="pb-3">Memory</th>
                  <th className="pb-3 text-right pr-3 sticky right-0 bg-[var(--surface-container)] z-20 shadow-[-6px_0_10px_rgba(0,0,0,0.35)]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs font-mono">
                {groupedProcesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono">
                      {isLoading ? 'Fetching process telemetry...' : `No processes match "${searchQuery}".`}
                    </td>
                  </tr>
                ) : (
                  groupedProcesses.map(group => {
                    const isMulti = group.items.length > 1;
                    const isExpanded = expandedGroups.has(group.key);
                    const isGroupKilling = confirmGroupKey === group.key;

                    return (
                      <React.Fragment key={group.key}>
                        {/* Parent App Header Row */}
                        <tr
                          className={`transition-colors group ${
                            isExpanded ? 'bg-[var(--surface-elevated)]/40' : 'hover:bg-[var(--surface-elevated)]/30'
                          }`}
                        >
                          <td className="py-2.5 pl-2 font-sans">
                            <div className="flex items-center gap-2">
                              {isMulti ? (
                                <button
                                  onClick={() => toggleGroupExpand(group.key)}
                                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-heading)] transition shrink-0"
                                  title={isExpanded ? 'Collapse sub-processes' : 'Expand sub-processes'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown size={14} className="text-[var(--accent-primary)]" />
                                  ) : (
                                    <ChevronRight size={14} />
                                  )}
                                </button>
                              ) : (
                                <span className="w-5 shrink-0" />
                              )}

                              {getAppIcon(group.name, group.category)}

                              <span className="font-semibold text-[var(--text-heading)] text-xs sm:text-sm truncate max-w-[140px] sm:max-w-xs">
                                {group.name}
                              </span>

                              {isMulti && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--accent-container)] text-[var(--accent-on-container)] border border-[var(--border-active)]">
                                  {group.items.length}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 text-[var(--text-muted)] font-mono text-xs">
                            {isMulti ? (
                              <span className="text-[var(--text-muted)] italic text-[11px]">
                                {group.items.length} tasks
                              </span>
                            ) : (
                              <span>{group.items[0].pid}</span>
                            )}
                          </td>

                          <td className="py-2.5 text-[var(--text-muted)] hidden sm:table-cell">
                            {group.items.every(i => i.user === group.items[0].user)
                              ? group.items[0].user || 'SYSTEM'
                              : 'Multiple'}
                          </td>

                          <td
                            className={`py-2.5 font-medium ${
                              group.totalCpu > 5 ? 'text-[#FFB4AB]' : 'text-[var(--text-heading)]'
                            }`}
                          >
                            {group.totalCpu.toFixed(1)}%
                          </td>

                          <td className="py-2.5 text-[#6DD58C] font-medium">
                            {formatMemory(group.totalMemoryMb)}
                          </td>

                          <td className="py-2.5 text-right pr-3 sticky right-0 bg-[var(--surface-container)] group-hover:bg-[var(--surface-elevated)] z-10 shadow-[-6px_0_10px_rgba(0,0,0,0.35)] transition-colors">
                            {isMulti ? (
                              <button
                                onClick={() => handleKillGroup(group)}
                                className={`h-8 px-2.5 rounded-lg transition-colors inline-flex items-center gap-1.5 touch-manipulation ${
                                  isGroupKilling
                                    ? 'bg-[#93000A] text-[#FFB4AB] font-bold px-3 border border-[#FFB4AB]/30'
                                    : 'text-[#FFB4AB] hover:bg-[#93000A]/20'
                                }`}
                                title={`Terminate entire ${group.name} (${group.items.length} processes)`}
                              >
                                <Skull className="w-3.5 h-3.5" />
                                <span className="text-[11px]">
                                  {isGroupKilling ? `Kill All (${group.items.length})?` : 'End task'}
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleKillClick(group.items[0].pid)}
                                className={`h-8 px-2.5 rounded-lg transition-colors inline-flex items-center gap-1.5 touch-manipulation ${
                                  confirmPid === group.items[0].pid
                                    ? 'bg-[#93000A] text-[#FFB4AB] font-bold px-3 border border-[#FFB4AB]/30'
                                    : 'text-[#FFB4AB] hover:bg-[#93000A]/20'
                                }`}
                                title={`Terminate PID ${group.items[0].pid}`}
                              >
                                <Skull className="w-3.5 h-3.5" />
                                <span className="text-[11px]">
                                  {confirmPid === group.items[0].pid ? 'Confirm Kill?' : 'End task'}
                                </span>
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Child Process Rows when Expanded */}
                        {isExpanded &&
                          isMulti &&
                          group.items.map(child => (
                            <tr
                              key={child.pid}
                              className="bg-[var(--surface-base)]/50 hover:bg-[var(--surface-base)]/80 text-[11px] text-[var(--text-body)] transition-colors"
                            >
                              <td className="py-2 pl-9 font-sans text-[var(--text-muted)]">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/50" />
                                  <span className="truncate max-w-[160px] sm:max-w-xs">{child.name}</span>
                                </div>
                              </td>
                              <td className="py-2 text-[var(--text-muted)] font-mono">{child.pid}</td>
                              <td className="py-2 text-[var(--text-muted)] hidden sm:table-cell">{child.user || 'SYSTEM'}</td>
                              <td className="py-2 text-[var(--text-body)] font-mono">{child.cpu.toFixed(1)}%</td>
                              <td className="py-2 text-[#6DD58C] font-mono">{formatMemory(child.memoryMb)}</td>
                              <td className="py-2 text-right pr-3 sticky right-0 bg-[var(--surface-base)] group-hover:bg-[var(--surface-base)] z-10 shadow-[-6px_0_10px_rgba(0,0,0,0.35)]">
                                <button
                                  onClick={() => handleKillClick(child.pid)}
                                  className={`h-7 px-2 rounded transition-colors inline-flex items-center gap-1 ${
                                    confirmPid === child.pid
                                      ? 'bg-[#93000A] text-[#FFB4AB] font-bold border border-[#FFB4AB]/30'
                                      : 'text-[#FFB4AB] hover:bg-[#93000A]/20'
                                  }`}
                                  title={`Kill PID ${child.pid}`}
                                >
                                  <Skull className="w-3 h-3" />
                                  <span className="text-[10px]">
                                    {confirmPid === child.pid ? 'Kill?' : 'Kill'}
                                  </span>
                                </button>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
