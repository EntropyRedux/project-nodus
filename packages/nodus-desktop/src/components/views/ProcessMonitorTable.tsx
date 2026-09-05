import React, { useState, useMemo } from 'react';
import { DeviceInfo, DeviceProcess } from '../../types/desktop';
import { ProcessMonitorProps } from '../../types/ui-contracts';
import {
  Search,
  RefreshCw,
  Skull,
  ChevronRight,
  ChevronDown,
  Cpu,
  HardDrive,
  ArrowUpDown,
  AlertTriangle,
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  Layers,
  Activity,
  Check,
  Play,
  Pause,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';

type RawProcessItem = {
  pid: number;
  parent_pid?: number;
  parent_name?: string;
  parentPid?: number;
  parentName?: string;
  name: string;
  memory_kb?: number;
  memoryMb?: number;
  cpu?: number;
  category?: string;
  user?: string;
};

function normalizeProcessList(rawList: ProcessMonitorProps['processes']): DeviceProcess[] {
  if (!rawList) return [];
  return rawList.map(item => {
    const raw = item as RawProcessItem;
    const parentPid = raw.parentPid || raw.parent_pid;
    const parentName = raw.parentName || raw.parent_name;

    if ('memoryMb' in item && typeof (item as DeviceProcess).memoryMb === 'number') {
      const proc = item as DeviceProcess;
      return {
        ...proc,
        parentPid: proc.parentPid || parentPid,
        parentName: proc.parentName || parentName,
      };
    }

    return {
      pid: raw.pid,
      parentPid,
      parentName,
      name: raw.name,
      user: raw.user || 'User',
      cpu: typeof raw.cpu === 'number' ? Math.round(raw.cpu * 10) / 10 : 0,
      memoryMb: Math.round(((raw.memory_kb || 0) / 1024) * 10) / 10,
      status: 'running' as const,
      category: (raw.category as any) || categorizeProcess(raw.name),
    };
  });
}

function categorizeProcess(name: string): DeviceProcess['category'] {
  const n = name.toLowerCase();
  if (n.includes('webview2')) return 'system';
  if ((n.includes('chrome') || n.includes('edge') || n.includes('firefox') || n.includes('brave') || n.includes('opera')) && !n.includes('webview')) return 'browser';
  if (n.includes('code') || n.includes('node') || n.includes('git') || n.includes('cargo') || n.includes('rust') || n.includes('terminal') || n.includes('bash') || n.includes('powershell')) return 'dev';
  if (n.includes('spotify') || n.includes('vlc') || n.includes('media') || n.includes('audio') || n.includes('obs')) return 'media';
  if (n.includes('slack') || n.includes('teams') || n.includes('discord') || n.includes('notion') || n.includes('word') || n.includes('excel')) return 'productivity';
  if (n.includes('system') || n.includes('service') || n.includes('svchost') || n.includes('csrss') || n.includes('lsass') || n.includes('dwm')) return 'system';
  return 'user';
}

function cleanAppName(rawName: string, parentName?: string): string {
  const base = rawName.replace(/\.exe$/i, '').trim();
  const lower = base.toLowerCase();

  // 1. Differentiate WebView2 embedded runtime from actual Microsoft Edge Browser
  if (lower.includes('webview2') || lower === 'msedgewebview2') {
    if (parentName) {
      const parentClean = cleanAppName(parentName);
      return `${parentClean} (WebView2 Engine)`;
    }
    return 'WebView2 Runtime (Embedded UI)';
  }

  // 2. Genuine Microsoft Edge Browser
  if (lower === 'msedge' || (lower.includes('edge') && !lower.includes('webview'))) {
    return 'Microsoft Edge Browser';
  }

  if (lower.includes('chrome')) return 'Google Chrome';
  if (lower.includes('firefox')) return 'Mozilla Firefox';
  if (lower.includes('code')) return 'Visual Studio Code';
  if (lower.includes('windowsterminal') || lower === 'wt') return 'Windows Terminal';
  if (lower.includes('powershell') || lower === 'pwsh') return 'PowerShell';
  if (lower.includes('cmd')) return 'Command Prompt';
  if (lower.includes('node')) return 'Node.js Runtime';
  if (lower.includes('explorer')) return 'Windows Explorer';
  if (lower.includes('spotify')) return 'Spotify Music';
  if (lower.includes('slack')) return 'Slack Workstation';
  if (lower.includes('teams') || lower.includes('msteams')) return 'Microsoft Teams';
  if (lower.includes('discord')) return 'Discord';
  if (lower.includes('docker')) return 'Docker Desktop';
  if (lower.includes('svchost')) return 'Host Process for Windows Services';
  if (lower.includes('dwm')) return 'Desktop Window Manager';
  if (lower.includes('nodus') || lower.includes('tauri')) return 'Nodus Desktop Host';
  if (lower.includes('widget')) return 'Windows Widgets';
  if (lower.includes('searchhost')) return 'Windows Search Indexer';
  if (lower.includes('startmenuexperiencehost')) return 'Windows Start Menu';
  return base;
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

function getDeviceIcon(type?: DeviceInfo['type'], size = 16) {
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
  selectedDeviceId,
  onSelectDevice,
  processes,
  isLoading = false,
  isPolling = false,
  onTogglePolling,
  onRefresh,
  onKillProcess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmPid, setConfirmPid] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'memory' | 'cpu' | 'name' | 'pid'>('memory');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Normalize processes
  const normalizedList = useMemo(() => normalizeProcessList(processes), [processes]);

  // Filter processes
  const filteredProcesses = useMemo(() => {
    return normalizedList.filter(p => {
      const appName = cleanAppName(p.name, p.parentName);
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.pid).includes(searchQuery) ||
        appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.parentName && p.parentName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [normalizedList, searchQuery, categoryFilter]);

  // Group processes by friendly application name & parent relationship
  const groupedProcesses = useMemo(() => {
    const map = new Map<string, DeviceProcess[]>();
    filteredProcesses.forEach(p => {
      const groupName = cleanAppName(p.name, p.parentName);
      const key = groupName.toLowerCase();
      const existing = map.get(key) || [];
      existing.push(p);
      map.set(key, existing);
    });

    const groups: ProcessGroup[] = Array.from(map.entries()).map(([key, items]) => {
      const totalMemoryMb = items.reduce((sum, item) => sum + (item.memoryMb || 0), 0);
      const totalCpu = Math.round(items.reduce((sum, item) => sum + (item.cpu || 0), 0) * 10) / 10;
      return {
        key,
        name: cleanAppName(items[0].name, items[0].parentName),
        category: items[0].category,
        items,
        totalMemoryMb,
        totalCpu,
      };
    });

    // Sort groups
    groups.sort((a, b) => {
      const dir = sortDirection === 'desc' ? -1 : 1;
      if (sortBy === 'memory') return (a.totalMemoryMb - b.totalMemoryMb) * dir;
      if (sortBy === 'cpu') return (a.totalCpu - b.totalCpu) * dir;
      if (sortBy === 'pid') return (a.items[0].pid - b.items[0].pid) * dir;
      return a.name.localeCompare(b.name) * dir;
    });

    return groups;
  }, [filteredProcesses, sortBy, sortDirection]);

  // Flat sorted processes
  const flatProcesses = useMemo(() => {
    const list = [...filteredProcesses];
    const dir = sortDirection === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      if (sortBy === 'memory') return ((a.memoryMb || 0) - (b.memoryMb || 0)) * dir;
      if (sortBy === 'cpu') return ((a.cpu || 0) - (b.cpu || 0)) * dir;
      if (sortBy === 'pid') return (a.pid - b.pid) * dir;
      return a.name.localeCompare(b.name) * dir;
    });
    return list;
  }, [filteredProcesses, sortBy, sortDirection]);

  // Overall RAM and CPU metrics calculation
  const totalAllocatedRamMb = normalizedList.reduce((sum, p) => sum + (p.memoryMb || 0), 0);
  const totalDeviceRamMb = device?.ramTotalMb || 16384;
  const ramUsagePercent = Math.min(100, Math.round((totalAllocatedRamMb / totalDeviceRamMb) * 100));
  const totalCpuPercent = Math.min(100, Math.round(normalizedList.reduce((sum, p) => sum + (p.cpu || 0), 0) * 10) / 10);

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

  const handleSortSwitch = (field: 'memory' | 'cpu' | 'name' | 'pid') => {
    if (sortBy === field) {
      setSortDirection(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface-container)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-xl text-[var(--text-body)] p-6 space-y-4">
      {/* 1. Header Bar: Device Selector & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-container)] text-[var(--accent-on-container)] border border-[var(--border-active)] flex items-center justify-center shadow-md shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--text-heading)]">
                Process Monitor
              </h2>
              {/* Target Device Selector Pill */}
              {devices.length > 1 && onSelectDevice ? (
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedDeviceId || device.id}
                    onChange={e => onSelectDevice(e.target.value)}
                    className="bg-[var(--surface-elevated)] text-[var(--text-heading)] text-xs font-mono font-medium rounded-md px-2.5 py-1 border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-active)] cursor-pointer"
                  >
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.isLocal ? 'Local Host' : d.ipAddress})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] text-[11px] font-mono font-medium">
                  {device.name} ({device.isLocal ? 'Local Workstation' : device.ipAddress})
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
              Live kernel process inspector with parent application hierarchy tracking
            </p>
          </div>
        </div>

        {/* Action Controls: Search, View Mode Toggle, Polling Toggle & Manual Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search process, app, or PID..."
              className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg h-9 pl-9 pr-3 text-xs focus:outline-none focus:border-[var(--border-active)] text-[var(--text-heading)] placeholder:text-[var(--text-muted)] font-mono w-44 sm:w-56 transition-all"
            />
          </div>

          {/* Grouped vs Flat View Switcher */}
          <div className="flex items-center bg-[var(--surface-base)] rounded-lg border border-[var(--border-subtle)] p-0.5">
            <button
              onClick={() => setViewMode('grouped')}
              title="Grouped by Application Hierarchy"
              className={`h-8 px-2.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-1.5 ${
                viewMode === 'grouped'
                  ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
              }`}
            >
              <Layers size={13} />
              <span className="hidden sm:inline">Tree</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              title="Flat Process Table"
              className={`h-8 px-2.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-1.5 ${
                viewMode === 'flat'
                  ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Flat</span>
            </button>
          </div>

          {/* Auto-Polling Live Stream Toggle */}
          {onTogglePolling && (
            <button
              onClick={onTogglePolling}
              title={isPolling ? 'Live Polling Active (3s) — Click to Pause' : 'Polling Paused — Click for Live Stream'}
              className={`h-9 px-3 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition active:scale-95 border ${
                isPolling
                  ? 'bg-[var(--btn-success-bg)] text-[var(--btn-success-text)] border-[var(--btn-success-border)]'
                  : 'bg-[var(--surface-base)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-heading)]'
              }`}
            >
              {isPolling ? <Pause size={12} /> : <Play size={12} />}
              <span>{isPolling ? 'Live (3s)' : 'Paused'}</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="bg-[var(--control-btn-bg)] hover:bg-[var(--control-btn-hover)] w-9 h-9 rounded-lg text-[var(--control-btn-text)] transition-colors flex items-center justify-center border border-[var(--border-subtle)] disabled:opacity-50 shrink-0"
            title="Refresh Process List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--accent-primary)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Telemetry Overview Bar: RAM, CPU, Process Count */}
      <div className="px-4 py-3 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        {/* Metric 1: RAM */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-base)] text-[var(--accent-primary)] flex items-center justify-center border border-[var(--border-subtle)]">
            <HardDrive size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-muted)]">RAM:</span>
              <span className="font-semibold" style={{ color: 'var(--status-online-text)' }}>
                {formatMemory(totalAllocatedRamMb)}
              </span>
              <span className="text-[var(--text-muted)]">/ {formatMemory(totalDeviceRamMb)}</span>
              <span className="text-[var(--text-heading)] font-bold">({ramUsagePercent}%)</span>
            </div>
            <div className="w-32 h-1.5 bg-[var(--surface-base)] rounded-full overflow-hidden border border-[var(--border-subtle)] mt-1">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${ramUsagePercent}%`,
                  backgroundColor: ramUsagePercent > 85 ? 'var(--btn-danger-text)' : 'var(--accent-primary)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: CPU */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-base)] text-amber-400 flex items-center justify-center border border-[var(--border-subtle)]">
            <Cpu size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-muted)]">Total CPU:</span>
              <span className="font-bold text-[var(--text-heading)]">
                {totalCpuPercent > 0 ? `${totalCpuPercent}%` : `${device?.cpuUsagePercent || 8}%`}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {normalizedList.length} Active Processes
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 bg-[var(--surface-base)] p-1 rounded-lg border border-[var(--border-subtle)]">
          {(['all', 'user', 'browser', 'dev', 'media', 'system'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`h-7 px-2.5 rounded-md capitalize font-medium transition text-[11px] ${
                categoryFilter === cat
                  ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Process Table Body */}
      <div className="flex-1 overflow-y-auto pr-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[var(--surface-container)] z-10">
            <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase font-mono text-[var(--text-muted)] select-none">
              <th
                onClick={() => handleSortSwitch('pid')}
                className="pb-3 pl-3 cursor-pointer hover:text-[var(--text-heading)] transition w-24"
              >
                <div className="flex items-center gap-1">
                  <span>PID</span>
                  {sortBy === 'pid' && <ArrowUpDown size={11} className="text-[var(--accent-primary)]" />}
                </div>
              </th>
              <th
                onClick={() => handleSortSwitch('name')}
                className="pb-3 cursor-pointer hover:text-[var(--text-heading)] transition"
              >
                <div className="flex items-center gap-1">
                  <span>Process / Application Name</span>
                  {sortBy === 'name' && <ArrowUpDown size={11} className="text-[var(--accent-primary)]" />}
                </div>
              </th>
              <th className="pb-3 hidden md:table-cell w-28">Category</th>
              <th
                onClick={() => handleSortSwitch('cpu')}
                className="pb-3 cursor-pointer hover:text-[var(--text-heading)] transition w-24"
              >
                <div className="flex items-center gap-1">
                  <span>CPU %</span>
                  {sortBy === 'cpu' && <ArrowUpDown size={11} className="text-[var(--accent-primary)]" />}
                </div>
              </th>
              <th
                onClick={() => handleSortSwitch('memory')}
                className="pb-3 cursor-pointer hover:text-[var(--text-heading)] transition w-28"
              >
                <div className="flex items-center gap-1">
                  <span>Memory</span>
                  {sortBy === 'memory' && <ArrowUpDown size={11} className="text-[var(--accent-primary)]" />}
                </div>
              </th>
              <th className="pb-3 text-right pr-3 w-28">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)] text-xs font-mono">
            {filteredProcesses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-[var(--text-muted)] font-mono">
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[var(--accent-primary)]" />
                      <span>Loading running processes...</span>
                    </div>
                  ) : (
                    <span>No processes match your filter "{searchQuery}".</span>
                  )}
                </td>
              </tr>
            ) : viewMode === 'grouped' ? (
              /* GROUPED TREE VIEW */
              groupedProcesses.map(group => {
                const isExpanded = expandedGroups.has(group.key);
                const hasMultiple = group.items.length > 1;

                return (
                  <React.Fragment key={group.key}>
                    {/* Parent Group Row */}
                    <tr
                      onClick={() => hasMultiple && toggleGroupExpand(group.key)}
                      className={`hover:bg-[var(--card-hover)] transition-colors group ${
                        hasMultiple ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="py-3 pl-3 text-[var(--text-muted)]">
                        {hasMultiple ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
                            {group.items.length} procs
                          </span>
                        ) : (
                          group.items[0].pid
                        )}
                      </td>

                      <td className="py-3 font-sans font-medium text-[var(--text-heading)]">
                        <div className="flex items-center gap-2">
                          {hasMultiple && (
                            <span className="text-[var(--text-muted)]">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                          )}
                          <Cpu className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                          <span className="truncate">{group.name}</span>
                        </div>
                      </td>

                      <td className="py-3 hidden md:table-cell">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium bg-[var(--surface-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                          {group.category}
                        </span>
                      </td>

                      <td className="py-3 text-amber-400 font-semibold">
                        {group.totalCpu > 0 ? `${group.totalCpu}%` : '0.0%'}
                      </td>

                      <td className="py-3 font-semibold" style={{ color: 'var(--status-online-text)' }}>
                        {formatMemory(group.totalMemoryMb)}
                      </td>

                      <td className="py-3 text-right pr-3" onClick={e => e.stopPropagation()}>
                        {!hasMultiple ? (
                          <button
                            onClick={() => handleKillClick(group.items[0].pid)}
                            className={`h-7 px-2.5 rounded-md text-xs font-mono font-semibold transition inline-flex items-center gap-1 ${
                              confirmPid === group.items[0].pid
                                ? 'bg-red-600 text-white border border-red-400'
                                : 'text-red-400 hover:bg-red-500/15 border border-red-500/20'
                            }`}
                            title="Terminate Process"
                          >
                            <Skull size={12} />
                            <span>{confirmPid === group.items[0].pid ? 'Kill?' : 'Kill'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleGroupExpand(group.key)}
                            className="h-7 px-2.5 rounded-md text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] transition"
                          >
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Child Rows with Parent Hierarchy Info */}
                    {hasMultiple &&
                      isExpanded &&
                      group.items.map(child => (
                        <tr
                          key={child.pid}
                          className="bg-[var(--surface-elevated)]/40 hover:bg-[var(--card-hover)] transition-colors text-[11px]"
                        >
                          <td className="py-2 pl-8 text-[var(--text-muted)]">↳ {child.pid}</td>
                          <td className="py-2 pl-6 font-mono text-[var(--text-body)]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[var(--text-heading)] font-semibold">{child.name}</span>
                              {child.parentName && (
                                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-base)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                                  Host: {cleanAppName(child.parentName)} (PID {child.parentPid})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 hidden md:table-cell text-[var(--text-muted)]">
                            {child.user || 'User'}
                          </td>
                          <td className="py-2 text-amber-400/80">{child.cpu || 0}%</td>
                          <td className="py-2" style={{ color: 'var(--status-online-text)' }}>
                            {formatMemory(child.memoryMb || 0)}
                          </td>
                          <td className="py-2 text-right pr-3">
                            <button
                              onClick={() => handleKillClick(child.pid)}
                              className={`h-6 px-2 rounded text-[10px] font-mono font-semibold transition inline-flex items-center gap-1 ${
                                confirmPid === child.pid
                                  ? 'bg-red-600 text-white border border-red-400'
                                  : 'text-red-400 hover:bg-red-500/15 border border-red-500/20'
                              }`}
                              title={`Terminate PID ${child.pid}`}
                            >
                              <Skull size={10} />
                              <span>{confirmPid === child.pid ? 'Kill?' : 'Kill'}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            ) : (
              /* FLAT TABLE VIEW */
              flatProcesses.map(proc => (
                <tr key={proc.pid} className="hover:bg-[var(--card-hover)] transition-colors">
                  <td className="py-3 pl-3 text-[var(--text-muted)]">{proc.pid}</td>
                  <td className="py-3 font-sans font-medium text-[var(--text-heading)]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Cpu className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                      <span className="truncate">{proc.name}</span>
                      {proc.parentName && (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                          Host: {cleanAppName(proc.parentName)} (PID {proc.parentPid})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 hidden md:table-cell">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium bg-[var(--surface-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                      {proc.category}
                    </span>
                  </td>
                  <td className="py-3 text-amber-400 font-semibold">{proc.cpu || 0}%</td>
                  <td className="py-3 font-semibold" style={{ color: 'var(--status-online-text)' }}>
                    {formatMemory(proc.memoryMb || 0)}
                  </td>
                  <td className="py-3 text-right pr-3">
                    <button
                      onClick={() => handleKillClick(proc.pid)}
                      className={`h-7 px-2.5 rounded-md text-xs font-mono font-semibold transition inline-flex items-center gap-1 ${
                        confirmPid === proc.pid
                          ? 'bg-red-600 text-white border border-red-400'
                          : 'text-red-400 hover:bg-red-500/15 border border-red-500/20'
                      }`}
                      title="Terminate Process"
                    >
                      <Skull size={12} />
                      <span>{confirmPid === proc.pid ? 'Kill?' : 'Kill'}</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
