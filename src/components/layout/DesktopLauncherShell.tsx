import React, { useMemo, useState, useEffect } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { DeviceSidebar } from './DeviceSidebar';
import { DeviceProcessSidePanel } from './DeviceProcessSidePanel';
import { ClipboardHistoryPanel } from '../desktop/ClipboardHistoryPanel';
import { SmartAppTaskbar } from './SmartAppTaskbar';
import { FloatingAssistiveCircle } from '../common/FloatingAssistiveCircle';
import { DesktopAppWindow } from '../desktop/DesktopAppWindow';
import { QuickSettingsShade } from './QuickSettingsShade';
import { FolderModal } from '../home/FolderModal';
import { UniversalSearchModal } from '../home/UniversalSearchModal';
import { ToastNotification } from '../common/ToastNotification';
import { ConfirmModal } from '../common/ConfirmModal';
import { AppContextMenu } from '../home/AppContextMenu';
import { AppIcon } from '../home/AppIcon';
import { DynamicIcon } from '../common/DynamicIcon';
import { WALLPAPER_PRESETS } from '../../utils/constants';

// Built-in Real Apps
import { SettingsApp } from '../apps/SettingsApp';
import { TerminalApp } from '../apps/TerminalApp';
import { PlatformCodeStudioApp } from '../apps/PlatformCodeStudioApp';
import { ProcessMonitorApp } from '../apps/ProcessMonitorApp';
import { NetworkMeshApp } from '../apps/NetworkMeshApp';
import { UniversalClipboardApp } from '../apps/UniversalClipboardApp';
import { FileExplorerApp } from '../apps/FileExplorerApp';
import { audio } from '../../utils/audio';
import {
  FolderPlus,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutGrid,
  AppWindow,
  Clock,
  Calendar,
  Bell,
  Clipboard as ClipboardIcon,
  Settings as SettingsIcon,
  Battery,
  BatteryCharging,
  Zap
} from 'lucide-react';

