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
import { audio } from '../../utils/audio';

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
    { id: 'dnd', name: 'Do Not Disturb', active: quickSettings.dnd, icon: Moon, sub: quickSettings.dnd ? 'Priority Only' : 'Off' },
    { id: 'airplane', name: 'Airplane Mode', active: quickSettings.airplane, icon: Plane, sub: quickSettings.airplane ? 'On' : 'Off' },
    { id: 'autoRotate', name: 'Auto-rotate', active: quickSettings.autoRotate, icon: RotateCw, sub: quickSettings.autoRotate ? 'On' : 'Locked' },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-[#0A0A0C]/95 backdrop-blur-2xl text-[#F0F0F2] flex flex-col justify-between p-4 overflow-y-auto animate-in slide-in-from-top-6 duration-200 select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between pt-2 pb-1">
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

      {/* Quick Settings Tiles Grid (Clean Minimalism Pill Style) */}
      <div className="grid grid-cols-2 gap-2.5 my-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              onClick={() => toggleQuickSetting(tile.id as any)}
              className={`p-3 rounded-2xl flex items-center gap-3 transition text-left ${tile.active
                  ? 'bg-[#34C759] text-[#0A0A0C] font-semibold shadow-lg shadow-[#34C759]/20'
                  : 'bg-[#1C1C1E] border border-white/5 text-[#F0F0F2] hover:bg-[#2C2C2E]'
                }`}
            >
              <div
                className={`p-2 rounded-xl ${tile.active ? 'bg-black/15 text-[#0A0A0C]' : 'bg-white/5 text-[#8E8E93]'
                  }`}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold block truncate leading-tight">{tile.name}</span>
                <span className={`text-[10px] truncate block ${tile.active ? 'text-[#0A0A0C]/80 font-medium' : 'text-[#8E8E93]'}`}>
                  {tile.sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="space-y-2.5 my-2">
        {/* Brightness */}
        <div className="flex items-center gap-3 bg-[#1C1C1E] p-2.5 rounded-2xl border border-white/5">
          <Sun size={16} className="text-[#FFD60A] shrink-0 ml-1" />
          <input
            type="range"
            min="10"
            max="100"
            value={quickSettings.brightness}
            onChange={(e) => setQuickSettings((p) => ({ ...p, brightness: Number(e.target.value) }))}
            className="w-full h-2 bg-[#2C2C2E] rounded-lg appearance-none cursor-pointer accent-[#34C759]"
          />
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 bg-[#1C1C1E] p-2.5 rounded-2xl border border-white/5">
          <Volume2 size={16} className="text-[#007AFF] shrink-0 ml-1" />
          <input
            type="range"
            min="0"
            max="100"
            value={quickSettings.volume}
            onChange={(e) => setQuickSettings((p) => ({ ...p, volume: Number(e.target.value) }))}
            className="w-full h-2 bg-[#2C2C2E] rounded-lg appearance-none cursor-pointer accent-[#007AFF]"
          />
        </div>
      </div>

      {/* Active Music Player Widget */}
      <div className="p-3 rounded-2xl bg-[#1C1C1E] border border-white/5 flex items-center justify-between my-2 shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
            style={{ backgroundColor: currentTrack.coverColor }}
          >
            <Disc size={20} className={`text-white ${isPlayingMusic ? 'animate-spin-slow' : ''}`} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-[#F0F0F2] truncate">{currentTrack.title}</h4>
            <p className="text-[10px] text-[#8E8E93] truncate">{currentTrack.artist}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleMusic}
            className="p-2 bg-[#34C759] text-[#0A0A0C] rounded-full hover:bg-[#30D158] transition"
          >
            {isPlayingMusic ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
          <button onClick={nextTrack} className="p-1.5 text-[#8E8E93] hover:text-[#F0F0F2]">
            <SkipForward size={16} />
          </button>
        </div>
      </div>

      {/* Notifications Center */}
      <div className="flex-1 my-2 overflow-y-auto space-y-2">
        <div className="flex items-center justify-between text-xs text-[#8E8E93] px-1">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Notifications</span>
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="text-[11px] text-[#8E8E93] hover:text-[#F0F0F2] flex items-center gap-1"
            >
              <Trash2 size={12} /> Clear all
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-6 text-[#4A4A4F] text-xs">
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
              className="p-3 rounded-2xl bg-[#1C1C1E] border border-white/5 flex items-start justify-between gap-3 hover:bg-[#2C2C2E] cursor-pointer transition shadow-lg"
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
                    <span className="text-[11px] font-semibold text-[#F0F0F2] truncate">{notif.title}</span>
                    <span className="text-[9px] text-[#8E8E93]">{notif.time}</span>
                  </div>
                  <p className="text-[11px] text-[#8E8E93] line-clamp-2 mt-0.5 leading-relaxed">{notif.message}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(notif.id);
                }}
                className="text-[#8E8E93] hover:text-[#F0F0F2] p-1"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Slide up close handle */}
      <div
        onClick={() => setQuickSettingsOpen(false)}
        className="w-full flex items-center justify-center py-2 cursor-pointer text-[#4A4A4F] hover:text-[#8E8E93]"
      >
        <div className="w-16 h-1 bg-[#4A4A4F] rounded-full" />
      </div>
    </div>
  );
};
