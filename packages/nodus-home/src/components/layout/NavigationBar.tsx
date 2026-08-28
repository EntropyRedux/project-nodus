import React from 'react';
import { ChevronLeft, Circle, Square } from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { audio } from '../../utils/audio';

export const NavigationBar: React.FC = () => {
  const { 
    activeAppId, 
    closeActiveApp, 
    isSearchOpen, 
    setSearchOpen, 
    settings,
    activeFolderId,
    setActiveFolderId,
    isQuickSettingsOpen,
    setQuickSettingsOpen
  } = useLauncher();

  const handleBack = () => {
    if (settings.soundEffects) audio.playTap();
    if (isQuickSettingsOpen) {
      setQuickSettingsOpen(false);
      return;
    }
    if (activeFolderId) {
      setActiveFolderId(null);
      return;
    }
    if (isSearchOpen) {
      setSearchOpen(false);
      return;
    }
    if (activeAppId) {
      closeActiveApp();
    }
  };

  const handleHome = () => {
    if (settings.soundEffects) audio.playTap();
    setQuickSettingsOpen(false);
    setSearchOpen(false);
    setActiveFolderId(null);
    closeActiveApp();
  };

  const handleRecents = () => {
    if (settings.soundEffects) audio.playTap();
    setSearchOpen(false);
    setActiveFolderId(null);
    setQuickSettingsOpen(false);
  };

  return (
    <div className="w-full h-8 px-6 flex items-center justify-between z-40 bg-gradient-to-t from-[#0A0A0C] to-transparent select-none">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="p-1.5 text-[#8E8E93] hover:text-[#F0F0F2] active:scale-90 transition rounded-full"
        title="Back"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Center Clean Minimalism Gesture Navigation Pill */}
      <div
        onClick={handleHome}
        onDoubleClick={handleRecents}
        className="group py-2 px-8 cursor-pointer flex items-center justify-center"
        title="Home (Double click for Recents)"
      >
        <div className="w-32 h-1 bg-[#4A4A4F] group-hover:bg-[#8E8E93] group-active:scale-95 transition-all rounded-full" />
      </div>

      {/* Recents Multitasking button */}
      <button
        onClick={handleRecents}
        className="p-1.5 text-[#8E8E93] hover:text-[#F0F0F2] active:scale-90 transition rounded-full"
        title="Recent Apps"
      >
        <Square size={14} />
      </button>
    </div>
  );
};
