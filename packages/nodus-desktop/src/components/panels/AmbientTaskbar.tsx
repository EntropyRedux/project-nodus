import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Clipboard, 
  Terminal, 
  Code, 
  Gamepad2, 
  Camera, 
  Activity, 
  Sparkles, 
  Radio,
  Volume1,
  Volume2,
  Play
} from 'lucide-react';
import { useDesktop } from '../../context/DesktopContext';

export const AmbientTaskbar: React.FC = () => {
  const { 
    remoteExecutables, 
    executeShortcut, 
    controlMedia,
    activeDevice, 
    setActiveTab, 
    clipboardItems, 
    devices,
    systemStats
  } = useDesktop();

  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getShortcutIcon = (name: string) => {
    switch (name) {
      case 'Code': return <Code size={16} />;
      case 'Terminal': return <Terminal size={16} />;
      case 'Gamepad2': return <Gamepad2 size={16} />;
      case 'Camera': return <Camera size={16} />;
      default: return <Activity size={16} />;
    }
  };

  return (
    <div className="w-full flex justify-center pb-3 px-4">
      <div
        className="max-w-4xl w-full h-14 bg-[#121218] rounded-2xl px-3 flex items-center justify-between border border-white/10 select-none shadow-2xl"
      >
        {/* Left Section: Fleet & Panel Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('fleet')}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#F0F0F2] text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <div className="w-2 h-2 rounded-full bg-[#34C759] shadow-[0_0_8px_#34C759]" />
            <span>Fleet ({devices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('clipboard')}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[#F0F0F2] text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Clipboard size={14} className="text-[#007AFF]" />
            <span>Clips</span>
            {clipboardItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#007AFF]/20 text-[#007AFF] text-[10px] font-bold">
                {clipboardItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Center: Remote Executable Shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-2">
          {remoteExecutables.map((shortcut) => (
            <button
              key={shortcut.id}
              onClick={() => executeShortcut(shortcut)}
              title={`${shortcut.name} (${shortcut.deviceName})`}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-[#F0F0F2] flex items-center gap-1.5 text-xs font-medium hover:scale-105 active:scale-95 transition-all group"
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-white"
                style={{ backgroundColor: shortcut.iconColor }}
              >
                {getShortcutIcon(shortcut.iconName)}
              </div>
              <span className="hidden sm:inline text-xs">{shortcut.name}</span>
            </button>
          ))}
        </div>

        {/* Right Section: Media Controls, Telemetry & Clock */}
        <div className="flex items-center gap-2">
          {/* Quick Win32 Media Controls */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => controlMedia('volume_down')}
              className="p-1 rounded-lg hover:bg-white/10 text-[#8E8E93] hover:text-white transition"
              title="Volume Down"
            >
              <Volume1 size={13} />
            </button>
            <button
              onClick={() => controlMedia('play_pause')}
              className="p-1 rounded-lg hover:bg-white/10 text-[#34C759] transition"
              title="Play / Pause Track"
            >
              <Play size={13} />
            </button>
            <button
              onClick={() => controlMedia('volume_up')}
              className="p-1 rounded-lg hover:bg-white/10 text-[#8E8E93] hover:text-white transition"
              title="Volume Up"
            >
              <Volume2 size={13} />
            </button>
          </div>

          {activeDevice ? (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 text-[11px] border border-white/5 font-mono">
              <span className="text-[#8E8E93]">{activeDevice.name}</span>
              <span className="text-[#34C759] font-bold">{activeDevice.cpuLoad ?? 0}% CPU</span>
            </div>
          ) : systemStats ? (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 text-[11px] border border-white/5 font-mono">
              <span className="text-[#8E8E93]">Host PC</span>
              <span className="text-[#34C759] font-bold">{systemStats.cpu_usage_pct}% CPU</span>
            </div>
          ) : null}

          <div className="px-2.5 py-1 rounded-xl bg-white/5 text-xs font-mono font-semibold text-[#F0F0F2]">
            {timeStr}
          </div>
        </div>
      </div>
    </div>
  );
};
