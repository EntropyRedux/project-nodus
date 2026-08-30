import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { AppIcon } from './AppIcon';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

export const Dock: React.FC = () => {
  const { dockAppIds, apps, settings } = useLauncher();
  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  const dockApps = dockAppIds
    .map((id) => apps.find((a) => a.id === id))
    .filter(Boolean);

  const dockClass = {
    glass: 'rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/60',
    hud: 'rounded-none border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]',
    brutalist: 'rounded-xl border-2 border-black shadow-[4px_4px_0px_#000000]',
    minimal: 'rounded-none border-t border-b border-white/10',
  }[currentTheme.archetype];

  return (
    <div className="w-full px-4 py-2 z-30 select-none">
      <div 
        className={`w-full ${dockClass} p-3 flex items-center justify-around backdrop-blur-3xl transition-colors duration-200`}
        style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'taskbar') }}
      >
        {dockApps.map((app) => app && <AppIcon key={app.id} app={app} size="dock" />)}
      </div>
    </div>
  );
};
