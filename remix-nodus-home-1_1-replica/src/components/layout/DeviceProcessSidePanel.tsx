import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  X, 
  RotateCcw, 
  Skull, 
  Search, 
  Cpu, 
  HardDrive, 
  Check, 
  Terminal, 
  Play, 
  Flame 
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

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

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'user' | 'daemon' | 'system'>('all');
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'pid' | 'name'>('cpu');
  const [customCommand, setCustomCommand] = useState('');
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  const isOpen = Boolean(processModalDeviceId);
  const currentDevice = devices.find((d) => d.id === processModalDeviceId);
  const processes = processModalDeviceId ? (deviceProcesses[processModalDeviceId] || []) : [];

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
      <div 
        onClick={closeProcessManager}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-in fade-in duration-200"
      />

      <aside
        className={`fixed top-0 bottom-0 left-16 sm:left-20 w-[380px] sm:w-[420px] md:w-[460px] h-full ${currentTheme.classes.modalContainer} border-r shadow-[20px_0_50px_rgba(0,0,0,0.95)] flex flex-col z-50 shrink-0 select-none animate-in slide-in-from-left duration-250 ease-out ${currentTheme.classes.containerFont} ${currentTheme.classes.textPrimary} backdrop-blur-3xl transition-colors duration-200`}
        style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'panel') }}
      >
      {/* Side Panel Header */}
      <div className={`p-3.5 sm:p-4 ${currentTheme.classes.modalHeader} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-2 ${currentTheme.buttonRadius} border shrink-0`}
            style={{ backgroundColor: currentAccent.badgeBg, color: currentAccent.hex, borderColor: currentAccent.badgeBorder }}
          >
            <Activity size={16} className="animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold truncate font-mono uppercase tracking-wider">
                {currentDevice.name}
              </h3>
              <span className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 ${currentTheme.buttonRadius} border shrink-0 ${
                currentDevice.isRebooting 
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 animate-pulse'
                  : 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40'
              }`}>
                {currentDevice.isRebooting ? 'Rebooting' : currentDevice.status}
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-1.5 truncate">
              <span className="truncate">{currentDevice.os}</span>
              <span>•</span>
              <span style={{ color: currentAccent.hex }}>{currentDevice.ipAddress}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => rebootDevice(currentDevice.id)}
            disabled={currentDevice.isRebooting}
            className={`px-2 py-1 ${currentTheme.buttonRadius} text-[10px] font-mono font-bold flex items-center gap-1 border transition ${
              currentDevice.isRebooting
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 cursor-not-allowed'
                : 'bg-white/[0.04] hover:bg-[#F59E0B]/20 text-[#F59E0B] hover:border-[#F59E0B]/40 border-white/10'
            }`}
            title={`Reboot ${currentDevice.name}`}
          >
            <RotateCcw size={11} className={currentDevice.isRebooting ? 'animate-spin' : ''} />
            <span>{currentDevice.isRebooting ? '...' : 'Reboot'}</span>
          </button>

          <button
            onClick={closeProcessManager}
            className={`p-1.5 ${currentTheme.buttonRadius} bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F1F5F9] transition border border-white/5`}
            title="Close Processes Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Live Hardware Stats Banner */}
      <div className="grid grid-cols-3 gap-2 p-2.5 bg-black/40 border-b border-white/5 text-xs shrink-0 font-mono">
        <div className={`bg-white/[0.02] p-2 ${currentTheme.buttonRadius} border border-white/5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider">
              <Cpu size={10} className="text-[#10B981]" /> CPU
            </span>
            <span className="font-bold text-[#F1F5F9] text-[11px]">{currentDevice.cpuLoad ?? totalCpuUsed}%</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                (currentDevice.cpuLoad ?? totalCpuUsed) > 70 
                  ? 'bg-[#F43F5E]' 
                  : (currentDevice.cpuLoad ?? totalCpuUsed) > 40 
                  ? 'bg-[#F59E0B]' 
                  : 'bg-[#10B981]'
              }`}
              style={{ width: `${Math.min(100, currentDevice.cpuLoad ?? totalCpuUsed)}%` }}
            />
          </div>
        </div>

        <div className={`bg-white/[0.02] p-2 ${currentTheme.buttonRadius} border border-white/5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-[#94A3B8] mb-1">
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider">
              <HardDrive size={10} style={{ color: currentAccent.hex }} /> RAM
            </span>
            <span className="font-bold text-[#F1F5F9] text-[11px] truncate">{currentDevice.ramUsage || `${(totalRamUsedMb / 1024).toFixed(1)} GB`}</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300"
              style={{ width: '48%', backgroundColor: currentAccent.hex }}
            />
          </div>
        </div>

        <div className={`bg-white/[0.02] p-1.5 ${currentTheme.buttonRadius} border border-white/5 flex flex-col justify-between`}>
          <button
            onClick={() => killAllUserProcesses(currentDevice.id)}
            disabled={userProcessesCount === 0 || currentDevice.isRebooting}
            className={`w-full h-full py-1 bg-[#F43F5E]/15 hover:bg-[#F43F5E] text-[#F43F5E] hover:text-[#090B10] border border-[#F43F5E]/30 ${currentTheme.buttonRadius} text-[9px] font-bold uppercase transition flex items-center justify-center gap-1 disabled:opacity-30`}
            title="Kill all non-system background tasks"
          >
            <Flame size={10} />
            <span>Kill ({userProcessesCount})</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-2.5 bg-black/20 border-b border-white/5 flex flex-col gap-2 shrink-0">
        <div className="relative w-full">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search active PIDs or service names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${currentTheme.classes.inputField} pl-7 pr-3 py-1 text-xs`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F1F5F9]"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-1.5 text-xs font-mono">
          <div className="flex items-center bg-white/[0.03] p-0.5 rounded-lg border border-white/5 overflow-x-auto scrollbar-none">
            {(['all', 'user', 'daemon', 'system'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 ${currentTheme.buttonRadius} font-medium transition text-[10px] capitalize`}
                style={
                  selectedCategory === cat
                    ? { backgroundColor: currentAccent.hex, color: '#090B10', fontWeight: 'bold' }
                    : { color: '#94A3B8' }
                }
              >
                {cat === 'all' ? `All (${processes.length})` : cat === 'daemon' ? 'Daemons' : cat}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`bg-white/[0.03] border border-white/10 ${currentTheme.buttonRadius} px-2 py-0.5 text-[10px] text-[#94A3B8] focus:outline-none focus:text-[#F1F5F9] shrink-0`}
          >
            <option value="cpu">Sort: CPU</option>
            <option value="memory">Sort: RAM</option>
            <option value="pid">Sort: PID</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {/* Process List (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin font-mono text-xs">
        {sortedProcesses.length === 0 ? (
          <div className="py-12 text-center text-[#94A3B8] font-sans">
            <Activity size={24} className="mx-auto mb-2 opacity-30" style={{ color: currentAccent.hex }} />
            <p className="text-xs font-semibold">No active processes matched criteria</p>
          </div>
        ) : (
          sortedProcesses.map((proc) => {
            const isHighCpu = proc.cpu > 5.0;

            return (
              <div
                key={proc.pid}
                className={`flex items-center justify-between p-2 ${currentTheme.cardRadius} bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/15 transition group`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`w-10 text-center px-1 py-0.5 ${currentTheme.buttonRadius} bg-[#090B10] text-[#94A3B8] text-[9px] font-bold border border-white/5 shrink-0`}>
                    {proc.pid}
                  </span>

                  <div className="min-w-0 font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#F1F5F9] text-xs truncate max-w-[130px]">
                        {proc.name}
                      </span>
                      <span
                        className={`text-[8px] font-mono font-semibold px-1 py-0.2 ${currentTheme.buttonRadius}`}
                        style={
                          proc.category === 'user'
                            ? { backgroundColor: currentAccent.badgeBg, color: currentAccent.hex }
                            : proc.category === 'system'
                            ? { backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }
                            : { backgroundColor: 'rgba(255,255,255,0.1)', color: '#94A3B8' }
                        }
                      >
                        {proc.category}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#94A3B8] truncate max-w-[150px] font-mono">
                      {proc.description || `User: ${proc.user}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-right mr-2 shrink-0 font-mono">
                  <div className="w-10">
                    <span className={`font-bold text-[10px] ${isHighCpu ? 'text-[#F43F5E]' : 'text-[#10B981]'}`}>
                      {proc.cpu.toFixed(1)}%
                    </span>
                    <span className="text-[7px] text-[#64748B] block uppercase">CPU</span>
                  </div>

                  <div className="w-11">
                    <span className="font-bold text-[#F1F5F9] text-[10px]">
                      {proc.memoryMb}M
                    </span>
                    <span className="text-[7px] text-[#64748B] block uppercase">RAM</span>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => killProcess(currentDevice.id, proc.pid)}
                    disabled={currentDevice.isRebooting}
                    className={`p-1.5 bg-white/[0.04] hover:bg-[#F43F5E] text-[#94A3B8] hover:text-[#090B10] border border-white/10 hover:border-[#F43F5E] ${currentTheme.buttonRadius} text-xs transition flex items-center`}
                    title={`Kill ${proc.name} (PID ${proc.pid})`}
                  >
                    <Skull size={11} className="text-[#F43F5E] hover:text-[#090B10]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Command Feedback Toast */}
      {commandFeedback && (
        <div className="px-3 py-1.5 bg-[#10B981]/15 border-t border-[#10B981]/30 text-[10px] font-mono text-[#10B981] flex items-center gap-1.5 shrink-0">
          <Check size={11} />
          <span className="truncate">{commandFeedback}</span>
        </div>
      )}

      {/* Bottom Interactive Terminal Bar */}
      <form 
        onSubmit={handleExecuteCommand}
        className={`p-2 bg-black/40 border-t border-white/10 flex items-center gap-1.5 shrink-0 font-mono`}
      >
        <div className={`flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] border border-white/10 ${currentTheme.buttonRadius} flex-1 text-xs`}>
          <Terminal size={12} style={{ color: currentAccent.hex }} className="shrink-0" />
          <input
            type="text"
            placeholder="Command (e.g. kill 8312, reboot)..."
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            className="w-full bg-transparent text-[#F1F5F9] font-mono text-[10px] placeholder-[#64748B] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className={`px-2.5 py-1 ${currentTheme.buttonRadius} text-xs font-bold transition flex items-center gap-1 shrink-0`}
          style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
        >
          <Play size={10} />
          <span>Exec</span>
        </button>
      </form>
    </aside>
    </>
  );
};
