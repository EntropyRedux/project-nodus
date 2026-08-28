import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { AppIcon } from './AppIcon';

export const Dock: React.FC = () => {
  const { dockAppIds, apps } = useLauncher();

  const dockApps = dockAppIds
    .map((id) => apps.find((a) => a.id === id))
    .filter(Boolean);

  return (
    <div className="w-full px-4 py-2 z-30 select-none">
      <div className="w-full bg-[#1C1C1E]/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-3 flex items-center justify-around shadow-2xl shadow-black/60">
        {dockApps.map((app) => app && <AppIcon key={app.id} app={app} size="dock" />)}
      </div>
    </div>
  );
};
