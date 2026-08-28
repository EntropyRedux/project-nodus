import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { audio } from '../../utils/audio';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirm } = useLauncher();

  if (!confirmDialog?.isOpen) return null;

  const { title, message, onConfirm, confirmText, isDestructive } = confirmDialog;

  return (
    <div 
      onClick={closeConfirm}
      className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-3">
          <div 
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isDestructive ? 'bg-[#FF3B30]/20 text-[#FF3B30]' : 'bg-[#34C759]/20 text-[#34C759]'
            }`}
          >
            {isDestructive ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F0F0F2]">{title}</h3>
            <p className="text-xs text-[#8E8E93] mt-0.5 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button
            onClick={() => {
              audio.playTap();
              closeConfirm();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8E8E93] hover:text-white hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              audio.playTap();
              onConfirm();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition active:scale-95 ${
              isDestructive 
                ? 'bg-[#FF3B30] hover:bg-[#FF3B30]/90 shadow-[#FF3B30]/30' 
                : 'bg-[#34C759] text-[#0A0A0C] hover:bg-[#34C759]/90 shadow-[#34C759]/30'
            }`}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
