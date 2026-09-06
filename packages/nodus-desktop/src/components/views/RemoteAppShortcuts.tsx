import React, { useState, useEffect } from 'react';
import {
  RemoteAppShortcutsProps,
  SharedApp,
  AppCategory
} from '../../types/ui-contracts';
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
  RefreshCw,
  Trash2,
  X,
  Compass,
  Terminal,
  Calculator,
  Folder,
  Activity
} from 'lucide-react';
import { TauriService } from '../../services/TauriCommands';

const CATEGORY_ICONS: Record<AppCategory, { label: string; icon: React.ElementType; color: string }> = {
  browser: { label: 'Browser', icon: Globe, color: '#9ECAFF' },
  media: { label: 'Media', icon: Music, color: '#D4AAFF' },
  dev: { label: 'Development', icon: Code2, color: '#82D5A5' },
  productivity: { label: 'Productivity', icon: FileText, color: '#FFD87A' },
  system: { label: 'System', icon: Settings2, color: '#879099' },
  game: { label: 'Gaming', icon: Gamepad2, color: '#FFB4AB' },
  utility: { label: 'Utility', icon: Zap, color: '#9ECAFF' },
};

const DEFAULT_PRESETS: Array<{
  name: string;
  path: string;
  category: AppCategory;
  description: string;
}> = [
  { name: 'Visual Studio Code', path: 'code .', category: 'dev', description: 'Open project directory in VS Code' },
  { name: 'Windows Terminal', path: 'wt', category: 'dev', description: 'Launch tabbed Windows Terminal' },
  { name: 'PowerShell', path: 'powershell.exe', category: 'dev', description: 'Windows PowerShell prompt' },
  { name: 'Google Chrome', path: 'chrome.exe', category: 'browser', description: 'Launch Chrome browser' },
  { name: 'File Explorer', path: 'explorer.exe', category: 'productivity', description: 'Open File Explorer' },
  { name: 'Task Manager', path: 'taskmgr.exe', category: 'system', description: 'Windows Task Manager & Performance' },
  { name: 'Calculator', path: 'calc.exe', category: 'utility', description: 'Windows Calculator' },
  { name: 'Notepad', path: 'notepad.exe', category: 'productivity', description: 'Simple text editor' },
];

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
  onLaunchMyApp,
  onDeleteMyApp,
  onRegisterApp,
  onAddMyApp
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'mine' | 'installed' | 'peer'>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [launchedAppId, setLaunchedAppId] = useState<string | null>(null);

  // Installed Apps state
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [isScanningInstalled, setIsScanningInstalled] = useState(false);

  // Add Custom Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formCategory, setFormCategory] = useState<AppCategory>('dev');
  const [formDesc, setFormDesc] = useState('');

  const fetchInstalledApps = async () => {
    setIsScanningInstalled(true);
    try {
      const apps = await TauriService.getInstalledApps();
      if (apps && Array.isArray(apps)) {
        setInstalledApps(apps);
      }
    } catch (_) {
    } finally {
      setIsScanningInstalled(false);
    }
  };

  const handleLaunchLocal = async (app: SharedApp | { id: string; name: string; path?: string; commandOrPackage?: string }) => {
    setLaunchedAppId(app.id);
    const path = app.path || (app as any).commandOrPackage || app.name;
    try {
      if (onLaunchMyApp) {
        onLaunchMyApp(app as SharedApp);
      } else {
        await TauriService.executeLocalCommand(path);
      }
    } catch (_) {}
    setTimeout(() => {
      setLaunchedAppId(null);
    }, 2000);
  };

  const handleLaunchPeer = (app: SharedApp) => {
    setLaunchedAppId(app.id);
    onLaunchPeerApp(app);
    setTimeout(() => {
      setLaunchedAppId(null);
    }, 2000);
  };

  const handleAddPreset = (preset: typeof DEFAULT_PRESETS[0]) => {
    if (onRegisterApp) {
      onRegisterApp(preset);
    }
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPath.trim()) return;

    if (onRegisterApp) {
      onRegisterApp({
        name: formName.trim(),
        path: formPath.trim(),
        category: formCategory,
        description: formDesc.trim() || undefined,
      });
    }
    setFormName('');
    setFormPath('');
    setFormDesc('');
    setShowAddModal(false);
  };

  // Filtered lists
  const filteredMyApps = myApps.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.path && app.path.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const filteredInstalled = installedApps.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.path_or_appid && app.path_or_appid.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const filteredPeerApps = peerApps.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.path && app.path.toLowerCase().includes(searchQuery.toLowerCase())) ||
      app.deviceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex flex-col h-full bg-[var(--surface-container)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-xl text-[var(--text-body)] p-6 select-none">
      {/* Header Bar with Sub-Tab Switcher & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-[var(--border-subtle)]">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-base)] rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveSubTab('mine')}
            className={`h-8 px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-2 ${
              activeSubTab === 'mine'
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Sparkles size={14} />
            <span>My Workstation Apps ({myApps.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('installed');
              if (installedApps.length === 0) fetchInstalledApps();
            }}
            className={`h-8 px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-2 ${
              activeSubTab === 'installed'
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Compass size={14} />
            <span>Installed Windows Apps {installedApps.length > 0 ? `(${installedApps.length})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('peer')}
            className={`h-8 px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center gap-2 ${
              activeSubTab === 'peer'
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Layers size={14} />
            <span>Peer Launchpad ({peerApps.length})</span>
          </button>
        </div>

        {/* Right Actions: Register Shortcut & Scan Buttons */}
        <div className="flex items-center gap-2.5">
          {activeSubTab === 'installed' && (
            <button
              onClick={fetchInstalledApps}
              disabled={isScanningInstalled}
              className="h-8 px-3 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-base)] text-xs font-mono font-medium text-[var(--text-heading)] border border-[var(--border-subtle)] flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={isScanningInstalled ? 'animate-spin' : ''} />
              <span>{isScanningInstalled ? 'Scanning System...' : 'Re-Scan Apps'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="h-8 px-3.5 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] text-xs font-semibold font-mono flex items-center gap-1.5 transition shadow"
          >
            <Plus size={15} />
            <span>Add Shortcut</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] max-w-sm w-full">
          <Search size={14} className="text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search shortcuts, exes, packages..."
            className="flex-1 bg-transparent text-xs text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-heading)]"
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
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold'
                : 'bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)]'
            }`}
          >
            All Categories
          </button>
          {Object.entries(CATEGORY_ICONS).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`h-7 px-2.5 rounded-md text-[11px] font-mono transition flex items-center gap-1.5 ${
                selectedCategory === key
                  ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold'
                  : 'bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)]'
              }`}
            >
              <cat.icon size={12} style={{ color: selectedCategory === key ? 'inherit' : cat.color }} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* VIEW 1: MY WORKSTATION SHORTCUTS */}
        {activeSubTab === 'mine' && (
          <div>
            {filteredMyApps.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] mb-3">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-1">
                  No Workstation Shortcuts Configured
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-5">
                  Register shortcuts for your favorite Windows tools, IDEs, or scripts to launch them in 1-click or stream them to your tablet.
                </p>

                {/* Quick Presets Recommendation */}
                <div className="w-full bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-xl p-4 text-left">
                  <span className="text-[11px] font-mono uppercase font-semibold text-[var(--accent-primary)] block mb-2.5">
                    Recommended Quick Presets
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {DEFAULT_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handleAddPreset(preset)}
                        className="p-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-container)] border border-[var(--border-subtle)] flex items-center justify-between text-left transition group cursor-pointer"
                      >
                        <div className="min-w-0 pr-1">
                          <div className="text-xs font-semibold text-[var(--text-heading)] truncate">{preset.name}</div>
                          <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">{preset.path}</div>
                        </div>
                        <Plus size={14} className="text-[var(--accent-primary)] group-hover:scale-110 transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {filteredMyApps.map((app) => {
                  const catMeta = CATEGORY_ICONS[app.category] || CATEGORY_ICONS.utility;
                  const Icon = catMeta.icon;
                  const isLaunched = launchedAppId === app.id;

                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] transition shadow-sm flex flex-col justify-between gap-3 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shadow shrink-0"
                            style={{
                              backgroundColor: `${catMeta.color}18`,
                              color: catMeta.color,
                              border: `1px solid ${catMeta.color}30`
                            }}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-[var(--text-heading)] truncate">
                              {app.name}
                            </h4>
                            <p className="text-[11px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                              {app.path || 'Registered System Binary'}
                            </p>
                          </div>
                        </div>

                        {onDeleteMyApp && (
                          <button
                            onClick={() => onDeleteMyApp(app.id)}
                            title="Delete Shortcut"
                            className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                        {/* Share to Tablet Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={app.enabled}
                            onChange={e => onToggleMyApp(app.id, e.target.checked)}
                            className="w-3.5 h-3.5 rounded accent-[var(--accent-primary)] cursor-pointer"
                          />
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {app.enabled ? 'Shared to Mesh' : 'Local Only'}
                          </span>
                        </label>

                        {/* Launch Button */}
                        <button
                          onClick={() => handleLaunchLocal(app)}
                          className={`h-7 px-3 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition active:scale-95 ${
                            isLaunched
                              ? 'bg-emerald-600 text-white shadow'
                              : 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] hover:opacity-90 shadow-sm'
                          }`}
                        >
                          {isLaunched ? <Check size={13} /> : <Play size={12} />}
                          <span>{isLaunched ? 'Launched!' : 'Launch'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: INSTALLED WINDOWS APPS */}
        {activeSubTab === 'installed' && (
          <div>
            {isScanningInstalled ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-[var(--accent-primary)] mb-3" />
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  Scanning Windows Start Menu and Application Registries...
                </span>
              </div>
            ) : filteredInstalled.length === 0 ? (
              <div className="py-16 text-center text-xs text-[var(--text-muted)] font-mono">
                No installed Windows applications discovered. Click "Re-Scan Apps" to probe system registries.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredInstalled.map((app) => {
                  const isLaunched = launchedAppId === app.id;
                  const isAlreadyAdded = myApps.some(m => m.path === app.path_or_appid || m.name === app.name);

                  return (
                    <div
                      key={app.id || app.name}
                      className="p-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] transition shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {app.icon_base64 ? (
                          <img
                            src={`data:image/png;base64,${app.icon_base64}`}
                            alt=""
                            className="w-8 h-8 rounded shrink-0 object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                            <Monitor size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[var(--text-heading)] truncate">
                            {app.name}
                          </h4>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] truncate block">
                            {app.is_uwp ? 'UWP App' : app.path_or_appid}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isAlreadyAdded && onRegisterApp && (
                          <button
                            onClick={() =>
                              onRegisterApp({
                                name: app.name,
                                path: app.path_or_appid,
                                category: (app.category as any) || 'productivity',
                              })
                            }
                            title="Add to My Shortcuts"
                            className="h-7 px-2.5 rounded-lg bg-[var(--surface-base)] hover:bg-[var(--surface-container)] text-[var(--text-body)] border border-[var(--border-subtle)] text-[11px] font-mono transition flex items-center gap-1"
                          >
                            <Plus size={13} />
                            <span>Add</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleLaunchLocal(app)}
                          className={`h-7 px-2.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1 transition active:scale-95 ${
                            isLaunched
                              ? 'bg-emerald-600 text-white shadow'
                              : 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] hover:opacity-90 shadow-sm'
                          }`}
                        >
                          {isLaunched ? <Check size={12} /> : <Play size={11} />}
                          <span>{isLaunched ? 'Launched' : 'Launch'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: REMOTE PEER LAUNCHPAD */}
        {activeSubTab === 'peer' && (
          <div>
            {filteredPeerApps.length === 0 ? (
              <div className="py-20 text-center text-xs text-[var(--text-muted)] font-mono">
                No peer application shortcuts shared across mesh nodes yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {filteredPeerApps.map((app) => {
                  const catMeta = CATEGORY_ICONS[app.category] || CATEGORY_ICONS.utility;
                  const Icon = catMeta.icon;
                  const isLaunched = launchedAppId === app.id;

                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 hover:border-[var(--border-active)] transition shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shadow shrink-0"
                          style={{
                            backgroundColor: `${catMeta.color}20`,
                            color: catMeta.color,
                            border: `1px solid ${catMeta.color}35`
                          }}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[var(--text-heading)] truncate">
                            {app.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-0.5">
                            <span className="flex items-center gap-1 font-mono">
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
                        onClick={() => handleLaunchPeer(app)}
                        className={`h-8 px-3.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition active:scale-95 whitespace-nowrap shrink-0 ${
                          isLaunched
                            ? 'bg-emerald-600 text-white border border-emerald-500/30 shadow'
                            : 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] hover:opacity-90 shadow-sm'
                        }`}
                      >
                        {isLaunched ? <Check size={14} /> : <Play size={13} />}
                        <span>{isLaunched ? 'Launched!' : 'Launch'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Custom Shortcut Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-modal)] border border-[var(--border-subtle)] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-[var(--accent-primary)]">
                <Plus size={18} />
                <h3 className="text-sm font-semibold text-[var(--text-heading)]">Register Custom Shortcut</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-heading)] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCustom} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-mono text-[var(--text-muted)] block mb-1">
                  Application / Shortcut Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Visual Studio Code, Dev Server"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-heading)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--text-muted)] block mb-1">
                  Executable Path or Command *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. code ., wt, chrome.exe, C:\Games\game.exe"
                  value={formPath}
                  onChange={e => setFormPath(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-heading)] font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--text-muted)] block mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as AppCategory)}
                  className="w-full h-9 px-3 text-xs bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-heading)] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="dev">Development</option>
                  <option value="browser">Browser</option>
                  <option value="media">Media</option>
                  <option value="productivity">Productivity</option>
                  <option value="system">System</option>
                  <option value="game">Gaming</option>
                  <option value="utility">Utility</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--text-muted)] block mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary coding environment"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-heading)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-8 px-4 rounded-lg bg-[var(--surface-base)] text-xs text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-lg bg-[var(--accent-primary)] text-[var(--m3-on-primary)] text-xs font-semibold font-mono hover:opacity-90 transition shadow cursor-pointer"
                >
                  Save Shortcut
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
