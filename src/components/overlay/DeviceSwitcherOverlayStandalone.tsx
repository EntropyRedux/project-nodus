import React from 'react';
import { DeviceSidebar } from '../layout/DeviceSidebar';
import { DeviceProcessSidePanel } from '../layout/DeviceProcessSidePanel';

export const DeviceSwitcherOverlayStandalone: React.FC = () => {
  const handleClose = () => {
    try {
      if ((window as any).NodusNativeBridge?.closeOverlay) {
        (window as any).NodusNativeBridge.closeOverlay();
      }
    } catch (_) {}
  };

  return (
    <div 
      className="h-screen w-screen bg-black/40 backdrop-blur-xs flex items-center justify-start p-4 select-none animate-in fade-in duration-200 relative"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="w-full max-w-sm h-full max-h-[92vh] flex flex-row rounded-3xl overflow-hidden shadow-2xl shadow-black/90 animate-in slide-in-from-left duration-300 border border-white/10 bg-[#141416]/95 backdrop-blur-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <DeviceSidebar />
        <DeviceProcessSidePanel />
      </div>
    </div>
  );
};
