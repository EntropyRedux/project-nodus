import React from 'react';
import {
  Wifi,
  WifiOff,
  Bluetooth,
  Flashlight,
  Moon,
  Plane,
  RotateCw,
  Sun,
  Volume2,
  Settings,
  ChevronUp,
  Trash2,
  Play,
  Pause,
  SkipForward,
  Disc,
  X
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { DynamicIcon } from '../common/DynamicIcon';

export const QuickSettingsShade: React.FC = () => {
  const {
    isQuickSettingsOpen,
    setQuickSettingsOpen,
    quickSettings,
    toggleQuickSetting,
    setQuickSettings,
    launchApp,
    notifications,
    dismissNotification,
    clearAllNotifications,
    currentTrack,
    isPlayingMusic,
    toggleMusic,
    nextTrack
  } = useLauncher();

  if (!isQuickSettingsOpen) return null;

  const tiles = [
    { id: 'wifi', name: 'Internet', active: quickSettings.wifi, icon: quickSettings.wifi ? Wifi : WifiOff, sub: quickSettings.wifi ? 'LTE' : 'Off' },
    { id: 'bluetooth', name: 'Bluetooth', active: quickSettings.bluetooth, icon: Bluetooth, sub: quickSettings.bluetooth ? 'Connected' : 'Off' },
    { id: 'flashlight', name: 'Flashlight', active: quickSettings.flashlight, icon: Flashlight, sub: quickSettings.flashlight ? 'On' : 'Off' },
    { id: 'dnd', name: 'Do Not Disturb', active: quickSettings.dnd, icon: Moon, sub: quickSettings.dnd ? 'Priority' : 'Off' },
    { id: 'airplane', name: 'Airplane Mode', active: quickSettings.airplane, icon: Plane, sub: quickSettings.airplane ? 'On' : 'Off' },
    { id: 'autoRotate', name: 'Auto-rotate', active: quickSettings.autoRotate, icon: RotateCw, sub: quickSettings.autoRotate ? 'On' : 'Locked' },
  ];

  return (
    <>
      <div 
        onClick={() => setQuickSettingsOpen(false)}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-150" 
      />

      <div className="fixed bottom-16 right-3 sm:right-4 z-50 w-[380px] sm:w-[420px] max-h-[620px] bg-[#101016]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/90 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 select-none overflow-hidden text-[#F0F0F2]">
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-xl font-light tracking-tighter text-[#F0F0F2]">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setQuickSettingsOpen(false);
                launchApp('settings');
              }}
              className="p-2 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F0F0F2] transition border border-white/5"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => setQuickSettingsOpen(false)}
              className="p-2 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-[#F0F0F2] transition border border-white/5"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>

        {/* Quick Settings Tiles Grid */}
        <div className="grid grid-cols-2 gap-2.5 my-2">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                onClick={() => toggleQuickSetting(tile.id as any)}
                className={`p-3 rounded-2xl flex items-center gap-3 transition text-left ${tile.active
                    ? 'bg-[#10B981] text-[#0A0A0E] font-semibold shadow-lg shadow-[#10B981]/20'
                    : 'bg-[#161620] border border-white/10 text-[#F3F4F6] hover:bg-[#222230]'
                  }`}
              >
                <div
                  className={`p-2 rounded-xl ${tile.active ? 'bg-black/15 text-[#0A0A0E]' : 'bg-white/5 text-[#9CA3AF]'
                    }`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold block truncate leading-tight">{tile.name}</span>
                  <span className={`text-[10px] truncate block ${tile.active ? 'text-[#0A0A0E]/80 font-medium' : 'text-[#9CA3AF]'}`}>
                    {tile.sub}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sliders */}
        <div className="space-y-2.5 my-1">
          <div className="flex items-center gap-3 bg-[#161620] p-2.5 rounded-2xl border border-white/10">
            <Sun size={16} className="text-[#FBBF24] shrink-0 ml-1" />
            <input
              type="range"
              min="10"
              max="100"
              value={quickSettings.brightness}
              onChange={(e) => setQuickSettings((p) => ({ ...p, brightness: Number(e.target.value) }))}
              className="w-full h-2 bg-[#222230] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
            />
          </div>

          <div className="flex items-center gap-3 bg-[#161620] p-2.5 rounded-2xl border border-white/10">
            <Volume2 size={16} className="text-[#3B82F6] shrink-0 ml-1" />
            <input
              type="range"
              min="0"
              max="100"
              value={quickSettings.volume}
              onChange={(e) => setQuickSettings((p) => ({ ...p, volume: Number(e.target.value) }))}
              className="w-full h-2 bg-[#222230] rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
            />
          </div>
        </div>

        {/* Music Player Widget */}
        <div className="p-3 rounded-2xl bg-[#161620] border border-white/10 flex items-center justify-between my-1 shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
              style={{ backgroundColor: currentTrack?.coverColor || '#10B981' }}
            >
              <Disc size={20} className={`text-white ${isPlayingMusic ? 'animate-spin-slow' : ''}`} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-[#F3F4F6] truncate">{currentTrack?.title || 'Obsidian Synthesis'}</h4>
              <p className="text-[10px] text-[#9CA3AF] truncate">{currentTrack?.artist || 'Nodus Audio Lab'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleMusic}
              className="p-2 bg-[#10B981] text-[#0A0A0E] rounded-full hover:bg-[#059669] transition"
            >
              {isPlayingMusic ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="p-1.5 text-[#9CA3AF] hover:text-[#F3F4F6]">
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        {/* Notifications Center */}
        <div className="flex-1 my-1 overflow-y-auto space-y-2 max-h-44 pr-1 scrollbar-thin">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF] px-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-[11px] text-[#9CA3AF] hover:text-[#F3F4F6] flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear all
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-4 text-[#6B7280] text-xs">
              No new notifications
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  setQuickSettingsOpen(false);
                  launchApp(notif.appId);
                }}
                className="p-3 rounded-2xl bg-[#161620] border border-white/10 flex items-start justify-between gap-3 hover:bg-[#222230] cursor-pointer transition shadow-lg"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-white"
                    style={{ backgroundColor: notif.color }}
                  >
                    <DynamicIcon name={notif.iconName} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#F3F4F6] truncate">{notif.title}</span>
                      <span className="text-[9px] text-[#9CA3AF]">{notif.time}</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] line-clamp-2 mt-0.5 leading-relaxed">{notif.message}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notif.id);
                  }}
                  className="text-[#9CA3AF] hover:text-[#F3F4F6] p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
