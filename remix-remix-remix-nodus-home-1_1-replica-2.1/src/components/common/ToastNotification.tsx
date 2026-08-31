import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { getSystemTheme, getAccentColor } from '../../utils/themes';
import { CheckCircle2 } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toastMessage, settings } = useLauncher();
  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);
  const isLight = settings.theme === 'material-light';

  if (!toastMessage) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none select-none">
      <div 
        className={`${
          isLight
            ? 'bg-white/95 text-[#0F172A] border border-[#CBD5E1] shadow-[0_12px_32px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)]'
            : 'bg-[#0F172A]/95 text-white border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.7)]'
        } backdrop-blur-2xl px-4 py-2.5 ${currentTheme.pillRadius} flex items-center gap-2.5 text-xs font-semibold tracking-tight transition-all`}
      >
        <div 
          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
            isLight ? 'bg-emerald-100 text-emerald-600 shadow-2xs' : 'bg-emerald-500/20 text-emerald-400'
          }`}
        >
          <CheckCircle2 size={13} className="stroke-[2.5]" />
        </div>
        <span className={isLight ? 'text-[#0F172A] font-semibold' : 'text-white drop-shadow-xs'}>
          {toastMessage}
        </span>
      </div>
    </div>
  );
};

