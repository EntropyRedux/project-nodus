import React, { useRef } from 'react';
import { SmartAppTaskbar } from '../layout/SmartAppTaskbar';

export const TaskbarOverlayStandalone: React.FC = () => {
  const mountTimeRef = useRef(Date.now());

  const handleClose = () => {
    if (Date.now() - mountTimeRef.current < 350) return;
    try {
      if ((window as any).NodusNativeBridge?.closeOverlay) {
        (window as any).NodusNativeBridge.closeOverlay();
      }
    } catch (_) {}
  };

  return (
    <div 
      className="h-screen w-screen bg-black/40 backdrop-blur-xs flex items-end justify-center p-3 select-none animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="w-full max-w-4xl flex flex-col items-center justify-center animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <SmartAppTaskbar />
      </div>
    </div>
  );
};
