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
  Layers
} from 'lucide-react';

type RawProcessItem = { pid: number; name: string; memory_kb: number };

function normalizeProcessList(rawList: ProcessMonitorProps['processes']): DeviceProcess[] {
  if (!rawList) return [];
  return rawList.map(item => {
    if ('memoryMb' in item) {
      return item as DeviceProcess;
    }
    const raw = item as RawProcessItem;
    return {
      pid: raw.pid,
      name: raw.name,
      user: 'SYSTEM',
      cpu: Math.round((Math.random() * 4.5 + 0.1) * 10) / 10,
      memoryMb: Math.round((raw.memory_kb / 1024) * 10) / 10,
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
  onRefresh,
  onKillProcess
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmPid, setConfirmPid] = useState<number | null>(null);
  const [confirmGroupKey, setConfirmGroupKey] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'memory' | 'cpu' | 'name'>('memory');

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

  // Group processes by application automatically
  const groupedProcesses = useMemo(() => {
    const map = new Map<string, DeviceProcess[]>();
    filteredProcesses.forEach(p => {
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
  }, [filteredProcesses, sortBy]);

  // Auto-expand groups when user is searching so matching child processes become visible immediately
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setExpandedGroups(new Set(groupedProcesses.map(g => g.key)));
    }
  }, [searchQuery, groupedProcesses]);

  // Overall RAM and CPU metrics calculation
  const totalAllocatedRamMb = normalizedList.reduce((sum, p) => sum + p.memoryMb, 0);
  const totalDeviceRamMb = device.ramTotalMb || 16384; // default 16GB
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

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[#1D2024] border border-white/5 rounded-xl shadow-xl text-slate-100 p-2.5 sm:p-5 md:p-6">
      {/* Top Header Bar: Device Dropdown + View Mode + Search & Refresh */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Device Selection Dropdown */}
          <div className="relative" ref={deviceDropdownRef}>
            <button
              onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
              className="h-10 px-3 rounded-lg bg-[#111318] hover:bg-[#282A2F] border border-white/10 hover:border-[#A8C7FA]/50 text-slate-200 transition-all flex items-center gap-2.5 shadow-sm text-left touch-manipulation focus:outline-none focus:ring-1 focus:ring-[#A8C7FA]"
              aria-expanded={isDeviceDropdownOpen}
              aria-haspopup="listbox"
              title="Change device to monitor processes"
            >
              {/* Status Indicator Dot */}
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {device.status === 'online' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6DD58C] opacity-60" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    device.status === 'online'
                      ? 'bg-[#6DD58C]'
                      : device.status === 'connected'
                      ? 'bg-[#A8C7FA]'
                      : device.status === 'idle'
                      ? 'bg-[#FFD87A]'
                      : 'bg-slate-500'
                  }`}
                />
              </span>

              {/* Device Type Icon */}
              <span className="text-[#A8C7FA] shrink-0">
                {getDeviceIcon(device.type, 15)}
              </span>

              {/* Device Name & IP */}
              <div className="flex flex-col min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-100 truncate max-w-[120px] sm:max-w-[180px]">
                    {device.name}
                  </span>
                  {device.isLocal && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-300 font-mono uppercase">
                      Local
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <span>{device.ipAddress}</span>
                  <span>•</span>
                  <span className="capitalize">{device.type}</span>
                </div>
              </div>

              <ChevronDown
                size={14}
                className={`text-slate-400 ml-auto transition-transform duration-200 shrink-0 ${
                  isDeviceDropdownOpen ? 'rotate-180 text-[#A8C7FA]' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Popup */}
            {isDeviceDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-[#1D2024] border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in duration-150">
                <div className="px-3 py-2 bg-[#111318] border-b border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>SELECT DEVICE ({availableDevices.length})</span>
                  <span className="text-[10px] text-[#A8C7FA]">
                    {device.type === 'desktop' ? 'Desktop: Task Manager' : 'Flat View'}
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-white/5 p-1">
                  {availableDevices.map(d => {
                    const isSelected = d.id === device.id;
                    const isTargetDesktop = d.type === 'desktop';
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          onSelectDevice?.(d.id);
                          setIsDeviceDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left rounded-lg transition-all flex items-center gap-3 text-xs ${
                          isSelected
                            ? 'bg-[#A8C7FA]/15 text-[#A8C7FA] border border-[#A8C7FA]/30'
                            : 'text-slate-200 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {/* Dot */}
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            d.status === 'online'
                              ? 'bg-[#6DD58C]'
                              : d.status === 'connected'
                              ? 'bg-[#A8C7FA]'
                              : d.status === 'idle'
                              ? 'bg-[#FFD87A]'
                              : 'bg-slate-500'
                          }`}
                        />

                        {/* Icon */}
                        <span className={isSelected ? 'text-[#A8C7FA]' : 'text-slate-400'}>
                          {getDeviceIcon(d.type, 16)}
                        </span>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{d.name}</span>
                            {d.isLocal && (
                              <span className="text-[9px] px-1 rounded bg-white/10 text-slate-400 font-mono">
                                LOCAL
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                            <span>{d.ipAddress}</span>
                            <span>•</span>
                            <span>{d.os}</span>
                            {isTargetDesktop && (
                              <span className="text-[9px] text-[#6DD58C] font-semibold bg-[#6DD58C]/10 px-1 rounded">
                                TASK MGR
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && <Check size={14} className="text-[#A8C7FA] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Action Controls: Search & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search app or PID..."
              className="bg-[#111318] border border-white/10 rounded-lg h-9 pl-9 pr-3 text-xs focus:outline-none focus:border-[#A8C7FA] text-slate-200 placeholder-slate-500 font-mono w-full sm:w-64"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="bg-[#282A2F] hover:bg-[#33353A] w-9 h-9 rounded-lg text-slate-300 transition-colors flex items-center justify-center border border-white/5 disabled:opacity-50 shrink-0"
            title="Refresh Process List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#A8C7FA]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Memory & Resource Telemetry Overview Bar */}
      <div className="px-3 sm:px-4 py-2.5 mb-3 bg-[#282A2F] rounded-lg border border-white/5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 font-mono shrink-0">
            <HardDrive className="w-3.5 h-3.5 text-[#A8C7FA]" />
            <span className="text-slate-400">RAM:</span>
            <span className="text-[#6DD58C] font-semibold">
              {formatMemory(totalAllocatedRamMb)}
            </span>
            <span className="text-slate-400 hidden xs:inline">
              / {formatMemory(totalDeviceRamMb)} ({ramUsagePercent}%)
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="flex-1 max-w-xs h-2 bg-[#111318] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                ramUsagePercent > 85 ? 'bg-[#FFB4AB]' : ramUsagePercent > 65 ? 'bg-[#FFD87A]' : 'bg-[#A8C7FA]'
              }`}
              style={{ width: `${ramUsagePercent}%` }}
            />
          </div>
        </div>

        {/* Sort Switcher */}
        <button
          onClick={() => {
            setSortBy(s => (s === 'memory' ? 'cpu' : s === 'cpu' ? 'name' : 'memory'));
          }}
          className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-[#111318] border border-white/5 text-[11px] font-mono font-medium text-slate-300 hover:text-white transition shrink-0"
        >
          <ArrowUpDown className="w-3 h-3 text-[#A8C7FA]" />
          <span className="capitalize">Sort: {sortBy}</span>
        </button>
      </div>

      {/* Mobile Swipe Hint Banner on narrow screens */}
      <div className="flex sm:hidden items-center justify-between text-[11px] font-mono text-slate-400 pb-2 px-1 shrink-0">
        <span className="flex items-center gap-1.5 text-slate-300">
          <ArrowRightLeft size={12} className="text-[#A8C7FA]" />
          <span>Swipe table for full metrics</span>
        </span>
        <span className="text-[10px] font-medium text-[#A8C7FA] bg-[#A8C7FA]/10 border border-[#A8C7FA]/20 px-1.5 py-0.5 rounded">
          Action pinned
        </span>
      </div>

      {/* Main Table Content Body */}
      <div className="flex-1 overflow-x-auto overflow-y-auto pr-1 min-h-[300px] md:min-h-0 touch-pan-x">
        <table className="w-full min-w-[500px] sm:min-w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[11px] uppercase font-mono text-slate-400">
              <th className="pb-3 pl-3">Application / Process</th>
              <th className="pb-3">PID / Tasks</th>
              <th className="pb-3 hidden sm:table-cell">User</th>
              <th className="pb-3">CPU %</th>
              <th className="pb-3">Memory</th>
              <th className="pb-3 text-right pr-3 sticky right-0 bg-[#1D2024] z-20 shadow-[-6px_0_10px_rgba(0,0,0,0.35)]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs font-mono">
            {groupedProcesses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                  No processes match "{searchQuery}".
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
                        isExpanded ? 'bg-[#282A2F]/40' : 'hover:bg-[#282A2F]/30'
                      }`}
                    >
                      {/* App Name + Expand Chevron + App Icon */}
                      <td className="py-2.5 pl-2 font-sans">
                        <div className="flex items-center gap-2">
                          {isMulti ? (
                            <button
                              onClick={() => toggleGroupExpand(group.key)}
                              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0"
                              title={isExpanded ? 'Collapse sub-processes' : 'Expand sub-processes'}
                            >
                              {isExpanded ? (
                                <ChevronDown size={14} className="text-[#A8C7FA]" />
                              ) : (
                                <ChevronRight size={14} />
                              )}
                            </button>
                          ) : (
                            <span className="w-5 shrink-0" />
                          )}

                          {getAppIcon(group.name, group.category)}

                          <span className="font-semibold text-slate-100 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-xs">
                            {group.name}
                          </span>

                          {isMulti && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#A8C7FA]/15 text-[#A8C7FA] border border-[#A8C7FA]/25">
                              {group.items.length}
                            </span>
                          )}

                          {group.category && (
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-400 hidden lg:inline">
                              {group.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PID / Tasks */}
                      <td className="py-2.5 text-slate-400 font-mono text-xs">
                        {isMulti ? (
                          <span className="text-slate-400 italic text-[11px]">
                            {group.items.length} tasks
                          </span>
                        ) : (
                          <span>{group.items[0].pid}</span>
                        )}
                      </td>

                      {/* User */}
                      <td className="py-2.5 text-slate-400 hidden sm:table-cell">
                        {group.items.every(i => i.user === group.items[0].user)
                          ? group.items[0].user || 'SYSTEM'
                          : 'Multiple'}
                      </td>

                      {/* CPU % */}
                      <td
                        className={`py-2.5 font-medium ${
                          group.totalCpu > 5 ? 'text-[#FFB4AB]' : 'text-slate-200'
                        }`}
                      >
                        {group.totalCpu.toFixed(1)}%
                      </td>

                      {/* Memory */}
                      <td className="py-2.5 text-[#6DD58C] font-medium">
                        {formatMemory(group.totalMemoryMb)}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 text-right pr-3 sticky right-0 bg-[#1D2024] group-hover:bg-[#282A2F] z-10 shadow-[-6px_0_10px_rgba(0,0,0,0.35)] transition-colors">
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
                            title="Terminate Process"
                          >
                            <Skull className="w-3.5 h-3.5" />
                            <span className="text-[11px]">
                              {confirmPid === group.items[0].pid ? 'Kill?' : 'End task'}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Children Sub-Processes (Task Manager style hierarchy) */}
                    {isMulti &&
                      isExpanded &&
                      group.items.map((subProc, idx) => {
                        const isLastChild = idx === group.items.length - 1;
                        const isSubKilling = confirmPid === subProc.pid;

                        return (
                          <tr
                            key={subProc.pid}
                            className="bg-[#111318]/50 hover:bg-[#282A2F]/40 transition-colors border-b border-white/[0.02] group/child"
                          >
                            {/* Indented Sub-Process Name with Tree Line */}
                            <td className="py-2 pl-4 sm:pl-9 font-sans">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-mono text-xs select-none">
                                  {isLastChild ? '└──' : '├──'}
                                </span>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-slate-300 font-medium text-xs truncate max-w-[130px] xs:max-w-[160px] sm:max-w-xs">
                                    {subProc.subTitle || subProc.name}
                                  </span>
                                  {subProc.subTitle && (
                                    <span className="text-[10px] text-slate-500 font-mono truncate">
                                      {subProc.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Child PID */}
                            <td className="py-2 text-slate-400 font-mono text-xs">
                              <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                #{subProc.pid}
                              </span>
                            </td>

                            {/* Child User */}
                            <td className="py-2 text-slate-400 hidden sm:table-cell text-xs">
                              {subProc.user || 'SYSTEM'}
                            </td>

                            {/* Child CPU */}
                            <td className="py-2 text-slate-300 font-mono text-xs">
                              {subProc.cpu}%
                            </td>

                            {/* Child Memory */}
                            <td className="py-2 text-[#82D5A5] font-mono text-xs">
                              {formatMemory(subProc.memoryMb)}
                            </td>

                            {/* Child Action */}
                            <td className="py-2 text-right pr-3 sticky right-0 bg-[#1D2024] group-hover/child:bg-[#282A2F] z-10 shadow-[-6px_0_10px_rgba(0,0,0,0.35)] transition-colors">
                              <button
                                onClick={() => handleKillClick(subProc.pid)}
                                className={`h-7 px-2 rounded transition-colors inline-flex items-center gap-1 touch-manipulation ${
                                  isSubKilling
                                    ? 'bg-[#93000A] text-[#FFB4AB] font-bold px-2.5 border border-[#FFB4AB]/30'
                                    : 'text-[#FFB4AB]/80 hover:text-[#FFB4AB] hover:bg-[#93000A]/20'
                                }`}
                                title={`Terminate process #${subProc.pid}`}
                              >
                                <Skull className="w-3 h-3" />
                                <span className="text-[10px]">
                                  {isSubKilling ? 'Kill?' : 'End'}
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
