import React, { useState } from 'react';
import {
  RemoteAppShortcutsProps,
  SharedApp,
  AppCategory
} from '../types/ui-contracts';
import {
  Plus,
  Globe,
  Music,
  Code2,
  FileText,
  Settings2,
  Gamepad2,
  Zap,
  Play,
  Monitor,
  Tablet,
  Smartphone,
  Laptop,
  Check,
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react';

const CATEGORY_ICONS: Record<AppCategory, { label: string; icon: React.ElementType; color: string }> = {
  browser: { label: 'Browser', icon: Globe, color: '#9ECAFF' },
  media: { label: 'Media', icon: Music, color: '#D4AAFF' },
  dev: { label: 'Development', icon: Code2, color: '#82D5A5' },
  productivity: { label: 'Productivity', icon: FileText, color: '#FFD87A' },
  system: { label: 'System', icon: Settings2, color: '#879099' },
  game: { label: 'Gaming', icon: Gamepad2, color: '#FFB4AB' },
  utility: { label: 'Utility', icon: Zap, color: '#9ECAFF' },
};

function getDeviceIcon(type: SharedApp['deviceType'], size = 12) {
  switch (type) {
    case 'tablet':
      return <Tablet size={size} />;
    case 'laptop':
      return <Laptop size={size} />;
    case 'phone':
      return <Smartphone size={size} />;
    case 'desktop':
    default:
      return <Monitor size={size} />;
  }
}

export const RemoteAppShortcuts: React.FC<RemoteAppShortcutsProps> = ({
  myApps,
  peerApps,
  onToggleMyApp,
  onLaunchPeerApp,
  onAddMyApp
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'peer' | 'mine'>('peer');
  const [launchedAppId, setLaunchedAppId] = useState<string | null>(null);

  const handleLaunch = (app: SharedApp) => {
    setLaunchedAppId(app.id);
    onLaunchPeerApp(app);
    setTimeout(() => {
      setLaunchedAppId(null);
    }, 2200);
  };

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[#1D2024] border border-white/5 rounded-xl overflow-hidden shadow-xl text-slate-100 p-3 sm:p-5 md:p-6">
      {/* Header Bar with Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-5 pb-3 sm:pb-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-1 p-1 bg-[#111318] rounded-lg border border-white/5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('peer')}
            className={`flex-1 sm:flex-initial h-8 px-3 sm:px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeSubTab === 'peer'
                ? 'bg-[#A8C7FA] text-[#062E6F] font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={14} />
            <span>Remote Peer Launchpad ({peerApps.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('mine')}
            className={`flex-1 sm:flex-initial h-8 px-3 sm:px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeSubTab === 'mine'
                ? 'bg-[#A8C7FA] text-[#062E6F] font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>My Shared Apps ({myApps.length})</span>
          </button>
        </div>

        {activeSubTab === 'mine' && (
          <button
            onClick={onAddMyApp}
            className="h-8 px-3.5 rounded-lg bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition shadow shrink-0 touch-manipulation w-full sm:w-auto"
          >
            <Plus size={15} />
            <span>Register Shortcut</span>
          </button>
        )}
      </div>

      {/* Shortcuts List Body */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
        {activeSubTab === 'peer' ? (
          peerApps.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500 font-mono">
              No peer application shortcuts shared across mesh nodes yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
              {peerApps.map(app => {
                const catMeta = CATEGORY_ICONS[app.category] || CATEGORY_ICONS.utility;
                const Icon = catMeta.icon;
                const isLaunched = launchedAppId === app.id;

                return (
                  <div
                    key={app.id}
                    className="p-3 sm:p-4 rounded-xl bg-[#282A2F] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition shadow-sm"
                  >
                    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center shadow-md shrink-0"
                        style={{
                          backgroundColor: `${catMeta.color}20`,
                          color: catMeta.color,
                          border: `1px solid ${catMeta.color}35`
                        }}
                      >
                        <Icon size={19} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-100 truncate">
                          {app.name}
                        </h4>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 font-mono truncate max-w-[120px] sm:max-w-none">
                            {getDeviceIcon(app.deviceType, 12)}
                            {app.deviceName}
                          </span>
                          <span>•</span>
                          <span
                            className="font-mono text-[10px] uppercase font-semibold"
                            style={{ color: catMeta.color }}
                          >
                            {catMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunch(app)}
                      className={`h-8 px-3 sm:px-3.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition active:scale-95 whitespace-nowrap shrink-0 touch-manipulation ${
                        isLaunched
                          ? 'bg-[#0F5223] text-[#C4EED0] border border-[#6DD58C]/30 shadow'
                          : 'bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] shadow-sm'
                      }`}
                    >
                      {isLaunched ? <Check size={14} /> : <Play size={13} />}
                      <span>{isLaunched ? 'Launched!' : 'Launch'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : myApps.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 font-mono">
            You have not registered any shortcuts on this tablet yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
            {myApps.map(app => {
              const catMeta = CATEGORY_ICONS[app.category] || CATEGORY_ICONS.utility;
              const Icon = catMeta.icon;

              return (
                <div
                  key={app.id}
                  className="p-3 sm:p-4 rounded-xl bg-[#282A2F] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center shadow-md shrink-0"
                      style={{
                        backgroundColor: `${catMeta.color}20`,
                        color: catMeta.color,
                        border: `1px solid ${catMeta.color}35`
                      }}
                    >
                      <Icon size={19} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-slate-100 truncate">
                        {app.name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-400 truncate">
                        {app.path || 'Registered System Binary'}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 touch-manipulation">
                    <input
                      type="checkbox"
                      checked={app.enabled}
                      onChange={e => onToggleMyApp(app.id, e.target.checked)}
                      className="w-4 h-4 rounded accent-[#A8C7FA] cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-slate-400">
                      {app.enabled ? 'Shared' : 'Hidden'}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
