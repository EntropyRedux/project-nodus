import React, { useState } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  ShieldAlert, 
  Check, 
  Skull, 
  Layers, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Server,
  Play,
  RotateCcw
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DeviceProcess } from '../../types/launcher';
import { audio } from '../../utils/audio';

export const ProcessMonitorApp: React.FC = () => {
  const { 
    devices, 
    activeDeviceId, 
    selectDevice, 
    deviceProcesses, 
    killProcess, 
    killAllUserProcesses, 
    rebootDevice,
    addNotification 
  } = useLauncher();

  const [selectedNodeId, setSelectedNodeId] = useState<string>(activeDeviceId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'user' | 'system' | 'service' | 'daemon'>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const targetDevice = devices.find((d) => d.id === selectedNodeId) || devices[0];
  const procs = deviceProcesses[selectedNodeId] || [];

  const filteredProcs = procs.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.pid.toString().includes(searchQuery) ||
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalMemMb = procs.reduce((sum, p) => sum + p.memoryMb, 0);
  const totalCpuLoad = procs.reduce((sum, p) => sum + p.cpu, 0).toFixed(1);

  const handleKill = (p: DeviceProcess) => {
    audio.playTap();
    killProcess(selectedNodeId, p.pid);
    setStatusMessage(`Terminated PID ${p.pid} (${p.name})`);
    setTimeout(() => setStatusMessage(null), 3000);
    addNotification({
      appId: 'monitor',
      appName: 'Process Monitor',
      title: 'Process Terminated',
      message: `Sent SIGKILL to ${p.name} (PID ${p.pid}) on ${targetDevice.name}`,
      iconName: 'Activity',
      color: '#FF3B30',
    });
  };

  const handleKillAllUser = () => {
    audio.playTap();
    killAllUserProcesses(selectedNodeId);
    setStatusMessage(`Terminated all user processes on ${targetDevice.name}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleReboot = () => {
    audio.playTap();
    rebootDevice(selectedNodeId);
    setStatusMessage(`Initiated system reboot on ${targetDevice.name}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0A0C] text-[#F0F0F2] select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="px-5 py-3 border-b border-white/5 bg-[#121214] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#34C759] to-[#007AFF] flex items-center justify-center text-white shadow-lg shadow-[#34C759]/20">
            <Activity size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Cluster Process & Resource Monitor</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#34C759]/15 text-[#34C759] font-mono font-bold border border-[#34C759]/30">
                LIVE IPC
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93]">
              Real-time task manager, memory allocation, and SIGKILL dispatcher across connected cluster nodes
            </p>
          </div>
        </div>

        {/* Global Node Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleKillAllUser}
            className="px-3 py-1.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30]/25 text-[#FF3B30] border border-[#FF3B30]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Skull size={13} /> Kill User Tasks
          </button>
          <button
            onClick={handleReboot}
            className="px-3 py-1.5 bg-[#FF9500]/15 hover:bg-[#FF9500]/25 text-[#FF9500] border border-[#FF9500]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RotateCcw size={13} /> Reboot Node
          </button>
        </div>
      </div>

      {/* Node Selector Tabs & Resource Gauges */}
      <div className="px-5 py-3 border-b border-white/5 bg-[#0E0E10] flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Device Switcher */}
        <div className="flex items-center bg-[#1C1C1E] p-1 rounded-xl border border-white/5 text-xs font-semibold gap-1">
          {devices.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                audio.playTap();
                setSelectedNodeId(d.id);
                selectDevice(d.id);
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                selectedNodeId === d.id
                  ? 'bg-[#34C759] text-black font-bold shadow'
                  : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              {d.type === 'desktop' ? <Laptop size={13} /> : <Tablet size={13} />}
              {d.name}
            </button>
          ))}
        </div>

        {/* Resource Telemetry Summary */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-[#1C1C1E] px-3 py-1.5 rounded-xl border border-white/5">
            <Cpu size={14} className="text-[#34C759]" />
            <span className="text-[#8E8E93]">CPU Load:</span>
            <span className="text-white font-bold">{totalCpuLoad}%</span>
          </div>
          <div className="flex items-center gap-2 bg-[#1C1C1E] px-3 py-1.5 rounded-xl border border-white/5">
            <HardDrive size={14} className="text-[#007AFF]" />
            <span className="text-[#8E8E93]">Allocated RAM:</span>
            <span className="text-white font-bold">{totalMemMb} MB</span>
          </div>
          <div className="flex items-center gap-2 bg-[#1C1C1E] px-3 py-1.5 rounded-xl border border-white/5">
            <Layers size={14} className="text-[#BF5AF2]" />
            <span className="text-[#8E8E93]">Active Tasks:</span>
            <span className="text-white font-bold">{filteredProcs.length}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-5 py-2.5 bg-[#121214] border-b border-white/5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          {(['all', 'user', 'service', 'daemon', 'system'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                categoryFilter === cat
                  ? 'bg-white/15 text-white font-bold'
                  : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Filter processes or PID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1C1C1E] border border-white/5 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#8E8E93] focus:outline-none focus:border-[#34C759]"
          />
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="bg-[#34C759]/20 text-[#34C759] px-5 py-1.5 text-xs font-mono font-bold flex items-center gap-2 border-b border-[#34C759]/30 shrink-0 animate-fade-in">
          <Check size={14} /> {statusMessage}
        </div>
      )}

      {/* Process Table View */}
      <div className="flex-1 overflow-y-auto p-4 select-text">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[#8E8E93] text-[11px] select-none">
              <th className="py-2 px-3 font-semibold">PID</th>
              <th className="py-2 px-3 font-semibold">PROCESS NAME</th>
              <th className="py-2 px-3 font-semibold">USER</th>
              <th className="py-2 px-3 font-semibold">CATEGORY</th>
              <th className="py-2 px-3 font-semibold">CPU %</th>
              <th className="py-2 px-3 font-semibold">WORKING SET (RAM)</th>
              <th className="py-2 px-3 font-semibold">STATUS</th>
              <th className="py-2 px-3 font-semibold text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredProcs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#8E8E93]">
                  No matching processes found for node {targetDevice.name}.
                </td>
              </tr>
            ) : (
              filteredProcs.map((p) => (
                <tr key={p.pid} className="hover:bg-white/5 transition-colors group">
                  <td className="py-2.5 px-3 text-[#8E8E93]">{p.pid}</td>
                  <td className="py-2.5 px-3 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      {p.description && (
                        <span className="text-[10px] text-[#8E8E93] font-normal hidden lg:inline">
                          ({p.description})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{p.user}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      p.category === 'user' ? 'bg-[#007AFF]/20 text-[#007AFF]' :
                      p.category === 'system' ? 'bg-[#FF9500]/20 text-[#FF9500]' :
                      p.category === 'service' ? 'bg-[#BF5AF2]/20 text-[#BF5AF2]' :
                      'bg-white/10 text-[#8E8E93]'
                    }`}>
                      {p.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#34C759] font-bold">{p.cpu.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-white">{p.memoryMb} MB</td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#34C759]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleKill(p)}
                      className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 opacity-80 group-hover:opacity-100"
                      title="Send SIGKILL"
                    >
                      <Trash2 size={12} /> Kill
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
