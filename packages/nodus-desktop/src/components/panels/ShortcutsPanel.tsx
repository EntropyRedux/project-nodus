import React, { useState, useEffect, type CSSProperties } from 'react';
import { useDesktop } from '../../context/DesktopContext';
import { TauriService } from '../../services/TauriCommands';

function Icon({ name, size = 18, style }: { name: string; size?: number; style?: CSSProperties }) {
  return (
    <span className="material-symbols-rounded" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

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

type Tab = 'active' | 'installed' | 'watched';

export const ShortcutsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [sharedShortcuts, setSharedShortcuts] = useState<DiscoveredApp[]>([]);
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [folderDiscoveredApps, setFolderDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [watchedFolderPath, setWatchedFolderPath] = useState('C:\\Projects\\LocalActive\\Repo\\Active\\project-nodus\\shortcuts');
  const [appSearch, setAppSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const fetchShared = async () => {
    try {
      const apps = await TauriService.getSharedShortcuts();
      if (apps && apps.length > 0) setSharedShortcuts(apps);
    } catch (_) {}
  };

  const fetchInstalledApps = async () => {
    setIsScanning(true);
    try {
      const apps = await TauriService.getInstalledApps();
      if (apps && apps.length > 0) setDiscoveredApps(apps);
    } catch (_) {
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchShared();
  }, []);

  const toggleShareApp = async (app: DiscoveredApp) => {
    const isAlreadyShared = sharedShortcuts.some((s) => s.path_or_appid === app.path_or_appid);
    let updated: DiscoveredApp[];
    if (isAlreadyShared) {
      updated = sharedShortcuts.filter((s) => s.path_or_appid !== app.path_or_appid);
    } else {
      updated = [{ ...app, enabled: true }, ...sharedShortcuts];
    }
    setSharedShortcuts(updated);
    await TauriService.setSharedShortcuts(updated);
  };

  const handleScanWatchedFolder = async (folderToScan?: string) => {
    const target = (folderToScan || watchedFolderPath).trim();
    if (!target) return;
    setIsScanning(true);
    try {
      const apps = await TauriService.addWatchedFolder(target);
      if (apps && apps.length > 0) setFolderDiscoveredApps(apps);
    } catch (_) {
    } finally {
      setIsScanning(false);
    }
  };

  const filteredInstalled = discoveredApps.filter(a =>
    a.name.toLowerCase().includes(appSearch.toLowerCase()) ||
    a.path_or_appid.toLowerCase().includes(appSearch.toLowerCase())
  );

  const filteredFolderApps = folderDiscoveredApps.filter(a =>
    a.name.toLowerCase().includes(folderFilter.toLowerCase())
  );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'active', label: 'Active on Tablet', count: sharedShortcuts.length },
    { id: 'installed', label: 'Installed Apps' },
    { id: 'watched', label: 'Watched Folders' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--m3-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bolt" size={16} style={{ color: 'var(--m3-on-primary-container)' }} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 400, color: 'var(--m3-on-background)' }}>
            Remote Shortcuts &amp; App Streaming
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--m3-on-surface-variant)', marginLeft: 40 }}>
          Expose Windows software, Steam games, PWAs, or command scripts to your connected tablet
        </p>
      </div>

      {/* M3 Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--m3-surface-container-high)' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'installed' && discoveredApps.length === 0) fetchInstalledApps();
                if (tab.id === 'watched' && folderDiscoveredApps.length === 0) handleScanWatchedFolder();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--m3-primary)' : '2px solid transparent',
                padding: '10px 18px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--m3-primary)' : 'var(--m3-on-surface-variant)',
                fontFamily: 'Roboto, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: -1,
                transition: 'color 150ms ease',
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  style={{
                    background: isActive ? 'var(--m3-primary-container)' : 'var(--m3-surface-container-high)',
                    color: isActive ? 'var(--m3-on-primary-container)' : 'var(--m3-on-surface-variant)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 100,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Active on Tablet */}
      {activeTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--m3-on-surface-variant)', fontWeight: 500 }}>
            {sharedShortcuts.length} Shortcut{sharedShortcuts.length !== 1 ? 's' : ''} Exposed to Tablet
          </div>
          {sharedShortcuts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--m3-on-surface-variant)' }}>
              <Icon name="bolt" size={40} style={{ opacity: 0.25, display: 'block', margin: '0 auto 8px' }} />
              <span style={{ fontSize: 14 }}>No active shortcuts — add from Installed Apps</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {sharedShortcuts.map(s => (
                <div
                  key={s.id || s.path_or_appid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--m3-surface-container-high)',
                    background: 'var(--m3-surface-container-lowest)',
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--m3-surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {s.icon_base64 ? (
                      <img src={s.icon_base64.startsWith('data:') ? s.icon_base64 : `data:image/png;base64,${s.icon_base64}`} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                    ) : (
                      <Icon name="bolt" size={18} style={{ color: 'var(--m3-primary)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--m3-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--m3-on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.path_or_appid}</div>
                  </div>
                  <button
                    onClick={() => toggleShareApp(s)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--m3-on-surface-variant)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--m3-error-container)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Installed Apps */}
      {activeTab === 'installed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Icon name="search" size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--m3-on-surface-variant)', pointerEvents: 'none' }} />
              <input
                value={appSearch}
                onChange={e => setAppSearch(e.target.value)}
                placeholder="Search installed programs, Steam games, PWAs..."
                style={{
                  width: '100%',
                  background: 'var(--m3-surface-container-low)',
                  border: '1px solid var(--m3-outline-variant)',
                  borderRadius: 10,
                  padding: '9px 12px 9px 32px',
                  fontSize: 13,
                  fontFamily: 'Roboto, sans-serif',
                  color: 'var(--m3-on-surface)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={fetchInstalledApps}
              disabled={isScanning}
              style={{
                background: 'var(--m3-secondary-container)',
                color: 'var(--m3-on-secondary-container)',
                border: 'none',
                borderRadius: 10,
                padding: '0 16px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'Roboto, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon name="refresh" size={15} />
              {isScanning ? 'Rescanning...' : 'Rescan Apps'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {filteredInstalled.map(app => {
              const isShared = sharedShortcuts.some(s => s.path_or_appid === app.path_or_appid);
              return (
                <div
                  key={app.id || app.path_or_appid}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    borderRadius: 16,
                    border: isShared
                      ? '1px solid color-mix(in srgb, var(--m3-primary) 40%, transparent)'
                      : '1px solid var(--m3-surface-container-high)',
                    background: isShared
                      ? 'color-mix(in srgb, var(--m3-primary-container) 20%, var(--m3-surface-container-lowest))'
                      : 'var(--m3-surface-container-lowest)',
                    justifyContent: 'space-between',
                    minHeight: 110,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--m3-surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {app.icon_base64 ? (
                        <img src={app.icon_base64.startsWith('data:') ? app.icon_base64 : `data:image/png;base64,${app.icon_base64}`} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                      ) : (
                        <Icon name="bolt" size={18} style={{ color: 'var(--m3-primary)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--m3-on-surface)', marginBottom: 4 }}>{app.name}</div>
                      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--m3-on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.path_or_appid}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <button
                      onClick={() => toggleShareApp(app)}
                      style={{
                        background: isShared ? 'var(--m3-primary)' : 'var(--m3-secondary-container)',
                        color: isShared ? 'var(--m3-on-primary)' : 'var(--m3-on-secondary-container)',
                        border: 'none',
                        borderRadius: 100,
                        padding: '6px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontFamily: 'Roboto, sans-serif',
                      }}
                    >
                      <Icon name={isShared ? 'check' : 'add'} size={14} />
                      {isShared ? 'Shared' : '+ Share'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Watched Folders */}
      {activeTab === 'watched' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--m3-surface-container-lowest)', border: '1px solid var(--m3-surface-container-high)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--m3-surface-container-high)', background: 'var(--m3-surface-container-low)' }}>
              <Icon name="folder_open" size={18} style={{ color: 'var(--m3-tertiary)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m3-on-surface)' }}>Load PWAs &amp; Shortcuts from Directory</span>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--m3-on-surface-variant)', letterSpacing: 0.8, marginBottom: 6 }}>WINDOWS FOLDER PATH</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={watchedFolderPath}
                  onChange={e => setWatchedFolderPath(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--m3-surface-container)',
                    border: '1px solid var(--m3-outline-variant)',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 13,
                    fontFamily: 'Space Mono, monospace',
                    color: 'var(--m3-on-surface)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => handleScanWatchedFolder()}
                  style={{
                    background: 'var(--m3-tertiary-container)',
                    color: 'var(--m3-on-tertiary-container)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'Roboto, sans-serif',
                  }}
                >
                  <Icon name="folder_open" size={15} />
                  Load Shortcuts
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {filteredFolderApps.map(app => {
              const isShared = sharedShortcuts.some(s => s.path_or_appid === app.path_or_appid);
              return (
                <div
                  key={app.id || app.path_or_appid}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    borderRadius: 16,
                    border: '1px solid var(--m3-surface-container-high)',
                    background: 'var(--m3-surface-container-lowest)',
                    minHeight: 110,
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 12, background: 'var(--m3-secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="code" size={18} style={{ color: 'var(--m3-on-secondary-container)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--m3-on-surface)', marginBottom: 4 }}>{app.name}</div>
                      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--m3-on-surface-variant)' }}>{app.path_or_appid}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <button
                      onClick={() => toggleShareApp(app)}
                      style={{
                        background: isShared ? 'var(--m3-primary)' : 'var(--m3-secondary-container)',
                        color: isShared ? 'var(--m3-on-primary)' : 'var(--m3-on-secondary-container)',
                        border: 'none',
                        borderRadius: 100,
                        padding: '6px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontFamily: 'Roboto, sans-serif',
                      }}
                    >
                      <Icon name={isShared ? 'check' : 'add'} size={14} />
                      {isShared ? 'Shared' : '+ Share'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

