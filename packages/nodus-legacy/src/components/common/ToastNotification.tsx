import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { Sparkles, Info } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toastMessage } = useLauncher();

  if (!toastMessage) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
      <div className="bg-[#1C1C1E]/90 backdrop-blur-2xl border border-white/10 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-medium tracking-wide">
        <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse shrink-0" />
        <span className="text-[#F0F0F2] drop-shadow-sm">{toastMessage}</span>
      </div>
    </div>
  );
};
