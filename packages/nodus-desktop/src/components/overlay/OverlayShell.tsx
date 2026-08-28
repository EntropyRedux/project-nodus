import React, { useState, useEffect } from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { FleetPanel } from '../panels/FleetPanel';
import { ClipboardPanel } from '../panels/ClipboardPanel';
import { 
  Layers, 
  Clipboard, 
  Terminal, 
  Activity, 
  Cpu, 
  Lock, 
  Wifi, 
  Radio, 
  ShieldCheck, 
  Zap, 
  RotateCcw,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
  Check,
  Trash2,
  Code,
  Gamepad2,
  Camera,
  Play
} from 'lucide-react';

export const OverlayShell: React.FC = () => {
  const { 
    activePanel, 
    setActivePanel, 
    devices, 
    activeDeviceId, 
    selectDevice, 
    activeDevice, 
    clipboardItems, 
    remoteExecutables, 
    executeShortcut, 
    lockWorkstation, 
    systemStats,
    processes,
    refreshProcesses,
    killProcess
  } = useDesktop();

  const [activeTab, setActiveTab] = useState<'fleet' | 'clipboard' | 'shortcuts' | 'processes'>('fleet');
  const [filterQuery, setFilterQuery] = useState('');

  // Sync activeTab when activePanel changes from tray or hotcorners
  useEffect(() => {
    if (activePanel === 'fleet') setActiveTab('fleet');
    if (activePanel === 'clipboard') setActiveTab('clipboard');
    if (activePanel === 'taskbar') setActiveTab('shortcuts');
  }, [activePanel]);

  const getShortcutIcon = (name: string) => {
    switch (name) {
      case 'Code': return <Code size={16} />;
      case 'Terminal': return <Terminal size={16} />;
      case 'Gamepad2': return <Gamepad2 size={16} />;
      case 'Camera': return <Camera size={16} />;
      default: return <Play size={16} />;
    }
  };

  const filteredProcesses = processes.filter((p) =>
    p.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="w-screen h-screen bg-[#0A0A0E] text-[#F0F0F2] flex flex-col overflow-hidden select-none font-sans">
      {/* ─── Top Header Navigation ───────────────────────────────── */}
      <header className="h-14 bg-[#121218] border-b border-white/10 px-4 flex items-center justify-between shrink-0">
        {/* Left: Branding & Host Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007AFF] via-[#34C759] to-[#BF5AF2] p-[1px] flex items-center justify-center shadow-md">
            <div className="w-full h-full bg-[#0E0E14] rounded-[11px] flex items-center justify-center">
              <Layers size={16} className="text-[#34C759]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-white tracking-wide">Nodus Companion Hub</h1>
              <span className="px-1.5 py-0.5 rounded-full bg-[#34C759]/20 text-[#34C759] text-[10px] font-bold border border-[#34C759]/30">
                v2.0 Native
              </span>
            </div>
            <p className="text-[10.5px] text-[#8E8E93] font-mono">
              Workstation PC • 127.0.0.1:9120
            </p>
          </div>
        </div>

        {/* Center: Main Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#181822] p-1 rounded-2xl border border-white/10 shadow-inner">
          <button
            onClick={() => {
              setActiveTab('fleet');
              setActivePanel('fleet');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'fleet'
                ? 'bg-[#34C759] text-[#0A0A0C] shadow-md shadow-[#34C759]/25'
                : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio size={13} />
            <span>Fleet Mesh ({devices.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('clipboard');
              setActivePanel('clipboard');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'clipboard'
                ? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25'
                : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
            }`}
          >
            <Clipboard size={13} />
            <span>Clipboard ({clipboardItems.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('shortcuts');
              setActivePanel('taskbar');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'shortcuts'
                ? 'bg-[#BF5AF2] text-white shadow-md shadow-[#BF5AF2]/25'
                : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap size={13} />
            <span>Remote Shortcuts</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('processes');
              refreshProcesses();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'processes'
                ? 'bg-[#FF9500] text-[#0A0A0C] shadow-md shadow-[#FF9500]/25'
                : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity size={13} />
            <span>Processes</span>
          </button>
        </nav>

        {/* Right: Live Telemetry */}
        <div className="flex items-center gap-2">
          {systemStats && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#181822] border border-white/10 text-xs font-mono">
              <span className="text-[#8E8E93]">RAM:</span>
              <span className="text-[#34C759] font-bold">
                {Math.round(systemStats.ram_used_mb / 1024 * 10) / 10} / {Math.round(systemStats.ram_total_mb / 1024 * 10) / 10} GB
              </span>
            </div>
          )}
          <button
            onClick={lockWorkstation}
            className="px-2.5 py-1.5 rounded-xl bg-[#FF9500]/15 hover:bg-[#FF9500]/25 text-[#FF9500] text-xs font-bold flex items-center gap-1 border border-[#FF9500]/30 transition"
            title="Lock Windows Workstation"
          >
            <Lock size={12} />
            <span>Lock PC</span>
          </button>
        </div>
      </header>

      {/* ─── Main Content Views ──────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {activeTab === 'fleet' && (
          <div className="flex-1 h-full flex gap-4 overflow-hidden">
            {/* Left: Device Hub Panel */}
            <div className="w-96 h-full flex shrink-0">
              <FleetPanel />
            </div>

            {/* Right: Detailed Device Overview & Remote Ops */}
            <div className="flex-1 h-full bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#34C759]/20 text-[#34C759] flex items-center justify-center text-lg">
                    {activeDevice?.type === 'tablet' ? <Tablet size={22} /> : <Monitor size={22} />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      {activeDevice?.name}
                      <span className="w-2 h-2 rounded-full bg-[#34C759] shadow-[0_0_8px_#34C759]" />
                    </h2>
                    <p className="text-xs text-[#8E8E93]">{activeDevice?.os} • {activeDevice?.ipAddress}</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-[#34C759]/20 text-[#34C759] text-xs font-bold border border-[#34C759]/40 uppercase tracking-wider">
                  {activeDevice?.status || 'Online'}
                </span>
              </div>

              {/* Specs & Telemetry Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-[#8E8E93] uppercase">Display Resolution</span>
                  <span className="text-sm font-mono font-bold text-[#F0F0F2]">{activeDevice?.resolution || '1920 × 1080'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-[#8E8E93] uppercase">CPU Load</span>
                  <span className="text-sm font-mono font-bold text-[#34C759]">{activeDevice?.cpuLoad ?? 8}%</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#181822] border border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-[#8E8E93] uppercase">RAM Usage</span>
                  <span className="text-sm font-mono font-bold text-[#007AFF]">{activeDevice?.ramUsage ?? '12.4 / 32.0 GB'}</span>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2.5">
                <h3 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">Remote Mesh Actions</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => alert(`Ping sent to ${activeDevice?.name} (${activeDevice?.ipAddress})`)}
                    className="p-3 rounded-xl bg-[#181822] hover:bg-[#222230] border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-98"
                  >
                    <Zap size={14} className="text-[#34C759]" />
                    <span>Ping Node</span>
                  </button>
                  <button
                    onClick={() => alert(`Sync requested for ${activeDevice?.name}`)}
                    className="p-3 rounded-xl bg-[#181822] hover:bg-[#222230] border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-98"
                  >
                    <Radio size={14} className="text-[#007AFF]" />
                    <span>Sync State</span>
                  </button>
                  <button
                    onClick={lockWorkstation}
                    className="p-3 rounded-xl bg-[#181822] hover:bg-[#222230] border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 text-[#FF9500] transition active:scale-98"
                  >
                    <Lock size={14} />
                    <span>Lock Display</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clipboard' && (
          <div className="flex-1 h-full flex justify-center overflow-hidden">
            <div className="w-full max-w-4xl h-full flex">
              <ClipboardPanel />
            </div>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="flex-1 h-full bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 overflow-y-auto shadow-2xl">
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Remote Shortcuts & Cross-Device Triggers</h2>
                <p className="text-xs text-[#8E8E93]">Execute apps and commands across active nodes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {remoteExecutables.map((item) => (
                <div
                  key={item.id}
                  onClick={() => executeShortcut(item)}
                  className="p-3.5 rounded-2xl bg-[#181822] hover:bg-[#222230] border border-white/10 hover:border-white/20 cursor-pointer transition flex items-center justify-between group shadow-sm hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                      style={{ backgroundColor: item.iconColor }}
                    >
                      {getShortcutIcon(item.iconName)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">{item.name}</h4>
                      <p className="text-[10.5px] text-[#8E8E93] truncate max-w-[180px]">{item.description}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-[#34C759] border border-white/5">
                    {item.deviceName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'processes' && (
          <div className="flex-1 h-full bg-[#121218] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 overflow-hidden shadow-2xl">
            <div className="pb-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-white">Windows Process Manager</h2>
                <p className="text-xs text-[#8E8E93]">Direct Win32 toolhelp process enumeration & termination</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter process name..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-[#F0F0F2] outline-none focus:border-[#34C759] w-56"
                />
                <button
                  onClick={refreshProcesses}
                  className="px-3 py-1.5 rounded-xl bg-[#34C759] hover:bg-[#30D158] text-[#0A0A0C] text-xs font-bold flex items-center gap-1 transition"
                >
                  <RotateCcw size={12} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
              {filteredProcesses.map((proc) => (
                <div
                  key={proc.pid}
                  className="p-2 px-3 rounded-xl bg-[#181822] hover:bg-[#20202C] border border-white/5 flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#8E8E93] text-[11px] w-14">PID {proc.pid}</span>
                    <span className="font-semibold text-white">{proc.name}</span>
                  </div>
                  <button
                    onClick={() => killProcess(proc.pid)}
                    className="p-1 px-2.5 rounded-lg bg-[#FF3B30]/15 hover:bg-[#FF3B30]/25 text-[#FF3B30] text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <Trash2 size={12} />
                    <span>End Task</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ─── Bottom Status Bar ───────────────────────────────────── */}
      <footer className="h-8 bg-[#0E0E14] border-t border-white/10 px-4 flex items-center justify-between text-[11px] text-[#8E8E93] shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#34C759]" />
          <span>Local Bridge: Active (Port 9120)</span>
          <span className="text-white/20">•</span>
          <span>{devices.length} Nodes in Cluster</span>
        </div>
        <div>
          <span>Hot-Corner Shortcuts: Enabled (↖ Top-Left / ↗ Top-Right)</span>
        </div>
      </footer>
    </div>
  );
};
