import React, { useState } from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { 
  Activity, 
  RotateCcw, 
  Trash2, 
  Search, 
  ShieldAlert, 
  Cpu, 
  HardDrive,
  CheckCircle2
} from 'lucide-react';

export const ProcessManagerPanel: React.FC = () => {
  const { processes, refreshProcesses, killProcess, systemStats } = useDesktop();
  const [filterQuery, setFilterQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [terminatedPid, setTerminatedPid] = useState<number | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProcesses();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleKill = async (pid: number) => {
    const success = await killProcess(pid);
    if (success) {
      setTerminatedPid(pid);
      setTimeout(() => setTerminatedPid(null), 2000);
    }
  };

  const filteredProcesses = processes.filter((proc) =>
    proc.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    proc.pid.toString().includes(filterQuery)
  );

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-hidden">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity size={20} className="text-[#FF9500]" />
            <span>Win32 Native Process Manager</span>
          </h2>
          <p className="text-xs text-[#8E8E93]">
            Direct toolhelp32 process snapshot inspection & termination.
          </p>
        </div>

        {/* Quick Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-3 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search process name or PID..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-[#181822] border border-white/10 text-xs text-white outline-none focus:border-[#FF9500] w-64"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 rounded-xl bg-[#FF9500] hover:bg-[#E08500] text-black text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#FF9500]/20 transition active:scale-95"
          >
            <RotateCcw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* System Gauges Strip */}
      {systemStats && (
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-[#121218] border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#34C759]/20 text-[#34C759] flex items-center justify-center">
              <Cpu size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8E8E93]">CPU Active Load</span>
              <p className="text-sm font-mono font-bold text-white">{systemStats.cpu_load_percent}%</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#121218] border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#007AFF]/20 text-[#007AFF] flex items-center justify-center">
              <HardDrive size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8E8E93]">Physical RAM Usage</span>
              <p className="text-sm font-mono font-bold text-white">
                {Math.round((systemStats.ram_used_mb / 1024) * 10) / 10} / {Math.round((systemStats.ram_total_mb / 1024) * 10) / 10} GB
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#121218] border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#BF5AF2]/20 text-[#BF5AF2] flex items-center justify-center">
              <Activity size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8E8E93]">Active Win32 Tasks</span>
              <p className="text-sm font-mono font-bold text-white">{processes.length} Processes</p>
            </div>
          </div>
        </div>
      )}

      {/* Process Table List */}
      <div className="flex-1 bg-[#121218] border border-white/10 rounded-3xl p-4 flex flex-col overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 text-[11px] font-bold text-[#8E8E93] uppercase pb-2.5 border-b border-white/10 px-3 shrink-0">
          <span className="col-span-3">Process ID (PID)</span>
          <span className="col-span-6">Executable Name</span>
          <span className="col-span-3 text-right">Action</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5 pr-1">
          {filteredProcesses.map((proc) => (
            <div
              key={proc.pid}
              className="grid grid-cols-12 items-center py-2 px-3 hover:bg-white/5 rounded-xl transition text-xs"
            >
              <span className="col-span-3 font-mono text-[#8E8E93]">PID {proc.pid}</span>
              <span className="col-span-6 font-semibold text-white truncate">{proc.name}</span>
              <div className="col-span-3 flex justify-end">
                <button
                  onClick={() => handleKill(proc.pid)}
                  className="px-2.5 py-1 rounded-lg bg-[#FF3B30]/15 hover:bg-[#FF3B30]/30 text-[#FF3B30] font-bold text-[11px] flex items-center gap-1 border border-[#FF3B30]/30 transition active:scale-95"
                >
                  <Trash2 size={11} />
                  <span>End Task</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
