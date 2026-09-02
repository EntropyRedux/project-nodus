import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { DeviceSidebar } from './DeviceSidebar';
import { DeviceProcessSidePanel } from './DeviceProcessSidePanel';
import { ClipboardHistoryPanel } from '../desktop/ClipboardHistoryPanel';
import { SmartAppTaskbar } from './SmartAppTaskbar';
import { DesktopAppWindow } from '../desktop/DesktopAppWindow';
import { MultiWindowManager } from '../desktop/MultiWindowManager';
import { FolderModal } from '../home/FolderModal';
import { ToastNotification } from '../common/ToastNotification';
import { ConfirmModal } from '../common/ConfirmModal';
import { AppContextMenu } from '../home/AppContextMenu';
import { AppIcon } from '../home/AppIcon';
import { TopWidgetRow } from '../home/TopWidgetRow';
import { NotesWidgetModal } from '../home/NotesWidgetModal';
import { SingleNoteModal } from '../home/SingleNoteModal';
import { DynamicIcon } from '../common/DynamicIcon';
import { WALLPAPER_PRESETS, DEVICE_COLORS } from '../../utils/constants';
import { getSystemTheme, getAccentColor, getSurfaceRgba } from '../../utils/themes';
import { SettingsApp } from '../apps/SettingsApp';
import { NotesApp } from '../apps/NotesApp';
import { audio } from '../../utils/audio';
import { fetchRemoteShortcuts, inferLucideIcon } from '../../services/RemoteShortcutsService';
import { Monitor, RefreshCw } from 'lucide-react';

