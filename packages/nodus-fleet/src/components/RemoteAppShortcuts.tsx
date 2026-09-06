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
  Layers,
  Search,
  X,
  Compass,
  Trash2
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

export function formatIconSrc(rawIcon?: string): string | null {
  if (!rawIcon || typeof rawIcon !== 'string' || rawIcon.trim().length === 0) {
    return null;
  }
  const trimmed = rawIcon.trim();
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
}

export const RemoteAppShortcuts: React.FC<RemoteAppShortcutsProps> = ({
  myApps,
  peerApps,
  onToggleMyApp,
  onLaunchPeerApp,
  onAddMyApp
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'peer' | 'mine'>('peer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [launchedAppId, setLaunchedAppId] = useState<string | null>(null);

  // Add Custom Modal state for tablet
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formCategory, setFormCategory] = useState<AppCategory>('utility');

  const handleLaunch = (app: SharedApp) => {
    setLaunchedAppId(app.id);
    onLaunchPeerApp(app);
    setTimeout(() => {
      setLaunchedAppId(null);
    }, 2200);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    if (onAddMyApp) {
      onAddMyApp();
    }
    setShowAddModal(false);
    setFormName('');
    setFormPath('');
  };

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');

  // Extract unique peer devices
  const availableDevices = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: SharedApp['deviceType']; color: string; count: number }>();
    peerApps.forEach(app => {
      const key = app.deviceId || app.deviceName;
      if (!map.has(key)) {
        map.set(key, {
          id: app.deviceId,
          name: app.deviceName,
          type: app.deviceType,
          color: app.deviceColor || '#A8C7FA',
          count: 0,
        });
      }
      map.get(key)!.count += 1;
    });
    return Array.from(map.values());
  }, [peerApps]);

  const filteredPeerApps = peerApps.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.path && app.path.toLowerCase().includes(searchQuery.toLowerCase())) ||
      app.deviceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    const matchesDevice = selectedDeviceId === 'all' || app.deviceId === selectedDeviceId || app.deviceName === selectedDeviceId;
    return matchesSearch && matchesCat && matchesDevice;
  });

  const filteredMyApps = myApps.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.path && app.path.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[#1D2024] border border-white/5 rounded-xl overflow-hidden shadow-xl text-slate-100 p-3 sm:p-5 md:p-6 select-none">
      {/* Header Bar with Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-white/5 shrink-0">
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
            onClick={() => setShowAddModal(true)}
            className="h-8 px-3.5 rounded-lg bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition shadow shrink-0 touch-manipulation w-full sm:w-auto"
          >
            <Plus size={15} />
            <span>Register Shortcut</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2.5 mb-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111318] border border-white/10 max-w-sm w-full">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search peer apps, host PC, commands..."
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`h-7 px-2.5 rounded-md text-[11px] font-mono transition ${
                selectedCategory === 'all'
                  ? 'bg-[#A8C7FA] text-[#062E6F] font-semibold'
                  : 'bg-[#111318] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              All Types
            </button>
            {Object.entries(CATEGORY_ICONS).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`h-7 px-2.5 rounded-md text-[11px] font-mono transition flex items-center gap-1.5 ${
                  selectedCategory === key
                    ? 'bg-[#A8C7FA] text-[#062E6F] font-semibold'
                    : 'bg-[#111318] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <cat.icon size={12} style={{ color: selectedCategory === key ? 'inherit' : cat.color }} />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Device Origin Filter Pills (Visible when in peer tab with multiple devices) */}
        {activeSubTab === 'peer' && availableDevices.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-0.5 border-t border-white/5">
            <span className="text-[11px] font-mono text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Monitor size={12} />
              Source Device:
            </span>
            <button
              onClick={() => setSelectedDeviceId('all')}
              className={`h-6 px-2.5 rounded-full text-[10px] font-mono transition whitespace-nowrap ${
                selectedDeviceId === 'all'
                  ? 'bg-[#00497D] text-[#D3E3FD] font-semibold border border-[#A8C7FA]/40'
                  : 'bg-[#111318] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              All Nodes ({peerApps.length})
            </button>
            {availableDevices.map(dev => (
              <button
                key={dev.id}
                onClick={() => setSelectedDeviceId(dev.id)}
                className={`h-6 px-2.5 rounded-full text-[10px] font-mono transition flex items-center gap-1.5 whitespace-nowrap ${
                  selectedDeviceId === dev.id
                    ? 'bg-[#00497D] text-[#D3E3FD] font-semibold border border-[#A8C7FA]/40'
                    : 'bg-[#111318] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span style={{ color: dev.color }}>{getDeviceIcon(dev.type, 11)}</span>
                <span>{dev.name}</span>
                <span className="opacity-60">({dev.count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Shortcuts List Body */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
        {activeSubTab === 'peer' ? (
          filteredPeerApps.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500 font-mono">
              No peer application shortcuts discovered on the connected workstation node.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
              {filteredPeerApps.map(app => {
                const catMeta = CATEGORY_ICONS[app.category] || CATEGORY_ICONS.utility;
                const Icon = catMeta.icon;
                const isLaunched = launchedAppId === app.id;
                const iconSrc = formatIconSrc(app.icon_base64);
                const devColor = app.deviceColor || '#A8C7FA';

                return (
                  <div
                    key={app.id}
                    className="p-3 sm:p-4 rounded-xl bg-[#282A2F] border border-white/5 flex flex-col justify-between gap-2.5 hover:border-white/10 transition shadow-sm"
                  >
                    {/* Top Device Attribution Header Badge */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border shrink-0"
                        style={{
                          backgroundColor: `${devColor}18`,
                          borderColor: `${devColor}35`,
                          color: devColor,
                        }}
                      >
                        {getDeviceIcon(app.deviceType, 11)}
                        <span className="font-semibold truncate max-w-[140px] sm:max-w-none">
                          {app.deviceName}
                        </span>
                        {app.deviceIp && (
                          <span className="opacity-70 text-[9px]">· {app.deviceIp}</span>
                        )}
                      </div>

                      <span
                        className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/5"
                        style={{ color: catMeta.color }}
                      >
                        {catMeta.label}
                      </span>
                    </div>

                    {/* App Info & Launch Action */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                        {iconSrc ? (
                          <img
                            src={iconSrc}
                            alt=""
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg object-contain shrink-0 bg-[#111318] p-1 border border-white/10 shadow-md"
                          />
                        ) : (
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
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-slate-100 truncate">
                            {app.name}
                          </h4>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                            {app.path || 'Native Target Binary'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleLaunch(app)}
                        className={`h-8 px-3 sm:px-3.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition active:scale-95 whitespace-nowrap shrink-0 touch-manipulation cursor-pointer ${
                          isLaunched
                            ? 'bg-[#0F5223] text-[#C4EED0] border border-[#6DD58C]/30 shadow'
                            : 'bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] shadow-sm'
                        }`}
                      >
                        {isLaunched ? <Check size={14} /> : <Play size={13} />}
                        <span>{isLaunched ? 'Launched!' : 'Launch'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : filteredMyApps.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 font-mono">
            You have not registered any shortcuts on this tablet yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
            {filteredMyApps.map(app => {
              const catMeta = CATEGORY_ICONS[app.category] || CATEGORY_ICONS.utility;
              const Icon = catMeta.icon;
              const iconSrc = formatIconSrc(app.icon_base64);

              return (
                <div
                  key={app.id}
                  className="p-3 sm:p-4 rounded-xl bg-[#282A2F] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    {iconSrc ? (
                      <img
                        src={iconSrc}
                        alt=""
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg object-contain shrink-0 bg-[#111318] p-1 border border-white/10 shadow-md"
                      />
                    ) : (
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
                    )}
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

      {/* Add Shortcut Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1D2024] border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Register Tablet Shortcut</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateCustom} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Shortcut Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Browser, Terminal"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-[#111318] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#A8C7FA]"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Package / URL</label>
                <input
                  type="text"
                  placeholder="e.g. com.android.chrome"
                  value={formPath}
                  onChange={e => setFormPath(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-[#111318] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-[#A8C7FA]"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as AppCategory)}
                  className="w-full h-9 px-3 text-xs bg-[#111318] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#A8C7FA]"
                >
                  <option value="utility">Utility</option>
                  <option value="browser">Browser</option>
                  <option value="dev">Development</option>
                  <option value="media">Media</option>
                  <option value="productivity">Productivity</option>
                  <option value="game">Gaming</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-8 px-3 rounded-lg bg-[#282A2F] text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-lg bg-[#A8C7FA] text-[#062E6F] text-xs font-semibold font-mono hover:bg-[#C2E7FF]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
