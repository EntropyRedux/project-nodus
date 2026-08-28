import React from 'react';
import { X, Minus } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

interface DesktopAppWindowProps {
  appId: string;
  children: React.ReactNode;
}

export const DesktopAppWindow: React.FC<DesktopAppWindowProps> = ({ appId, children }) => {
  const { apps, closeActiveApp, killApp } = useLauncher();

  const currentApp = apps.find((a) => a.id === appId) || {
    id: appId,
    name: 'Preferences',
    color: '#34C759',
  };

  const handleMinimize = () => {
    audio.playTap();
    closeActiveApp();
  };

  const handleClose = () => {
    audio.playTap();
    killApp(appId);
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0E0E14] border border-white/10 shadow-2xl overflow-hidden rounded-3xl backdrop-blur-2xl select-none">
      {/* Sleek Frosted Window Header */}
      <div className="h-12 bg-[#161622]/90 border-b border-white/10 px-5 flex items-center justify-between flex-shrink-0 backdrop-blur-md">
        {/* Left: App Icon & Name */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: currentApp.color || '#34C759' }}
          >
            {currentApp.name.charAt(0)}
          </div>
          <span className="text-xs font-bold text-[#F0F0F2] tracking-wide">{currentApp.name}</span>
          <span className="text-[10px] text-[#34C759] bg-[#34C759]/10 border border-[#34C759]/20 px-2 py-0.5 rounded-full font-mono font-medium">
            Active
          </span>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleMinimize}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-7 h-7 rounded-lg hover:bg-white/10 active:scale-90 text-[#8E8E93] hover:text-[#F0F0F2] transition flex items-center justify-center"
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={handleClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-7 h-7 rounded-lg bg-[#FF3B30]/15 hover:bg-[#FF3B30] active:scale-90 text-[#FF3B30] hover:text-white transition flex items-center justify-center shadow-sm"
            title="Close"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Window Body Content */}
      <div className="flex-1 overflow-hidden relative bg-[#0A0A0E]/95">
        {children}
      </div>
    </div>
  );
};