export const DesktopLauncherShell: React.FC = () => {
  const {
    apps,
    folders,
    currentPageIndex,
    activeAppId,
    settings,
    updateSettings,
    isEditing,
    setActiveFolderId,
    addAppToFolder,
    createFolderFromApps,
    moveApp,
    draggedAppId,
    setDraggedAppId,
    dragPosition,
    setDragPosition,
    setHoverTargetAppId,
    folderCombineArmedId,
    setFolderCombineArmedId,
    devices,
    activeDeviceId,
    isSidebarCollapsed,
    toggleSidebar,
    setSearchOpen,
    isClipboardOpen,
    setClipboardOpen,
    setTaskbarOpen,
    closeActiveApp,
    openProcessManager,
    showToast,
    isDeviceRailVisible,
  } = useLauncher();

  const [isSyncingShortcuts, setIsSyncingShortcuts] = useState(false);

  const activeDevice = useMemo(() => {
    return devices.find((d) => d.id === activeDeviceId) || devices[0];
  }, [devices, activeDeviceId]);

  const isLocalDevice = activeDevice.type === 'tablet' || activeDevice.id === 'poco-pad';

  const handleSyncShortcuts = useCallback(async (quiet = false) => {
    if (isLocalDevice) return;
    const targetIp = activeDevice.ipAddress;
    if (!targetIp) {
      if (!quiet) showToast(`No IP address for ${activeDevice.name}`);
      return;
    }

    if (!quiet) audio.playTap();
    setIsSyncingShortcuts(true);
    const fetched = await fetchRemoteShortcuts(targetIp);
    setIsSyncingShortcuts(false);

    const isThisDevice = (e: any) =>
      e.deviceId === activeDevice.id ||
      e.deviceId === activeDeviceId ||
      e.deviceName === activeDevice.name ||
      e.deviceId === 'this-pc';

    const existingOther = (settings.remoteExecutables || []).filter((e) => !isThisDevice(e));

    const tagged = fetched.map((f) => ({
      ...f,
      deviceId: activeDevice.id,
      deviceName: activeDevice.name,
    }));

    updateSettings({
      remoteExecutables: [...tagged, ...existingOther],
    });

    if (fetched.length > 0) {
      if (!quiet) showToast(`Synced ${tagged.length} apps from ${activeDevice.name}`);
    } else if (!quiet) {
      showToast(`No shared apps configured on ${activeDevice.name}`);
    }
  }, [isLocalDevice, activeDevice, settings.remoteExecutables, updateSettings, showToast]);

  // Auto-sync when switching to a remote PC node
  useEffect(() => {
    if (!isLocalDevice && activeDevice.ipAddress) {
      handleSyncShortcuts(true);
    }
  }, [activeDeviceId, isLocalDevice]);

  useEffect(() => {
    const handleOpenPanel = (e: any) => {
      const panel = e.detail?.panel;
      if (panel === 'clipboard') {
        audio.playTap();
        setClipboardOpen(true);
      } else if (panel === 'device_switcher') {
        audio.playTap();
        if (isSidebarCollapsed) {
          toggleSidebar();
        }
      } else if (panel === 'taskbar') {
        audio.playTap();
        setTaskbarOpen(true);
        setSearchOpen(false);
      }
    };
    window.addEventListener('nodus_open_panel', handleOpenPanel);
    return () => window.removeEventListener('nodus_open_panel', handleOpenPanel);
  }, [isSidebarCollapsed, toggleSidebar, setClipboardOpen, setTaskbarOpen, setSearchOpen]);

  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const folderDwellTimerRef = useRef<number | null>(null);

  const draggedApp = useMemo(() => {
    return apps.find((a) => a.id === draggedAppId);
  }, [apps, draggedAppId]);

  // Global Pointer Tracker for Drag-to-Reorder & Folder Drop
  useEffect(() => {
    if (!draggedAppId) {
      if (folderDwellTimerRef.current) {
        clearTimeout(folderDwellTimerRef.current);
        folderDwellTimerRef.current = null;
      }
      setFolderCombineArmedId(null);
      return;
    }

    const handleGlobalPointerMove = (e: PointerEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });

      const targetElem = document.elementFromPoint(e.clientX, e.clientY);
      const targetAppCard = targetElem?.closest('[data-app-id]');
      const targetFolderCard = targetElem?.closest('[data-folder-id]');
      
      const targetId = targetAppCard?.getAttribute('data-app-id');
      const folderId = targetFolderCard?.getAttribute('data-folder-id');

      if (targetId && targetId !== draggedAppId) {
        setHoverTargetAppId(targetId);
        // If hovered over an app, arm folder combine if stationary for 450ms
        if (folderCombineArmedId !== targetId && !folderDwellTimerRef.current) {
          folderDwellTimerRef.current = window.setTimeout(() => {
            setFolderCombineArmedId(targetId);
            folderDwellTimerRef.current = null;
          }, 450);
        }
      } else {
        setHoverTargetAppId(null);
        if (folderDwellTimerRef.current) {
          clearTimeout(folderDwellTimerRef.current);
          folderDwellTimerRef.current = null;
        }
        setFolderCombineArmedId(null);
      }

      if (folderId) {
        setHoveredFolderId(folderId);
      } else {
        setHoveredFolderId(null);
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (folderDwellTimerRef.current) {
        clearTimeout(folderDwellTimerRef.current);
        folderDwellTimerRef.current = null;
      }

      const targetElem = document.elementFromPoint(e.clientX, e.clientY);
      const targetAppCard = targetElem?.closest('[data-app-id]');
      const targetFolderCard = targetElem?.closest('[data-folder-id]');
      
      const targetId = targetAppCard?.getAttribute('data-app-id');
      const folderId = targetFolderCard?.getAttribute('data-folder-id');

      if (folderId) {
        audio.playTap();
        addAppToFolder(folderId, draggedAppId);
      } else if (targetId && targetId !== draggedAppId) {
        audio.playTap();
        if (folderCombineArmedId === targetId) {
          createFolderFromApps(draggedAppId, targetId);
        } else {
          moveApp(draggedAppId, targetId);
        }
      }

      setDraggedAppId(null);
      setDragPosition(null);
      setHoverTargetAppId(null);
      setHoveredFolderId(null);
      setFolderCombineArmedId(null);
    };

    const handleGlobalPointerCancel = () => {
      if (folderDwellTimerRef.current) {
        clearTimeout(folderDwellTimerRef.current);
        folderDwellTimerRef.current = null;
      }
      setDraggedAppId(null);
      setDragPosition(null);
      setHoverTargetAppId(null);
      setHoveredFolderId(null);
      setFolderCombineArmedId(null);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp, { passive: true });
    window.addEventListener('pointercancel', handleGlobalPointerCancel, { passive: true });

    return () => {
      if (folderDwellTimerRef.current) {
        clearTimeout(folderDwellTimerRef.current);
        folderDwellTimerRef.current = null;
      }
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerCancel);
    };
  }, [draggedAppId, folderCombineArmedId, moveApp, addAppToFolder, createFolderFromApps, setDraggedAppId, setDragPosition, setHoverTargetAppId]);

  const currentTheme = getSystemTheme(settings.theme);
  const currentAccent = getAccentColor(settings.accentColor);
  const currentWp = WALLPAPER_PRESETS.find((w) => w.id === settings.wallpaper) || {
    id: currentTheme.wallpaperId,
    name: currentTheme.name,
    style: currentTheme.wallpaperStyle,
  };

  const wallpaperStyle = useMemo(() => {
    return settings.wallpaper === 'custom' && settings.customWallpaperUrl
      ? {
        backgroundImage: `url(${settings.customWallpaperUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : currentWp.style;
  }, [settings.wallpaper, settings.customWallpaperUrl, currentWp.style]);

  const activeApp = apps.find((a) => a.id === activeAppId);
  const isInternalApp = Boolean(activeAppId && (activeAppId === 'settings' || activeAppId === 'notes' || (activeApp && !activeApp.packageName && !activeApp.isRemote && !activeAppId.startsWith('remote_'))));

  const renderActiveApp = () => {
    if (!isInternalApp) return null;
    if (activeAppId === 'settings') {
      return <SettingsApp />;
    }
    if (activeAppId === 'notes') {
      return <NotesApp />;
    }
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
        <div 
          className={`w-16 h-16 ${currentTheme.cardRadius} flex items-center justify-center shadow-xl border border-white/10`}
          style={{ backgroundColor: activeApp?.color || currentAccent.hex }}
        >
          <DynamicIcon name={activeApp?.iconName || 'AppWindow'} size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#F1F5F9]">{activeApp?.name}</h3>
          <p className="text-xs text-[#94A3B8] max-w-sm">
            Active workstation process executing in high-performance cluster space.
          </p>
        </div>
      </div>
    );
  };

  const isContinuous = (settings.drawerLayout ?? 'continuous') === 'continuous';

  // Context-Aware App Grid Calculation
  const currentApps = useMemo(() => {
    if (isLocalDevice) {
      // 1. LOCAL ANDROID TABLET: Show local Android apps
      return isContinuous
        ? apps.filter((app) => !app.folderId)
        : apps.filter((app) => !app.folderId && (app.pageIndex ?? 0) === currentPageIndex);
    }

    // 2. REMOTE WORKSTATION: Show configured shortcuts for this specific device
    const matchingExecs = (settings.remoteExecutables || []).filter(
      (exec) => exec.enabled && (
        exec.deviceId === activeDevice.id || 
        exec.deviceId === activeDeviceId || 
        exec.deviceName === activeDevice.name ||
        exec.deviceId === 'this-pc' ||
        activeDevice.type === 'desktop' ||
        activeDevice.type === 'laptop'
      )
    );

    return matchingExecs.map((exec, idx) => {
      const fallback = inferLucideIcon(exec.name, exec.commandOrPackage || '');
      return {
        id: `remote_${exec.id}`,
        name: exec.name,
        iconName: exec.iconName || fallback.iconName,
        color: exec.iconColor || fallback.iconColor,
        category: exec.category || 'tools',
        pageIndex: 0,
        order: idx,
        isRemote: true,
        remoteExecutableId: exec.id,
        remoteDeviceName: exec.deviceName,
        remoteIconBase64: exec.iconBase64,
      };
    });
  }, [apps, isContinuous, currentPageIndex, settings.remoteExecutables, isLocalDevice, activeDevice, currentAccent.hex]);

  const currentFolders = useMemo(() => {
    if (!isLocalDevice) return [];
    if (isContinuous) {
      return folders;
    }
    return folders.filter((f) => (f.pageIndex ?? 0) === currentPageIndex);
  }, [folders, isContinuous, currentPageIndex, isLocalDevice]);

  const iconSize = settings.iconSize || 'medium';

  const gridMinSizeClass = {
    small: 'grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-y-6 gap-x-3 sm:gap-x-4',
    medium: 'grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-y-7 gap-x-4 sm:gap-x-5',
    large: 'grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-y-8 gap-x-5 sm:gap-x-6',
    xlarge: 'grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-y-9 gap-x-6 sm:gap-x-7',
  }[iconSize];

  // Folder style variations based on archetype
  const folderCardClass = {
    glass: 'rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/[0.08]',
    hud: 'rounded-none bg-black/80 hover:bg-black/95 border border-white/[0.16] shadow-[0_0_12px_rgba(0,0,0,0.8)]',
    brutalist: 'rounded-lg bg-[#181C26] hover:bg-[#202534] border-2 border-black shadow-[3px_3px_0px_#000000]',
    minimal: 'rounded-none bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08]',
    material: 'rounded-3xl bg-[#FFFFFF] hover:bg-[#F8FAFD] border border-[#E2E8F0] shadow-sm text-[#0F172A]',
  }[currentTheme.archetype] || 'rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/[0.08]';

  const windowModalClass = {
    glass: 'rounded-2xl border border-white/[0.12] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)]',
    hud: 'rounded-none border border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.15)]',
    brutalist: 'rounded-xl border-2 border-black shadow-[8px_8px_0px_#000000]',
    minimal: 'rounded-none border border-white/[0.14] shadow-none',
    material: 'rounded-3xl border border-[#E2E8F0] shadow-[0_20px_50px_rgba(0,0,0,0.12)]',
  }[currentTheme.archetype] || 'rounded-2xl border border-white/[0.12] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)]';

  return (
    <div
      data-theme={currentTheme.id}
      data-accent={currentAccent.id}
      className={`h-screen w-screen overflow-hidden flex flex-row ${currentTheme.classes.bgCanvas} ${currentTheme.classes.textPrimary} ${currentTheme.classes.containerFont} select-none relative workstation-grid-bg transition-colors duration-300`}
    >
      {/* Background Wallpaper */}
      <div
        className="fixed inset-0 bg-cover bg-center transition-all duration-500 ease-in-out pointer-events-none z-0"
        style={wallpaperStyle}
      >
        <div className={`absolute inset-0 ${currentTheme.classes.bgOverlay} backdrop-blur-[0.5px] transition-colors duration-300`} />
      </div>

      {/* 1. Left Multi-Device Mesh Sidebar */}
      {settings.enableMultiDevice && isDeviceRailVisible && <DeviceSidebar />}

      {/* 2. Side Panel for Device Processes */}
      {settings.enableMultiDevice && isDeviceRailVisible && <DeviceProcessSidePanel />}

      {/* 3. Main Desktop Canvas */}
      <main className="flex-1 h-full flex flex-col justify-between relative overflow-hidden transition-all duration-300 ease-in-out z-10">
        {/* Apps Canvas Area */}
        <div className="flex-1 flex flex-row min-h-0 relative p-4 sm:p-6 lg:p-8 pb-20 overflow-hidden gap-4">
          <div
            className={`flex-1 h-full min-h-0 ${isContinuous ? 'overflow-y-auto' : 'overflow-hidden'} pr-1 scrollbar-thin flex flex-col`}
          >
            {/* Top Persistent Widget Area (Seamless floating single widget) */}
            <TopWidgetRow />

            <div
              className={`grid ${gridMinSizeClass} auto-rows-max items-start justify-items-center w-full min-h-full pt-1 pb-24`}
            >
              {/* Folders in current scope - Seamless Translucent Tile */}
              {currentFolders.map((folder) => {
                const folderApps = folder.appIds
                  .map((id) => apps.find((a) => a.id === id))
                  .filter(Boolean) as typeof apps;
                const previewApps = folderApps.slice(0, 4);

                return (
                  <div
                    key={folder.id}
                    data-folder-id={folder.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.playTap();
                      setActiveFolderId(folder.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (hoveredFolderId !== folder.id) setHoveredFolderId(folder.id);
                    }}
                    onDragLeave={() => {
                      if (hoveredFolderId === folder.id) setHoveredFolderId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setHoveredFolderId(null);
                      const draggedId = e.dataTransfer.getData('text/plain');
                      if (draggedId && !folder.appIds.includes(draggedId)) {
                        addAppToFolder(folder.id, draggedId);
                      }
                    }}
                    className={`flex flex-col items-center justify-start w-full min-w-[76px] max-w-[90px] cursor-pointer group active:scale-95 transition-all select-none ${
                      isEditing ? 'animate-wiggle touch-none' : ''
                    }`}
                  >
                    <div
                      className={`w-14 h-14 ${folderCardClass} p-1.5 grid grid-cols-2 gap-1 items-center justify-items-center group-hover:scale-105 transition-all relative ${
                        hoveredFolderId === folder.id ? 'ring-2 scale-110' : ''
                      }`}
                      style={{
                        borderColor: hoveredFolderId === folder.id ? currentAccent.hex : undefined,
                        boxShadow: hoveredFolderId === folder.id ? `0 0 16px ${currentAccent.glowRgba}` : undefined,
                      }}
                    >
                      {previewApps.map((fApp) => (
                        <div
                          key={fApp.id}
                          className="w-5 h-5 rounded-md bg-black/10 border border-white/[0.04] flex items-center justify-center overflow-hidden"
                        >
                          {fApp.customIcon ? (
                            <img
                              src={fApp.customIcon}
                              alt={fApp.name}
                              className="w-4 h-4 object-contain"
                            />
                          ) : (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: fApp.color || currentAccent.hex }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <span className={`text-[11px] font-medium ${currentTheme.classes.textPrimary} mt-1.5 truncate w-full max-w-[80px] text-center drop-shadow-md select-none leading-tight tracking-tight`}>
                      {folder.name}
                    </span>
                  </div>
                );
              })}

              {/* Empty State for Remote PC Nodes */}
              {!isLocalDevice && currentApps.length === 0 && (
                <div className="col-span-full py-16 px-4 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-xl"
                    style={{ backgroundColor: `${currentAccent.hex}18`, color: currentAccent.hex }}
                  >
                    <Monitor size={30} />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h3 className="text-base font-bold text-white tracking-wide">No Apps Shared from {activeDevice.name}</h3>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      Open <span className="text-white font-semibold">Nodus Desktop</span> on your Windows PC to select installed apps from the Start Menu or configure a watched shortcuts folder.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSyncShortcuts(false)}
                    disabled={isSyncingShortcuts}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xl active:scale-95 border border-white/10"
                    style={{ backgroundColor: currentAccent.hex, color: '#090B10' }}
                  >
                    <RefreshCw size={14} className={isSyncingShortcuts ? 'animate-spin' : ''} />
                    <span>{isSyncingShortcuts ? 'Syncing with PC...' : `Sync Apps from ${activeDevice.name}`}</span>
                  </button>
                </div>
              )}

              {/* Desktop Apps & Remote Shortcuts */}
              {currentApps.map((app) => (
                <AppIcon key={app.id} app={app} size="normal" />
              ))}

              {/* Sync Pill for Remote PC Mode with Active Apps */}
              {!isLocalDevice && currentApps.length > 0 && (
                <div
                  onClick={() => handleSyncShortcuts(false)}
                  title="Sync updated apps from PC"
                  className="flex flex-col items-center justify-start w-full min-w-[76px] max-w-[90px] cursor-pointer group active:scale-95 transition-all select-none"
                >
                  <div 
                    className={`w-14 h-14 ${currentTheme.cardRadius} border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] flex items-center justify-center transition group-hover:scale-105 shadow-md`}
                    style={{ color: currentAccent.hex }}
                  >
                    <RefreshCw size={20} className={`transition-transform duration-300 ${isSyncingShortcuts ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                  </div>
                  <span className="text-[10px] font-mono text-[#94A3B8] group-hover:text-white mt-1.5 truncate w-full text-center">
                    Sync PC
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Multi-Window Floating PWA & App Canvas */}
          <MultiWindowManager />

          {/* Active Internal App Window Modal (Fallback when experimental multi-window is disabled) */}
          {!settings.enableExperimentalPwaWindows && isInternalApp && (
            <div 
              className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 pb-20 backdrop-blur-md animate-in fade-in duration-200"
              style={{ backgroundColor: `rgba(0, 0, 0, ${Math.min(0.55, ((settings.taskbarOpacity ?? 92) / 100) * 0.45).toFixed(2)})` }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  audio.playTap();
                  closeActiveApp();
                }
              }}
            >
              <div 
                className="w-full max-w-4xl h-[85vh] max-h-[820px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 bg-transparent"
              >
                <DesktopAppWindow appId={activeAppId!}>
                  {renderActiveApp()}
                </DesktopAppWindow>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Desktop Column: Cross-Device Clipboard Panel */}
      <div
        className={`fixed top-4 bottom-18 right-4 z-50 w-84 sm:w-88 xl:w-96 flex flex-col rounded-2xl shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
          isClipboardOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
            : 'translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        <ClipboardHistoryPanel onClose={() => setClipboardOpen(false)} />
      </div>

      <SmartAppTaskbar />
      <FolderModal />
      <NotesWidgetModal />
      <SingleNoteModal />
      <ConfirmModal />
      <ToastNotification />
      <AppContextMenu />

      {/* Floating Drag Avatar */}
      {draggedApp && dragPosition && (
        <div
          className="fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center scale-110 drop-shadow-2xl"
          style={{
            left: `${dragPosition.x}px`,
            top: `${dragPosition.y}px`,
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl bg-[#141924] flex items-center justify-center shadow-2xl ring-2 ring-[#38BDF8] border border-white/20"
            style={draggedApp.color ? { backgroundColor: draggedApp.color } : {}}
          >
            {draggedApp.customIcon ? (
              <img src={draggedApp.customIcon} alt={draggedApp.name} className="w-10 h-10 object-contain drop-shadow pointer-events-none" />
            ) : (
              <div style={{ color: '#FFFFFF' }}>
                <DynamicIcon name={draggedApp.iconName} size={28} strokeWidth={2.2} />
              </div>
            )}
          </div>
          <span className="text-xs font-semibold text-white mt-1.5 px-2.5 py-0.5 rounded-full bg-black/90 backdrop-blur-md shadow-lg border border-white/10 select-none">
            {draggedApp.name}
          </span>
        </div>
      )}
    </div>
  );
};
