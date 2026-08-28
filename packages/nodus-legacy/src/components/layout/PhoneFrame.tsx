import React from 'react';
import { useLauncher } from '../../context/LauncherContext';
import { StatusBar } from './StatusBar';
import { NavigationBar } from './NavigationBar';
import { QuickSettingsShade } from './QuickSettingsShade';
import { HomeScreen } from '../home/HomeScreen';
import { SettingsApp } from '../apps/SettingsApp';
import { TerminalApp } from '../apps/TerminalApp';
import { PlatformCodeStudioApp } from '../apps/PlatformCodeStudioApp';
import { ProcessMonitorApp } from '../apps/ProcessMonitorApp';
import { NetworkMeshApp } from '../apps/NetworkMeshApp';
import { UniversalClipboardApp } from '../apps/UniversalClipboardApp';
import { WALLPAPER_PRESETS } from '../../utils/constants';
import { Power, Volume2, Maximize2, Minimize2 } from 'lucide-react';
import { audio } from '../../utils/audio';

export const PhoneFrame: React.FC = () => {
  const { 
    activeAppId, 
    launchApp, 
    settings, 
    updateSettings, 
    toggleQuickSetting 
  } = useLauncher();

  const currentWp = WALLPAPER_PRESETS.find((w) => w.id === settings.wallpaper) || WALLPAPER_PRESETS[1];

  const wallpaperStyle =
    settings.wallpaper === 'custom' && settings.customWallpaperUrl
      ? {
          backgroundImage: `url(${settings.customWallpaperUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : currentWp.style;

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
      default:
        return null;
    }
  };

  const handlePowerButton = () => {
    if (settings.soundEffects) audio.playTap();
  };

  const content = (
    <div
      className="w-full h-full relative overflow-hidden flex flex-col justify-between bg-[#0A0A0C]"
      style={wallpaperStyle}
    >
      {/* Subtle wallpaper dark overlay for readability */}
      <div className="absolute inset-0 bg-[#0A0A0C]/20 pointer-events-none" />

      {/* Android Status Bar */}
      <StatusBar />

      {/* Main Viewport (Home Screen or Active App) */}
      <div className="relative flex-1 flex flex-col overflow-hidden z-10">
        {isInternalApp ? (
          <div className="w-full h-full bg-[#0A0A0C] overflow-hidden animate-in zoom-in-95 duration-200">
            {renderActiveApp()}
          </div>
        ) : (
          <HomeScreen />
        )}
      </div>

      {/* Android Gesture Navigation Bar */}
      <NavigationBar />

      {/* Overlay Layers */}
      <QuickSettingsShade />
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#0A0A0C] flex flex-col items-center justify-center p-2 sm:p-4 text-[#F0F0F2] overflow-x-hidden font-sans">
      {/* Top Outer Controls Bar */}
      <div className="w-full max-w-md flex items-center justify-between px-3 py-2 text-xs text-[#8E8E93] select-none z-50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#F0F0F2] tracking-tight">Nova Minimal</span>
          <span className="text-[10px] bg-[#34C759]/15 text-[#34C759] px-2 py-0.5 rounded-full font-semibold">
            Clean Minimal
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audio.playTap();
              updateSettings({ deviceFrame: !settings.deviceFrame });
            }}
            className="px-2.5 py-1 bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/5 rounded-lg text-[#F0F0F2] flex items-center gap-1.5 transition text-[11px]"
            title="Toggle Device Frame vs Full Viewport"
          >
            {settings.deviceFrame ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            <span>{settings.deviceFrame ? 'Full View' : 'Phone Frame'}</span>
          </button>
        </div>
      </div>

      {/* Device Shell Render */}
      {settings.deviceFrame ? (
        <div className="relative my-auto">
          {/* Physical Phone Side Buttons */}
          <button
            onClick={handlePowerButton}
            className="absolute -right-3 top-28 w-2 h-14 bg-[#2C2C2E] hover:bg-[#3A3A3C] rounded-r-md border-r border-[#4A4A4F] shadow-md active:translate-x-0.5 transition cursor-pointer"
            title="Power / Lock Button"
          />

          <button
            onClick={() => toggleQuickSetting('volume')}
            className="absolute -left-3 top-24 w-2 h-12 bg-[#2C2C2E] hover:bg-[#3A3A3C] rounded-l-md border-l border-[#4A4A4F] shadow-md active:-translate-x-0.5 transition cursor-pointer"
            title="Volume Up"
          />
          <button
            onClick={() => toggleQuickSetting('volume')}
            className="absolute -left-3 top-40 w-2 h-12 bg-[#2C2C2E] hover:bg-[#3A3A3C] rounded-l-md border-l border-[#4A4A4F] shadow-md active:-translate-x-0.5 transition cursor-pointer"
            title="Volume Down"
          />

          {/* Physical Phone Chassis Frame with Clean Minimalism styling */}
          <div className="w-[375px] h-[780px] bg-[#161618] rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border-[4px] border-[#2C2C2E] ring-1 ring-white/5 relative overflow-hidden flex flex-col">
            {/* Screen Inner Bezel */}
            <div className="w-full h-full rounded-[38px] overflow-hidden bg-[#0A0A0C] flex flex-col relative shadow-inner">
              {content}
            </div>
          </div>
        </div>
      ) : (
        /* Full Viewport Mode */
        <div className="w-full max-w-md h-[88vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0A0A0C] flex flex-col relative my-auto">
          {content}
        </div>
      )}

      {/* Subtle bottom info */}
      <div className="text-[11px] text-[#8E8E93] pt-3 text-center flex items-center justify-center gap-3">
        <span>Long-press app or home to customize</span>
        <span className="text-[#4A4A4F]">•</span>
        <span>Swipe down status bar for quick settings</span>
      </div>
    </div>
  );
};
