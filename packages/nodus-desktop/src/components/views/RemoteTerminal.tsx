import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { DeviceInfo } from '../../types/desktop';
import {
  RemoteTerminalProps,
  TerminalSession,
  ScannedPeer,
} from '../../types/ui-contracts';
import { TauriService } from '../../services/TauriCommands';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Trash2,
  Copy,
  Check,
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  Search,
  Radio,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';

function getDeviceIcon(type?: DeviceInfo['type'] | string, size = 13) {
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

function getTerminalThemeColors(themeName?: string) {
  switch (themeName) {
    case 'light':
      return {
        // Soft, comfortably darkened slate-200 background (not blinding stark white)
        background: '#E2E8F0',
        foreground: '#0F172A',
        cursor: '#0B57D0',
        cursorAccent: '#E2E8F0',
        selectionBackground: 'rgba(11, 87, 208, 0.30)',
        black: '#1E293B',
        red: '#B91C1C',
        green: '#047857',
        yellow: '#B45309', // amber/gold for yellow (e.g. cline) - high contrast on light bg
        blue: '#1D4ED8',
        magenta: '#6D28D9',
        cyan: '#0E7490', // deep teal/cyan - crystal clear on light bg
        white: '#F8FAFC',
        brightBlack: '#475569',
        brightRed: '#DC2626',
        brightGreen: '#059669',
        brightYellow: '#D97706',
        brightBlue: '#2563EB',
        brightMagenta: '#7C3AED',
        brightCyan: '#0891B2',
        brightWhite: '#0F172A',
      };
    case 'obsidian':
      return {
        background: '#07070C',
        foreground: '#F1F5F9',
        cursor: '#C084FC',
        cursorAccent: '#07070C',
        selectionBackground: 'rgba(167, 139, 250, 0.35)',
        black: '#334155',
        red: '#F87171',
        green: '#4ADE80',
        yellow: '#FBBF24',
        blue: '#60A5FA',
        magenta: '#C084FC',
        cyan: '#38BDF8',
        white: '#F8FAFC',
        brightBlack: '#64748B',
        brightRed: '#FCA5A5',
        brightGreen: '#86EFAC',
        brightYellow: '#FDE047',
        brightBlue: '#93C5FD',
        brightMagenta: '#E9D5FF',
        brightCyan: '#7DD3FC',
        brightWhite: '#FFFFFF',
      };
    case 'cyberpunk':
      return {
        background: '#090D16',
        foreground: '#E2E8F0',
        cursor: '#22D3EE',
        cursorAccent: '#090D16',
        selectionBackground: 'rgba(34, 211, 238, 0.35)',
        black: '#1E293B',
        red: '#FF0055',
        green: '#00FF9F',
        yellow: '#FFE600',
        blue: '#00B8FF',
        magenta: '#D600FF',
        cyan: '#00F0FF',
        white: '#F8FAFC',
        brightBlack: '#475569',
        brightRed: '#FF4D88',
        brightGreen: '#5CFFBF',
        brightYellow: '#FFF066',
        brightBlue: '#66D4FF',
        brightMagenta: '#E666FF',
        brightCyan: '#66F5FF',
        brightWhite: '#FFFFFF',
      };
    case 'slate':
      return {
        background: '#0F172A',
        foreground: '#F8FAFC',
        cursor: '#94A3B8',
        cursorAccent: '#0F172A',
        selectionBackground: 'rgba(148, 163, 184, 0.35)',
        black: '#1E293B',
        red: '#EF4444',
        green: '#10B981',
        yellow: '#F59E0B',
        blue: '#3B82F6',
        magenta: '#8B5CF6',
        cyan: '#06B6D4',
        white: '#F8FAFC',
        brightBlack: '#64748B',
        brightRed: '#F87171',
        brightGreen: '#34D399',
        brightYellow: '#FBBF24',
        brightBlue: '#60A5FA',
        brightMagenta: '#A78BFA',
        brightCyan: '#22D3EE',
        brightWhite: '#FFFFFF',
      };
    case 'midnight':
    default:
      return {
        background: '#0D1117',
        foreground: '#E6EDF3',
        cursor: '#A8C7FA',
        cursorAccent: '#0D1117',
        selectionBackground: 'rgba(56, 139, 253, 0.35)',
        black: '#484F58',
        red: '#FF7B72',
        green: '#7EE787',
        yellow: '#FFA657',
        blue: '#79C0FF',
        magenta: '#D2A8FF',
        cyan: '#56D4DD',
        white: '#F0F6FC',
        brightBlack: '#6E7681',
        brightRed: '#FFA198',
        brightGreen: '#AFF5B4',
        brightYellow: '#FFDF5D',
        brightBlue: '#A5D6FF',
        brightMagenta: '#EDB4FF',
        brightCyan: '#8CE9FF',
        brightWhite: '#FFFFFF',
      };
  }
}

interface XTermViewProps {
  session: TerminalSession;
  theme?: string;
}

const XTermView: React.FC<XTermViewProps> = ({ session, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Dynamic real-time theme synchronization without restarting session
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getTerminalThemeColors(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current) return;

    const themeColors = getTerminalThemeColors(theme);

    const term = new XTerm({
      theme: themeColors,
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: 'var(--app-font-mono), "Cascadia Code", Consolas, monospace',
      lineHeight: 1.25,
      convertEol: true,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (_) {}
    }, 50);

    let unlistenData: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    // Spawn native Windows ConPTY session
    const initPty = async () => {
      const cols = term.cols || 80;
      const rows = term.rows || 24;

      await TauriService.spawnPty(session.id, cols, rows, session.cwd);

      unlistenData = await TauriService.listenPtyData(session.id, (data) => {
        term.write(data);
      });

      unlistenExit = await TauriService.listenPtyExit(session.id, () => {
        term.writeln('\r\n[Process terminated]');
      });
    };

    initPty();

    // Stream user keystrokes into ConPTY
    const dataSub = term.onData((data) => {
      TauriService.writePty(session.id, data);
    });

    // Handle container resizing
    const handleResize = () => {
      if (fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit();
          TauriService.resizePty(session.id, termRef.current.cols, termRef.current.rows);
        } catch (_) {}
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      dataSub.dispose();
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (unlistenData) unlistenData();
      if (unlistenExit) unlistenExit();
      TauriService.killPty(session.id);
      term.dispose();
    };
  }, [session.id]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[300px] overflow-hidden p-3 select-text"
      style={{
        backgroundColor: getTerminalThemeColors(theme).background,
      }}
    />
  );
};

