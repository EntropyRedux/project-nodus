import React, { useRef } from 'react';
import { ClipboardHistoryPanel } from '../desktop/ClipboardHistoryPanel';

export const ClipboardOverlayStandalone: React.FC = () => {
  const mountTimeRef = useRef(Date.now());

  const handleClose = () => {
    // Prevent initial tap bleed-through from closing immediately
    if (Date.now() - mountTimeRef.current < 350) return;
    try {
      if ((window as any).NodusNativeBridge?.closeOverlay) {
        (window as any).NodusNativeBridge.closeOverlay();
      }
    } catch (_) {}
  };

  return (
    <div 
      className="h-screen w-screen bg-black/40 backdrop-blur-xs flex items-center justify-end p-4 select-none animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="w-full max-w-sm h-full max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-black/90 animate-in slide-in-from-right duration-300 border border-white/10 bg-[#141416]/95 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ClipboardHistoryPanel onClose={handleClose} />
      </div>
    </div>
  );
};
