import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Trash2,
  X,
  Compass,
  Terminal,
  Folder,
  Activity,
  AppWindow
} from 'lucide-react';
import { universalNetworkFetch } from '../services/FleetDirectClient';

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
  const [activeSubTab, setActiveSubTab] = useState<'peer' | 'mine' | 'installed'>('peer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [launchedAppId, setLaunchedAppId] = useState<string | null>(null);

  // Installed Apps scanned from remote host PC
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [isScanningInstalled, setIsScanningInstalled] = useState(false);

  // Add Custom Modal state for tablet
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formArgs, setFormArgs] = useState('');
  const [formWorkingDir, setFormWorkingDir] = useState('');
  const [formCategory, setFormCategory] = useState<AppCategory>('productivity');
  const [formDesc, setFormDesc] = useState('');

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

  const targetHostIp = peerApps[0]?.deviceIp || '127.0.0.1';

  const fetchInstalledApps = async () => {
    setIsScanningInstalled(true);
    try {
      const host = targetHostIp.includes(':') ? targetHostIp : `${targetHostIp}:9120`;
      const res = await universalNetworkFetch<any>(`http://${host}/api/shortcuts/installed`, {
        headers: { 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
        timeoutMs: 8000,
      });
      if (res.ok && res.data && Array.isArray(res.data.apps)) {
        setInstalledApps(res.data.apps);
      }
    } catch (_) {
    } finally {
      setIsScanningInstalled(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'installed' && installedApps.length === 0) {
      fetchInstalledApps();
    }
  }, [activeSubTab]);

  const handleLaunch = (app: SharedApp) => {
    setLaunchedAppId(app.id);
    onLaunchPeerApp(app);
    setTimeout(() => {
      setLaunchedAppId(null), 2200;
    });
  };

  const handleLaunchInstalledApp = async (app: any) => {
    const appId = `inst-${app.name}`;
    setLaunchedAppId(appId);
    try {
      const host = targetHostIp.includes(':') ? targetHostIp : `${targetHostIp}:9120`;
      await universalNetworkFetch(`http://${host}/api/exec`, {
        method: 'POST',
        headers: { 'X-Nodus-Auth-Token': 'NODUS-FLEET-SECURE' },
        body: { command_or_path: app.path || app.name },
      });
    } catch (_) {}
    setTimeout(() => {
      setLaunchedAppId(null);
    }, 2200);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPath.trim()) return;

    if (onAddMyApp) {
      onAddMyApp();
    }
    setShowAddModal(false);
    setFormName('');
    setFormPath('');
    setFormArgs('');
    setFormWorkingDir('');
    setFormDesc('');
  };

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

  const filteredInstalledApps = installedApps.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.path && app.path.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[var(--surface-container)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-xl text-[var(--text-body)] p-3 sm:p-5 md:p-6 select-none">
      {/* Header Bar with Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-1 p-1 bg-[var(--app-bg)] rounded-lg border border-[var(--border-subtle)] overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('peer')}
            className={`flex-1 sm:flex-initial h-8 px-3 sm:px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeSubTab === 'peer'
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Layers size={14} />
            <span>Host Workstation Apps ({peerApps.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('mine')}
            className={`flex-1 sm:flex-initial h-8 px-3 sm:px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeSubTab === 'mine'
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Compass size={14} />
            <span>Pinned Launchpad ({myApps.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('installed')}
            className={`flex-1 sm:flex-initial h-8 px-3 sm:px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeSubTab === 'installed'
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <AppWindow size={14} />
            <span>Installed Windows Apps ({installedApps.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'installed' && (
            <button
              onClick={fetchInstalledApps}
              disabled={isScanningInstalled}
              className="h-8 px-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-body)] hover:text-[var(--text-heading)] text-xs font-mono flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={isScanningInstalled ? 'animate-spin text-[var(--accent-primary)]' : ''} />
              <span>{isScanningInstalled ? 'Scanning PC...' : 'Rescan PC'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="h-8 px-3.5 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus size={14} />
            <span>Add Shortcut</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applications, binaries, or paths..."
            className="w-full h-8 pl-9 pr-8 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)] font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-heading)]"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`h-7 px-2.5 rounded-md text-[11px] font-mono font-medium transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-bold'
                : 'bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)]'
            }`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_ICONS) as AppCategory[]).map(cat => {
            const info = CATEGORY_ICONS[cat];
            const Icon = info.icon;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`h-7 px-2.5 rounded-md text-[11px] font-mono font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-bold'
                    : 'bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)]'
                }`}
              >
                <Icon size={12} style={{ color: selectedCategory === cat ? 'inherit' : info.color }} />
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Apps Grid Container */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'peer' && (
          filteredPeerApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-[var(--text-muted)] space-y-2">
              <Layers size={32} className="opacity-40" />
              <p className="text-sm font-medium text-[var(--text-heading)]">No Workstation Shortcuts found</p>
              <p className="text-xs max-w-sm">
                Shortcuts pinned on your host Workstation PC will automatically appear here for instant remote execution.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
              {filteredPeerApps.map(app => {
                const catInfo = CATEGORY_ICONS[app.category] || CATEGORY_ICONS.utility;
                const CatIcon = catInfo.icon;
                const isLaunched = launchedAppId === app.id;
                const iconSrc = formatIconSrc(app.icon_base64);

                return (
                  <div
                    key={app.id}
                    className="group relative bg-[var(--surface-elevated)] hover:bg-[var(--surface-base)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] rounded-xl p-4 transition-all duration-200 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] overflow-hidden shrink-0">
                          {iconSrc ? (
                            <img src={iconSrc} alt={app.name} className="w-7 h-7 object-contain" />
                          ) : (
                            <CatIcon size={20} style={{ color: catInfo.color }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[var(--text-heading)] truncate">{app.name}</h4>
                          <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{app.path || 'Binary target'}</p>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0"
                        style={{
                          backgroundColor: `${catInfo.color}15`,
                          color: catInfo.color,
                          borderColor: `${catInfo.color}30`
                        }}
                      >
                        {catInfo.label}
                      </span>
                    </div>

                    {app.description && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {app.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{app.deviceName}</span>
                      </span>

                      <button
                        onClick={() => handleLaunch(app)}
                        className={`h-7 px-3 rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 transition active:scale-95 shadow-sm ${
                          isLaunched
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] hover:opacity-90'
                        }`}
                      >
                        {isLaunched ? <Check size={12} /> : <Play size={12} />}
                        <span>{isLaunched ? 'Launched' : 'Launch'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeSubTab === 'mine' && (
          filteredMyApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-[var(--text-muted)] space-y-2">
              <Compass size={32} className="opacity-40" />
              <p className="text-sm font-medium text-[var(--text-heading)]">No Pinned Shortcuts defined</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs text-[var(--accent-primary)] hover:underline mt-1"
              >
                Create your first custom shortcut
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
              {filteredMyApps.map(app => {
                const catInfo = CATEGORY_ICONS[app.category] || CATEGORY_ICONS.utility;
                const CatIcon = catInfo.icon;
                const isLaunched = launchedAppId === app.id;
                const iconSrc = formatIconSrc(app.icon_base64);

                return (
                  <div
                    key={app.id}
                    className="group relative bg-[var(--surface-elevated)] hover:bg-[var(--surface-base)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] rounded-xl p-4 transition-all duration-200 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] overflow-hidden shrink-0">
                          {iconSrc ? (
                            <img src={iconSrc} alt={app.name} className="w-7 h-7 object-contain" />
                          ) : (
                            <CatIcon size={20} style={{ color: catInfo.color }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[var(--text-heading)] truncate">{app.name}</h4>
                          <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{app.path || 'Local target'}</p>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0"
                        style={{
                          backgroundColor: `${catInfo.color}15`,
                          color: catInfo.color,
                          borderColor: `${catInfo.color}30`
                        }}
                      >
                        {catInfo.label}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-center justify-end">
                      <button
                        onClick={() => handleLaunch(app)}
                        className={`h-7 px-3 rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 transition active:scale-95 shadow-sm ${
                          isLaunched
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] hover:opacity-90'
                        }`}
                      >
                        {isLaunched ? <Check size={12} /> : <Play size={12} />}
                        <span>{isLaunched ? 'Launched' : 'Launch'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeSubTab === 'installed' && (
          isScanningInstalled ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-[var(--accent-primary)]" />
              <p className="text-xs font-mono text-[var(--text-muted)]">Querying Workstation installed apps and Start Menu...</p>
            </div>
          ) : filteredInstalledApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-[var(--text-muted)] space-y-2">
              <AppWindow size={32} className="opacity-40" />
              <p className="text-sm font-medium text-[var(--text-heading)]">No Installed Applications discovered</p>
              <button
                onClick={fetchInstalledApps}
                className="text-xs text-[var(--accent-primary)] hover:underline mt-1"
              >
                Scan Windows applications now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
              {filteredInstalledApps.map((app, idx) => {
                const appId = `inst-${app.name}-${idx}`;
                const isLaunched = launchedAppId === appId;
                const iconSrc = formatIconSrc(app.icon || app.icon_base64);

                return (
                  <div
                    key={appId}
                    className="group relative bg-[var(--surface-elevated)] hover:bg-[var(--surface-base)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] rounded-xl p-4 transition-all duration-200 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] overflow-hidden shrink-0">
                          {iconSrc ? (
                            <img src={iconSrc} alt={app.name} className="w-7 h-7 object-contain" />
                          ) : (
                            <AppWindow size={20} className="text-[var(--accent-primary)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[var(--text-heading)] truncate">{app.name}</h4>
                          <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{app.path || 'System application'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-center justify-end">
                      <button
                        onClick={() => handleLaunchInstalledApp(app)}
                        className={`h-7 px-3 rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 transition active:scale-95 shadow-sm ${
                          isLaunched
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] hover:opacity-90'
                        }`}
                      >
                        {isLaunched ? <Check size={12} /> : <Play size={12} />}
                        <span>{isLaunched ? 'Launched' : 'Launch on PC'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Add Shortcut Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-modal)] border border-[var(--border-subtle)] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-sm font-semibold text-[var(--text-heading)] flex items-center gap-2">
                <Plus size={16} className="text-[var(--accent-primary)]" />
                <span>Add Custom Shortcut</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-heading)]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-3.5">
              <div>
                <label className="text-xs font-mono text-[var(--text-muted)] block mb-1">Shortcut Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Chrome, Steam, Visual Studio Code"
                  required
                  className="w-full h-8 px-3 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-heading)] focus:outline-none focus:border-[var(--border-active)]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-[var(--text-muted)] block mb-1">Executable / Command Target</label>
                <input
                  type="text"
                  value={formPath}
                  onChange={(e) => setFormPath(e.target.value)}
                  placeholder="e.g. chrome.exe, wt.exe, or C:\App\bin.exe"
                  required
                  className="w-full h-8 px-3 text-xs font-mono bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-heading)] focus:outline-none focus:border-[var(--border-active)]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-[var(--text-muted)] block mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as AppCategory)}
                  className="w-full h-8 px-2 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-heading)] focus:outline-none focus:border-[var(--border-active)]"
                >
                  {(Object.keys(CATEGORY_ICONS) as AppCategory[]).map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_ICONS[cat].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-[var(--text-muted)] block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Primary browser for web workflow"
                  className="w-full h-8 px-3 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-heading)] focus:outline-none focus:border-[var(--border-active)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-8 px-3 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-heading)] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim() || !formPath.trim()}
                  className="h-8 px-4 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-50 text-[var(--m3-on-primary)] text-xs font-semibold shadow-sm"
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