export const RemoteTerminal: React.FC<RemoteTerminalProps> = ({
  sessions = [],
  activeSessionId,
  availableDevices = [],
  scannedPeers = [],
  isLoading = false,
  isExecuting = false,
  theme,
  onSendCommand,
  onCreateSession,
  onCloseSession,
  onSetActiveSession,
  onClearBuffer,
}) => {
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const activeSession = useMemo(() => {
    if (activeSessionId) {
      const found = sessions.find(s => s.id === activeSessionId);
      if (found) return found;
    }
    return sessions[0] || null;
  }, [sessions, activeSessionId]);

  const handleSelectSession = (id: string) => {
    onSetActiveSession?.(id);
  };

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onCloseSession?.(id);
  };

  const handleSpawnSessionForDevice = (device: DeviceInfo) => {
    setShowDeviceModal(false);
    setDeviceSearch('');
    onCreateSession?.(device);
  };

  const handleSpawnSessionForScannedPeer = (peer: ScannedPeer) => {
    setShowDeviceModal(false);
    setDeviceSearch('');
    const dev: DeviceInfo = {
      id: `node-${peer.ip.replace(/[\.:]/g, '-')}`,
      name: peer.nickname || peer.hostname || `Peer (${peer.ip})`,
      type: (peer.deviceType as any) || 'tablet',
      os: 'android',
      status: 'connected',
      ipAddress: peer.ip,
      isLocal: false,
    };
    onCreateSession?.(dev);
  };

  const handleSendVirtualKey = (key: string) => {
    if (!activeSession) return;
    TauriService.writePty(activeSession.id, key);
  };

  const handleQuickMacro = (command: string) => {
    if (!activeSession) return;
    TauriService.writePty(activeSession.id, `${command}\r`);
  };

  // Filtered devices for the modal
  const filteredAvailableDevices = useMemo(() => {
    const q = deviceSearch.toLowerCase().trim();
    if (!q) return availableDevices;
    return availableDevices.filter(
      d =>
        d.name.toLowerCase().includes(q) ||
        d.ipAddress.toLowerCase().includes(q) ||
        d.os.toLowerCase().includes(q)
    );
  }, [availableDevices, deviceSearch]);

  const filteredScannedPeers = useMemo(() => {
    const q = deviceSearch.toLowerCase().trim();
    if (!q) return scannedPeers;
    return scannedPeers.filter(
      p =>
        p.ip.toLowerCase().includes(q) ||
        (p.nickname && p.nickname.toLowerCase().includes(q)) ||
        (p.hostname && p.hostname.toLowerCase().includes(q))
    );
  }, [scannedPeers, deviceSearch]);

  return (
    <div className="flex flex-col h-full bg-[var(--surface-container)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-xl text-[var(--text-body)] relative">
      {/* 1. Header & Tab Navigation Bar */}
      <div className="px-4 py-2.5 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 flex-wrap">
        {/* Left Section: Shell Indicator & Tab List */}
        <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
          <div className="flex items-center gap-2 pr-3 border-r border-[var(--border-subtle)] text-xs font-mono font-semibold text-[var(--text-heading)] shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-container)] text-[var(--accent-on-container)] flex items-center justify-center shadow-sm">
              <TerminalIcon className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline">Interactive PTY Shell</span>
          </div>

          {/* Active Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {sessions.map((sess, idx) => {
              const isActive = sess.id === activeSession?.id;
              return (
                <div
                  key={sess.id}
                  onClick={() => handleSelectSession(sess.id)}
                  className={`flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-mono font-medium cursor-pointer transition select-none shrink-0 ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary)] font-semibold shadow-sm'
                      : 'bg-[var(--surface-container)] text-[var(--text-muted)] hover:bg-[var(--surface-base)] hover:text-[var(--text-heading)] border border-[var(--border-subtle)]'
                  }`}
                  title={`${sess.targetDevice.name} (${sess.targetDevice.ipAddress})`}
                >
                  {getDeviceIcon(sess.targetDevice.type, 13)}
                  <span className="max-w-[120px] truncate">{sess.targetDevice.name}</span>
                  {sessions.filter(s => s.targetDevice.id === sess.targetDevice.id).length > 1 && (
                    <span className="text-[10px] opacity-75 font-mono">#{idx + 1}</span>
                  )}
                  {sessions.length > 1 && (
                    <button
                      onClick={e => handleCloseTab(e, sess.id)}
                      className="p-0.5 rounded-md hover:bg-black/20 dark:hover:bg-white/20 transition ml-0.5"
                      title="Close Tab"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* New Shell Button */}
          <button
            onClick={() => setShowDeviceModal(true)}
            className="h-8 px-3 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[var(--text-body)] hover:text-[var(--text-heading)] transition flex items-center gap-1.5 text-xs font-mono border border-[var(--border-subtle)] shrink-0 active:scale-95 shadow-sm"
            title="Open New Interactive Shell on Local Host or Remote Companion"
          >
            <Plus size={13} className="text-[var(--accent-primary)]" />
            <span className="font-medium">New Shell</span>
          </button>
        </div>

        {/* Right Section: Status Indicator */}
        <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[10px] font-semibold text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ConPTY Active
          </span>
        </div>
      </div>

      {/* 2. Device Selection Modal / Popover */}
      {showDeviceModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-modal)] border border-[var(--border-active)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85%] text-[var(--text-body)] animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-container)] text-[var(--accent-on-container)] flex items-center justify-center">
                  <TerminalIcon size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-heading)]">
                    Select Target Node
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    Spawn an interactive PTY shell on local host or remote fleet peer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeviceModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-heading)] transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--surface-base)]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={deviceSearch}
                  onChange={e => setDeviceSearch(e.target.value)}
                  placeholder="Search device name, IP, OS..."
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg h-8 pl-9 pr-3 text-xs font-mono text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
                  autoFocus
                />
              </div>
            </div>

            {/* Device List Body */}
            <div className="p-3 overflow-y-auto space-y-3 flex-1">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-[var(--text-muted)] px-1 tracking-wider">
                  Fleet Workstations & Nodes ({filteredAvailableDevices.length})
                </span>
                <div className="mt-1.5 space-y-1.5">
                  {filteredAvailableDevices.map(dev => (
                    <button
                      key={dev.id}
                      onClick={() => handleSpawnSessionForDevice(dev)}
                      className="w-full text-left p-3 rounded-xl bg-[var(--surface-base)] hover:bg-[var(--card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] transition flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[var(--surface-elevated)] text-[var(--accent-primary)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)]">
                          {getDeviceIcon(dev.type, 18)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--text-heading)] group-hover:text-[var(--accent-primary)] transition">
                              {dev.name}
                            </span>
                            {dev.isLocal && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[var(--accent-container)] text-[var(--accent-on-container)]">
                                LOCAL HOST
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                            <span>{dev.ipAddress || '127.0.0.1'}</span>
                            <span>•</span>
                            <span className="capitalize">{dev.os}</span>
                            {dev.status === 'online' && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-500 font-semibold">Online</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition">
                        <span>Spawn PTY</span>
                        <Play size={12} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {filteredScannedPeers.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-[var(--text-muted)] px-1 tracking-wider">
                    Discovered Subnet Peers ({filteredScannedPeers.length})
                  </span>
                  <div className="mt-1.5 space-y-1.5">
                    {filteredScannedPeers.map(peer => (
                      <button
                        key={peer.ip}
                        onClick={() => handleSpawnSessionForScannedPeer(peer)}
                        className="w-full text-left p-3 rounded-xl bg-[var(--surface-base)] hover:bg-[var(--card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] transition flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-muted)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)]">
                            <Radio size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-[var(--text-heading)] group-hover:text-[var(--accent-primary)] transition">
                              {peer.nickname || peer.hostname || `LAN Node (${peer.ip})`}
                            </span>
                            <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                              {peer.ip}:{peer.port || 9120} {peer.hasAgent ? '• Agent Ready' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition">
                          <span>Connect PTY</span>
                          <Play size={12} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] flex items-center justify-end">
              <button
                onClick={() => setShowDeviceModal(false)}
                className="h-8 px-4 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-xs font-mono font-medium text-[var(--text-body)] transition border border-[var(--border-subtle)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Interactive xterm.js PTY Canvas */}
      <div
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
        style={{
          backgroundColor: getTerminalThemeColors(theme).background,
        }}
      >
        {activeSession ? (
          <XTermView key={activeSession.id} session={activeSession} theme={theme} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] gap-3 p-8">
            <TerminalIcon size={48} className="opacity-40 text-[var(--accent-primary)]" />
            <p className="text-xs font-mono text-center">
              No active terminal sessions. Click <strong className="text-[var(--text-heading)]">New Shell</strong> above to open a shell.
            </p>
            <button
              onClick={() => setShowDeviceModal(true)}
              className="h-8 px-4 rounded-lg bg-[var(--accent-primary)] text-[var(--m3-on-primary)] text-xs font-mono font-semibold transition shadow active:scale-95"
            >
              Open Shell Session
            </button>
          </div>
        )}
      </div>

      {/* 4. Touch-Friendly Mobile/Tablet Virtual Toolbar & Macro Row */}
      <div className="px-4 py-2 bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 overflow-x-auto text-xs font-mono flex-wrap">
        {/* Virtual Helper Keys (Essential for Tablet / Mobile / Couch Coding) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mr-1">Keys:</span>
          <button
            onClick={() => handleSendVirtualKey('\x03')}
            className="h-7 px-2.5 rounded-md font-mono text-[11px] font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition active:scale-95"
            title="Interrupt Signal (Ctrl+C)"
          >
            Ctrl+C
          </button>
          <button
            onClick={() => handleSendVirtualKey('\t')}
            className="h-7 px-2.5 rounded-md font-mono text-[11px] bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[var(--text-body)] border border-[var(--border-subtle)] transition active:scale-95"
            title="Tab Autocomplete"
          >
            Tab
          </button>
          <button
            onClick={() => handleSendVirtualKey('\x1b')}
            className="h-7 px-2.5 rounded-md font-mono text-[11px] bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[var(--text-body)] border border-[var(--border-subtle)] transition active:scale-95"
            title="Escape"
          >
            Esc
          </button>
          <button
            onClick={() => handleSendVirtualKey('\x1b[A')}
            className="h-7 px-2 rounded-md font-mono text-[11px] bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[var(--text-body)] border border-[var(--border-subtle)] transition active:scale-95"
            title="Up Arrow (History)"
          >
            ↑
          </button>
          <button
            onClick={() => handleSendVirtualKey('\x1b[B')}
            className="h-7 px-2 rounded-md font-mono text-[11px] bg-[var(--surface-container)] hover:bg-[var(--surface-base)] text-[var(--text-body)] border border-[var(--border-subtle)] transition active:scale-95"
            title="Down Arrow (History)"
          >
            ↓
          </button>
        </div>

        {/* Quick Agent & Shell Launch Macros */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mr-1">Launch:</span>
          {['cline', 'aider', 'git status', 'python', 'help', 'cls'].map((macro) => (
            <button
              key={macro}
              onClick={() => handleQuickMacro(macro)}
              className="h-7 px-2.5 rounded-md font-mono text-[11px] border transition active:scale-95 whitespace-nowrap shadow-sm"
              style={{
                backgroundColor: 'var(--terminal-macro-bg)',
                color: 'var(--text-heading)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {macro}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