export const DesktopLauncherShell: React.FC = () => {
  const {
    apps,
    folders,
    currentPageIndex,
    totalPages,
    setCurrentPageIndex,
    activeAppId,
    launchApp,
    settings,
    updateSettings,
    isEditing,
    setIsEditing,
    setActiveFolderId,
    createFolder,
    addAppToFolder,
    moveApp,
    draggedAppId,
    setDraggedAppId,
    dragPosition,
    setDragPosition,
    hoverTargetAppId,
    setHoverTargetAppId,
    openQuickSettings,
    devices,
    activeDeviceId,
    activeDevice,
    isSidebarCollapsed,
    toggleSidebar,
    setSearchOpen,
    isClipboardOpen,
    setClipboardOpen,
    toggleClipboardPanel,
    setTaskbarOpen,
    isFloatingModeArmed,
    toggleFloatingMode,
    notifications,
    totalUnreadNotifications,
    toggleQuickSettings,
  } = useLauncher();

  // Listen to Native System Overlay Open Panel events
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

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [currentTime]);

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }, [currentTime]);

  const unreadNotificationCount = totalUnreadNotifications;

  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(activeDevice?.battery ?? 85);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        const onLevelChange = () => setBatteryLevel(Math.round(battery.level * 100));
        const onChargingChange = () => setIsCharging(battery.charging);

        battery.addEventListener('levelchange', onLevelChange);
        battery.addEventListener('chargingchange', onChargingChange);

        return () => {
          battery.removeEventListener('levelchange', onLevelChange);
          battery.removeEventListener('chargingchange', onChargingChange);
        };
      }).catch(() => {});
    } else if (activeDevice?.battery) {
      setBatteryLevel(activeDevice.battery);
    }
  }, [activeDevice?.battery]);

  const draggedApp = useMemo(() => {
    return apps.find((a) => a.id === draggedAppId);
  }, [apps, draggedAppId]);

  // Global Pointer Tracker for Drag-to-Reorder & Folder Drop
  useEffect(() => {
    if (!draggedAppId) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });

      const targetElem = document.elementFromPoint(e.clientX, e.clientY);
      const targetAppCard = targetElem?.closest('[data-app-id]');
      const targetFolderCard = targetElem?.closest('[data-folder-id]');
      
      const targetId = targetAppCard?.getAttribute('data-app-id');
      const folderId = targetFolderCard?.getAttribute('data-folder-id');

      if (targetId && targetId !== draggedAppId) {
        setHoverTargetAppId(targetId);
      } else {
        setHoverTargetAppId(null);
      }

      if (folderId) {
        setHoveredFolderId(folderId);
      } else {
        setHoveredFolderId(null);
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
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
        moveApp(draggedAppId, targetId);
      }

      setDraggedAppId(null);
      setDragPosition(null);
      setHoverTargetAppId(null);
      setHoveredFolderId(null);
    };

    const handleGlobalPointerCancel = () => {
      setDraggedAppId(null);
      setDragPosition(null);
      setHoverTargetAppId(null);
      setHoveredFolderId(null);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp, { passive: true });
    window.addEventListener('pointercancel', handleGlobalPointerCancel, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerCancel);
    };
  }, [draggedAppId, moveApp, addAppToFolder, setDraggedAppId, setDragPosition, setHoverTargetAppId]);

  const currentDevice = devices.find((d) => d.id === activeDeviceId) || devices[0];
  const currentWp = WALLPAPER_PRESETS.find((w) => w.id === settings.wallpaper) || WALLPAPER_PRESETS[0];

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
  const isInternalApp = Boolean(activeAppId && !activeApp?.packageName);

  const renderActiveApp = () => {
    if (!isInternalApp) return null;
    switch (activeAppId) {
      case 'settings':
        return <SettingsApp />;
      case 'terminal':
        return <TerminalApp />;
      case 'studio':
        return <PlatformCodeStudioApp />;
      case 'monitor':
        return <ProcessMonitorApp />;
      case 'network':
        return <NetworkMeshApp />;
      case 'clipboard':
        return <UniversalClipboardApp />;
      case 'files':
        return <FileExplorerApp />;
      default:
        return null;
    }
  };

  const isContinuous = (settings.drawerLayout ?? 'continuous') === 'continuous';

  // Filter apps based on layout mode
  const currentApps = useMemo(() => {
    if (isContinuous) {
      return apps.filter((app) => !app.folderId);
    }
    return apps.filter((app) => !app.folderId && (app.pageIndex ?? 0) === currentPageIndex);
  }, [apps, isContinuous, currentPageIndex]);

  const currentFolders = useMemo(() => {
    if (isContinuous) {
      return folders;
    }
    return folders.filter((f) => (f.pageIndex ?? 0) === currentPageIndex);
  }, [folders, isContinuous, currentPageIndex]);

  const handleCreateFolder = () => {
    audio.playTap();
    const candidateApps = apps.filter((a) => !a.folderId);
    if (candidateApps.length >= 2) {
      createFolder('Utilities', [candidateApps[0].id, candidateApps[1].id], currentPageIndex);
    } else {
      createFolder('Work & Tools', [], currentPageIndex);
    }
  };

  const iconSize = settings.iconSize || 'medium';

  // Responsive dynamic grid column sizing based on icon size setting
  const gridMinSizeClass = {
    small: 'grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-y-6 gap-x-3 sm:gap-x-4',
    medium: 'grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-y-7 gap-x-4 sm:gap-x-5',
    large: 'grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-y-8 gap-x-5 sm:gap-x-6',
    xlarge: 'grid-cols-[repeat(auto-fill,minmax(114px,1fr))] gap-y-9 gap-x-6 sm:gap-x-7',
  }[iconSize];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-row bg-[#0A0A0C] text-[#F0F0F2] font-sans select-none relative">
      {/* Fixed Full-Window Background Wallpaper */}
      <div
        className="fixed inset-0 bg-cover bg-center transition-all duration-500 ease-in-out pointer-events-none z-0"
        style={wallpaperStyle}
      >
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[0.5px]" />
      </div>

      {/* 1. Left Sidebar with Device Selection */}
      <DeviceSidebar />

      {/* 2. Side Panel for Device Processes */}
      <DeviceProcessSidePanel />

      {/* 3. Main Android Desktop Canvas */}
      <main
        className="flex-1 h-full flex flex-col justify-between relative overflow-hidden transition-all duration-300 ease-in-out z-10"
      >
        {/* Top Android Status & Action Bar */}
        <header className="relative z-20 px-4 py-2.5 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5 shrink-0 gap-3">
          {/* Left: Device Name, Live Time/Date, Pagination Controls */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Device Name Badge */}
            <span className="text-xs font-bold text-[#F0F0F2] tracking-wider uppercase bg-[#1C1C1E]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
              {activeDevice?.name || 'Android Node'}
            </span>

            {/* Battery Pill right beside device name */}
            <div className="flex items-center gap-1.5 bg-[#1C1C1E]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-sm text-xs shrink-0" title={`Battery: ${batteryLevel}% ${isCharging ? '(Charging)' : ''}`}>
              {isCharging ? (
                <Zap size={12} className="text-[#FFD60A] fill-current animate-pulse" />
              ) : batteryLevel > 20 ? (
                <Battery size={13} className="text-[#34C759]" />
              ) : (
                <Battery size={13} className="text-[#FF3B30] animate-pulse" />
              )}
              <span className="font-semibold text-[#F0F0F2] font-mono text-[11px]">{batteryLevel}%</span>
            </div>

            {/* Time & Date Pill right beside device name */}
            <div className="flex items-center gap-2 bg-[#1C1C1E]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm text-xs shrink-0">
              <Clock size={12} className="text-[#34C759]" />
              <span className="font-semibold text-[#F0F0F2] font-mono text-[11px]">{formattedTime}</span>
              <span className="text-white/20">•</span>
              <Calendar size={12} className="text-[#007AFF]" />
              <span className="text-[#8E8E93] text-[11px]">{formattedDate}</span>
            </div>

            {/* Pagination Controls (shown in Paginated Mode) */}
            {!isContinuous ? (
              <div className="hidden md:flex items-center gap-1 bg-[#1C1C1E]/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                <button
                  disabled={currentPageIndex === 0}
                  onClick={() => {
                    audio.playTap();
                    setCurrentPageIndex(currentPageIndex - 1);
                  }}
                  className="p-0.5 rounded text-[#8E8E93] hover:text-[#F0F0F2] disabled:opacity-20 transition"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      audio.playTap();
                      setCurrentPageIndex(idx);
                    }}
                    className={`transition-all duration-300 rounded-full ${currentPageIndex === idx
                        ? 'w-4 h-1.5 bg-[#34C759]'
                        : 'w-1.5 h-1.5 bg-[#4A4A4F] hover:bg-[#8E8E93]'
                      }`}
                  />
                ))}

                <button
                  disabled={currentPageIndex === totalPages - 1}
                  onClick={() => {
                    audio.playTap();
                    setCurrentPageIndex(currentPageIndex + 1);
                  }}
                  className="p-0.5 rounded text-[#8E8E93] hover:text-[#F0F0F2] disabled:opacity-20 transition"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#1C1C1E]/60 rounded-full border border-white/5 text-[11px] text-[#8E8E93]">
                <LayoutGrid size={12} className="text-[#34C759]" />
                <span>All Apps ({currentApps.length})</span>
              </div>
            )}

            {/* Arrange Mode Toolset */}
            {isEditing && (
              <div className="flex items-center gap-1.5 bg-[#1C1C1E]/90 px-2.5 py-1 rounded-full border border-[#34C759]/40 shadow-lg animate-in fade-in">
                <button
                  onClick={handleCreateFolder}
                  className="px-2 py-0.5 bg-[#34C759]/20 hover:bg-[#34C759]/30 text-[#34C759] rounded-full text-xs flex items-center gap-1 font-semibold transition"
                  title="Create a new folder"
                >
                  <FolderPlus size={13} /> + Folder
                </button>

                <div className="h-3 w-[1px] bg-white/20 mx-1" />

                {/* Icon Size Toggle in Arrange Mode */}
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  {(['small', 'medium', 'large', 'xlarge'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => {
                        audio.playTap();
                        updateSettings({ iconSize: sz });
                      }}
                      className={`px-1.5 py-0.5 rounded transition uppercase ${iconSize === sz
                          ? 'bg-[#34C759] text-[#0A0A0C]'
                          : 'text-[#8E8E93] hover:text-white'
                        }`}
                      title={`Icon Size: ${sz}`}
                    >
                      {sz === 'xlarge' ? 'XL' : sz.charAt(0)}
                    </button>
                  ))}
                </div>

                <div className="h-3 w-[1px] bg-white/20 mx-1" />

                {/* Layout Mode Toggle */}
                <button
                  onClick={() => {
                    audio.playTap();
                    updateSettings({ drawerLayout: isContinuous ? 'paginated' : 'continuous' });
                  }}
                  className="px-2 py-0.5 text-[#8E8E93] hover:text-white rounded text-[10px] font-semibold transition"
                  title="Toggle Drawer vs Paginated View"
                >
                  {isContinuous ? 'Pages' : 'Drawer'}
                </button>
              </div>
            )}
          </div>

          {/* Right: Search, Arrange, Floating, Clipboard, Notifications, Settings (Icon Only) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Search Button */}
            <button
              onClick={() => {
                audio.playTap();
                setSearchOpen(true);
              }}
              className="p-2 bg-[#1C1C1E]/80 hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] rounded-full border border-white/10 transition shadow-sm"
              title="Universal Search (Ctrl+Space)"
            >
              <Search size={14} className="text-[#34C759]" />
            </button>

            {/* Arrange Icons Toggle */}
            <button
              onClick={() => {
                audio.playTap();
                setIsEditing(!isEditing);
              }}
              className={`p-2 rounded-full border transition ${isEditing
                  ? 'bg-[#34C759] text-[#0A0A0C] border-[#34C759] shadow-md shadow-[#34C759]/20'
                  : 'bg-[#1C1C1E]/80 text-[#8E8E93] hover:text-[#F0F0F2] border-white/10 hover:bg-[#1C1C1E]'
                }`}
              title={isEditing ? 'Finish Arranging' : 'Arrange Apps & Folders'}
            >
              {isEditing ? <Check size={14} /> : <Sparkles size={14} />}
            </button>

            {/* Floating Window Mode Toggle */}
            <button
              onClick={() => {
                toggleFloatingMode();
              }}
              className={`p-2 rounded-full border transition ${isFloatingModeArmed
                  ? 'bg-[#34C759] text-[#0A0A0C] border-[#34C759] shadow-md shadow-[#34C759]/20'
                  : 'bg-[#1C1C1E]/80 text-[#8E8E93] hover:text-[#F0F0F2] border-white/10 hover:bg-[#1C1C1E]'
                }`}
              title={isFloatingModeArmed ? 'Floating Mode: Active (Click to disable)' : 'Enable Floating Mode'}
            >
              <AppWindow size={14} className={isFloatingModeArmed ? 'text-black' : 'text-[#34C759]'} />
            </button>

            {/* Clipboard History Panel Toggle */}
            <button
              onClick={() => {
                toggleClipboardPanel();
              }}
              className={`p-2 rounded-full border transition ${isClipboardOpen
                  ? 'bg-[#34C759] text-[#0A0A0C] border-[#34C759] shadow-md shadow-[#34C759]/20'
                  : 'bg-[#1C1C1E]/80 text-[#8E8E93] hover:text-[#F0F0F2] border-white/10 hover:bg-[#1C1C1E]'
                }`}
              title={isClipboardOpen ? 'Hide Clipboard History' : 'Show Clipboard History'}
            >
              <ClipboardIcon size={14} className={isClipboardOpen ? 'text-black' : 'text-[#34C759]'} />
            </button>

            {/* Pending Notifications Indicator Status Icon (Swipe down from top edge to view) */}
            <div
              className={`relative p-2 rounded-full border transition flex items-center justify-center select-none ${
                unreadNotificationCount > 0
                  ? 'bg-[#1C1C1E]/90 text-[#FF9500] border-[#FF9500]/40 shadow-sm shadow-[#FF9500]/20'
                  : 'bg-[#1C1C1E]/80 text-[#8E8E93] border-white/10'
              }`}
              title={unreadNotificationCount > 0 ? `${unreadNotificationCount} pending notifications (Swipe down from top edge to view)` : 'No pending notifications'}
            >
              <Bell size={14} className={unreadNotificationCount > 0 ? 'animate-pulse' : ''} />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-extrabold flex items-center justify-center shadow-lg border-2 border-[#0A0A0C] leading-none pointer-events-none">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </div>

            {/* Settings & Hub Trigger */}
            <button
              onClick={() => {
                audio.playTap();
                launchApp('settings');
              }}
              className="p-2 bg-[#1C1C1E]/80 hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#34C759] rounded-full border border-white/10 transition"
              title="Settings & Hub"
            >
              <SettingsIcon size={14} />
            </button>
          </div>
        </header>

        {/* Dynamic Desktop Workspace Canvas */}
        <div className="flex-1 flex flex-row min-h-0 relative p-3 sm:p-5 overflow-hidden gap-4">
          {/* App Drawer & Paged Home Canvas (Always Mounted for 0ms return lag) */}
          <div
            className={`flex-1 h-full min-h-0 ${isContinuous ? 'overflow-y-auto' : 'overflow-hidden'
              } pr-1`}
          >
            <div
              className={`grid ${gridMinSizeClass} auto-rows-max items-start justify-items-center w-full min-h-full pt-3 sm:pt-4 pb-20`}
            >
              {/* Folders in current scope */}
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
                    className={`flex flex-col items-center justify-start w-full min-w-[72px] max-w-[88px] cursor-pointer group active:scale-95 transition-all select-none ${isEditing ? 'animate-wiggle touch-none' : ''
                      }`}
                  >
                    {/* 2x2 Folder Icon Tile Preview */}
                    <div
                      className={`w-14 h-14 rounded-[1.5rem] bg-[#1C1C1E]/90 backdrop-blur-md border border-white/10 p-1.5 grid grid-cols-2 gap-1 items-center justify-items-center shadow-xl group-hover:bg-[#2C2C2E]/90 group-hover:scale-105 transition-all relative ${hoveredFolderId === folder.id ? 'ring-4 ring-[#34C759] scale-110 shadow-2xl' : ''
                        }`}
                    >
                      {previewApps.map((fApp) => {
                        return (
                          <div
                            key={fApp.id}
                            className="w-5 h-5 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden"
                          >
                            {fApp.customIcon ? (
                              <img
                                src={fApp.customIcon}
                                alt={fApp.name}
                                className="w-4 h-4 object-contain"
                              />
                            ) : (
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: fApp.color || '#34C759' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-medium text-[#F0F0F2] mt-1.5 truncate w-full max-w-[76px] text-center drop-shadow-md select-none leading-tight">
                      {folder.name}
                    </span>
                  </div>
                );
              })}

              {/* Desktop Apps */}
              {currentApps.map((app) => (
                <AppIcon key={app.id} app={app} size="normal" />
              ))}
            </div>
          </div>

          {/* Active Internal App Window (GPU-composited overlay) */}
          {isInternalApp && (
            <div 
              className="absolute inset-3 sm:inset-4 z-30 flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-200"
              style={{ contain: 'layout paint' }}
            >
              <DesktopAppWindow appId={activeAppId!}>
                {renderActiveApp()}
              </DesktopAppWindow>
            </div>
          )}

        </div>
      </main>

      {/* Global Overlays & Modals */}
      {/* Right Desktop Column: Cross-Device Clipboard History Panel (GPU-Accelerated Floating Sheet) */}
      <div
        className={`fixed top-14 bottom-14 right-4 z-50 w-80 sm:w-84 xl:w-90 flex flex-col rounded-3xl shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${isClipboardOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto shadow-2xl shadow-black/90'
            : 'translate-x-[110%] opacity-0 pointer-events-none'
          }`}
      >
        <ClipboardHistoryPanel onClose={() => setClipboardOpen(false)} />
      </div>
      <SmartAppTaskbar />
      <FloatingAssistiveCircle />
      <QuickSettingsShade />
      <FolderModal />
      <UniversalSearchModal />
      <ConfirmModal />
      <ToastNotification />
      <AppContextMenu />

      {/* Floating Drag Avatar Following Finger */}
      {draggedApp && dragPosition && (
        <div
          className="fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center scale-110 drop-shadow-2xl"
          style={{
            left: `${dragPosition.x}px`,
            top: `${dragPosition.y}px`,
          }}
        >
          <div
            className="w-16 h-16 rounded-[1.75rem] bg-[#1C1C1E] flex items-center justify-center shadow-2xl ring-4 ring-[#34C759] border border-white/20"
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
          <span className="text-xs font-semibold text-white mt-1.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md shadow-lg border border-white/10 select-none">
            {draggedApp.name}
          </span>
        </div>
      )}
    </div>
  );
};
