import React, { useState, useEffect } from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { 
  Zap, 
  Plus, 
  Terminal, 
  Code, 
  Gamepad2, 
  Play, 
  Trash2, 
  Check, 
  X, 
  FolderOpen,
  RefreshCw,
  Search,
  CheckCircle2,
  FolderSync,
  Laptop,
  Layers,
  Sparkles,
  Edit3
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { IconPickerModal } from '../common/IconPickerModal';
import { TauriService } from '../../services/TauriCommands';

interface DiscoveredApp {
  id: string;
  name: string;
  path_or_appid: string;
  is_uwp: boolean;
  icon_base64?: string;
  icon_name?: string;
  icon_color?: string;
  category: string;
  enabled: boolean;
}

const DynamicAppIcon = ({ name, iconName, iconColor, iconBase64, size = 16 }: any) => {
  if (iconBase64) {
    return <img src={iconBase64} alt={name} className="w-full h-full object-contain pointer-events-none" />;
  }
  const Component = (Icons as any)[iconName || ''] || Icons.AppWindow;
  return <Component size={size} style={{ color: iconColor || '#38BDF8' }} className="pointer-events-none" />;
};

export const ShortcutsPanel: React.FC = () => {
  const { executeShortcut } = useDesktop();

  const [activeTab, setActiveTab] = useState<'shared' | 'discover' | 'watched'>('shared');
  const [sharedShortcuts, setSharedShortcuts] = useState<DiscoveredApp[]>([]);
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [folderDiscoveredApps, setFolderDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [watchedFoldersList, setWatchedFoldersList] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [watchedFolderPath, setWatchedFolderPath] = useState('C:\\Projects\\LocalActive\\Repo\\Active\\project-nodus\\shortcuts');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  // Custom Icon Picker Modal state
  const [editingIconApp, setEditingIconApp] = useState<DiscoveredApp | null>(null);

  const fetchShared = async () => {
    try {
      const apps = await TauriService.getSharedShortcuts();
      if (apps && apps.length > 0) {
        setSharedShortcuts(apps);
      }
    } catch (e) {
      console.warn('Failed to fetch shared shortcuts:', e);
    }
  };

  const fetchWatchedConfig = async () => {
    try {
      const folders = await TauriService.getWatchedFolders();
      if (folders && folders.length > 0) {
        setWatchedFoldersList(folders);
      }
    } catch (e) {
      console.warn('Failed to fetch watched config:', e);
    }
  };

  const fetchInstalledApps = async () => {
    setIsScanning(true);
    setStatusMessage('Scanning Windows Start Menu & Installed Apps...');
    try {
      const apps = await TauriService.getInstalledApps();
      if (apps && apps.length > 0) {
        setDiscoveredApps(apps);
        setStatusMessage(`Found ${apps.length} Windows applications`);
      } else {
        setStatusMessage('No applications returned. Ensure desktop backend permissions.');
      }
    } catch (e: any) {
      setStatusMessage(`Scan failed: ${e.message || e}`);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchShared();
    fetchWatchedConfig();
  }, []);

  const toggleShareApp = async (app: DiscoveredApp) => {
    const isAlreadyShared = sharedShortcuts.some((s) => s.path_or_appid === app.path_or_appid);
    let updated: DiscoveredApp[];

    if (isAlreadyShared) {
      updated = sharedShortcuts.filter((s) => s.path_or_appid !== app.path_or_appid);
      setStatusMessage(`Unshared "${app.name}" from tablet.`);
    } else {
      updated = [{ ...app, enabled: true }, ...sharedShortcuts];
      setStatusMessage(`✓ Added "${app.name}" to tablet shortcuts! Tap Sync on tablet.`);
    }

    setSharedShortcuts(updated);
    await TauriService.setSharedShortcuts(updated);
  };

  const handleUpdateIcon = async (iconName: string, iconColor: string) => {
    if (!editingIconApp) return;
    const target = editingIconApp;

    const updatedShared = sharedShortcuts.map((s) => {
      if (s.path_or_appid === target.path_or_appid) {
        return { ...s, icon_name: iconName, icon_color: iconColor, icon_base64: undefined };
      }
      return s;
    });
    setSharedShortcuts(updatedShared);

    setDiscoveredApps((prev) =>
      prev.map((s) =>
        s.path_or_appid === target.path_or_appid
          ? { ...s, icon_name: iconName, icon_color: iconColor, icon_base64: undefined }
          : s
      )
    );

    setFolderDiscoveredApps((prev) =>
      prev.map((s) =>
        s.path_or_appid === target.path_or_appid
          ? { ...s, icon_name: iconName, icon_color: iconColor, icon_base64: undefined }
          : s
      )
    );

    setStatusMessage(`✓ Assigned icon <${iconName} /> (${iconColor}) to "${target.name}". Tap Sync on tablet!`);

    if (sharedShortcuts.some((s) => s.path_or_appid === target.path_or_appid)) {
      await TauriService.setSharedShortcuts(updatedShared);
    }
  };

  const handleScanWatchedFolder = async (folderToScan?: string) => {
    const target = (folderToScan || watchedFolderPath).trim();
    if (!target) return;
    setIsScanning(true);
    setStatusMessage(`Scanning folder: ${target}...`);
    try {
      const apps = await TauriService.addWatchedFolder(target);
      if (apps && apps.length > 0) {
        setFolderDiscoveredApps(apps);
        const folders = await TauriService.getWatchedFolders();
        setWatchedFoldersList(folders);
        await fetchShared();
        setStatusMessage(`Found ${apps.length} shortcuts in folder! Click any item below to share it.`);
      } else {
        setStatusMessage(`Directory '${target}' was read, but no .exe / .lnk / .url / .bat files were found.`);
      }
    } catch (e: any) {
      setStatusMessage(`Failed to scan folder: ${e.message || e}`);
    } finally {
      setIsScanning(false);
    }
  };

  const filteredDiscovered = discoveredApps.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.path_or_appid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolderApps = folderDiscoveredApps.filter((a) =>
    a.name.toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
    a.path_or_appid.toLowerCase().includes(folderSearchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-y-auto pr-1 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Zap size={18} className="text-[#38BDF8]" />
            <span>Shortcuts & Cross-Device Launcher</span>
          </h2>
          <p className="text-xs text-[#8E8E93]">
            Expose Windows software, Steam games, PWAs, or command scripts to your POCO Pad. (Tip: Double-click any icon to customize it!)
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'shared' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-[#8E8E93] hover:text-white'
            }`}
          >
            <span>Active on Tablet ({sharedShortcuts.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('discover');
              if (discoveredApps.length === 0) fetchInstalledApps();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'discover' ? 'bg-[#38BDF8] text-black shadow-md' : 'bg-white/5 text-[#8E8E93] hover:text-white'
            }`}
          >
            <Search size={13} />
            <span>Installed PC Apps</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('watched');
              if (folderDiscoveredApps.length === 0 && watchedFolderPath) {
                handleScanWatchedFolder(watchedFolderPath);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'watched' ? 'bg-[#34C759] text-black shadow-md' : 'bg-white/5 text-[#8E8E93] hover:text-white'
            }`}
          >
            <FolderSync size={13} />
            <span>Watched Folders / PWAs</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-mono text-[#38BDF8] flex items-center justify-between shadow-sm animate-in fade-in duration-150">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-[#8E8E93] hover:text-white p-1">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ─── TAB 1: Shared Apps (Live on Tablet) ────────────────────────── */}
      {activeTab === 'shared' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8E8E93] uppercase font-mono tracking-wider">
              {sharedShortcuts.length} Shortcuts Exposed to Tablet (Double-click any app or icon to customize):
            </span>
            <button
              onClick={fetchShared}
              className="text-xs text-[#38BDF8] hover:underline flex items-center gap-1 font-mono"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          {sharedShortcuts.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#121218] border border-white/10 flex flex-col items-center justify-center text-center space-y-3">
              <Laptop size={36} className="text-[#8E8E93]" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">No Shared Apps Selected</h3>
                <p className="text-xs text-[#8E8E93] max-w-sm">
                  Switch to "Installed PC Apps" or "Watched Folders" to select programs and PWAs to share with your POCO Pad.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveTab('discover');
                    fetchInstalledApps();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#38BDF8] text-black font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95"
                >
                  <Search size={14} />
                  <span>Browse PC Apps</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('watched');
                    handleScanWatchedFolder(watchedFolderPath);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#34C759] text-black font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95"
                >
                  <FolderOpen size={14} />
                  <span>Load PWA Folder</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sharedShortcuts.map((item) => (
                <div
                  key={item.id || item.path_or_appid}
                  onDoubleClick={() => setEditingIconApp(item)}
                  title="Double-click to customize Lucide icon & color"
                  className="p-3.5 rounded-2xl bg-[#121218] border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 shadow-md group transition cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingIconApp(item);
                      }}
                      title="Click or double-click to customize icon"
                      className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 hover:border-[#38BDF8] flex items-center justify-center overflow-hidden shrink-0 p-1.5 transition group-hover:scale-105"
                    >
                      <DynamicAppIcon
                        name={item.name}
                        iconName={item.icon_name}
                        iconColor={item.icon_color}
                        iconBase64={item.icon_base64}
                        size={20}
                      />
                    </button>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{item.name}</span>
                        <Edit3 size={11} className="text-[#8E8E93] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-[10px] font-mono text-[#8E8E93] truncate">{item.path_or_appid}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleShareApp(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] text-[11px] font-bold transition"
                    >
                      Unshare
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: Discover Installed Windows Apps ───────────────────── */}
      {activeTab === 'discover' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-2.5 text-[#8E8E93]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search installed programs, Steam games, PWAs, tools..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-[#64748B] text-xs focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
            <button
              onClick={fetchInstalledApps}
              disabled={isScanning}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
              <span>{isScanning ? 'Scanning...' : 'Rescan Start Menu'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
            {filteredDiscovered.map((app) => {
              const isShared = sharedShortcuts.some((s) => s.path_or_appid === app.path_or_appid);
              return (
                <div
                  key={app.id}
                  onClick={() => toggleShareApp(app)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingIconApp(app);
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition active:scale-98 ${
                    isShared
                      ? 'bg-[#38BDF8]/10 border-[#38BDF8]/40 shadow-sm'
                      : 'bg-[#121218] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingIconApp(app);
                      }}
                      title="Click to customize icon"
                      className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 hover:border-[#38BDF8] flex items-center justify-center overflow-hidden shrink-0 p-1 transition"
                    >
                      <DynamicAppIcon
                        name={app.name}
                        iconName={app.icon_name}
                        iconColor={app.icon_color}
                        iconBase64={app.icon_base64}
                        size={16}
                      />
                    </button>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{app.name}</h4>
                      <p className="text-[9px] font-mono text-[#64748B] truncate">{app.path_or_appid}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isShared ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#38BDF8] text-black flex items-center gap-1">
                        <Check size={10} /> Shared
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[#8E8E93] hover:text-white px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                        + Share
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: Watched Folders / PWAs ────────────────────────────── */}
      {activeTab === 'watched' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#121218] border border-white/10 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderOpen size={18} className="text-[#34C759]" />
                <span>Select Folder to Load PWAs & Shortcuts</span>
              </h3>
              <p className="text-xs text-[#8E8E93] max-w-xl">
                Point Nodus to any folder on your PC (e.g. project shortcuts, Chrome PWAs, or custom desktop folder). Click <strong>Load Shortcuts</strong> to view all discovered items and click on them to share to your tablet. Double-click any item to change its icon!
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white block">Windows Folder Path</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={watchedFolderPath}
                  onChange={(e) => setWatchedFolderPath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleScanWatchedFolder();
                  }}
                  placeholder="e.g. C:\Projects\LocalActive\Repo\Active\project-nodus\shortcuts"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-[#64748B] text-xs font-mono focus:outline-none focus:border-[#34C759]"
                />
                <button
                  onClick={() => handleScanWatchedFolder()}
                  disabled={isScanning}
                  className="px-5 py-2.5 rounded-xl bg-[#34C759] text-black font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 shrink-0 shadow-md"
                >
                  <FolderSync size={14} className={isScanning ? 'animate-spin' : ''} />
                  <span>{isScanning ? 'Loading...' : 'Load Shortcuts'}</span>
                </button>
              </div>
            </div>

            {/* Preset Folder Suggestions */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <label className="text-[11px] font-semibold text-[#8E8E93]">Quick Folder Presets:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Project Shortcuts Folder', path: 'C:\\Projects\\LocalActive\\Repo\\Active\\project-nodus\\shortcuts' },
                  { name: 'Common Desktop', path: 'C:\\Users\\Public\\Desktop' },
                  { name: 'Chrome PWAs', path: 'C:\\Users\\Default\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Web Applications' },
                ].map((sug) => (
                  <button
                    key={sug.name}
                    onClick={() => {
                      setWatchedFolderPath(sug.path);
                      handleScanWatchedFolder(sug.path);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#38BDF8] border border-white/5 transition flex items-center gap-1.5 active:scale-95"
                  >
                    <FolderSync size={12} />
                    <span>{sug.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Discovered Shortcuts in Loaded Folder ─── */}
          {folderDiscoveredApps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#8E8E93] uppercase font-mono tracking-wider">
                  Found {folderDiscoveredApps.length} Shortcuts in Folder — Click to Share on Tablet (Double-click to edit icon):
                </span>
                <div className="w-64 relative">
                  <Search size={13} className="absolute left-2.5 top-2 text-[#8E8E93]" />
                  <input
                    type="text"
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                    placeholder="Filter shortcuts in folder..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-[#64748B] text-xs focus:outline-none focus:border-[#34C759]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                {filteredFolderApps.map((app) => {
                  const isShared = sharedShortcuts.some((s) => s.path_or_appid === app.path_or_appid);
                  return (
                    <div
                      key={app.id}
                      onClick={() => toggleShareApp(app)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingIconApp(app);
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between gap-3 transition active:scale-98 ${
                        isShared
                          ? 'bg-[#34C759]/10 border-[#34C759]/50 shadow-md ring-1 ring-[#34C759]/30'
                          : 'bg-[#121218] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIconApp(app);
                          }}
                          title="Click to customize icon"
                          className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 hover:border-[#34C759] flex items-center justify-center overflow-hidden shrink-0 p-1 transition"
                        >
                          <DynamicAppIcon
                            name={app.name}
                            iconName={app.icon_name}
                            iconColor={app.icon_color}
                            iconBase64={app.icon_base64}
                            size={18}
                          />
                        </button>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{app.name}</span>
                            <Edit3 size={10} className="text-[#8E8E93] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </h4>
                          <p className="text-[9px] font-mono text-[#8E8E93] truncate">{app.path_or_appid}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isShared ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#34C759] text-black flex items-center gap-1 shadow-sm">
                            <Check size={11} strokeWidth={3} /> Shared
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-[#8E8E93] hover:text-white px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                            + Share
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Custom Icon Picker Modal ─── */}
      {editingIconApp && (
        <IconPickerModal
          appName={editingIconApp.name}
          currentIconName={editingIconApp.icon_name || 'AppWindow'}
          currentIconColor={editingIconApp.icon_color || '#38BDF8'}
          onSelectIcon={handleUpdateIcon}
          onClose={() => setEditingIconApp(null)}
        />
      )}
    </div>
  );
};
