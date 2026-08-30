import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  X, 
  RotateCcw, 
  Skull, 
  Search, 
  Cpu, 
  HardDrive, 
  Layers, 
  Check, 
  Terminal, 
  Play, 
  Flame,
  ChevronLeft,
  Server,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  AppWindow,
  Shield
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DeviceProcess } from '../../types/launcher';
import { audio } from '../../utils/audio';

interface ProcessAppGroup {
  appName: string;
  category: 'user' | 'daemon' | 'system' | 'service';
  totalCpu: number;
  totalMemoryMb: number;
  processes: DeviceProcess[];
}

export const DeviceProcessSidePanel: React.FC = () => {
  const { 
    devices, 
    deviceProcesses, 
    processModalDeviceId, 
    closeProcessManager, 
    fetchDeviceProcesses,
    killProcess, 
    killAllUserProcesses, 
    rebootDevice,
    settings 
  } = useLauncher();

  const [searchQuery, setSearchQuery] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processToKill, setProcessToKill] = useState<{ pid: number; name: string } | null>(null);

  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    apps: false,
    background: false,
    system: false,
  });

  const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});

  const toggleCategory = (catKey: string) => {
    audio.playTap();
    setCollapsedCategories(prev => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  const toggleAppExpand = (appName: string) => {
    audio.playTap();
    setExpandedApps(prev => ({ ...prev, [appName]: !prev[appName] }));
  };

  const leftPanelAlpha = (settings.leftPanelOpacity ?? 85) / 100;

  const isOpen = Boolean(processModalDeviceId);
  const currentDevice = devices.find((d) => d.id === processModalDeviceId);
  const processes = processModalDeviceId ? (deviceProcesses[processModalDeviceId] || []) : [];

  const filteredProcesses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return processes;
    return processes.filter((proc) => {
      return (
        proc.name.toLowerCase().includes(q) ||
        proc.pid.toString().includes(q) ||
        (proc.description && proc.description.toLowerCase().includes(q)) ||
        proc.user.toLowerCase().includes(q)
      );
    });
  }, [processes, searchQuery]);

  const groupedCategories = useMemo(() => {
    const appMap: Record<string, ProcessAppGroup> = {};
    const bgMap: Record<string, ProcessAppGroup> = {};
    const sysMap: Record<string, ProcessAppGroup> = {};

    for (const proc of filteredProcesses) {
      const cat = proc.category || 'user';
      let targetMap = appMap;
      if (cat === 'system') {
        targetMap = sysMap;
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
      system: sortGroups(sysMap),
    };
  }, [filteredProcesses]);

  const totalRamUsed = useMemo(
    () => processes.reduce((acc, p) => acc + p.memoryMb, 0),
    [processes]
  );
  const totalCpuUsed = useMemo(
    () => Math.min(100, Math.round(processes.reduce((acc, p) => acc + p.cpu, 0))),
    [processes]
  );

  const requestKillProcess = (pid: number, name: string) => {
    audio.playTap();
    setProcessToKill({ pid, name });
  };

  const confirmKillProcess = () => {
    if (!processToKill || !currentDevice) return;
    killProcess(currentDevice.id, processToKill.pid);
    setCommandFeedback(`Signal SIGKILL dispatched to ${processToKill.name} (PID ${processToKill.pid})`);
    setProcessToKill(null);
    setTimeout(() => setCommandFeedback(null), 4000);
  };

  const handleExecuteCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim() || !currentDevice) return;

    audio.playTap();
    const cmd = customCommand.trim().toLowerCase();

    if (cmd === 'reboot' || cmd === 'adb reboot' || cmd === 'shutdown -r -t 0') {
      rebootDevice(currentDevice.id);
      setCommandFeedback(`Executing reboot on ${currentDevice.name}...`);
    } else if (cmd.startsWith('kill') || cmd.startsWith('taskkill')) {
      const parts = cmd.split(' ');
      const targetPidStr = parts.find((part) => !isNaN(Number(part)) && part !== '-9' && part !== '/f');
      if (targetPidStr) {
        const pidNum = parseInt(targetPidStr, 10);
        const targetProc = processes.find(p => p.pid === pidNum);
        requestKillProcess(pidNum, targetProc?.name || `PID ${pidNum}`);
      } else {
        setCommandFeedback(`Usage: kill <pid> or taskkill /F /PID <pid>`);
      }
    } else if (cmd === 'clear' || cmd === 'pkill -u user') {
      killAllUserProcesses(currentDevice.id);
      setCommandFeedback(`Killed all non-system user tasks.`);
    } else {
      setCommandFeedback(`Command '${customCommand}' dispatched to ${currentDevice.ipAddress}`);
    }

    setCustomCommand('');
    setTimeout(() => setCommandFeedback(null), 4000);
  };

  const renderAppGroup = (group: ProcessAppGroup) => {
    const isExpanded = Boolean(expandedApps[group.appName]);
    const hasMultiple = group.processes.length > 1;
    const isHighCpu = group.totalCpu > 5.0;
    const isHighMem = group.totalMemoryMb > 400;

    return (
      <div key={group.appName} className="rounded-xl overflow-hidden transition bg-[#141418]/80 hover:bg-[#1C1C22] border border-white/5 hover:border-white/10">
        <div className="flex items-center justify-between p-2 text-xs font-sans group">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasMultiple ? (
              <button
                type="button"
                onClick={() => toggleAppExpand(group.appName)}
                className="p-1 -ml-1 text-[#8E8E93] hover:text-white transition rounded"
              >
                {isExpanded ? <ChevronDown size={14} className="text-[#34C759]" /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-5" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#F0F0F2] text-xs truncate max-w-[130px]">
                  {group.appName}
                </span>
                {hasMultiple && (
                  <span className="text-[9px] font-mono text-[#8E8E93] bg-white/10 px-1.5 py-0.2 rounded-md shrink-0">
                    {group.processes.length}
                  </span>
                )}
                {isHighCpu && <Flame size={10} className="text-[#FF3B30] shrink-0" />}
              </div>
              <p className="text-[9px] text-[#8E8E93] truncate max-w-[150px]">
                {group.processes[0]?.description || (hasMultiple ? `${group.processes.length} instances running` : `PID ${group.processes[0]?.pid}`)}
              </p>
            </div>
          </div>

          {/* Middle: Total CPU & Memory */}
          <div className="flex items-center gap-2 text-right mr-2 shrink-0 font-mono">
            <div className="w-14">
              <span className={`font-bold text-[11px] ${isHighCpu ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>
                {group.totalCpu > 0 ? `${Number(group.totalCpu.toFixed(2))}%` : '0.00%'}
              </span>
              <span className="text-[7px] text-[#8E8E93] block uppercase font-sans">CPU</span>
            </div>

            <div className="w-12">
              <span className={`font-bold text-[11px] ${isHighMem ? 'text-[#FF9500]' : 'text-[#F0F0F2]'}`}>
                {group.totalMemoryMb}M
              </span>
              <span className="text-[7px] text-[#8E8E93] block uppercase font-sans">RAM</span>
            </div>
          </div>

          {/* Right: End Task / Toggle Expand */}
          <div className="shrink-0">
            {group.processes.length === 1 ? (
              <button
                onClick={() => requestKillProcess(group.processes[0].pid, group.processes[0].name)}
                disabled={currentDevice?.isRebooting}
                className="p-1.5 bg-[#1C1C20] hover:bg-[#FF3B30] text-[#8E8E93] hover:text-white border border-white/10 hover:border-[#FF3B30] rounded-lg text-xs font-semibold transition flex items-center gap-1 group-hover:border-[#FF3B30]/40 active:scale-95"
                title={`End Task: ${group.appName} (PID ${group.processes[0].pid})`}
              >
                <Skull size={11} className="text-[#FF3B30] group-hover:text-white" />
              </button>
            ) : (
              <button
                onClick={() => toggleAppExpand(group.appName)}
                className="p-1.5 bg-[#1C1C20] text-[#8E8E93] hover:text-white border border-white/10 rounded-lg text-xs transition"
                title="Expand instances"
              >
                {isExpanded ? <ChevronDown size={12} className="text-[#34C759]" /> : <ChevronRight size={12} />}
              </button>
            )}
          </div>
        </div>

        {/* Sub-processes under this application */}
        {hasMultiple && isExpanded && (
          <div className="pl-6 pr-2 py-1 space-y-1 border-l-2 border-[#34C759]/40 ml-4 mb-1.5 bg-black/20">
            {group.processes.map((proc) => (
              <div
                key={proc.pid}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white/5 transition text-xs font-mono"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[9px] bg-white/5 text-[#8E8E93] px-1.5 py-0.2 rounded">
                    PID {proc.pid}
                  </span>
                  <span className="text-[#8E8E93] text-[11px] truncate font-sans">
                    {proc.description || proc.user || proc.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-right mr-2 shrink-0 text-[10px] text-[#8E8E93]">
                  <span className="w-12">{proc.cpu ? `${Number(proc.cpu.toFixed(2))}%` : '0.00%'}</span>
                  <span className="w-10">{proc.memoryMb}M</span>
                </div>

                <button
                  onClick={() => requestKillProcess(proc.pid, `${proc.name} (PID ${proc.pid})`)}
                  className="p-1 rounded bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white transition active:scale-95 shrink-0"
                  title={`End instance PID ${proc.pid}`}
                >
                  <Skull size={10} />
                </button>
              </div>
            ))}
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
        className="w-full flex items-center justify-between py-1.5 px-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-left transition my-1 select-none"
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          {isCollapsed ? <ChevronRight size={13} className="text-[#8E8E93]" /> : <ChevronDown size={13} className="text-[#8E8E93]" />}
          <div className="flex items-center gap-1 text-[#8E8E93]">
            {icon}
            <span className="text-white text-[11px]">{title}</span>
          </div>
          <span className="text-[9px] font-mono font-normal text-[#8E8E93] bg-white/5 px-1.5 py-0.2 rounded-full">
            {count}
          </span>
        </div>
      </button>
    );
  };

  if (!isOpen || !currentDevice) {
    return null;
  }

  return (
    <>
      <div 
        onClick={() => {
          audio.playTap();
          closeProcessManager();
        }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fadeIn"
      />

      {processToKill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#16161D] border border-[#FF3B30]/40 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-center animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-[#FF3B30]/20 border border-[#FF3B30]/40 text-[#FF3B30] flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">End Task?</h3>
              <p className="text-xs text-[#8E8E93] mt-1.5 leading-relaxed">
                Are you sure you want to forcibly terminate <span className="text-white font-mono font-bold">{processToKill.name}</span> (PID: <span className="font-mono text-[#FF9500]">{processToKill.pid}</span>)? Unsaved work in this application may be lost.
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
                onClick={confirmKillProcess}
                className="flex-1 py-2.5 rounded-xl bg-[#FF3B30] hover:bg-[#E0352B] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF3B30]/25 active:scale-95"
              >
                <Skull size={13} />
                <span>Force Kill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        style={{
          backgroundColor: `rgba(14, 14, 18, ${leftPanelAlpha})`,
        }}
        className="fixed top-0 bottom-0 left-16 z-50 w-[420px] max-w-[calc(100vw-64px)] backdrop-blur-3xl border-r border-white/15 shadow-[20px_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between overflow-hidden animate-in slide-in-from-left duration-250 ease-out font-sans"
      >
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0A0A0C]/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => {
                audio.playTap();
                closeProcessManager();
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-white transition"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Activity size={16} className="text-[#34C759]" />
                <h2 className="text-sm font-bold text-white tracking-wide truncate">
                  Task Manager
                </h2>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/30">
                  {currentDevice.status}
                </span>
              </div>
              <p className="text-[10px] text-[#8E8E93] font-mono mt-0.5 truncate">
                {currentDevice.name} • {currentDevice.ipAddress || 'Local Bridge'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                if (processModalDeviceId) {
                  audio.playTap();
                  setIsRefreshing(true);
                  fetchDeviceProcesses(processModalDeviceId);
                  setTimeout(() => setIsRefreshing(false), 500);
                }
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-white transition"
              title="Refresh processes"
            >
              <RotateCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => {
                audio.playTap();
                closeProcessManager();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-white transition"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-2.5 bg-white/[0.02] border-b border-white/5 shrink-0">
          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className="flex items-center justify-center gap-1 text-[9px] text-[#8E8E93] uppercase font-bold">
              <Cpu size={10} className="text-[#34C759]" />
              <span>CPU Load</span>
            </div>
            <span className="text-xs font-mono font-bold text-white mt-0.5 block">
              {Number((currentDevice.cpuLoad ?? totalCpuUsed).toFixed(2))}%
            </span>
          </div>

          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className="flex items-center justify-center gap-1 text-[9px] text-[#8E8E93] uppercase font-bold">
              <HardDrive size={10} className="text-[#007AFF]" />
              <span>RAM Used</span>
            </div>
            <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">
              {currentDevice.ramUsage ? currentDevice.ramUsage.split('/')[0].trim() : `${totalRamUsed} MB`}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className="flex items-center justify-center gap-1 text-[9px] text-[#8E8E93] uppercase font-bold">
              <Layers size={10} className="text-[#FF9500]" />
              <span>Tasks</span>
            </div>
            <span className="text-xs font-mono font-bold text-white mt-0.5 block">
              {processes.length}
            </span>
          </div>
        </div>

        <div className="p-2.5 border-b border-white/10 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search apps or process instances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#16161A] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F0F0F2] placeholder-[#8E8E93] focus:outline-none focus:border-[#34C759]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5 scrollbar-none">
          {filteredProcesses.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-[#8E8E93] gap-2">
              <Activity size={24} className="opacity-40" />
              <p className="text-xs">No active processes matched.</p>
            </div>
          ) : (
            <>
              <div>
                {renderSectionHeader('Apps', groupedCategories.apps.length, 'apps', <AppWindow size={13} className="text-[#34C759]" />)}
                {!collapsedCategories.apps && (
                  <div className="space-y-1 pl-1">
                    {groupedCategories.apps.length === 0 ? (
                      <p className="py-1 text-center text-[10px] text-[#8E8E93] italic">No active applications</p>
                    ) : (
                      groupedCategories.apps.map(renderAppGroup)
                    )}
                  </div>
                )}
              </div>

              <div className="pt-1">
                {renderSectionHeader('Background Processes', groupedCategories.background.length, 'background', <Server size={13} className="text-[#007AFF]" />)}
                {!collapsedCategories.background && (
                  <div className="space-y-1 pl-1">
                    {groupedCategories.background.length === 0 ? (
                      <p className="py-1 text-center text-[10px] text-[#8E8E93] italic">No background processes</p>
                    ) : (
                      groupedCategories.background.map(renderAppGroup)
                    )}
                  </div>
                )}
              </div>

              <div className="pt-1">
                {renderSectionHeader('System Processes', groupedCategories.system.length, 'system', <Shield size={13} className="text-[#FF9500]" />)}
                {!collapsedCategories.system && (
                  <div className="space-y-1 pl-1">
                    {groupedCategories.system.length === 0 ? (
                      <p className="py-1 text-center text-[10px] text-[#8E8E93] italic">No system processes</p>
                    ) : (
                      groupedCategories.system.map(renderAppGroup)
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {commandFeedback && (
          <div className="px-3 py-1.5 bg-[#34C759]/20 border-t border-[#34C759]/30 text-[11px] font-mono text-[#34C759] flex items-center gap-1.5 shrink-0">
            <Check size={12} />
            <span className="truncate">{commandFeedback}</span>
          </div>
        )}

        <form 
          onSubmit={handleExecuteCommand}
          className="p-2.5 bg-[#0A0A0C] border-t border-white/10 flex items-center gap-1.5 shrink-0"
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#16161A] border border-white/10 rounded-xl flex-1 text-xs">
            <Terminal size={12} className="text-[#34C759] shrink-0" />
            <input
              type="text"
              placeholder="Command (e.g. kill 8312, reboot)..."
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              className="w-full bg-transparent text-[#F0F0F2] font-mono text-[11px] placeholder-[#8E8E93] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-2.5 py-1.5 bg-[#34C759] hover:bg-[#30D158] text-[#0A0A0C] rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
          >
            <Play size={10} />
            <span>Run</span>
          </button>
        </form>
      </aside>
    </>
  );
};
