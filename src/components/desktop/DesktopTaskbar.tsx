import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Search, 
  Wifi, 
  Volume2, 
  VolumeX, 
  Battery, 
  Bell, 
  Power, 
  Layers, 
  Maximize, 
  Minimize, 
  Settings as SettingsIcon,
  Sparkles,
  Server
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

export const DesktopTaskbar: React.FC = () => {
  const { 
    apps, 
    runningApps, 
    activeAppId, 
    launchApp, 
    closeActiveApp, 
    toggleQuickSettings, 
    setSearchOpen, 
    setRecentsOpen, 
    isRecentsOpen, 
    lockDevice, 
    activeDevice,
    notifications,
    settings,
    updateSettings
  } = useLauncher();

  const [timeStr, setTimeStr] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const toggleFullscreen = () => {
    audio.playTap();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Frequently accessed pinned apps on taskbar
  const pinnedIds = ['phone', 'messages', 'browser', 'files', 'camera', 'notes', 'terminal', 'settings'];

  return (
    <footer className="h-14 w-full bg-[#0A0A0C]/90 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between px-3 z-40 select-none shadow-2xl">
      {/* Left: Start / Apps Launcher & Search */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            audio.playTap();
            if (activeAppId) {
              closeActiveApp();
            } else {
              setSearchOpen(true);
            }
          }}
          className={`px-3 py-1.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition ${
            !activeAppId
              ? 'bg-[#34C759] text-[#0A0A0C] shadow-lg shadow-[#34C759]/20'
              : 'bg-[#1C1C1E] text-[#F0F0F2] hover:bg-[#2C2C2E] border border-white/10'
          }`}
          title="Launcher Home / Search"
        >
          <Grid size={16} />
          <span className="hidden sm:inline">Launcher</span>
        </button>

        <button
          onClick={() => {
            audio.playTap();
            setSearchOpen(true);
          }}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/5 rounded-2xl text-xs text-[#8E8E93] hover:text-[#F0F0F2] transition w-44"
        >
          <Search size={14} />
          <span>Search apps, web...</span>
        </button>
      </div>

      {/* Center: Running & Pinned Apps on Taskbar */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-xl px-2">
        {pinnedIds.map((id) => {
          const app = apps.find((a) => a.id === id);
          if (!app) return null;
          const isActive = activeAppId === app.id;
          const isRunning = runningApps.includes(app.id);

          return (
            <button
              key={app.id}
              onClick={() => {
                if (isActive) {
                  closeActiveApp();
                } else {
                  launchApp(app.id);
                }
              }}
              title={app.name}
              className={`relative p-2 rounded-2xl transition flex items-center justify-center ${
                isActive
                  ? 'bg-[#1C1C1E] ring-2 ring-[#34C759] shadow-lg'
                  : isRunning
                  ? 'bg-[#1C1C1E]/80 hover:bg-[#1C1C1E]'
                  : 'hover:bg-[#1C1C1E]/50 opacity-80 hover:opacity-100'
              }`}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: app.color }}
              >
                {app.name.charAt(0)}
              </div>

              {/* Running Indicator Dot */}
              {isRunning && (
                <span
                  className={`absolute -bottom-0.5 w-1.5 h-1.5 rounded-full transition-all ${
                    isActive ? 'bg-[#34C759] w-3' : 'bg-[#8E8E93]'
                  }`}
                />
              )}
            </button>
          );
        })}

        {/* Task View / Recents Button */}
        <button
          onClick={() => {
            audio.playTap();
            setRecentsOpen(!isRecentsOpen);
          }}
          title="Task View / Multitasking Recents"
          className={`p-2 rounded-2xl hover:bg-[#1C1C1E] text-[#8E8E93] hover:text-[#F0F0F2] transition ${
            isRecentsOpen ? 'bg-[#1C1C1E] text-[#34C759]' : ''
          }`}
        >
          <Layers size={18} />
        </button>
      </div>

      {/* Right: Connected Node & System Tray */}
      <div className="flex items-center gap-2">
        {/* Active Node Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#1C1C1E] border border-white/5 rounded-2xl text-[11px] font-semibold text-[#8E8E93]">
          <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
          <span className="text-[#F0F0F2]">{activeDevice.name}</span>
        </div>

        {/* Quick Settings & Notification Button */}
        <button
          onClick={toggleQuickSettings}
          className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/5 rounded-2xl text-xs text-[#8E8E93] hover:text-[#F0F0F2] transition relative"
          title="System Tray & Quick Settings"
        >
          <Wifi size={14} className="text-[#34C759]" />
          <Volume2 size={14} className="text-[#007AFF]" />
          <Battery size={14} className="text-[#FF9500]" />

          {unreadNotifs > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#FF3B30] text-white text-[9px] font-bold flex items-center justify-center">
              {unreadNotifs}
            </span>
          )}
        </button>

        {/* Clock & Date */}
        <button
          onClick={() => {
            audio.playTap();
            launchApp('clock');
          }}
          className="px-2.5 py-1.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/5 rounded-2xl text-xs font-mono font-bold text-[#F0F0F2] transition"
          title="Clock & Calendar"
        >
          {timeStr}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-2xl hover:bg-[#1C1C1E] text-[#8E8E93] hover:text-[#F0F0F2] transition hidden sm:flex"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>

        {/* Power / Lock */}
        <button
          onClick={() => {
            audio.playTap();
            lockDevice();
          }}
          className="p-2 rounded-2xl hover:bg-[#FF3B30]/20 text-[#8E8E93] hover:text-[#FF3B30] transition"
          title="Lock Screen"
        >
          <Power size={16} />
        </button>
      </div>
    </footer>
  );
};
