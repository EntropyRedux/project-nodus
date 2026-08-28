import React, { useRef, useEffect } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { SmartAppTaskbar } from '../layout/SmartAppTaskbar';
import { ClipboardHistoryPanel } from '../desktop/ClipboardHistoryPanel';
import { DeviceSwitcherOverlayStandalone } from './DeviceSwitcherOverlayStandalone';
import { ToastNotification } from '../common/ToastNotification';
import { AppContextMenu } from '../home/AppContextMenu';

export const TaskbarOverlayStandalone: React.FC = () => {
  const {
    isClipboardOpen,
    setClipboardOpen,
    isSidebarCollapsed,
    toggleSidebar,
    setTaskbarOpen,
  } = useLauncher();

  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    // Open the Taskbar immediately upon overlay load
    setTaskbarOpen(true);
  }, [setTaskbarOpen]);

  const handleClose = () => {
    if (Date.now() - mountTimeRef.current < 250) return;
    try {
      if ((window as any).NodusNativeBridge?.closeOverlay) {
        (window as any).NodusNativeBridge.closeOverlay();
      }
    } catch (_) {}
  };

  return (
    <div
      className="fixed inset-0 h-screen w-screen bg-black/45 backdrop-blur-xs flex items-end justify-center select-none animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      {/* Floating Clipboard History Sheet (Right Side) */}
      <div
        className={`fixed top-12 bottom-20 right-4 z-50 w-80 sm:w-84 xl:w-90 flex flex-col rounded-3xl shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
          isClipboardOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto shadow-2xl shadow-black/90'
            : 'translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        <ClipboardHistoryPanel onClose={() => setClipboardOpen(false)} />
      </div>

      {/* Floating Device Switcher Sheet (Left Side) */}
      {!isSidebarCollapsed && (
        <div className="fixed top-12 bottom-20 left-4 z-50 w-80 sm:w-96 flex flex-col rounded-3xl shadow-2xl shadow-black/90 animate-in slide-in-from-left duration-250">
          <DeviceSwitcherOverlayStandalone onClose={() => toggleSidebar()} />
        </div>
      )}

      {/* Center Bottom Floating Smart Taskbar */}
      <div
        className="w-full max-w-4xl flex flex-col items-center justify-center pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <SmartAppTaskbar forceOpen={true} />
      </div>

      <ToastNotification />
      <AppContextMenu />
    </div>
  );
};
