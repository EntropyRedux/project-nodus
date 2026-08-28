import React, { useState, useEffect } from 'react';
import { 
  CloudSun, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Battery, 
  Activity, 
  Calendar, 
  Clock, 
  Music, 
  Play, 
  Pause, 
  SkipForward, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  RotateCcw,
  Skull
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

export const DesktopWidgets: React.FC = () => {
  const { 
    activeDevice, 
    currentTrack, 
    isPlayingMusic, 
    toggleMusic, 
    nextTrack, 
    launchApp,
    notifications,
    openProcessManager,
    rebootDevice
  } = useLauncher();

  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [cpuVal, setCpuVal] = useState(activeDevice.cpuLoad || 22);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
      setDateStr(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Slight dynamic jitter for live CPU meter
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuVal((prev) => {
        const base = activeDevice.cpuLoad || 24;
        const delta = Math.floor(Math.random() * 7) - 3;
        return Math.max(8, Math.min(95, base + delta));
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [activeDevice]);

  return (
    <div className="w-80 flex-shrink-0 flex flex-col gap-3 p-3 select-none overflow-y-auto scrollbar-none">
      {/* 1. At A Glance Clock & Date Card */}
      <div 
        onClick={() => {
          audio.playTap();
          launchApp('clock');
        }}
        className="p-4 rounded-3xl bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 hover:border-white/20 transition cursor-pointer shadow-xl group"
      >
        <div className="flex items-center justify-between text-xs text-[#8E8E93] mb-1">
          <span className="font-semibold text-[#34C759] flex items-center gap-1">
            <Sparkles size={13} /> {activeDevice.name}
          </span>
          <span className="group-hover:text-[#F0F0F2] transition flex items-center gap-1">
            <Calendar size={12} /> {dateStr}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <h1 className="text-4xl font-light tracking-tight text-[#F0F0F2]">
            {timeStr}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-[#8E8E93] group-hover:text-[#34C759] transition">
            <CloudSun size={18} className="text-[#FF9500]" />
            <span className="font-semibold text-[#F0F0F2]">72°F</span>
          </div>
        </div>
      </div>

      {/* 2. Device Hardware Monitor Widget (Live stats for Active Node) */}
      <div className="p-4 rounded-3xl bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-[#34C759]" />
            <h3 className="text-xs font-bold text-[#F0F0F2] tracking-wide">Device Telemetry</h3>
          </div>
          <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#34C759]/15 text-[#34C759] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
            {activeDevice.status.toUpperCase()}
          </span>
        </div>

        {/* CPU Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#8E8E93] flex items-center gap-1">
              <Cpu size={12} className="text-[#34C759]" /> CPU Load
            </span>
            <span className="font-mono text-[#F0F0F2] font-semibold">{cpuVal}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#0A0A0C] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#34C759] rounded-full transition-all duration-500"
              style={{ width: `${cpuVal}%` }}
            />
          </div>
        </div>

        {/* Memory Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#8E8E93] flex items-center gap-1">
              <Activity size={12} className="text-[#007AFF]" /> Memory (RAM)
            </span>
            <span className="font-mono text-[#F0F0F2] font-semibold">{activeDevice.ramUsage || '3.2 / 8.0 GB'}</span>
          </div>
          <div className="w-full h-1.5 bg-[#0A0A0C] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#007AFF] rounded-full transition-all duration-500"
              style={{ width: '58%' }}
            />
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-[#0A0A0C]/60 p-2 rounded-2xl border border-white/5 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-[#8E8E93]">
              <HardDrive size={11} className="text-[#BF5AF2]" /> Storage
            </div>
            <p className="text-xs font-mono font-bold text-[#F0F0F2] truncate">{activeDevice.storage || '64 GB'}</p>
          </div>

          <div className="bg-[#0A0A0C]/60 p-2 rounded-2xl border border-white/5 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] text-[#8E8E93]">
              <Wifi size={11} className="text-[#30D158]" /> Network
            </div>
            <p className="text-xs font-mono font-bold text-[#F0F0F2] truncate">{activeDevice.ipAddress}</p>
          </div>
        </div>

        {/* Quick Node Process & Reboot Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => openProcessManager(activeDevice.id)}
            className="flex-1 py-2 bg-[#0A0A0C] hover:bg-[#2C2C2E] border border-white/10 hover:border-[#34C759]/50 rounded-2xl text-xs font-semibold text-[#F0F0F2] flex items-center justify-center gap-1.5 transition group"
          >
            <Activity size={13} className="text-[#34C759] group-hover:scale-110 transition-transform" />
            <span>Process Manager</span>
          </button>

          <button
            onClick={() => rebootDevice(activeDevice.id)}
            disabled={activeDevice.isRebooting}
            className={`px-3 py-2 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeDevice.isRebooting
                ? 'bg-[#FF9500]/20 text-[#FF9500] border-[#FF9500]/40 cursor-not-allowed'
                : 'bg-[#0A0A0C] hover:bg-[#FF9500]/20 border-white/10 hover:border-[#FF9500]/40 text-[#FF9500]'
            }`}
            title={`Reboot ${activeDevice.name}`}
          >
            <RotateCcw size={13} className={activeDevice.isRebooting ? 'animate-spin' : ''} />
            <span>{activeDevice.isRebooting ? 'Rebooting' : 'Reboot'}</span>
          </button>
        </div>
      </div>

      {/* 3. Media Player Card */}
      <div className="p-3.5 rounded-3xl bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 shadow-xl flex items-center justify-between gap-3">
        <div 
          onClick={() => {
            audio.playTap();
            launchApp('music');
          }}
          className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
        >
          <div 
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
            style={{ backgroundColor: currentTrack?.coverColor || '#34C759' }}
          >
            <Music size={18} className={isPlayingMusic ? 'animate-bounce' : ''} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#F0F0F2] truncate">{currentTrack?.title || 'Solar Echoes'}</h4>
            <p className="text-[10px] text-[#8E8E93] truncate">{currentTrack?.artist || 'Nodus Ambient'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleMusic}
            className="w-8 h-8 rounded-full bg-[#34C759] hover:bg-[#30D158] text-[#0A0A0C] flex items-center justify-center transition shadow-md"
            title={isPlayingMusic ? 'Pause' : 'Play'}
          >
            {isPlayingMusic ? <Pause size={14} /> : <Play size={14} className="translate-x-0.5" />}
          </button>
          <button
            onClick={nextTrack}
            className="w-8 h-8 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#F0F0F2] flex items-center justify-center transition"
            title="Next Track"
          >
            <SkipForward size={14} />
          </button>
        </div>
      </div>

      {/* 4. Quick Scratchpad / Sticky Notes */}
      <div 
        onClick={() => {
          audio.playTap();
          launchApp('notes');
        }}
        className="p-3.5 rounded-3xl bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 hover:border-white/20 transition cursor-pointer shadow-xl space-y-1.5"
      >
        <div className="flex items-center justify-between text-xs text-[#FFD60A] font-semibold">
          <span className="flex items-center gap-1.5">
            <CheckSquare size={13} /> Quick Note
          </span>
          <span className="text-[10px] text-[#8E8E93]">Open Notes →</span>
        </div>
        <p className="text-xs text-[#8E8E93] line-clamp-2 italic">
          "Zero screen space waste • Desktop PC launcher with full multi-device link & Clean Minimalism..."
        </p>
      </div>
    </div>
  );
};
