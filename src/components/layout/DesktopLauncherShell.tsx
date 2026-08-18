import React, { useMemo } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { DeviceSidebar } from './DeviceSidebar';
import { DeviceProcessSidePanel } from './DeviceProcessSidePanel';
import { ClipboardHistoryPanel } from '../desktop/ClipboardHistoryPanel';
import { SmartAppTaskbar } from './SmartAppTaskbar';
import { DesktopAppWindow } from '../desktop/DesktopAppWindow';
import { QuickSettingsShade } from './QuickSettingsShade';
import { RecentsView } from './RecentsView';
import { LockScreen } from './LockScreen';
import { FolderModal } from '../home/FolderModal';
import { UniversalSearchModal } from '../home/UniversalSearchModal';
import { AppIcon } from '../home/AppIcon';
import { WALLPAPER_PRESETS } from '../../utils/constants';

// Built-in Real Apps
import { SettingsApp } from '../apps/SettingsApp';
import { TerminalApp } from '../apps/TerminalApp';
import { PlatformCodeStudioApp } from '../apps/PlatformCodeStudioApp';
import { ProcessMonitorApp } from '../apps/ProcessMonitorApp';
import { NetworkMeshApp } from '../apps/NetworkMeshApp';
import { UniversalClipboardApp } from '../apps/UniversalClipboardApp';
import { audio } from '../../utils/audio';
import { 
  FolderPlus, 
  Sparkles, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Sliders, 
  Maximize2, 
  Layers, 
  Lock,
  Wifi,
  Battery,
  Clipboard
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
    isEditing, 
    setIsEditing,
    setActiveFolderId,
    createFolder,
    openQuickSettings,
    openRecents,
    lockDevice,
    devices,
    activeDeviceId,
    setSearchOpen,
    isClipboardOpen,
    setClipboardOpen,
    toggleClipboardPanel
  } = useLauncher();

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

  const renderActiveApp = () => {
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
      default:
        return <SettingsApp />;
    }
  };

  // Filter apps for current desktop page (memoized)
  const currentApps = useMemo(
    () => apps.filter((app) => !app.folderId && (app.pageIndex ?? 0) === currentPageIndex),
    [apps, currentPageIndex]
  );

  const currentFolders = useMemo(
    () => folders.filter((f) => (f.pageIndex ?? 0) === currentPageIndex),
    [folders, currentPageIndex]
  );

  const handleCreateFolder = () => {
    audio.playTap();
    const candidateApps = apps.filter((a) => !a.folderId);
    if (candidateApps.length >= 2) {
      createFolder('Utilities', [candidateApps[0].id, candidateApps[1].id], currentPageIndex);
    } else {
      createFolder('Work & Tools', [], currentPageIndex);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-row bg-[#0A0A0C] text-[#F0F0F2] font-sans select-none relative">
      {/* Fixed Full-Window Background Wallpaper (Unaffected by sidebar/panel slide states) */}
      <div 
        className="fixed inset-0 bg-cover bg-center transition-all duration-500 ease-in-out pointer-events-none z-0"
        style={wallpaperStyle}
      >
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[0.5px]" />
      </div>

      {/* 1. Left Sidebar with Device Selection */}
      <DeviceSidebar />

      {/* 2. Side Panel for Device Processes (Slides smoothly from left beside DeviceSidebar, non-modal flex item) */}
      <DeviceProcessSidePanel />

      {/* 3. Main Android Desktop Canvas (Flex-1, auto resizes and reflows app grid, 100% scrollable & clickable) */}
      <main
        className="flex-1 h-full flex flex-col justify-between relative overflow-hidden transition-all duration-300 ease-in-out z-10"
      >
        {/* Top Android Status & Action Bar */}
        <header className="relative z-20 px-4 py-2.5 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5 shrink-0">
          {/* Left: Device Name & Pagination Pill */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-[#F0F0F2] tracking-wider uppercase bg-[#1C1C1E]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
              {currentDevice?.name || 'Android Node'}
            </span>

            {/* Pagination dots */}
            <div className="flex items-center gap-1 bg-[#1C1C1E]/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
              <button
                disabled={currentPageIndex === 0}
                onClick={() => {
                  audio.playTap();
                  setCurrentPageIndex(currentPageIndex - 1);
                }}
                className="p-0.5 rounded text-[#8E8E93] hover:text-[#F0F0F2] disabled:opacity-20 transition"
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
                  className={`transition-all duration-300 rounded-full ${
                    currentPageIndex === idx
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
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {isEditing && (
              <button
                onClick={handleCreateFolder}
                className="px-2.5 py-1 bg-[#1C1C1E]/80 hover:bg-[#2C2C2E] text-[#F0F0F2] rounded-full text-xs flex items-center gap-1 border border-white/10 font-medium transition"
              >
                <FolderPlus size={13} className="text-[#34C759]" /> Folder
              </button>
            )}
          </div>

          {/* Right: Search, Quick Settings, Arrange, Lock Screen */}
          <div className="flex items-center gap-2">
            {/* Quick Search Button */}
            <button
              onClick={() => {
                audio.playTap();
                setSearchOpen(true);
              }}
              className="px-3 py-1 bg-[#1C1C1E]/80 hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] rounded-full text-xs flex items-center gap-1.5 border border-white/10 transition shadow-sm"
              title="Universal Search (Ctrl+Space)"
            >
              <Search size={13} className="text-[#34C759]" />
              <span className="hidden sm:inline">Search</span>
            </button>

            {/* Arrange Icons Toggle */}
            <button
              onClick={() => {
                audio.playTap();
                setIsEditing(!isEditing);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border transition ${
                isEditing
                  ? 'bg-[#34C759] text-[#0A0A0C] border-[#34C759] shadow-md shadow-[#34C759]/20'
                  : 'bg-[#1C1C1E]/80 text-[#8E8E93] hover:text-[#F0F0F2] border-white/10 hover:bg-[#1C1C1E]'
              }`}
              title="Arrange apps and folders"
            >
              {isEditing ? <Check size={13} /> : <Sparkles size={13} />}
              <span className="hidden sm:inline">{isEditing ? 'Done' : 'Arrange'}</span>
            </button>

            {/* Clipboard History Panel Toggle */}
            <button
              onClick={() => {
                toggleClipboardPanel();
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition ${
                isClipboardOpen
                  ? 'bg-[#34C759] text-[#0A0A0C] border-[#34C759] shadow-md shadow-[#34C759]/20'
                  : 'bg-[#1C1C1E]/80 text-[#8E8E93] hover:text-[#F0F0F2] border-white/10 hover:bg-[#1C1C1E]'
              }`}
              title={isClipboardOpen ? 'Hide Clipboard History' : 'Show Clipboard History'}
            >
              <Clipboard size={13} />
              <span className="hidden sm:inline">Clipboard</span>
            </button>

            {/* Quick Settings Dropdown Shade Trigger */}
            <button
              onClick={() => {
                audio.playTap();
                openQuickSettings();
              }}
              className="p-1.5 bg-[#1C1C1E]/80 hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] rounded-full border border-white/10 transition"
              title="Quick Settings Control Center"
            >
              <Sliders size={14} />
            </button>

            {/* Recents Multitasking Trigger */}
            <button
              onClick={() => {
                audio.playTap();
                openRecents();
              }}
              className="p-1.5 bg-[#1C1C1E]/80 hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] rounded-full border border-white/10 transition"
              title="Recent Apps & Multitasking"
            >
              <Layers size={14} />
            </button>

            {/* Lock Screen Trigger */}
            <button
              onClick={() => {
                audio.playTap();
                lockDevice();
              }}
              className="p-1.5 bg-[#1C1C1E]/80 hover:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#F0F0F2] rounded-full border border-white/10 transition"
              title="Lock Screen"
            >
              <Lock size={14} />
            </button>
          </div>
        </header>

        {/* Main Desktop Workspace Area (Scrollable apps grid + dynamic layout) */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative z-10 p-3 sm:p-5 gap-4 sm:gap-6">
          {/* Active App Window Overlay if app is open */}
          {activeAppId ? (
            <div className="flex-1 h-full animate-in fade-in zoom-in-95 duration-200">
              <DesktopAppWindow appId={activeAppId}>
                {renderActiveApp()}
              </DesktopAppWindow>
            </div>
          ) : (
            <>
              {/* Left/Center Desktop Grid - Scrollable & Rearranges Automatically downward */}
              <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-y-auto pr-2 pb-8 scrollbar-thin">
                {/* Auto-fill App Grid: Icons maintain minimum 82px width, flow downward, never squish or overlap */}
                <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(82px,1fr))] gap-y-7 gap-x-4 sm:gap-x-5 items-start content-start py-2">
                  {/* Folders */}
                  {currentFolders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => {
                        audio.playTap();
                        setActiveFolderId(folder.id);
                      }}
                      className={`flex flex-col items-center justify-start w-full min-w-[72px] max-w-[88px] cursor-pointer group active:scale-95 transition select-none ${
                        isEditing ? 'animate-wiggle' : ''
                      }`}
                    >
                      <div className="w-14 h-14 shrink-0 rounded-[1.5rem] bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 p-2 grid grid-cols-2 gap-1 items-center justify-items-center shadow-xl group-hover:bg-[#2C2C2E] transition-colors">
                        {folder.appIds.slice(0, 4).map((appId) => {
                          const fApp = apps.find((a) => a.id === appId);
                          return fApp ? (
                            <span
                              key={appId}
                              className="w-3.5 h-3.5 rounded-full shadow shrink-0"
                              style={{ backgroundColor: fApp.color }}
                            />
                          ) : null;
                        })}
                      </div>
                      <span className="text-[11px] font-medium text-[#F0F0F2] mt-1.5 truncate w-full max-w-[76px] text-center drop-shadow-md select-none leading-tight">
                        {folder.name}
                      </span>
                    </div>
                  ))}

                  {/* Desktop Apps */}
                  {currentApps.map((app) => (
                    <AppIcon key={app.id} app={app} size="normal" />
                  ))}
                </div>
              </div>

              {/* Right Desktop Column: Cross-Device Clipboard History Panel (Fluid Collapse/Expand) */}
              <div 
                className={`transition-all duration-300 ease-in-out shrink-0 min-h-0 flex flex-col ${
                  isClipboardOpen 
                    ? 'w-80 lg:w-84 xl:w-88 opacity-100 translate-x-0' 
                    : 'w-0 opacity-0 translate-x-6 pointer-events-none overflow-hidden'
                }`}
              >
                <ClipboardHistoryPanel onClose={() => setClipboardOpen(false)} />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Global Overlays & Modals */}
      <SmartAppTaskbar />
      <QuickSettingsShade />
      <RecentsView />
      <LockScreen />
      <FolderModal />
      <UniversalSearchModal />
    </div>
  );
};
