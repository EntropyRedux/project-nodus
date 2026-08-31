import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { getSystemTheme, getAccentColor } from '../../utils/themes';

export const ToastNotification: React.FC = () => {
  const { toastMessage, settings } = useLauncher();
  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  if (!toastMessage) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
      <div className={`${currentTheme.classes.modalContainer} ${currentTheme.pillRadius} backdrop-blur-2xl px-5 py-2.5 shadow-2xl flex items-center gap-2.5 text-xs font-medium tracking-wide`}>
        <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: currentAccent.hex }} />
        <span className={`${currentTheme.classes.textPrimary} drop-shadow-sm`}>{toastMessage}</span>
      </div>
    </div>
  );
};
