import React, { useRef, useState } from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { AppIcon } from './AppIcon';
import { WidgetArea } from './WidgetArea';
import { Dock } from './Dock';
import { FolderModal } from './FolderModal';
import { UniversalSearchModal } from './UniversalSearchModal';
import { Settings, Sparkles, FolderPlus, Check } from 'lucide-react';
import { audio } from '../../utils/audio';
import { getSystemTheme } from '../../utils/themes';

export const HomeScreen: React.FC = () => {
  const { 
    apps, 
    folders, 
    dockAppIds, 
    currentPageIndex, 
    totalPages, 
    setCurrentPageIndex,
    isEditing, 
    setIsEditing,
    setActiveFolderId,
    createFolder,
    settings,
    launchApp,
  } = useLauncher();

  const currentTheme = getSystemTheme(settings.theme);

  const folderRadius = {
    glass: 'rounded-2xl',
    hud: 'rounded-none',
    brutalist: 'rounded-xl',
    minimal: 'rounded-none',
  }[currentTheme.archetype];

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const pressTimer = useRef<number | null>(null);

  const currentApps = apps.filter(
    (app) =>
      !dockAppIds.includes(app.id) &&
      !app.folderId &&
      (app.pageIndex ?? 0) === currentPageIndex
  );

  const currentFolders = folders.filter(
    (f) => (f.pageIndex ?? 0) === currentPageIndex
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    pressTimer.current = window.setTimeout(() => {
      audio.playTap();
      setIsEditing(true);
    }, 700);
  };

  const handleTouchMove = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }

    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (diff > 50 && currentPageIndex < totalPages - 1) {
      audio.playTap();
      setCurrentPageIndex(currentPageIndex + 1);
    } else if (diff < -50 && currentPageIndex > 0) {
      audio.playTap();
      setCurrentPageIndex(currentPageIndex - 1);
    }
    setTouchStartX(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    audio.playTap();
    setIsEditing(true);
  };

  const handleCreateNewFolder = () => {
    audio.playTap();
    const candidateApps = apps.filter((a) => !a.folderId && !dockAppIds.includes(a.id));
    if (candidateApps.length >= 2) {
      createFolder('Utilities', [candidateApps[0].id, candidateApps[1].id], currentPageIndex);
    } else {
      createFolder('Folder', [], currentPageIndex);
    }
  };

  const gridColsClass = settings.gridColumns === 5 ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
      className="relative flex-1 flex flex-col justify-between overflow-hidden select-none z-10"
    >
      {isEditing ? (
        <div className="mx-4 mt-2 p-3 bg-[#1C1C1E] border border-white/10 rounded-2xl flex items-center justify-between z-30 shadow-2xl animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#34C759]">
            <Sparkles size={16} />
            <span>Customize Home</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNewFolder}
              className="px-3 py-1.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#F0F0F2] rounded-xl text-xs flex items-center gap-1.5 transition font-medium"
            >
              <FolderPlus size={14} /> Folder
            </button>
            <button
              onClick={() => {
                audio.playTap();
                launchApp('settings');
              }}
              className="p-1.5 bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#F0F0F2] rounded-xl text-xs transition"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={() => {
                audio.playTap();
                setIsEditing(false);
              }}
              className="px-3 py-1.5 bg-[#34C759] hover:bg-[#30D158] text-[#0A0A0C] font-bold rounded-xl text-xs flex items-center gap-1 shadow transition"
            >
              <Check size={14} /> Done
            </button>
          </div>
        </div>
      ) : (
        <WidgetArea />
      )}

      {/* Main Apps Canvas */}
      <div className="flex-1 flex flex-col justify-center px-4 py-2 overflow-y-auto no-scrollbar">
        {settings.minimalistMode ? (
          <div className="space-y-1 max-w-xs mx-auto w-full py-2">
            {apps.slice(0, 10).map((app) => (
              <AppIcon key={app.id} app={app} size="list" />
            ))}
          </div>
        ) : (
          <div className={`grid ${gridColsClass} gap-y-6 gap-x-2 justify-items-center items-start py-2`}>
            {currentFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => {
                  audio.playTap();
                  setActiveFolderId(folder.id);
                }}
                className={`flex flex-col items-center justify-center cursor-pointer group active:scale-90 transition select-none ${
                  isEditing ? 'animate-wiggle' : ''
                }`}
              >
                <div className={`w-14 h-14 ${folderRadius} ${currentTheme.classes.folderBg} p-2 grid grid-cols-2 gap-1 items-center justify-items-center transition-all duration-200`}>
                  {folder.appIds.slice(0, 4).map((appId) => {
                    const fApp = apps.find((a) => a.id === appId);
                    return fApp ? (
                      <span
                        key={appId}
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: fApp.color || '#34C759' }}
                      />
                    ) : null;
                  })}
                </div>
                {settings.showLabels && (
                  <span className="text-xs font-medium text-[#8E8E93] group-hover:text-[#F0F0F2] transition-colors mt-1.5 truncate max-w-[68px] text-center">
                    {folder.name}
                  </span>
                )}
              </div>
            ))}

            {currentApps.map((app) => (
              <AppIcon key={app.id} app={app} size="normal" />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Indicator Dots */}
      <div className="flex items-center justify-center gap-1.5 py-1 z-20">
        {Array.from({ length: totalPages }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              audio.playTap();
              setCurrentPageIndex(idx);
            }}
            className={`transition-all duration-300 rounded-full ${
              currentPageIndex === idx
                ? 'w-6 h-1 bg-[#F0F0F2]'
                : 'w-1.5 h-1 bg-[#4A4A4F] hover:bg-[#8E8E93]'
            }`}
          />
        ))}
      </div>

      {/* Bottom Floating Dock */}
      <Dock />

      {/* Modals */}
      <FolderModal />
      <UniversalSearchModal />
    </div>
  );
};
