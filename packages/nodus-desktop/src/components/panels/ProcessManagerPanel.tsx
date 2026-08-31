import React, { useState, useMemo } from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { 
  Activity, 
  RotateCcw, 
  Trash2, 
  Search, 
  Cpu, 
  HardDrive, 
  ChevronDown, 
  ChevronRight,
  AppWindow,
  Server,
  Shield,
  Layers,
  AlertTriangle,
  Skull
} from 'lucide-react';
import { DeviceProcess } from '../../types/desktop';

interface ProcessAppGroup {
  appName: string;
  category: 'user' | 'daemon' | 'system' | 'service';
  totalCpu: number;
  totalMemoryMb: number;
  processes: DeviceProcess[];
}

export const ProcessManagerPanel: React.FC = () => {
  const { processes, refreshProcesses, killProcess, systemStats } = useDesktop();
  const [filterQuery, setFilterQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [terminatedPid, setTerminatedPid] = useState<number | null>(null);
  const [processToKill, setProcessToKill] = useState<{ pid: number; name: string } | null>(null);

  // Collapsible category sections
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    apps: false,
    background: false,
    windows: false,
  });

  // Expanded application instances (chevron toggle per application)
  const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    refreshProcesses();
  }, [refreshProcesses]);

  const toggleCategory = (catKey: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  const toggleAppExpand = (appName: string) => {
    setExpandedApps(prev => ({ ...prev, [appName]: !prev[appName] }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProcesses();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleConfirmKill = async () => {
    if (!processToKill) return;
    const pid = processToKill.pid;
    const success = await killProcess(pid);
    if (success) {
      setTerminatedPid(pid);
      setTimeout(() => setTerminatedPid(null), 2000);
    }
    setProcessToKill(null);
  };

  // Filter processes
  const filteredProcesses = useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return processes;
    return processes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.pid.toString().includes(q) ||
        (p.user && p.user.toLowerCase().includes(q))
    );
  }, [processes, filterQuery]);

  // Aggregate processes by Application Name under Apps, Background, and Windows categories
  const groupedCategories = useMemo(() => {
    const appMap: Record<string, ProcessAppGroup> = {};
    const bgMap: Record<string, ProcessAppGroup> = {};
    const winMap: Record<string, ProcessAppGroup> = {};

    for (const proc of filteredProcesses) {
      const cat = proc.category || 'user';
      let targetMap = appMap;
      if (cat === 'system') {
        targetMap = winMap;
      } else if (cat === 'daemon' || cat === 'service') {
        targetMap = bgMap;
      }

      if (!targetMap[proc.name]) {
        targetMap[proc.name] = {
          appName: proc.name,
          category: cat,
          totalCpu: 0,
          totalMemoryMb: 0,
          processes: [],
        };
      }

      targetMap[proc.name].totalCpu += proc.cpu || 0;
      targetMap[proc.name].totalMemoryMb += proc.memoryMb || 0;
      targetMap[proc.name].processes.push(proc);
    }

    const sortGroups = (map: Record<string, ProcessAppGroup>) =>
      Object.values(map).sort((a, b) => b.totalMemoryMb - a.totalMemoryMb);

    return {
      apps: sortGroups(appMap),
      background: sortGroups(bgMap),
      windows: sortGroups(winMap),
    };
  }, [filteredProcesses]);

  const renderAppGroup = (group: ProcessAppGroup) => {
    const isExpanded = Boolean(expandedApps[group.appName]);
    const hasMultiple = group.processes.length > 1;
    const isHighMem = group.totalMemoryMb > 400;
    const isHighCpu = group.totalCpu > 10.0;

    return (
      <div key={group.appName} className="rounded-xl overflow-hidden transition bg-white/[0.01] hover:bg-white/[0.03]">
        {/* Parent Application Header Row */}
        <div className="grid grid-cols-12 items-center py-2 px-3 hover:bg-white/5 rounded-xl transition text-xs group">
          {/* Chevron + App Name + Count Badge */}
          <div className="col-span-5 flex items-center gap-2 min-w-0 pr-2">
            {hasMultiple ? (
              <button
                type="button"
                onClick={() => toggleAppExpand(group.appName)}
                className="p-1 -ml-1 text-[#8E8E93] hover:text-white transition rounded"
              >
                {isExpanded ? <ChevronDown size={14} className="text-[#FF9500]" /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-5" />
            )}

            <span className="font-semibold text-white truncate group-hover:text-[#FF9500] transition">
              {group.appName}
            </span>

            {hasMultiple && (
              <span className="text-[10px] font-mono text-[#8E8E93] bg-white/10 px-1.5 py-0.2 rounded-md shrink-0">
                {group.processes.length}
              </span>
            )}
          </div>

          {/* Status */}
          <div className="col-span-2 text-[#8E8E93] text-[11px] truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
            <span>Running</span>
          </div>

          {/* CPU Total */}
          <div className="col-span-2 text-right pr-4 font-mono font-bold">
            <span className={isHighCpu ? 'text-[#FF3B30]' : 'text-[#8E8E93]'}>
              {group.totalCpu > 0 ? `${group.totalCpu.toFixed(1)}%` : '0.0%'}
            </span>
          </div>

          {/* Memory Total */}
          <div className="col-span-2 text-right pr-4 font-mono font-bold">
            <span className={isHighMem ? 'text-[#FF9500]' : 'text-white'}>
              {group.totalMemoryMb} MB
            </span>
          </div>

          {/* Action */}
          <div className="col-span-1 flex justify-end">
            {group.processes.length === 1 ? (
              <button
                onClick={() => setProcessToKill({ pid: group.processes[0].pid, name: group.processes[0].name })}
                className="p-1 px-2 rounded-lg bg-[#FF3B30]/10 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white font-bold text-[11px] flex items-center gap-1 border border-[#FF3B30]/20 hover:border-[#FF3B30] transition active:scale-95"
                title={`End Task: ${group.appName} (${group.processes[0].pid})`}
              >
                <Trash2 size={12} />
              </button>
            ) : (
              <button
                onClick={() => toggleAppExpand(group.appName)}
                className="p-1 px-2 text-[#8E8E93] hover:text-white text-[11px] transition"
                title="Expand instances"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Sub-processes / Child Instances under this Application */}
        {hasMultiple && isExpanded && (
          <div className="pl-6 pr-2 py-1 space-y-0.5 border-l-2 border-white/10 ml-4 mb-1">
            {group.processes.map((proc) => {
              const isTerminated = terminatedPid === proc.pid;
              return (
                <div
                  key={proc.pid}
                  className={`grid grid-cols-12 items-center py-1.5 px-3 rounded-lg hover:bg-white/5 transition text-[11px] ${
                    isTerminated ? 'bg-[#FF3B30]/20 opacity-50' : ''
                  }`}
                >
                  <div className="col-span-5 flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-mono text-[#8E8E93] text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-center shrink-0">
                      PID {proc.pid}
                    </span>
                    <span className="text-[#8E8E93] truncate">
                      {proc.description || proc.name}
                    </span>
                  </div>

                  <div className="col-span-2 text-[#8E8E93] text-[10px]">
                    {proc.user || 'User'}
                  </div>

                  <div className="col-span-2 text-right pr-4 font-mono text-[#8E8E93]">
                    {proc.cpu ? `${proc.cpu.toFixed(1)}%` : '0.0%'}
                  </div>

                  <div className="col-span-2 text-right pr-4 font-mono text-[#8E8E93]">
                    {proc.memoryMb || 0} MB
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => setProcessToKill({ pid: proc.pid, name: `${proc.name} (PID ${proc.pid})` })}
                      className="p-1 rounded bg-[#FF3B30]/10 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white transition active:scale-95"
                      title={`End Instance: PID ${proc.pid}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSectionHeader = (title: string, count: number, catKey: string, icon: React.ReactNode) => {
    const isCollapsed = collapsedCategories[catKey];
    return (
      <button
        onClick={() => toggleCategory(catKey)}
        className="w-full flex items-center justify-between py-2 px-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-left transition my-1 select-none"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          {isCollapsed ? <ChevronRight size={14} className="text-[#8E8E93]" /> : <ChevronDown size={14} className="text-[#8E8E93]" />}
          <div className="flex items-center gap-1.5 text-[#8E8E93]">
            {icon}
            <span className="text-white">{title}</span>
          </div>
          <span className="text-[10px] font-mono font-normal text-[#8E8E93] bg-white/5 px-2 py-0.5 rounded-full">
            {count} apps
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="w-full h-full flex flex-col gap-3 overflow-hidden relative font-sans">
      {/* Warning Confirmation Modal */}
      {processToKill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#16161D] border border-[#FF3B30]/40 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FF3B30]/20 border border-[#FF3B30]/40 text-[#FF3B30] flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">End Task?</h3>
              <p className="text-xs text-[#8E8E93] mt-1.5 leading-relaxed">
                Are you sure you want to end <span className="text-white font-mono font-bold">{processToKill.name}</span> (PID: <span className="font-mono text-[#FF9500]">{processToKill.pid}</span>)? If an open program is associated with this process, it will close and you will lose any unsaved data.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setProcessToKill(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-white text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmKill}
                className="flex-1 py-2.5 rounded-xl bg-[#FF3B30] hover:bg-[#E0352B] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF3B30]/25 active:scale-95"
              >
                <Skull size={13} />
                <span>End Task</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity size={18} className="text-[#FF9500]" />
            <span>Task Manager (Processes)</span>
          </h2>
          <p className="text-[11px] text-[#8E8E93]">
            Nested application tree showing all process instances under their parent app.
          </p>
        </div>

        {/* Quick Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-3 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search apps or process instances..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-[#181822] border border-white/10 text-xs text-white outline-none focus:border-[#FF9500] w-64"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-[#FF9500] hover:bg-[#E08500] text-black text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#FF9500]/20 transition active:scale-95"
          >
            <RotateCcw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* System Resource Gauges Strip */}
      {systemStats && (
        <div className="grid grid-cols-3 gap-2.5 shrink-0">
          <div className="p-2.5 rounded-2xl bg-[#121218] border border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#34C759]/20 text-[#34C759] flex items-center justify-center shrink-0">
              <Cpu size={15} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8E8E93]">CPU Utilization</span>
              <p className="text-xs font-mono font-bold text-white">{systemStats.cpu_load_percent}%</p>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#121218] border border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#007AFF]/20 text-[#007AFF] flex items-center justify-center shrink-0">
              <HardDrive size={15} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8E8E93]">Memory In-Use</span>
              <p className="text-xs font-mono font-bold text-white">
                {Math.round((systemStats.ram_used_mb / 1024) * 10) / 10} / {Math.round((systemStats.ram_total_mb / 1024) * 10) / 10} GB
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#121218] border border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#BF5AF2]/20 text-[#BF5AF2] flex items-center justify-center shrink-0">
              <Layers size={15} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8E8E93]">Total Running Tasks</span>
              <p className="text-xs font-mono font-bold text-white">{processes.length} Processes</p>
            </div>
          </div>
        </div>
      )}

      {/* Grouped Process Table */}
      <div className="flex-1 bg-[#121218] border border-white/10 rounded-2xl p-3 flex flex-col overflow-hidden shadow-2xl">
        {/* Table Column Headers */}
        <div className="grid grid-cols-12 text-[10px] font-bold text-[#8E8E93] uppercase pb-2 border-b border-white/10 px-3 shrink-0 select-none">
          <div className="col-span-5">
            <span>Name</span>
          </div>

          <div className="col-span-2">
            <span>Status</span>
          </div>

          <div className="col-span-2 text-right pr-4">
            <span>CPU</span>
          </div>

          <div className="col-span-2 text-right pr-4">
            <span>Memory</span>
          </div>

          <div className="col-span-1 text-right">
            <span>Action</span>
          </div>
        </div>

        {/* Scrollable Process Groups Container */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 pr-1 mt-1 space-y-1">
          {/* Section 1: Apps */}
          <div>
            {renderSectionHeader('Apps', groupedCategories.apps.length, 'apps', <AppWindow size={13} className="text-[#34C759]" />)}
            {!collapsedCategories.apps && (
              <div className="space-y-0.5 pl-1">
                {groupedCategories.apps.length === 0 ? (
                  <p className="py-2 text-center text-[11px] text-[#8E8E93] italic">No active application windows</p>
                ) : (
                  groupedCategories.apps.map(renderAppGroup)
                )}
              </div>
            )}
          </div>

          {/* Section 2: Background Processes */}
          <div className="pt-1">
            {renderSectionHeader('Background Processes', groupedCategories.background.length, 'background', <Server size={13} className="text-[#007AFF]" />)}
            {!collapsedCategories.background && (
              <div className="space-y-0.5 pl-1">
                {groupedCategories.background.length === 0 ? (
                  <p className="py-2 text-center text-[11px] text-[#8E8E93] italic">No background processes</p>
                ) : (
                  groupedCategories.background.map(renderAppGroup)
                )}
              </div>
            )}
          </div>

          {/* Section 3: Windows Processes */}
          <div className="pt-1">
            {renderSectionHeader('Windows Processes', groupedCategories.windows.length, 'windows', <Shield size={13} className="text-[#FF9500]" />)}
            {!collapsedCategories.windows && (
              <div className="space-y-0.5 pl-1">
                {groupedCategories.windows.length === 0 ? (
                  <p className="py-2 text-center text-[11px] text-[#8E8E93] italic">No Windows system processes</p>
                ) : (
                  groupedCategories.windows.map(renderAppGroup)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
