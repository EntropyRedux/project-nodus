import React, { useState } from 'react';
import { Minus, Square, X, Maximize2, Minimize2 } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

interface DesktopAppWindowProps {
  appId: string;
  children: React.ReactNode;
}

export const DesktopAppWindow: React.FC<DesktopAppWindowProps> = ({ appId, children }) => {
  const { apps, closeActiveApp, killApp } = useLauncher();
  const [isMaximized, setIsMaximized] = useState(true);

  const currentApp = apps.find((a) => a.id === appId) || {
    id: appId,
    name: 'Application',
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
    <div
      className={`h-full w-full flex flex-col bg-[#0A0A0C] border border-white/10 shadow-2xl overflow-hidden transition-all duration-200 ${
        isMaximized ? 'rounded-none' : 'max-w-4xl max-h-[85vh] rounded-3xl m-auto'
      }`}
    >
      {/* Window Titlebar */}
      <div className="h-10 bg-[#1C1C1E] border-b border-white/5 px-4 flex items-center justify-between select-none flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: currentApp.color }}
          >
            {currentApp.name.charAt(0)}
          </div>
          <span className="text-xs font-bold text-[#F0F0F2] tracking-wide">{currentApp.name}</span>
          <span className="text-[10px] text-[#8E8E93] bg-[#0A0A0C] px-2 py-0.5 rounded-full font-mono">
            running
          </span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded-lg hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] transition"
            title="Minimize to Taskbar"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded-lg hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] transition hidden sm:inline-flex"
            title={isMaximized ? 'Restore Window' : 'Maximize Window'}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-[#FF3B30] text-[#8E8E93] hover:text-white transition"
            title="Close Application"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Window Body Content */}
      <div className="flex-1 overflow-hidden relative bg-[#0A0A0C]">
        {children}
      </div>
    </div>
  );
};
