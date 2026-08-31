import React, { useState } from 'react';
import { Minus, X, Maximize2, Minimize2 } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DynamicIcon } from '../common/DynamicIcon';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

interface DesktopAppWindowProps {
  appId: string;
  children: React.ReactNode;
}

export const DesktopAppWindow: React.FC<DesktopAppWindowProps> = ({ appId, children }) => {
  const { apps, closeActiveApp, killApp, settings } = useLauncher();
  const [isMaximized, setIsMaximized] = useState(false);

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const app = apps.find((a) => a.id === appId);

  if (!app) return null;

  return (
    <div 
      className={`w-full h-full flex flex-col overflow-hidden select-none ${currentTheme.classes.containerFont} ${currentTheme.classes.textPrimary}`}
    >
      {/* Title bar */}
      <div className={`h-10 px-3.5 ${currentTheme.classes.cardHeader} flex items-center justify-between shrink-0 select-none`}>
        {/* App Title & Icon */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-5 h-5 ${currentTheme.buttonRadius} flex items-center justify-center text-white shrink-0 overflow-hidden`}
            style={{ backgroundColor: app.customIcon ? 'transparent' : app.color || currentAccent.hex }}
          >
            {app.customIcon ? (
              <img src={app.customIcon} alt={app.name} className="w-5 h-5 object-contain" />
            ) : (
              <DynamicIcon name={app.iconName} size={12} />
            )}
          </div>
          <span className="text-xs font-bold font-mono tracking-wide truncate">
            {currentTheme.archetype === 'hud' ? `[SYS//${app.name.toUpperCase()}]` : app.name}
          </span>
          <span className="text-[10px] text-[#64748B] font-mono hidden sm:inline">• session://{app.id}</span>
        </div>

        {/* Window controls (Minimize, Maximize, Close) */}
        <div className="flex items-center gap-1">
          {/* Minimize */}
          <button
            onClick={() => {
              audio.playTap();
              closeActiveApp();
            }}
            className={`w-6 h-6 ${currentTheme.buttonRadius} hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F1F5F9] flex items-center justify-center transition`}
            title="Minimize"
          >
            <Minus size={13} />
          </button>

          {/* Maximize */}
          <button
            onClick={() => {
              audio.playTap();
              setIsMaximized(!isMaximized);
            }}
            className={`w-6 h-6 ${currentTheme.buttonRadius} hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#F1F5F9] flex items-center justify-center transition`}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>

          {/* Close */}
          <button
            onClick={() => {
              audio.playTap();
              killApp(appId);
            }}
            className={`w-6 h-6 ${currentTheme.buttonRadius} hover:bg-[#F43F5E] text-[#94A3B8] hover:text-[#090B10] flex items-center justify-center transition`}
            title="Terminate Process"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};
