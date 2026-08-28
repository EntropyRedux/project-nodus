import React, { useState, useMemo } from 'react';
import { useAssistive } from '../../context/AssistiveContext';
import { ClipboardOverlayStandalone } from './ClipboardOverlayStandalone';
import { DeviceSwitcherOverlayStandalone } from './DeviceSwitcherOverlayStandalone';
import {
  LayoutGrid,
  Search,
  Clipboard,
  Radio,
  AppWindow,
  Maximize2,
  X,
  Layers,
  Sparkles
} from 'lucide-react';

export const TaskbarOverlayStandalone: React.FC = () => {
  const {
    isFleetInstalled,
    isClipboardOpen,
    isDevicesOpen,
    isStartMenuOpen,
    installedApps,
    recentApps,
    launchMode,
    toggleLaunchMode,
    toggleClipboardPanel,
    toggleSidebar,
    toggleStartMenu,
    closeOverlay,
    launchApp
  } = useAssistive();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return installedApps;
    const q = searchQuery.toLowerCase();
    return installedApps.filter(
      app => (app.name && app.name.toLowerCase().includes(q)) ||
             (app.label && app.label.toLowerCase().includes(q)) ||
             app.packageName.toLowerCase().includes(q)
    );
  }, [installedApps, searchQuery]);

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col justify-end p-4 pointer-events-none select-none">
      {/* Invisible backdrop to dismiss panels on outside tap */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto z-10 transition-opacity"
        onClick={closeOverlay}
      />

      {/* Floating Side/Bottom Panels (Positioned directly above the Taskbar dock) */}
      <div className="relative z-20 flex justify-center mb-3 pointer-events-auto">
        {/* 1. App Drawer / Start Menu Flyout */}
        {isStartMenuOpen && (
          <div className="w-[92vw] max-w-lg max-h-[62vh] flex flex-col bg-[#0F172A]/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Search Bar Header */}
            <div className="p-3.5 border-b border-slate-700/60 flex items-center gap-2.5 bg-slate-900/60 shrink-0">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps..."
                autoFocus
                className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 rounded-full text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Apps Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 sm:grid-cols-5 gap-3">
              {filteredApps.map((app) => (
                <button
                  key={app.packageName}
                  onClick={() => launchApp(app.packageName)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/80 active:scale-95 transition group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden shadow-md group-hover:scale-105 transition">
                    {app.icon ? (
                      <img src={app.icon} alt={app.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <LayoutGrid size={22} className="text-slate-400" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-200 text-center truncate w-full font-medium">
                    {app.name || app.label}
                  </span>
                </button>
              ))}
              {filteredApps.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-slate-400">
                  No apps found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Universal Clipboard History Panel */}
        {isClipboardOpen && isFleetInstalled && (
          <div className="w-[92vw] max-w-md h-84 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <ClipboardOverlayStandalone onClose={toggleClipboardPanel} />
          </div>
        )}

        {/* 3. Multi-Device Switcher Panel */}
        {isDevicesOpen && isFleetInstalled && (
          <div className="w-[92vw] max-w-md h-84 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <DeviceSwitcherOverlayStandalone onClose={toggleSidebar} />
          </div>
        )}
      </div>

      {/* Floating Monolith-Class Taskbar Dock */}
      <div className="relative z-20 mx-auto pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-2 px-3 py-2 rounded-3xl bg-[#0F172A]/90 backdrop-blur-2xl border border-slate-700/80 shadow-2xl">
          {/* Start Menu / App Drawer Trigger */}
          <button
            onClick={toggleStartMenu}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition shadow-sm hover:scale-105 active:scale-95 ${
              isStartMenuOpen
                ? 'bg-sky-500 text-white shadow-sky-500/30'
                : 'bg-slate-800/90 text-sky-400 hover:bg-slate-700/90'
            }`}
            title="App Drawer & Start Menu"
          >
            <LayoutGrid size={20} />
          </button>

          {/* Launch Mode Switch (Floating Window vs Fullscreen) */}
          <button
            onClick={toggleLaunchMode}
            className={`px-2.5 h-10 rounded-2xl flex items-center gap-1.5 transition text-xs font-semibold shadow-sm hover:scale-105 active:scale-95 ${
              launchMode === 'floating'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/90'
            }`}
            title={`Launch Mode: ${launchMode === 'floating' ? 'Floating Freeform Window' : 'Fullscreen'}`}
          >
            {launchMode === 'floating' ? <AppWindow size={15} /> : <Maximize2 size={15} />}
            <span className="text-[11px] hidden sm:inline capitalize">{launchMode}</span>
          </button>

          <div className="w-[1px] h-6 bg-slate-700 mx-0.5" />

          {/* Recent Apps Strip */}
          <div className="flex items-center gap-1.5">
            {recentApps.slice(0, 5).map((app) => (
              <button
                key={app.packageName}
                onClick={() => launchApp(app.packageName)}
                className="w-10 h-10 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 flex items-center justify-center transition shadow-sm hover:scale-105 active:scale-95 overflow-hidden p-1.5 group"
                title={app.name || app.label}
              >
                {app.icon ? (
                  <img src={app.icon} alt={app.name} className="w-7 h-7 object-contain" />
                ) : (
                  <span className="text-xs font-bold text-slate-300">{(app.name || 'A')[0]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Fleet Controls (Device Switcher & Universal Clipboard) */}
          {isFleetInstalled && (
            <>
              <div className="w-[1px] h-6 bg-slate-700 mx-0.5" />

              {/* Device Switcher Button */}
              <button
                onClick={toggleSidebar}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition shadow-sm hover:scale-105 active:scale-95 ${
                  isDevicesOpen
                    ? 'bg-sky-500 text-white shadow-sky-500/30'
                    : 'bg-slate-800/80 text-sky-400 hover:bg-slate-700/90'
                }`}
                title="Multi-Device Switcher"
              >
                <Radio size={18} />
              </button>

              {/* Universal Clipboard Button */}
              <button
                onClick={toggleClipboardPanel}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition shadow-sm hover:scale-105 active:scale-95 ${
                  isClipboardOpen
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-slate-800/80 text-emerald-400 hover:bg-slate-700/90'
                }`}
                title="Universal Clipboard History"
              >
                <Clipboard size={18} />
              </button>
            </>
          )}

          <div className="w-[1px] h-6 bg-slate-700 mx-0.5" />

          {/* Dismiss / Close Overlay */}
          <button
            onClick={closeOverlay}
            className="w-9 h-9 rounded-full bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition"
            title="Close Overlay"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
