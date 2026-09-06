import React, { useState, useEffect, useMemo } from 'react';
import {
  Grid,
  Sliders,
  Cpu,
  Terminal,
  Radio,
  Settings,
  CornerUpLeft,
  Clipboard,
  Plus,
  Server,
  Lock,
  Search,
  Tablet,
  Laptop,
  Smartphone,
  Monitor,
  Trash2,
  Play,
  Pause,
  Filter,
} from 'lucide-react';
import { useFleetStore } from '../../stores/useFleetStore';
import { useProcessStore } from '../../stores/useProcessStore';
import { useClipboardStore } from '../../stores/useClipboardStore';
import { useExecutableStore } from '../../stores/useExecutableStore';
import { useHotCornerStore } from '../../stores/useHotCornerStore';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { ThemePicker, Theme } from '../theme/ThemePicker';
import { MeshTopologyVisualizer } from '../views/MeshTopologyVisualizer';
import { RemoteControlTab } from '../views/RemoteControlTab';
import { ProcessMonitorTable } from '../views/ProcessMonitorTable';
import { RemoteTerminal } from '../views/RemoteTerminal';
import { RemoteAppShortcuts } from '../views/RemoteAppShortcuts';
import { ConfigPanel } from '../panels/ConfigPanel';
import { HotCornerConfigPanel } from '../panels/HotCornerConfigPanel';
import { ClipboardDrawer } from '../views/ClipboardDrawer';
import { DevicePairingModal } from '../views/DevicePairingModal';
import { TauriService } from '../../services/TauriCommands';

