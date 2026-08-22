import React, { useRef, useEffect } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { AppWindow, Maximize2, Info, Move, Trash2, X } from 'lucide-react';
import { audio } from '../../utils/audio';

export const AppContextMenu: React.FC = () => {
  const { 
    appContextMenu, 
    closeAppContextMenu, 
    apps, 
    launchApp, 
    launchAppFloating, 
    setIsEditing, 
    uninstallApp, 
    showConfirm, 
    showToast 
  } = useLauncher();

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeAppContextMenu();
      }
    };
    if (appContextMenu?.isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [appContextMenu?.isOpen, closeAppContextMenu]);

  if (!appContextMenu?.isOpen) return null;

  const targetApp = apps.find((a) => a.id === appContextMenu.appId);
  if (!targetApp) return null;

  // Calculate clamp position so menu doesn't overflow viewport edges
  const posX = Math.min(Math.max(16, appContextMenu.x - 110), window.innerWidth - 240);
  const posY = Math.min(Math.max(16, appContextMenu.y - 40), window.innerHeight - 280);

  const handleOpenAppSettings = () => {
    audio.playTap();
    closeAppContextMenu();
    if (targetApp.packageName) {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge?.openAppSettings) {
        bridge.openAppSettings(targetApp.packageName);
        showToast(`Opening app info for ${targetApp.name}`);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={closeAppContextMenu}
    >
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        style={{ left: `${posX}px`, top: `${posY}px` }}
        className="absolute w-56 bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl space-y-1 select-none animate-in zoom-in-95 duration-150 text-[#F0F0F2]"
      >
        {/* App Title Header */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 border-b border-white/5">
          {targetApp.customIcon ? (
            <img src={targetApp.customIcon} alt={targetApp.name} className="w-7 h-7 rounded-lg object-cover shrink-0 shadow-sm" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#34C759]/20 flex items-center justify-center text-[#34C759] font-bold text-xs">
              {targetApp.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">{targetApp.name}</h4>
            <p className="text-[9px] text-[#8E8E93] truncate">{targetApp.packageName || 'System Shortcut'}</p>
          </div>
          <button 
            onClick={closeAppContextMenu}
            className="text-[#8E8E93] hover:text-white p-1 rounded-md transition"
          >
            <X size={13} />
          </button>
        </div>

        {/* Action Menu Items */}
        <div className="space-y-0.5 pt-1">
          {/* 1. Launch in Floating Window */}
          <button
            onClick={() => {
              audio.playTap();
              closeAppContextMenu();
              launchAppFloating(targetApp.id);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold hover:bg-white/10 text-[#34C759] transition"
          >
            <AppWindow size={15} className="text-[#34C759] shrink-0" />
            <span>Floating Window</span>
          </button>

          {/* 2. Launch Fullscreen */}
          <button
            onClick={() => {
              audio.playTap();
              closeAppContextMenu();
              launchApp(targetApp.id, 'fullscreen');
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-white/10 text-white transition"
          >
            <Maximize2 size={15} className="text-[#007AFF] shrink-0" />
            <span>Open Fullscreen</span>
          </button>

          {/* 3. App System Info */}
          {targetApp.packageName && (
            <button
              onClick={handleOpenAppSettings}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-white/10 text-[#8E8E93] hover:text-white transition"
            >
              <Info size={15} className="text-[#8E8E93] shrink-0" />
              <span>App Info</span>
            </button>
          )}

          {/* 4. Arrange Workspace */}
          <button
            onClick={() => {
              audio.playTap();
              closeAppContextMenu();
              setIsEditing(true);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-white/10 text-[#8E8E93] hover:text-white transition"
          >
            <Move size={15} className="text-[#FF9500] shrink-0" />
            <span>Arrange Icons</span>
          </button>

          {/* 5. Uninstall */}
          <button
            onClick={() => {
              audio.playTap();
              closeAppContextMenu();
              showConfirm(
                `Uninstall ${targetApp.name}?`,
                `Do you want to uninstall or remove "${targetApp.name}" from your device?`,
                () => uninstallApp(targetApp.id),
                'Uninstall',
                true
              );
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-[#FF3B30]/10 text-[#FF3B30] transition border-t border-white/5 mt-1"
          >
            <Trash2 size={15} className="shrink-0" />
            <span>Uninstall App</span>
          </button>
        </div>
      </div>
    </div>
  );
};
