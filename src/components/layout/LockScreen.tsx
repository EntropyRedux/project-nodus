import React, { useState, useEffect } from 'react';
import { Fingerprint, Flashlight, Camera, Lock, ChevronUp } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

export const LockScreen: React.FC = () => {
  const { isLocked, unlockDevice, toggleQuickSetting, quickSettings, launchApp } = useLauncher();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isLocked) return null;

  return (
    <div className="absolute inset-0 z-50 bg-[#0A0A0C]/95 backdrop-blur-2xl text-[#F0F0F2] flex flex-col justify-between p-8 select-none animate-in fade-in duration-300">
      {/* Top Lock Indicator */}
      <div className="flex flex-col items-center pt-8 space-y-4">
        <Lock size={16} className="text-[#8E8E93]" />
        <div className="text-center">
          <span className="text-7xl font-light tracking-tighter text-[#F0F0F2]">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
          <p className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest mt-2">
            {time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Center Fingerprint / Tap to Unlock */}
      <div className="flex flex-col items-center justify-center space-y-4 my-auto">
        <button
          onClick={unlockDevice}
          className="w-20 h-20 rounded-[2rem] bg-[#1C1C1E] border border-white/5 text-[#34C759] flex items-center justify-center relative group active:scale-95 transition shadow-2xl shadow-black/80 hover:bg-[#2C2C2E]"
        >
          <div className="absolute inset-0 rounded-[2rem] border border-[#34C759]/30 animate-ping" />
          <Fingerprint size={38} strokeWidth={2} />
        </button>
        <span className="text-xs text-[#8E8E93] flex items-center gap-1 uppercase tracking-wider font-medium">
          <ChevronUp size={14} className="text-[#34C759]" /> Tap or swipe to unlock
        </span>
      </div>

      {/* Bottom Shortcuts (Flashlight & Camera) */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => toggleQuickSetting('flashlight')}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition border border-white/5 ${
            quickSettings.flashlight
              ? 'bg-[#34C759] text-[#0A0A0C] shadow-lg shadow-[#34C759]/20'
              : 'bg-[#1C1C1E] text-[#8E8E93] hover:text-[#F0F0F2] hover:bg-[#2C2C2E]'
          }`}
        >
          <Flashlight size={18} />
        </button>

        <button
          onClick={() => {
            unlockDevice();
            launchApp('camera');
          }}
          className="w-12 h-12 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] flex items-center justify-center transition border border-white/5"
        >
          <Camera size={18} />
        </button>
      </div>
    </div>
  );
};
