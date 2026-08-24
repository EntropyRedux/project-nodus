import React from 'react';
import { ClipboardHistoryPanel } from '../desktop/ClipboardHistoryPanel';

export const ClipboardOverlayStandalone: React.FC = () => {
  const handleClose = () => {
    try {
      if ((window as any).NodusNativeBridge?.closeOverlay) {
        (window as any).NodusNativeBridge.closeOverlay();
      }
    } catch (_) {}
  };

  return (
    <div className="w-screen h-screen sm:w-full sm:h-full p-2 select-none flex flex-col">
      <div className="w-full h-full flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-black/90 border border-white/10 bg-[#141416]/98 backdrop-blur-xl">
        <ClipboardHistoryPanel onClose={handleClose} />
      </div>
    </div>
  );
};
