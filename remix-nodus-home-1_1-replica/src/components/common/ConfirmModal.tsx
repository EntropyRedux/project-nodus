import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { audio } from '../../utils/audio';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirm, settings } = useLauncher();

  if (!confirmDialog?.isOpen) return null;

  const { title, message, onConfirm, confirmText, isDestructive } = confirmDialog;
  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);

  return (
    <div 
      onClick={closeConfirm}
      className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm ${currentTheme.classes.modalContainer} ${currentTheme.cardRadius} p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-4 animate-in zoom-in-95 duration-200 ${currentTheme.classes.containerFont} ${currentTheme.classes.textPrimary} backdrop-blur-3xl transition-colors duration-200`}
        style={{ backgroundColor: getSurfaceRgba(settings.theme, settings.taskbarOpacity, 'modal') }}
      >
        <div className="flex items-center gap-3">
          <div 
            className={`w-10 h-10 ${currentTheme.buttonRadius} flex items-center justify-center shrink-0 ${
              isDestructive ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#10B981]/20 text-[#10B981]'
            }`}
          >
            {isDestructive ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            onClick={() => {
              audio.playTap();
              closeConfirm();
            }}
            className={`px-4 py-2 ${currentTheme.buttonRadius} text-xs font-semibold text-[#9CA3AF] hover:text-white hover:bg-white/5 transition`}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              audio.playTap();
              onConfirm();
            }}
            className={`px-4 py-2 ${currentTheme.buttonRadius} text-xs font-semibold shadow-lg transition active:scale-95 ${
              isDestructive 
                ? 'bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-[#EF4444]/30' 
                : 'bg-[#10B981] text-[#0A0A0E] hover:bg-[#059669] shadow-[#10B981]/30'
            }`}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
