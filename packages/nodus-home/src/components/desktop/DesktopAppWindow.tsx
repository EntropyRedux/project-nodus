import React from 'react';
import { X, Minus } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

interface DesktopAppWindowProps {
  appId: string;
  children: React.ReactNode;
}

export const DesktopAppWindow: React.FC<DesktopAppWindowProps> = ({ appId, children }) => {
  const { apps, closeActiveApp, killApp, settings } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const currentApp = apps.find((a) => a.id === appId) || {
    id: appId,
    name: 'Preferences',
    color: currentAccent.hex,
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
      className={`h-full w-full flex flex-col border border-white/10 shadow-2xl overflow-hidden ${currentTheme.cardRadius} backdrop-blur-3xl select-none transition-colors duration-200`}
      style={{
        backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'window'),
      }}
    >
      {/* Sleek Frosted Window Header */}
      <div 
        className="h-12 border-b border-white/10 px-5 flex items-center justify-between flex-shrink-0 backdrop-blur-md bg-black/20"
      >
        {/* Left: App Icon & Name */}
        <div className="flex items-center gap-2.5">
          <div
            className={`w-6 h-6 ${currentTheme.buttonRadius} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}
            style={{ backgroundColor: currentApp.color || currentAccent.hex }}
          >
            {currentApp.name.charAt(0)}
          </div>
          <span className={`text-xs font-bold ${currentTheme.classes.textPrimary} tracking-wide`}>{currentApp.name}</span>
          <span 
            className={`text-[9px] px-2 py-0.5 ${currentTheme.buttonRadius} font-mono font-bold border`}
            style={{
              backgroundColor: currentAccent.badgeBg,
              color: currentAccent.hex,
              borderColor: currentAccent.badgeBorder,
            }}
          >
            ACTIVE
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
