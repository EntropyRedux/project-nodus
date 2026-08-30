import React, { useState, useEffect } from 'react';
import { Calendar, Search, Mic, Activity, ShieldCheck } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

import { RemoteCanvasWidget } from './RemoteCanvasWidget';

export const WidgetArea: React.FC = () => {
  const { settings, launchApp, setSearchOpen, activeDevice } = useLauncher();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchClick = () => {
    if (settings.soundEffects) audio.playTap();
    setSearchOpen(true);
  };

  const widgetStyle = settings.clockWidgetStyle;

  return (
    <div className="w-full space-y-3 px-4 pt-1 select-none max-w-lg mx-auto">
      {/* At A Glance / Clock Widget */}
      {settings.atAGlanceWidget && (
        <div className="w-full">
          {widgetStyle === 'digital-bold' && (
            <div className="flex flex-col items-center justify-center text-center py-2">
              <span className="text-7xl font-light tracking-tighter text-[#F0F0F2] font-sans drop-shadow-sm mb-1">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
              <div className="flex items-center gap-2 text-xs font-medium text-[#8E8E93] tracking-widest uppercase">
                <button
                  onClick={() => launchApp('clock')}
                  className="hover:text-[#F0F0F2] transition-colors flex items-center gap-1.5"
                >
                  <Calendar size={13} className="text-[#30D158]" />
                  <span>{time.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </button>
                <span className="text-[#4A4A4F]">•</span>
                <button
                  onClick={() => launchApp('settings')}
                  className="hover:text-[#F0F0F2] transition-colors flex items-center gap-1.5 text-[#8E8E93]"
                >
                  <Activity size={13} className="text-[#007AFF]" />
                  <span>{activeDevice.name}</span>
                </button>
              </div>
            </div>
          )}

          {widgetStyle === 'minimal-pill' && (
            <div className="flex items-center justify-between bg-[#1C1C1E]/80 backdrop-blur-xl px-4 py-2.5 rounded-full border border-white/5 text-xs text-[#F0F0F2]">
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-sm">
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
                <span className="text-[#8E8E93] uppercase tracking-wider text-[11px]">
                  {time.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                </span>
              </div>
              <button
                onClick={() => launchApp('settings')}
                className="flex items-center gap-1.5 text-[#30D158] font-medium"
              >
                <ShieldCheck size={14} /> {activeDevice.name}
              </button>
            </div>
          )}

          {widgetStyle === 'material-stack' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 py-1">
                <div>
                  <h2 className="text-5xl font-light text-[#F0F0F2] tracking-tighter leading-none">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </h2>
                  <p className="text-xs text-[#8E8E93] font-medium uppercase tracking-widest mt-1.5">
                    {time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => launchApp('settings')}
                  className="p-3 bg-[#1C1C1E] backdrop-blur-md rounded-2xl border border-white/5 flex flex-col items-center shadow-lg hover:bg-[#2C2C2E] transition"
                >
                  <Activity size={20} className="text-[#34C759]" />
                  <span className="text-[10px] font-semibold text-[#8E8E93] mt-1 font-mono">
                    {Number((activeDevice.cpuLoad ?? 18).toFixed(2))}% CPU
                  </span>
                </button>
              </div>
              <RemoteCanvasWidget />
            </div>
          )}

          {widgetStyle === 'analog' && (
            <div className="flex items-center justify-center py-2">
              <div className="w-24 h-24 rounded-full border-2 border-[#4A4A4F] bg-[#1C1C1E] backdrop-blur-md flex items-center justify-center relative shadow-xl">
                <div className="w-2 h-2 rounded-full bg-[#34C759] z-10" />
                {/* Hour hand */}
                <div
                  className="absolute w-0.5 h-6 bg-[#F0F0F2] rounded-full origin-bottom bottom-12"
                  style={{
                    transform: `rotate(${(time.getHours() % 12) * 30 + time.getMinutes() * 0.5}deg)`,
                  }}
                />
                {/* Minute hand */}
                <div
                  className="absolute w-0.5 h-8 bg-[#34C759] rounded-full origin-bottom bottom-12"
                  style={{
                    transform: `rotate(${time.getMinutes() * 6}deg)`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clean Search Bar */}
      <div
        onClick={handleSearchClick}
        className="w-full h-11 px-4 bg-[#1C1C1E]/60 hover:bg-[#1C1C1E] backdrop-blur-xl border border-white/5 rounded-full flex items-center justify-between text-[#8E8E93] cursor-pointer shadow-lg transition-all hover:scale-[1.01] active:scale-98"
      >
        <div className="flex items-center gap-2.5">
          <Search size={15} className="text-[#8E8E93]" />
          <span className="text-xs text-[#8E8E93] font-medium">Search apps, commands, devices...</span>
        </div>
        <div className="flex items-center gap-2 text-[#8E8E93]">
          <Mic size={15} className="hover:text-[#F0F0F2] transition" />
        </div>
      </div>
    </div>
  );
};
