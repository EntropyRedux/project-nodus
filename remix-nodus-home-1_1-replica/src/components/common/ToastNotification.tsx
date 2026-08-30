import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { getSystemTheme, getSurfaceRgba } from '../../utils/themes';

export const ToastNotification: React.FC = () => {
  const { toastMessage, settings } = useLauncher();
  const currentTheme = getSystemTheme(settings.theme);

  if (!toastMessage) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
      <div 
        className={`backdrop-blur-2xl border border-white/15 text-white px-5 py-2.5 ${currentTheme.pillRadius} shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-2.5 text-xs font-medium tracking-wide transition-colors duration-200`}
        style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'popup') }}
      >
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
        <span className="text-[#F3F4F6] drop-shadow-sm">{toastMessage}</span>
      </div>
    </div>
  );
};
