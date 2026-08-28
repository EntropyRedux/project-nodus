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
  Server
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

export const DeviceProcessSidePanel: React.FC = () => {
  const { 
    devices, 
    deviceProcesses, 
    processModalDeviceId, 
    closeProcessManager, 
    killProcess, 
    killAllUserProcesses, 
    rebootDevice,
    settings 
  } = useLauncher();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'user' | 'daemon' | 'system'>('all');
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'pid' | 'name'>('cpu');
  const [customCommand, setCustomCommand] = useState('');
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const leftPanelAlpha = (settings.leftPanelOpacity ?? 85) / 100;

  const isOpen = Boolean(processModalDeviceId);
  const currentDevice = devices.find((d) => d.id === processModalDeviceId);
  const processes = processModalDeviceId ? (deviceProcesses[processModalDeviceId] || []) : [];

  // Filter processes (memoized)
  const filteredProcesses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return processes.filter((proc) => {
      const matchesSearch =
        !q ||
        proc.name.toLowerCase().includes(q) ||
        proc.pid.toString().includes(q) ||
        (proc.description && proc.description.toLowerCase().includes(q)) ||
        proc.user.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'daemon'
          ? proc.category === 'daemon' || proc.category === 'service'
          : proc.category === selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [processes, searchQuery, selectedCategory]);

  // Sort processes (memoized)
  const sortedProcesses = useMemo(() => {
    return [...filteredProcesses].sort((a, b) => {
      if (sortBy === 'cpu') return b.cpu - a.cpu;
      if (sortBy === 'memory') return b.memoryMb - a.memoryMb;
      if (sortBy === 'pid') return a.pid - b.pid;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [filteredProcesses, sortBy]);

  const totalRamUsedMb = useMemo(
    () => processes.reduce((acc, p) => acc + p.memoryMb, 0),
    [processes]
  );
  const totalCpuUsed = useMemo(
    () => Math.min(100, Math.round(processes.reduce((acc, p) => acc + p.cpu, 0))),
    [processes]
  );
  const userProcessesCount = useMemo(
    () => processes.filter((p) => p.category === 'user').length,
    [processes]
  );

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
        killProcess(currentDevice.id, pidNum);
        setCommandFeedback(`Signal SIGKILL sent to PID ${pidNum}`);
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

  if (!isOpen || !currentDevice) {
    return null;
  }

  return (
    <>
      {/* Dimmed Interactive Backdrop Overlay */}
      <div 
        onClick={closeProcessManager}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-in fade-in duration-200"
      />

      <aside
        className="fixed top-0 bottom-0 left-16 sm:left-20 w-[380px] sm:w-[420px] md:w-[460px] h-full backdrop-blur-3xl border-r border-white/15 shadow-[15px_0_40px_rgba(0,0,0,0.8)] flex flex-col z-50 shrink-0 select-none animate-in slide-in-from-left duration-250 ease-out"
        style={{
          backgroundColor: `rgba(13, 13, 16, ${leftPanelAlpha})`,
        }}
      >
      {/* Side Panel Header */}
      <div className="p-3.5 sm:p-4 border-b border-white/10 bg-[#16161A]/95 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/30 shrink-0">
            <Activity size={18} className="animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#F0F0F2] truncate">
                {currentDevice.name}
              </h3>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${
                currentDevice.isRebooting 
                  ? 'bg-[#FF9500]/20 text-[#FF9500] border-[#FF9500]/40 animate-pulse'
                  : 'bg-[#34C759]/20 text-[#34C759] border-[#34C759]/40'
              }`}>
                {currentDevice.isRebooting ? 'Rebooting' : currentDevice.status}
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93] flex items-center gap-1.5 truncate">
              <span className="truncate">{currentDevice.os}</span>
              <span>•</span>
              <span className="font-mono text-[#007AFF]">{currentDevice.ipAddress}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Reboot Button */}
          <button
            onClick={() => rebootDevice(currentDevice.id)}
            disabled={currentDevice.isRebooting}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 border transition ${
              currentDevice.isRebooting
                ? 'bg-[#FF9500]/20 text-[#FF9500] border-[#FF9500]/40 cursor-not-allowed'
                : 'bg-[#1C1C20] hover:bg-[#FF9500]/20 text-[#FF9500] hover:border-[#FF9500]/40 border-white/10'
            }`}
            title={`Reboot ${currentDevice.name}`}
          >
            <RotateCcw size={12} className={currentDevice.isRebooting ? 'animate-spin' : ''} />
            <span>{currentDevice.isRebooting ? '...' : 'Reboot'}</span>
          </button>

          {/* Close Panel Button */}
          <button
            onClick={closeProcessManager}
            className="p-1.5 rounded-xl bg-[#1C1C20] hover:bg-[#2C2C32] text-[#8E8E93] hover:text-[#F0F0F2] transition border border-white/5"
            title="Close Processes Panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Live Hardware Stats Banner */}
      <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#121216] border-b border-white/5 text-xs shrink-0">
        {/* CPU Metric */}
        <div className="bg-[#0A0A0C] p-2 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8E8E93] mb-1">
            <span className="flex items-center gap-1 text-[10px]">
              <Cpu size={11} className="text-[#34C759]" /> CPU
            </span>
            <span className="font-mono font-bold text-[#F0F0F2] text-[11px]">{currentDevice.cpuLoad ?? totalCpuUsed}%</span>
          </div>
          <div className="w-full bg-[#1C1C20] h-1 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                (currentDevice.cpuLoad ?? totalCpuUsed) > 70 
                  ? 'bg-[#FF3B30]' 
                  : (currentDevice.cpuLoad ?? totalCpuUsed) > 40 
                  ? 'bg-[#FF9500]' 
                  : 'bg-[#34C759]'
              }`}
              style={{ width: `${Math.min(100, currentDevice.cpuLoad ?? totalCpuUsed)}%` }}
            />
          </div>
        </div>

        {/* RAM Metric */}
        <div className="bg-[#0A0A0C] p-2 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8E8E93] mb-1">
            <span className="flex items-center gap-1 text-[10px]">
              <HardDrive size={11} className="text-[#007AFF]" /> RAM
            </span>
            <span className="font-mono font-bold text-[#F0F0F2] text-[11px] truncate">{currentDevice.ramUsage || `${(totalRamUsedMb / 1024).toFixed(1)} GB`}</span>
          </div>
          <div className="w-full bg-[#1C1C20] h-1 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#007AFF] transition-all duration-300"
              style={{ width: '48%' }}
            />
          </div>
        </div>

        {/* Kill User Tasks Quick Action */}
        <div className="bg-[#0A0A0C] p-1.5 rounded-xl border border-white/5 flex flex-col justify-between">
          <button
            onClick={() => killAllUserProcesses(currentDevice.id)}
            disabled={userProcessesCount === 0 || currentDevice.isRebooting}
            className="w-full h-full py-1 bg-[#FF3B30]/20 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white border border-[#FF3B30]/30 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 disabled:opacity-30"
            title="Kill all non-system background tasks"
          >
            <Flame size={11} />
            <span>Kill All ({userProcessesCount})</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-2.5 bg-[#101013] border-b border-white/5 flex flex-col gap-2 shrink-0">
        {/* Search bar */}
        <div className="relative w-full">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Search processes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1C1C20] border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-xs text-[#F0F0F2] placeholder-[#8E8E93] focus:outline-none focus:border-[#34C759]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#F0F0F2]"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Category Tabs & Sort */}
        <div className="flex items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center bg-[#1C1C20] p-0.5 rounded-xl border border-white/5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-0.5 rounded-lg font-medium transition text-[10px] ${
                selectedCategory === 'all' ? 'bg-[#34C759] text-[#0A0A0C] font-bold' : 'text-[#8E8E93] hover:text-[#F0F0F2]'
              }`}
            >
              All ({processes.length})
            </button>
            <button
              onClick={() => setSelectedCategory('user')}
              className={`px-2 py-0.5 rounded-lg font-medium transition text-[10px] ${
                selectedCategory === 'user' ? 'bg-[#34C759] text-[#0A0A0C] font-bold' : 'text-[#8E8E93] hover:text-[#F0F0F2]'
              }`}
            >
              User
            </button>
            <button
              onClick={() => setSelectedCategory('daemon')}
              className={`px-2 py-0.5 rounded-lg font-medium transition text-[10px] ${
                selectedCategory === 'daemon' ? 'bg-[#34C759] text-[#0A0A0C] font-bold' : 'text-[#8E8E93] hover:text-[#F0F0F2]'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setSelectedCategory('system')}
              className={`px-2 py-0.5 rounded-lg font-medium transition text-[10px] ${
                selectedCategory === 'system' ? 'bg-[#34C759] text-[#0A0A0C] font-bold' : 'text-[#8E8E93] hover:text-[#F0F0F2]'
              }`}
            >
              System
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#1C1C20] border border-white/10 rounded-xl px-2 py-1 text-[10px] text-[#8E8E93] focus:outline-none focus:text-[#F0F0F2] shrink-0"
          >
            <option value="cpu">Sort: CPU</option>
            <option value="memory">Sort: RAM</option>
            <option value="pid">Sort: PID</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {/* Process List (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-none font-mono text-xs">
        {sortedProcesses.length === 0 ? (
          <div className="py-12 text-center text-[#8E8E93] font-sans">
            <Activity size={28} className="mx-auto mb-2 opacity-30 text-[#34C759]" />
            <p className="text-xs font-semibold">No active processes matched criteria</p>
          </div>
        ) : (
          sortedProcesses.map((proc) => {
            const isHighCpu = proc.cpu > 5.0;

            return (
              <div
                key={proc.pid}
                className="flex items-center justify-between p-2 rounded-xl bg-[#141418]/80 hover:bg-[#1C1C22] border border-white/5 hover:border-white/10 transition group"
              >
                {/* Left: PID, Process Name, Category */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-11 text-center px-1 py-0.5 rounded-md bg-[#0A0A0C] text-[#8E8E93] text-[9px] font-bold border border-white/5 shrink-0">
                    {proc.pid}
                  </span>

                  <div className="min-w-0 font-sans">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[#F0F0F2] text-xs truncate max-w-[130px]">
                        {proc.name}
                      </span>
                      <span className={`text-[8px] font-semibold px-1 py-0.2 rounded ${
                        proc.category === 'user'
                          ? 'bg-[#007AFF]/15 text-[#007AFF]'
                          : proc.category === 'system'
                          ? 'bg-[#FF9500]/15 text-[#FF9500]'
                          : 'bg-white/10 text-[#8E8E93]'
                      }`}>
                        {proc.category}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#8E8E93] truncate max-w-[150px]">
                      {proc.description || `User: ${proc.user}`}
                    </p>
                  </div>
                </div>

                {/* Middle: CPU % & Memory MB */}
                <div className="flex items-center gap-2 text-right mr-2 shrink-0">
                  <div className="w-11">
                    <span className={`font-bold text-[11px] ${isHighCpu ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>
                      {proc.cpu.toFixed(1)}%
                    </span>
                    <span className="text-[7px] text-[#8E8E93] block uppercase">CPU</span>
                  </div>

                  <div className="w-12">
                    <span className="font-bold text-[#F0F0F2] text-[11px]">
                      {proc.memoryMb}M
                    </span>
                    <span className="text-[7px] text-[#8E8E93] block uppercase">RAM</span>
                  </div>
                </div>

                {/* Right: Kill Process Action */}
                <div className="shrink-0">
                  <button
                    onClick={() => killProcess(currentDevice.id, proc.pid)}
                    disabled={currentDevice.isRebooting}
                    className="p-1.5 bg-[#1C1C20] hover:bg-[#FF3B30] text-[#8E8E93] hover:text-white border border-white/10 hover:border-[#FF3B30] rounded-lg text-xs font-sans font-semibold transition flex items-center gap-1 group-hover:border-[#FF3B30]/40"
                    title={`Kill ${proc.name} (PID ${proc.pid})`}
                  >
                    <Skull size={11} className="text-[#FF3B30] group-hover:text-white" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Command Feedback Toast */}
      {commandFeedback && (
        <div className="px-3 py-1.5 bg-[#34C759]/20 border-t border-[#34C759]/30 text-[11px] font-mono text-[#34C759] flex items-center gap-1.5 shrink-0">
          <Check size={12} />
          <span className="truncate">{commandFeedback}</span>
        </div>
      )}

      {/* Bottom Interactive Terminal Bar */}
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
