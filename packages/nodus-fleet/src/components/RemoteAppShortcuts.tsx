import React, { useState, useEffect } from 'react';
import {
  RemoteAppShortcutsProps,
  SharedApp,
  AppCategory,
  DeviceInfo
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
  Layers,
  Search,
  RefreshCw,
  Trash2,
  X,
  AppWindow,
  Wrench,
  Radio,
  Share2
} from 'lucide-react';
import { universalNetworkFetch } from '../services/FleetDirectClient';

const CATEGORY_ICONS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  all: { label: 'All', icon: Radio, color: '#A8C7FA' },
  browser: { label: 'Browser', icon: Globe, color: '#9ECAFF' },
  media: { label: 'Media', icon: Music, color: '#D4AAFF' },
  dev: { label: 'Development', icon: Code2, color: '#82D5A5' },
  productivity: { label: 'Productivity', icon: FileText, color: '#FFD87A' },
  system: { label: 'System', icon: Settings2, color: '#879099' },
  game: { label: 'Gaming', icon: Gamepad2, color: '#FFB4AB' },
  utility: { label: 'Utility', icon: Zap, color: '#9ECAFF' },
  tools: { label: 'Tools', icon: Wrench, color: '#67E8F9' },
};

const DEFAULT_PRESETS: Array<{
  name: string;
  path: string;
  category: AppCategory;
  description: string;
}> = [
  { name: 'Visual Studio Code', path: 'code .', category: 'dev', description: 'Open workspace in VS Code' },
  { name: 'Windows Terminal', path: 'wt', category: 'dev', description: 'Launch Windows Terminal' },
  { name: 'PowerShell', path: 'powershell.exe', category: 'dev', description: 'Windows PowerShell prompt' },
  { name: 'Google Chrome', path: 'chrome.exe', category: 'browser', description: 'Launch Chrome browser' },
  { name: 'File Explorer', path: 'explorer.exe', category: 'productivity', description: 'Open File Explorer' },
  { name: 'Task Manager', path: 'taskmgr.exe', category: 'system', description: 'Windows Task Manager' },
  { name: 'Calculator', path: 'calc.exe', category: 'utility', description: 'Windows Calculator' },
  { name: 'Notepad', path: 'notepad.exe', category: 'productivity', description: 'Simple text editor' },
];