export const DesktopAppShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'topology' | 'control' | 'processes' | 'terminal' | 'shortcuts' | 'config' | 'hotcorners'
  >('topology');

  const {
    devices: fleetDevices,
    selectedDeviceId,
    selectDevice,
    removeDevice,
    subnet,
    setSubnet,
    isScanning,
    scanProgress,
    scannedPeers,
    scanSubnet,
    connectDeviceManual,
    isServerRunning,
    toggleServer,
    fetchServerStatus,
    lanDeviceCount,
    trustedDevices,
    refreshLanCount,
    setDeviceNickname,
    lockWorkstation,
  } = useFleetStore();

  const {
    processes,
    isLoading: isProcessLoading,
    isPolling: isProcessPolling,
    loadProcesses,
    startAutoPolling: startProcessPolling,
    stopAutoPolling: stopProcessPolling,
    terminateProcess,
  } = useProcessStore();

  const {
    items: clipboardItems,
    pushClip,
  } = useClipboardStore();

  const {
    executables: remoteExecutables,
    executeShortcut,
    updateExecutable: updateRemoteExecutable,
    addExecutable: addRemoteExecutable,
    deleteExecutable: deleteRemoteExecutable,
  } = useExecutableStore();

  const {
    sessions: terminalSessions,
    activeSessionId: terminalActiveSessionId,
    isExecuting: isTerminalExecuting,
    initDefaultSession: initTerminalDefaultSession,
    createSession: createTerminalSession,
    closeSession: closeTerminalSession,
    setActiveSession: setTerminalActiveSession,
    clearBuffer: clearTerminalBuffer,
    sendCommand: sendTerminalCommand,
  } = useTerminalStore();

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('nodus_desktop_theme') as Theme) || 'midnight';
  });

  useEffect(() => {
    localStorage.setItem('nodus_desktop_theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchServerStatus();
    const interval = setInterval(() => {
      refreshLanCount();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'desktop' | 'laptop' | 'tablet' | 'online'>('all');

  // Pair Modal & Clipboard Drawer State
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [showClipboardDrawer, setShowClipboardDrawer] = useState(false);

  // Time & Date
  const [currentTime, setCurrentTime] = useState<string>('14:42:08');
  const [currentDate, setCurrentDate] = useState<string>('24 OCT 2026');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0] || now.toLocaleTimeString('en-US', { hour12: false }));
      const day = String(now.getDate()).padStart(2, '0');
      const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = now.getFullYear();
      setCurrentDate(`${day} ${month} ${year}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Map context/store devices to standard DeviceInfo format
  const devices = useMemo(() => {
    return fleetDevices.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type as any,
      os: d.os as any,
      status: d.status as any,
      ipAddress: d.ipAddress,
      resolution: d.resolution || '1920x1080',
      latencyMs: d.isLocal ? 1 : 12,
      batteryPercent: d.battery || 100,
      isLocal: Boolean(d.isLocal || d.id === 'this-pc' || d.id === 'local' || d.ipAddress === '127.0.0.1' || d.ipAddress?.startsWith('127.')),
      cpuUsagePercent: d.cpuLoad || 15,
    }));
  }, [fleetDevices]);

  const targetDevice = useMemo(() => {
    return (
      devices.find(d => d.id === selectedDeviceId) ||
      devices.find(d => !d.isLocal) ||
      devices[0] || {
        id: 'this-pc',
        name: 'Nodus Workstation PC',
        type: 'desktop' as const,
        os: 'windows' as const,
        status: 'online' as const,
        ipAddress: '127.0.0.1',
        resolution: '1920x1080',
        latencyMs: 1,
        batteryPercent: 100,
        isLocal: true,
        cpuUsagePercent: 8,
      }
    );
  }, [devices, selectedDeviceId]);

  // Live Auto-Polling for Process Monitor when tab is active
  useEffect(() => {
    if (activeTab === 'processes' && targetDevice) {
      startProcessPolling(targetDevice as any, 3000);
    } else {
      stopProcessPolling();
    }
    return () => {
      stopProcessPolling();
    };
  }, [activeTab, targetDevice?.id]);

  // Initialize default terminal session for host when terminal tab is opened
  useEffect(() => {
    if (activeTab === 'terminal' && targetDevice) {
      initTerminalDefaultSession(targetDevice as any);
    }
  }, [activeTab, targetDevice?.id]);

  const filteredDevices = devices.filter(dev => {
    const matchesSearch =
      dev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dev.ipAddress.includes(searchQuery) ||
      dev.os.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (deviceFilter === 'all') return true;
    if (deviceFilter === 'online') return dev.status === 'online' || dev.status === 'connected';
    return dev.type === deviceFilter;
  });

  const handleBroadcastClipboard = (content: string) => {
    pushClip(content, 'text', 'Host PC');
  };

  const handleCopyClipboardItem = (item: any) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(item.content);
    }
  };

  return (
    <div className={`theme-${theme} flex flex-col h-screen w-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text-body)] antialiased select-none`}>
      {/* Top Application Header */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-header)] backdrop-blur-xl flex items-center justify-between px-6 min-h-[4.25rem] py-2 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0842A0] text-[#D3E3FD] flex items-center justify-center shadow-md shadow-blue-950/30 shrink-0">
            <Server className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-[var(--text-heading)]">
                Nodus <span className="text-[var(--accent-primary)] font-light">Desktop</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#0F5223] text-[#C4EED0] border border-[#6DD58C]/20 text-[10px] font-medium tracking-wide">
                Host Daemon Active
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              Cross-Device Companion & Control Hub
            </span>
          </div>
        </div>

        {/* Integrated Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-elevated)] focus-within:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] focus-within:border-[var(--border-active)] transition-all text-xs">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search fleet nodes, IP, OS..."
              className="flex-1 bg-transparent text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[var(--text-muted)] hover:text-[var(--text-heading)] text-[11px] px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right Controls: Lock Workstation + Theme Picker + Clock */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => lockWorkstation()}
            className="h-8 px-3 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-elevated)] text-[var(--text-body)] hover:text-[var(--text-heading)] text-xs font-mono flex items-center gap-1.5 transition border border-[var(--border-subtle)]"
            title="Lock Workstation"
          >
            <Lock size={14} style={{ color: 'var(--btn-danger-text)' }} />
            <span>Lock</span>
          </button>

          <ThemePicker current={theme} onChange={setTheme} />

          <div className="text-right shrink-0 pl-1">
            <div className="text-sm font-mono text-[var(--text-heading)] tracking-wide">{currentTime}</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-tight">{currentDate}</div>
          </div>
        </div>
      </header>

      {/* -- Main Application Workspace with Navigation Rail -- */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Navigation Rail */}
        <nav className="w-20 border-r border-[var(--border-subtle)] bg-[var(--surface-base)] flex flex-col items-center py-5 gap-4 z-10 shrink-0 select-none">
          <button
            onClick={() => setShowPairingModal(true)}
            title={`Pair New Mesh Node (${lanDeviceCount || 0} active LAN devices detected)`}
            className="w-11 h-11 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary)] shadow-md shadow-blue-950/20 transition-all flex items-center justify-center active:scale-95 group mb-1 relative"
          >
            <Plus size={22} className="stroke-[2.5]" />
            {lanDeviceCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shadow-md border border-[var(--surface-base)] flex items-center justify-center min-w-[18px] h-[18px] transition-transform animate-in zoom-in-75"
                style={{
                  backgroundColor: 'var(--accent-container)',
                  color: 'var(--accent-on-container)',
                }}
                title={`${lanDeviceCount} active device${lanDeviceCount === 1 ? '' : 's'} on WiFi`}
              >
                {lanDeviceCount}
              </span>
            )}
          </button>

          {[
            { id: 'topology', label: 'Topology', icon: Grid },
            { id: 'control', label: 'Control', icon: Sliders },
            { id: 'processes', label: 'Processes', icon: Cpu },
            { id: 'terminal', label: 'Terminal', icon: Terminal },
            { id: 'shortcuts', label: 'Shortcuts', icon: Radio },
            { id: 'config', label: 'Bridge', icon: Settings },
            { id: 'hotcorners', label: 'HotCorners', icon: CornerUpLeft },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex flex-col items-center group w-full py-1 focus:outline-none"
              >
                <div
                  className={`w-12 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] shadow-sm'
                      : 'text-[var(--text-muted)] group-hover:text-[var(--text-heading)] group-hover:bg-[var(--surface-container)]'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <span
                  className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                    isActive ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-muted)] group-hover:text-[var(--text-heading)]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Bottom Navigation Rail: Universal Clipboard Trigger */}
          <div className="mt-auto flex flex-col items-center w-full">
            <button
              onClick={() => setShowClipboardDrawer(!showClipboardDrawer)}
              title="Universal Mesh Clipboard"
              className="flex flex-col items-center group focus:outline-none w-full py-1"
            >
              <div
                className={`w-12 h-8 rounded-lg flex items-center justify-center transition-all duration-200 relative ${
                  showClipboardDrawer
                    ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)]'
                    : 'text-[var(--text-muted)] group-hover:text-[var(--text-heading)] group-hover:bg-[var(--surface-container)]'
                }`}
              >
                <Clipboard size={18} />
                {clipboardItems.length > 0 && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--surface-base)]" />
                )}
              </div>
              <span className="text-[11px] font-medium tracking-tight mt-1 text-[var(--text-muted)] group-hover:text-[var(--text-heading)]">
                Clipboard
              </span>
            </button>
          </div>
        </nav>

        {/* Workspace Canvas */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-[var(--app-bg)]">
          {/* TAB 1: TOPOLOGY & NODES */}
          {activeTab === 'topology' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <MeshTopologyVisualizer
                devices={devices as any}
                activeDeviceId={selectedDeviceId || undefined}
                onSelectDevice={id => selectDevice(id)}
              />

              <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
                  <span className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5 mr-1 shrink-0">
                    <Filter size={13} />
                    Filter:
                  </span>
                  {[
                    { id: 'all', label: `All (${devices.length})` },
                    { id: 'desktop', label: 'Workstations' },
                    { id: 'laptop', label: 'Laptops' },
                    { id: 'tablet', label: 'Tablets' },
                    { id: 'online', label: 'Online' },
                  ].map(chip => (
                    <button
                      key={chip.id}
                      onClick={() => setDeviceFilter(chip.id as any)}
                      className={`h-8 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap inline-flex items-center justify-center shrink-0 ${
                        deviceFilter === chip.id
                          ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] shadow-sm font-semibold'
                          : 'bg-[var(--chip-bg)] hover:bg-[var(--surface-elevated)] text-[var(--chip-text)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs font-mono text-[var(--text-muted)]">
                  Showing {filteredDevices.length} of {devices.length} nodes
                </span>
              </div>

              {/* Connected Device Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDevices.map(device => {
                  const isSelected = selectedDeviceId === device.id;

                  return (
                    <div
                      key={device.id}
                      onClick={() => selectDevice(device.id)}
                      className={`bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border rounded-xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${
                        isSelected
                          ? 'border-[var(--accent-primary)] ring-1 ring-[var(--border-active)] bg-[var(--surface-elevated)]'
                          : 'border-[var(--border-subtle)] hover:border-[var(--border-active)]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                            {device.type === 'tablet' ? (
                              <Tablet size={20} />
                            ) : device.type === 'laptop' ? (
                              <Laptop size={20} />
                            ) : device.type === 'phone' ? (
                              <Smartphone size={20} />
                            ) : (
                              <Monitor size={20} />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[var(--text-heading)]">
                              {device.name}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                              ID: {device.id} · {device.ipAddress} · {device.os.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        {device.isLocal ? (
                          <span
                            className="text-[11px] px-2.5 py-0.5 rounded-md font-medium tracking-wide flex items-center gap-1.5 border"
                            style={{
                              backgroundColor: isServerRunning ? 'var(--status-online-bg)' : 'var(--status-offline-bg)',
                              color: isServerRunning ? 'var(--status-online-text)' : 'var(--status-offline-text)',
                              borderColor: isServerRunning ? 'var(--status-online-border)' : 'var(--status-offline-border)',
                            }}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isServerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                              }`}
                            />
                            {isServerRunning ? 'HOST DAEMON ACTIVE' : 'SERVER STOPPED'}
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium border ${
                              device.status === 'online'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                : 'bg-blue-500/10 text-[var(--accent-primary)] border-[var(--border-active)]'
                            }`}
                          >
                            {device.status}
                          </span>
                        )}
                      </div>

                      {/* Node Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                        {!device.isLocal ? (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              removeDevice(device.id);
                            }}
                            title="Remove Node from Fleet"
                            className="h-8 px-2.5 rounded-lg text-xs font-medium transition-colors border active:scale-95 inline-flex items-center justify-center gap-1"
                            style={{
                              backgroundColor: 'var(--btn-danger-bg)',
                              color: 'var(--btn-danger-text)',
                              borderColor: 'var(--btn-danger-border)',
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                toggleServer();
                              }}
                              title={isServerRunning ? 'Stop Server & Unregister from Mesh' : 'Start Server & Broadcast to Mesh'}
                              className="h-8 px-2.5 rounded-lg text-xs font-medium transition-colors border active:scale-95 inline-flex items-center justify-center gap-1.5"
                              style={{
                                backgroundColor: isServerRunning ? 'var(--btn-danger-bg)' : 'var(--btn-success-bg)',
                                color: isServerRunning ? 'var(--btn-danger-text)' : 'var(--btn-success-text)',
                                borderColor: isServerRunning ? 'var(--btn-danger-border)' : 'var(--btn-success-border)',
                              }}
                            >
                              {isServerRunning ? <Pause size={13} /> : <Play size={13} />}
                              <span>{isServerRunning ? 'Stop Server' : 'Start Server'}</span>
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setActiveTab('config' as any);
                              }}
                              title="Configure Local Daemon Server"
                              className="h-8 px-2.5 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-elevated)] text-xs font-medium text-[var(--accent-primary)] transition-colors border border-[var(--border-subtle)] active:scale-95 inline-flex items-center justify-center gap-1.5"
                            >
                              <Server size={13} />
                              <span>Config</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            selectDevice(device.id);
                            setActiveTab('control' as any);
                          }}
                          className="h-8 px-3.5 rounded-lg bg-[var(--control-btn-bg)] hover:bg-[var(--control-btn-hover)] text-xs font-medium text-[var(--control-btn-text)] transition-colors border border-[var(--border-subtle)]"
                        >
                          Control Deck
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: REMOTE CONTROL DECK */}
          {activeTab === 'control' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <RemoteControlTab
                devices={devices as any}
                targetDeviceId={selectedDeviceId}
                onSelectDevice={id => selectDevice(id)}
              />
            </div>
          )}

          {/* TAB 3: PROCESS MONITOR */}
          {activeTab === 'processes' && targetDevice && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-5">
              <ProcessMonitorTable
                device={targetDevice as any}
                devices={devices as any}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={id => selectDevice(id)}
                processes={processes as any}
                isLoading={isProcessLoading}
                isPolling={isProcessPolling}
                onTogglePolling={() => {
                  if (isProcessPolling) stopProcessPolling();
                  else startProcessPolling(targetDevice, 3000);
                }}
                onRefresh={() => loadProcesses(targetDevice)}
                onKillProcess={pid => terminateProcess(pid, targetDevice)}
              />
            </div>
          )}

          {/* TAB 4: REMOTE TERMINAL */}
          {activeTab === 'terminal' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-5">
              <RemoteTerminal
                sessions={terminalSessions}
                activeSessionId={terminalActiveSessionId}
                availableDevices={devices as any}
                scannedPeers={scannedPeers}
                isExecuting={isTerminalExecuting}
                theme={theme}
                onSendCommand={(id, cmd) => sendTerminalCommand(id, cmd)}
                onCreateSession={dev => createTerminalSession(dev)}
                onCloseSession={id => closeTerminalSession(id)}
                onSetActiveSession={id => setTerminalActiveSession(id)}
                onClearBuffer={id => clearTerminalBuffer(id)}
              />
            </div>
          )}

          {/* TAB 5: REMOTE SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-5">
              <RemoteAppShortcuts
                myApps={remoteExecutables.map((e: any) => ({
                  id: e.id,
                  name: e.name,
                  category: (e.category as any) || 'productivity',
                  deviceId: 'this-pc',
                  deviceName: 'Workstation PC',
                  deviceType: 'desktop',
                  deviceColor: '#A8C7FA',
                  path: e.commandOrPackage,
                  description: e.description,
                  sharedBy: 'me',
                  enabled: e.pinnedToDrawer ?? true,
                }))}
                peerApps={[]}
                onToggleMyApp={(id: string, enabled: boolean) => updateRemoteExecutable(id, { pinnedToDrawer: enabled })}
                onLaunchPeerApp={(app: any) => {
                  const exec = remoteExecutables.find((e: any) => e.id === app.id);
                  if (exec) executeShortcut(exec);
                }}
                onLaunchMyApp={(app: any) => {
                  const exec = remoteExecutables.find((e: any) => e.id === app.id);
                  if (exec) {
                    executeShortcut(exec);
                  } else if (app.path) {
                    TauriService.executeLocalCommand(app.path);
                  }
                }}
                onRegisterApp={(item) => {
                  addRemoteExecutable({
                    deviceId: 'this-pc',
                    deviceName: 'Workstation PC',
                    deviceType: 'desktop',
                    deviceOs: 'windows',
                    name: item.name,
                    description: item.description,
                    category: (item.category as any) || 'tools',
                    iconName: 'Code',
                    iconColor: '#0EA5E9',
                    execType: 'command',
                    commandOrPackage: item.path,
                    enabled: true,
                    pinnedToDrawer: true,
                  });
                }}
                onDeleteMyApp={(id: string) => {
                  deleteRemoteExecutable(id);
                }}
                onAddMyApp={() => {}}
              />
            </div>
          )}

          {/* TAB 6: CONFIG PANEL / BRIDGE */}
          {activeTab === 'config' && (
            <div className="flex-1 overflow-y-auto p-6">
              <ConfigPanel />
            </div>
          )}

          {/* TAB 7: HOT CORNERS CONFIG */}
          {activeTab === 'hotcorners' && (
            <div className="flex-1 overflow-y-auto p-6">
              <HotCornerConfigPanel />
            </div>
          )}
        </div>
      </main>

      {/* Universal Clipboard Slide-Over Drawer */}
      <ClipboardDrawer
        isOpen={showClipboardDrawer}
        onClose={() => setShowClipboardDrawer(false)}
        items={clipboardItems}
        onBroadcast={handleBroadcastClipboard}
        onCopyItem={handleCopyClipboardItem}
      />

      {/* Subnet Pairing Modal */}
      {showPairingModal && (
        <DevicePairingModal
          isOpen={showPairingModal}
          onClose={() => setShowPairingModal(false)}
          subnet={subnet}
          onSubnetChange={setSubnet}
          isScanning={isScanning}
          scanProgress={scanProgress}
          scannedPeers={scannedPeers}
          trustedDevices={trustedDevices}
          lanDeviceCount={lanDeviceCount}
          onUpdateNickname={setDeviceNickname}
          isServerRunning={isServerRunning}
          onStartServer={toggleServer}
          onStartScan={scanSubnet}
          onPair={(ip, port, token, peer) => {
            connectDeviceManual({
              name: peer?.nickname || peer?.hostname || `Nodus Node (${ip})`,
              ip,
              port,
              type: (peer?.deviceType as any) || 'tablet',
              os: peer?.os || 'android'
            });
            setShowPairingModal(false);
          }}
        />
      )}
    </div>
  );
};
