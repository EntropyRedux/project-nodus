import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirm, settings } = useLauncher();

  const currentTheme = getSystemTheme(settings?.theme || 'aurora-dark');
  const currentAccent = getAccentColor(settings?.accentColor || 'emerald');

  if (!confirmDialog?.isOpen) return null;

  const { title, message, onConfirm, confirmText, isDestructive } = confirmDialog;

  return (
    <div 
      onClick={closeConfirm}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: getSurfaceRgba(settings?.theme || 'aurora-dark', 98, 'popup') }}
        className={`w-full max-w-sm ${currentTheme.classes.modalContainer} ${currentTheme.cardRadius} p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 ${currentTheme.classes.containerFont}`}
      >
        <div className="flex items-center gap-3">
          <div 
            className={`w-10 h-10 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 border ${
              isDestructive 
                ? currentTheme.isLight
                  ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]'
                  : 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/30'
                : currentTheme.isLight
                ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                : 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30'
            }`}
          >
            {isDestructive ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>
          <div>
            <h3 className={`text-sm font-bold ${currentTheme.classes.textPrimary}`}>{title}</h3>
            <p className={`text-xs ${currentTheme.classes.textSecondary} mt-0.5 leading-relaxed`}>{message}</p>
          </div>
        </div>

        <div className={`flex items-center justify-end gap-2 pt-2 border-t ${currentTheme.isLight ? 'border-[#E2E8F0]' : 'border-white/5'}`}>
          <button
            onClick={() => {
              audio.playTap();
              closeConfirm();
            }}
            className={`px-4 py-2 ${currentTheme.buttonRadius} ${currentTheme.classes.actionButton} text-xs font-semibold transition`}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              audio.playTap();
              onConfirm();
              closeConfirm();
            }}
            className={`px-4 py-2 ${currentTheme.buttonRadius} text-xs font-semibold shadow-lg transition active:scale-95 ${
              isDestructive 
                ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-[#DC2626]/20' 
                : 'text-[#090B10] font-bold'
            }`}
            style={!isDestructive ? { backgroundColor: currentAccent.hex, boxShadow: `0 4px 14px ${currentAccent.glowRgba}` } : undefined}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