function getDeviceIcon(type?: SharedApp['deviceType'] | DeviceInfo['type'], size = 12) {
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
  targetDevice,
  devices,
  onToggleMyApp,
  onLaunchPeerApp,
  onLaunchMyApp,
  onDeleteMyApp,
  onRegisterApp,
  onAddMyApp,
  onRefreshPeerShortcuts
}) => {
  // Tabs:
  // 1. mine: My Workstation Apps (apps you allow to be launched by other connected devices)
  // 2. installed: Installed Apps (apps installed on this device)
  // 3. peer: Peer Launchpad (apps that all connected devices allow to be launched)
  const [activeSubTab, setActiveSubTab] = useState<'mine' | 'installed' | 'peer'>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [launchedAppId, setLaunchedAppId] = useState<string | null>(null);
  const [sharedFeedback, setSharedFeedback] = useState<string | null>(null);

  // Installed Apps state with cached persistence
  const [installedApps, setInstalledApps] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('nodus_cached_installed_apps');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isScanningInstalled, setIsScanningInstalled] = useState(false);

  // Custom Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formCategory, setFormCategory] = useState<AppCategory>('productivity');
  const [formDesc, setFormDesc] = useState('');

  // Source device filter for Peer Launchpad
  const [selectedPeerDeviceId, setSelectedPeerDeviceId] = useState<string>('all');

  // Extract unique peer devices from peerApps
  const availablePeerDevices = React.useMemo(() => {
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

  // Fetch installed applications on this device
  const fetchInstalledApps = async () => {
    setIsScanningInstalled(true);
    try {
      const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
      if (bridge && typeof bridge.getInstalledApps === 'function') {
        const rawJson = bridge.getInstalledApps();
        const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        if (parsed && Array.isArray(parsed.apps) && parsed.apps.length > 0) {
          setInstalledApps(parsed.apps);
          try {
            localStorage.setItem('nodus_cached_installed_apps', JSON.stringify(parsed.apps));
          } catch (_) {}
          setIsScanningInstalled(false);
          return;
        }
      }

      // Fallback: If companion PC is available, query companion PC installed apps
      const peerIp = targetDevice?.ipAddress || devices?.find(d => !d.isLocal && d.ipAddress && d.ipAddress !== '127.0.0.1')?.ipAddress;
      if (peerIp && peerIp !== '127.0.0.1') {
        const token = targetDevice?.token || 'NODUS-FLEET-SECURE';
        const host = peerIp.includes(':') ? peerIp : `${peerIp}:9120`;
        const res = await universalNetworkFetch<any>(`http://${host}/api/shortcuts/installed`, {
          headers: { 'X-Nodus-Auth-Token': token },
          timeoutMs: 45000,
        });
        if (res.ok && res.data && Array.isArray(res.data.apps)) {
          setInstalledApps(res.data.apps);
          try {
            localStorage.setItem('nodus_cached_installed_apps', JSON.stringify(res.data.apps));
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('[RemoteAppShortcuts] Failed to fetch installed apps:', e);
    } finally {
      setIsScanningInstalled(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'installed' && installedApps.length === 0) {
      fetchInstalledApps();
    }
  }, [activeSubTab]);

  const handleLaunchPeer = (app: SharedApp) => {
    setLaunchedAppId(app.id);
    onLaunchPeerApp(app);
    setTimeout(() => {
      setLaunchedAppId(null);
    }, 2200);
  };

  const handleLaunchLocal = (app: SharedApp | any) => {
    const appId = app.id || app.name;
    setLaunchedAppId(appId);
    const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
    if (bridge && typeof bridge.launchApp === 'function' && app.path) {
      bridge.launchApp(app.path);
    } else if (onLaunchMyApp) {
      onLaunchMyApp(app);
    }
    setTimeout(() => {
      setLaunchedAppId(null);
    }, 2200);
  };

  const handleAddPreset = (preset: typeof DEFAULT_PRESETS[0]) => {
    if (onRegisterApp) {
      onRegisterApp({
        name: preset.name,
        path: preset.path,
        category: preset.category,
        description: preset.description
      });
      setSharedFeedback(preset.name);
      setTimeout(() => setSharedFeedback(null), 2200);
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPath.trim()) return;

    if (onRegisterApp) {
      onRegisterApp({
        name: formName.trim(),
        path: formPath.trim(),
        category: formCategory,
        description: formDesc.trim() || undefined,
      });
    } else if (onAddMyApp) {
      onAddMyApp();
    }
    setShowAddModal(false);
    setFormName('');
    setFormPath('');
    setFormDesc('');
  };

  const isAppInMyApps = (app: any) => {
    const name = (app.name || '').toLowerCase();
    const target = (app.path_or_appid || app.path || '').toLowerCase();
    return myApps.some(m => m.name.toLowerCase() === name || (m.path && m.path.toLowerCase() === target));
  };

  const handleAddInstalledToMyApps = (app: any) => {
    if (onRegisterApp && !isAppInMyApps(app)) {
      onRegisterApp({
        name: app.name,
        path: app.path_or_appid || app.path || app.name,
        category: (app.category as AppCategory) || 'utility',
        description: `Installed app on ${targetDevice?.name || 'Device'}`,
      });
      setSharedFeedback(app.name);
      setTimeout(() => setSharedFeedback(null), 2200);
    }
  };

  // Filtered lists
  const filteredMyApps = myApps.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.path && app.path.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const filteredInstalledApps = installedApps.filter(app => {
    const name = app.name || '';
    const path = app.path_or_appid || app.path || '';
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      path.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const filteredPeerApps = peerApps.filter(app => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.path && app.path.toLowerCase().includes(searchQuery.toLowerCase())) ||
      app.deviceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    const matchesDevice = selectedPeerDeviceId === 'all' || app.deviceId === selectedPeerDeviceId || app.deviceName === selectedPeerDeviceId;
    return matchesSearch && matchesCat && matchesDevice;
  });

  return (
    <div className="flex flex-col min-h-full md:h-full bg-[var(--surface-container)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-xl text-[var(--text-body)] p-3 sm:p-5 md:p-6 select-none">
      {/* Header Bar with Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-1 p-1 bg-[var(--app-bg)] rounded-lg border border-[var(--border-subtle)] overflow-x-auto no-scrollbar w-full sm:w-auto">
          {/* TAB 1: MY WORKSTATION APPS */}
          <button
            onClick={() => setActiveSubTab('mine')}
            className={`flex-1 sm:flex-initial h-8 px-3 sm:px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'mine'
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Sparkles size={14} />
            <span>My Workstation Apps ({myApps.length})</span>
          </button>

          {/* TAB 2: INSTALLED APPS */}
          <button
            onClick={() => setActiveSubTab('installed')}
            className={`flex-1 sm:flex-initial h-8 px-3 sm:px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'installed'
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <AppWindow size={14} />
            <span>Installed Apps ({installedApps.length})</span>
          </button>

          {/* TAB 3: PEER LAUNCHPAD */}
          <button
            onClick={() => setActiveSubTab('peer')}
            className={`flex-1 sm:flex-initial h-8 px-3 sm:px-3.5 rounded-md text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'peer'
                ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Layers size={14} />
            <span>Peer Launchpad ({peerApps.length})</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeSubTab === 'installed' && (
            <button
              onClick={fetchInstalledApps}
              disabled={isScanningInstalled}
              className="h-8 px-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-body)] hover:text-[var(--text-heading)] text-xs font-mono flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={13} className={isScanningInstalled ? 'animate-spin text-[var(--accent-primary)]' : ''} />
              <span>{isScanningInstalled ? 'Scanning Apps...' : 'Re-Scan Apps'}</span>
            </button>
          )}

          {activeSubTab === 'peer' && onRefreshPeerShortcuts && (
            <button
              onClick={onRefreshPeerShortcuts}
              className="h-8 px-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-body)] hover:text-[var(--text-heading)] text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Refresh Peers</span>
            </button>
          )}

          {activeSubTab === 'mine' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="h-8 px-3.5 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span>Add Shortcut</span>
            </button>
          )}
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
            placeholder={
              activeSubTab === 'mine'
                ? 'Search your workstation shortcuts...'
                : activeSubTab === 'installed'
                ? 'Search installed applications...'
                : 'Search remote peer applications & binaries...'
            }
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
          {Object.entries(CATEGORY_ICONS).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`h-7 px-2.5 rounded-md text-[11px] font-mono font-medium transition whitespace-nowrap cursor-pointer ${
                selectedCategory === key
                  ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-bold'
                  : 'bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Peer Source Device Filter (for Peer Launchpad) */}
      {activeSubTab === 'peer' && availablePeerDevices.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-3 pb-1 border-b border-[var(--border-subtle)]">
          <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0 mr-1 flex items-center gap-1">
            <Monitor size={12} />
            <span>Origin:</span>
          </span>
          <button
            onClick={() => setSelectedPeerDeviceId('all')}
            className={`h-6 px-2.5 rounded-full text-[10px] font-mono transition whitespace-nowrap cursor-pointer ${
              selectedPeerDeviceId === 'all'
                ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] font-semibold border border-[var(--border-active)]'
                : 'bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)]'
            }`}
          >
            All Nodes ({peerApps.length})
          </button>
          {availablePeerDevices.map(dev => (
            <button
              key={dev.id}
              onClick={() => setSelectedPeerDeviceId(dev.id)}
              className={`h-6 px-2.5 rounded-full text-[10px] font-mono transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                selectedPeerDeviceId === dev.id
                  ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] font-semibold border border-[var(--border-active)]'
                  : 'bg-[var(--surface-base)] text-[var(--text-muted)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)]'
              }`}
            >
              <span style={{ color: dev.color }}>{getDeviceIcon(dev.type, 11)}</span>
              <span>{dev.name}</span>
              <span className="opacity-60">({dev.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Shared Feedback Toast */}
      {sharedFeedback && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <Check size={14} className="text-emerald-400" />
          <span>Added &quot;{sharedFeedback}&quot; to My Workstation Apps!</span>
        </div>
      )}

      {/* Main Apps Grid Container */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* ================================================================= */}
        {/* TAB 1: MY WORKSTATION APPS (Apps allowed to be launched by peers) */}
        {/* ================================================================= */}
        {activeSubTab === 'mine' && (
          filteredMyApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-muted)] space-y-4 max-w-xl mx-auto">
              <Sparkles size={36} className="text-[var(--accent-primary)] opacity-80" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-heading)]">No Workstation Apps Configured</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  Configure the applications on this device that other connected devices (such as your desktop or other fleet nodes) are allowed to launch remotely.
                </p>
              </div>

              {/* Recommended Quick Presets */}
              <div className="w-full bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-xl p-4 text-left shadow-sm">
                <span className="text-[11px] font-mono uppercase font-semibold text-[var(--accent-primary)] block mb-2.5">
                  Recommended Quick Presets
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs text-[var(--accent-primary)] hover:underline font-mono inline-flex items-center gap-1"
              >
                <Plus size={13} /> Or create custom shortcut manually
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
                          <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{app.path || 'Registered Binary'}</p>
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
                      {/* Allow to be launched by other connected devices toggle */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={app.enabled !== false}
                          onChange={e => onToggleMyApp(app.id, e.target.checked)}
                          className="w-3.5 h-3.5 rounded accent-[var(--accent-primary)] cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                          <Share2 size={11} className={app.enabled !== false ? 'text-emerald-400' : 'text-slate-500'} />
                          <span>{app.enabled !== false ? 'Shared to Mesh' : 'Local Only'}</span>
                        </span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        {onDeleteMyApp && (
                          <button
                            onClick={() => onDeleteMyApp(app.id)}
                            title="Delete shortcut"
                            className="w-7 h-7 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition active:scale-95 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        <button
                          onClick={() => handleLaunchLocal(app)}
                          title="Test / Launch shortcut"
                          className={`h-7 px-2.5 rounded-lg text-xs font-medium font-mono flex items-center gap-1 transition active:scale-95 cursor-pointer ${
                            isLaunched
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-[var(--surface-base)] text-[var(--text-body)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)]'
                          }`}
                        >
                          {isLaunched ? <Check size={12} /> : <Play size={11} />}
                          <span>{isLaunched ? 'Started' : 'Test'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ================================================================= */}
        {/* TAB 2: INSTALLED APPS (All apps installed on this device)         */}
        {/* ================================================================= */}
        {activeSubTab === 'installed' && (
          isScanningInstalled ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-[var(--text-muted)] space-y-3">
              <RefreshCw size={32} className="animate-spin text-[var(--accent-primary)]" />
              <p className="text-sm font-medium text-[var(--text-heading)]">Scanning Installed Applications...</p>
              <p className="text-xs font-mono text-[var(--text-muted)]">Querying package manager and application catalog...</p>
            </div>
          ) : filteredInstalledApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-[var(--text-muted)] space-y-2">
              <AppWindow size={32} className="opacity-40" />
              <p className="text-sm font-medium text-[var(--text-heading)]">No Installed Applications discovered</p>
              <button
                onClick={fetchInstalledApps}
                className="text-xs text-[var(--accent-primary)] hover:underline mt-1 font-mono flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} /> Scan device applications now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
              {filteredInstalledApps.map((app, idx) => {
                const appId = `inst-${app.id || app.name}-${idx}`;
                const iconSrc = formatIconSrc(app.icon || app.icon_base64);
                const isShared = isAppInMyApps(app);
                const targetDisplay = app.path_or_appid || app.path || 'System Application';

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
                          <p className="text-[11px] font-mono text-[var(--text-muted)] truncate" title={targetDisplay}>
                            {targetDisplay}
                          </p>
                        </div>
                      </div>

                      {app.is_uwp && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                          UWP
                        </span>
                      )}
                      {app.is_android && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          APK
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        {isShared ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <Check size={12} /> In Workstation Apps
                          </span>
                        ) : (
                          'Local App'
                        )}
                      </span>

                      {/* Add to Workstation Apps button */}
                      <button
                        onClick={() => handleAddInstalledToMyApps(app)}
                        disabled={isShared}
                        title={isShared ? 'Already allowed in My Workstation Apps' : 'Allow connected devices to launch this app'}
                        className={`h-7 px-3 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border transition active:scale-95 cursor-pointer ${
                          isShared
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 opacity-70 cursor-default'
                            : 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] hover:opacity-90 border-transparent shadow-sm'
                        }`}
                      >
                        {isShared ? <Check size={12} /> : <Plus size={12} />}
                        <span>{isShared ? 'Shared' : '+ Add to My Apps'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ================================================================= */}
        {/* TAB 3: PEER LAUNCHPAD (Apps connected devices allow to be launched) */}
        {/* ================================================================= */}
        {activeSubTab === 'peer' && (
          filteredPeerApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-[var(--text-muted)] space-y-3">
              <Layers size={36} className="opacity-40" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-heading)]">No Peer Applications Available</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm leading-relaxed">
                  When connected nodes (like your workstation PC {targetDevice?.name || ''}) enable and share applications to the mesh, they will appear here ready to launch.
                </p>
              </div>
              {onRefreshPeerShortcuts && (
                <button
                  onClick={onRefreshPeerShortcuts}
                  className="text-xs text-[var(--accent-primary)] hover:underline font-mono inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} /> Check for shortcuts from {targetDevice?.name || 'PC'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
              {filteredPeerApps.map(app => {
                const catInfo = CATEGORY_ICONS[app.category] || CATEGORY_ICONS.utility;
                const CatIcon = catInfo.icon;
                const isLaunched = launchedAppId === app.id;
                const iconSrc = formatIconSrc(app.icon_base64);
                const devColor = app.deviceColor || '#A8C7FA';

                return (
                  <div
                    key={app.id}
                    className="group relative bg-[var(--surface-elevated)] hover:bg-[var(--surface-base)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] rounded-xl p-4 transition-all duration-200 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md"
                  >
                    {/* Device Origin Header Badge */}
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)]/60 pb-2">
                      <div
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border shrink-0"
                        style={{
                          backgroundColor: `${devColor}18`,
                          borderColor: `${devColor}35`,
                          color: devColor,
                        }}
                      >
                        {getDeviceIcon(app.deviceType, 11)}
                        <span className="font-semibold truncate max-w-[120px]">
                          {app.deviceName}
                        </span>
                        {app.deviceIp && (
                          <span className="opacity-70 text-[9px]">· {app.deviceIp}</span>
                        )}
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

                    {/* App Content */}
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
                        <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{app.path || 'Remote target'}</p>
                      </div>
                    </div>

                    {app.description && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {app.description}
                      </p>
                    )}

                    {/* Remote Launch Action Button */}
                    <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Ready</span>
                      </span>

                      <button
                        onClick={() => handleLaunchPeer(app)}
                        className={`h-7 px-3.5 rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer ${
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
      </div>

      {/* Add Custom Shortcut Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-modal)] border border-[var(--border-subtle)] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-sm font-semibold text-[var(--text-heading)] flex items-center gap-2">
                <Plus size={16} className="text-[var(--accent-primary)]" />
                <span>Add Workstation Shortcut</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-heading)] cursor-pointer"
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
                  placeholder="e.g. chrome.exe, wt.exe, or com.package.name"
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
                  {(Object.keys(CATEGORY_ICONS) as AppCategory[])
                    .filter(c => c !== 'all')
                    .map(cat => (
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
                  className="h-8 px-3 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-heading)] text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim() || !formPath.trim()}
                  className="h-8 px-4 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-50 text-[var(--m3-on-primary)] text-xs font-semibold shadow-sm active:scale-95 cursor-pointer"
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
