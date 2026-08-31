import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Bluetooth, Disc, Moon } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';

export const StatusBar: React.FC = () => {
  const { toggleQuickSettings, quickSettings, isPlayingMusic } = useLauncher();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      onClick={toggleQuickSettings}
      className="w-full h-9 px-5 flex items-center justify-between text-xs text-[#F0F0F2] font-sans select-none cursor-pointer z-40 bg-gradient-to-b from-[#0A0A0C] to-transparent transition hover:bg-white/5"
    >
      {/* Left: Time */}
      <div className="flex items-center gap-2.5">
        <span className="font-semibold tracking-tight text-xs text-[#F0F0F2]">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>

        {isPlayingMusic && (
          <Disc size={12} className="text-[#FF2D55] animate-spin-slow" />
        )}
      </div>

      {/* Center camera indicator */}
      <div className="w-16 h-4 flex items-center justify-center">
        <div className="w-3.5 h-3.5 rounded-full bg-[#0A0A0C] border border-[#2C2C2E] shadow-inner" />
      </div>

      {/* Right: Connectivity and Battery */}
      <div className="flex items-center space-x-3 text-[#4A4A4F]">
        <div className="flex items-center space-x-1">
          {quickSettings.wifi ? <Wifi size={13} className="text-[#F0F0F2]" /> : <WifiOff size={13} className="text-[#4A4A4F]" />}
          <span className="text-[10px] font-semibold text-[#8E8E93]">LTE</span>
        </div>

        {quickSettings.bluetooth && <Bluetooth size={12} className="text-[#007AFF]" />}
        {quickSettings.dnd && <Moon size={11} className="text-[#FFD60A] fill-current" />}
        
        <div className="w-6 h-3 border border-[#4A4A4F] rounded-xs p-0.5 flex items-center">
          <div className="bg-[#34C759] h-full w-[85%] rounded-xs" />
        </div>
      </div>
    </div>
  );
};
