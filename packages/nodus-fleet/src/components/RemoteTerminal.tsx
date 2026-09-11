import React, { useState, useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { DeviceInfo } from '../nodus-common';
import { universalNetworkFetch } from '../services/FleetDirectClient';
import {
  RemoteTerminalProps,
  TerminalSession,
  TerminalLine
} from '../types/ui-contracts';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Send,
  Trash2,
  Copy,
  Clipboard,
  Check,
  RotateCcw,
  Keyboard,
  CornerDownLeft,
  Sparkles,
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  Shield,
  Activity,
  Maximize2
} from 'lucide-react';

function getDeviceIcon(type: DeviceInfo['type'], size = 13) {
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

function getDefaultPrompt(device: DeviceInfo): string {
  if (device.os === 'windows') {
    return 'PS C:\\Users\\NodusAdmin>';
  }
  if (device.isLocal || device.type === 'tablet' || device.type === 'phone' || device.os === 'android') {
    return `android@${device.name.toLowerCase().replace(/\s+/g, '-')}:~$`;
  }
  return `nodus@${device.name.toLowerCase().replace(/\s+/g, '-')}:~$`;
}

function getTerminalThemeColors(themeName?: string) {
  switch (themeName) {
    case 'light':
      return {
        background: '#E2E8F0',
        foreground: '#0F172A',
        cursor: '#0B57D0',
        cursorAccent: '#E2E8F0',
        selectionBackground: 'rgba(11, 87, 208, 0.30)',
        black: '#1E293B',
        red: '#B91C1C',
        green: '#047857',
        yellow: '#B45309',
        blue: '#1D4ED8',
        magenta: '#6D28D9',
        cyan: '#0E7490',
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
        background: 'rgba(8, 8, 14, 0.65)',
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

export interface PtyActions {
  copyBuffer: () => Promise<string>;
  selectAll: () => void;
  clearSelection: () => void;
  getSelection: () => string;
}

/**
 * Interactive ConPTY View powered by xterm.js
 * Streams real-time ANSI terminal output (AGY, Claude, TUIs) with zero-dropped bytes
 * using sequence-offset HTTP long-polling.
 */
interface RemotePtyViewProps {
  device: DeviceInfo;
  cwd?: string;
  theme?: string;
  onSendInputRef: React.MutableRefObject<((data: string) => void) | null>;
  initialCommand?: string;
  touchMode?: 'scroll' | 'select';
  actionsRef?: React.MutableRefObject<PtyActions | null>;
}

const RemotePtyView: React.FC<RemotePtyViewProps> = ({
  device,
  cwd,
  theme,
  onSendInputRef,
  initialCommand,
  touchMode = 'scroll',
  actionsRef
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const [ptyStatus, setPtyStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing ConPTY stream...');
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionCopied, setSelectionCopied] = useState<boolean>(false);

  // Dynamic real-time theme synchronization without restarting session
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getTerminalThemeColors(theme);
    }
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    let term: XTerm | null = null;
    let fitAddon: FitAddon | null = null;

    const setupPty = async () => {
      if (!containerRef.current) return;

      term = new XTerm({
        cursorBlink: true,
        cursorStyle: 'bar',
        theme: getTerminalThemeColors(theme),
        fontFamily: 'var(--app-font-mono), Consolas, "Fira Code", monospace, "Courier New"',
        fontSize: 13,
        lineHeight: 1.25,
        allowTransparency: true,
        convertEol: true
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      termRef.current = term;

      try {
        fitAddon.fit();
      } catch (_) {}

      term.writeln('\x1b[38;2;168;199;250m═══ Nodus ConPTY Interactive Bridge ═══\x1b[0m');
      term.writeln(`\x1b[90mConnecting to ${device.name} (${device.ipAddress}:9120)...\x1b[0m\r\n`);

      // 1. Create ConPTY session on desktop host
      try {
        const targetSessionId = `pty-${Date.now()}`;
        const ptyPayload = {
          session_id: targetSessionId,
          shell: initialCommand || (device.os === 'windows' ? 'powershell.exe' : 'sh'),
          command: initialCommand || (device.os === 'windows' ? 'powershell.exe' : 'sh'),
          cwd: cwd || (device.os === 'windows' ? 'C:\\Projects\\LocalActive\\Repo\\Active\\project-nodus' : '/sdcard'),
          cols: term.cols || 80,
          rows: term.rows || 24
        };

        let createRes = await universalNetworkFetch<{
          status: string;
          session_id: string;
        }>(`http://${device.ipAddress}:9120/api/terminal/pty/spawn`, {
          method: 'POST',
          body: JSON.stringify(ptyPayload),
          timeoutMs: 8000
        });

        if (!createRes.ok || !createRes.data?.session_id) {
          createRes = await universalNetworkFetch<{
            status: string;
            session_id: string;
          }>(`http://${device.ipAddress}:9120/api/terminal/pty/create`, {
            method: 'POST',
            body: JSON.stringify(ptyPayload),
            timeoutMs: 8000
          });
        }

        if (!isMounted) return;

        if (!createRes.ok || !createRes.data?.session_id) {
          setPtyStatus('error');
          setStatusMessage(createRes.error || 'Failed to spawn ConPTY on host.');
          term.writeln(`\x1b[31m[Error] Failed to spawn PTY: ${createRes.error || 'Unknown error'}\x1b[0m`);
          return;
        }

        const sid = createRes.data.session_id;
        sessionIdRef.current = sid;
        setPtyStatus('connected');
        setStatusMessage(`ConPTY active (${sid.slice(0, 8)})`);

        // Function to send raw keystrokes to PTY
        const writeToPty = (data: string) => {
          if (!sessionIdRef.current) return;
          universalNetworkFetch(`http://${device.ipAddress}:9120/api/terminal/pty/write`, {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionIdRef.current, data })
          }).catch(() => {});
        };

        // Wire xterm keyboard input
        term.onData(data => {
          writeToPty(data);
        });

        // Wire selection change listener
        term.onSelectionChange(() => {
          if (!term) return;
          setSelectedText(term.getSelection() || '');
        });

        // Expose to parent component
        onSendInputRef.current = (input: string) => {
          writeToPty(input);
        };

        if (actionsRef) {
          actionsRef.current = {
            copyBuffer: async () => {
              const curTerm = termRef.current;
              if (!curTerm) return '';
              const sel = curTerm.getSelection();
              if (sel) {
                await navigator.clipboard.writeText(sel).catch(() => {});
                return sel;
              }
              const buf = curTerm.buffer.active;
              const lines: string[] = [];
              for (let i = 0; i < buf.length; i++) {
                const line = buf.getLine(i);
                if (line) {
                  lines.push(line.translateToString(true));
                }
              }
              while (lines.length > 0 && !lines[lines.length - 1].trim()) {
                lines.pop();
              }
              const fullText = lines.join('\n');
              await navigator.clipboard.writeText(fullText).catch(() => {});
              return fullText;
            },
            selectAll: () => {
              termRef.current?.selectAll();
            },
            clearSelection: () => {
              termRef.current?.clearSelection();
              setSelectedText('');
            },
            getSelection: () => {
              return termRef.current?.getSelection() || '';
            }
          };
        }

        // Resize handler
        const onResize = () => {
          try {
            if (!fitAddon || !term) return;
            fitAddon.fit();
            if (sessionIdRef.current && term.cols && term.rows) {
              universalNetworkFetch(`http://${device.ipAddress}:9120/api/terminal/pty/resize`, {
                method: 'POST',
                body: JSON.stringify({
                  session_id: sessionIdRef.current,
                  cols: term.cols,
                  rows: term.rows
                })
              }).catch(() => {});
            }
          } catch (_) {}
        };
        window.addEventListener('resize', onResize);

        // 2. Start long-polling read loop with offset
        let offset = 0;
        while (isMounted && sessionIdRef.current) {
          // Suspend polling when tab/screen is backgrounded to preserve device battery & bandwidth
          if (typeof document !== 'undefined' && document.hidden) {
            await new Promise(r => setTimeout(r, 1200));
            continue;
          }

          try {
            const pullRes = await universalNetworkFetch<{
              status: string;
              data?: string;
              offset?: number;
              closed?: boolean;
            }>(`http://${device.ipAddress}:9120/api/terminal/pty/pull`, {
              method: 'POST',
              body: JSON.stringify({
                session_id: sid,
                offset,
                timeout_ms: 2500
              }),
              timeoutMs: 4000
            });

            if (!isMounted) break;

            if (pullRes.ok && pullRes.data) {
              if (pullRes.data.data) {
                term.write(pullRes.data.data);
              }
              if (typeof pullRes.data.offset === 'number') {
                offset = pullRes.data.offset;
              }
              if (pullRes.data.closed) {
                setPtyStatus('closed');
                setStatusMessage('Process exited');
                term.writeln('\r\n\x1b[33m[ConPTY Session Closed by Host]\x1b[0m\r\n');
                break;
              }
            } else {
              await new Promise(r => setTimeout(r, 400));
            }
          } catch (err) {
            if (!isMounted) break;
            await new Promise(r => setTimeout(r, 600));
          }
        }
      } catch (e: any) {
        if (!isMounted) return;
        setPtyStatus('error');
        setStatusMessage(e?.message || 'Connection failed');
        term?.writeln(`\x1b[31m[Error] PTY initialization exception: ${e?.message || e}\x1b[0m`);
      }
    };

    setupPty();

    return () => {
      isMounted = false;
      onSendInputRef.current = null;
      if (actionsRef) {
        actionsRef.current = null;
      }
      termRef.current = null;
      if (sessionIdRef.current) {
        universalNetworkFetch(`http://${device.ipAddress}:9120/api/terminal/pty/close`, {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionIdRef.current })
        }).catch(() => {});
        sessionIdRef.current = null;
      }
      if (term) {
        term.dispose();
      }
    };
  }, [device.id, device.ipAddress]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--terminal-bg,var(--surface-base))] relative rounded-b-xl overflow-hidden">
      {/* PTY Status Bar */}
      <div className="px-4 py-1.5 bg-[var(--surface-base)] border-b border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              ptyStatus === 'connected'
                ? 'bg-[#6DD58C] animate-pulse'
                : ptyStatus === 'connecting'
                ? 'bg-[#FFD87A] animate-pulse'
                : 'bg-[#FFB4AB]'
            }`}
          />
          <span className="text-[var(--text-heading)] font-medium">ConPTY ANSI Stream</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span>{statusMessage}</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px]">
          <span className={touchMode === 'select' ? 'text-[var(--accent-primary)] font-medium' : 'text-[var(--text-muted)]'}>
            {touchMode === 'select' ? '🔤 Select Mode' : '📜 Scroll Mode'}
          </span>
          <span>●</span>
          <span>Interactive TUI</span>
          <span>●</span>
          <span>Zero-Lag Pull</span>
        </div>
      </div>

      {/* Floating Selection Copy Chip */}
      {selectedText.length > 0 && (
        <div className="absolute top-10 right-4 z-40 animate-in fade-in zoom-in-95">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(selectedText).catch(() => {});
              setSelectionCopied(true);
              setTimeout(() => setSelectionCopied(false), 2000);
            }}
            className="px-3 py-1.5 rounded-lg bg-[var(--accent-container)] hover:opacity-90 text-[var(--accent-on-container)] border border-[var(--accent-primary)]/40 shadow-xl flex items-center gap-1.5 text-xs font-mono font-semibold transition active:scale-95 cursor-pointer"
          >
            {selectionCopied ? (
              <>
                <Check size={13} className="text-[#6DD58C]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy ({selectedText.length} chars)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* xterm canvas container with dynamic touchAction based on mode */}
      <div
        ref={containerRef}
        style={{
          touchAction: touchMode === 'select' ? 'auto' : 'pan-y',
          userSelect: touchMode === 'select' ? 'text' : 'none',
          WebkitUserSelect: touchMode === 'select' ? 'text' : 'none',
        }}
        className="flex-1 min-h-[320px] w-full p-2 bg-[var(--terminal-bg,var(--surface-base))] overflow-hidden select-text relative"
      />
    </div>
  );
};

export const RemoteTerminal: React.FC<RemoteTerminalProps> = ({
  sessions: propSessions,
  activeSessionId: propActiveSessionId,
  availableDevices,
  theme,
  onSendCommand,
  onCreateSession,
  onCloseSession,
  onSetActiveSession
}) => {
  // Setup default sessions if none provided
  const [internalSessions, setInternalSessions] = useState<TerminalSession[]>(() => {
    if (propSessions && propSessions.length > 0) return propSessions;
    const targetDev = availableDevices.find(d => !d.isLocal && d.status !== 'offline') ||
      availableDevices.find(d => !d.isLocal) ||
      availableDevices[0] || {
        id: 'poco-pad-local',
        name: 'Android Local Shell',
        type: 'tablet' as const,
        os: 'android' as const,
        ipAddress: '127.0.0.1',
        status: 'online' as const,
        isLocal: true,
      };

    return [
      {
        id: `sess-${targetDev.id}`,
        targetDevice: targetDev,
        isConnected: targetDev.status !== 'offline',
        cwd: targetDev.os === 'windows' ? 'C:\\Projects\\LocalActive\\Repo\\Active\\project-nodus' : '/sdcard',
        lines: [
          {
            id: 'init-1',
            type: 'system',
            content: `═══ Nodus Fleet Secure Shell Daemon ═══\nConnected to ${targetDev.name} (${targetDev.ipAddress}:9120)\nReady for shell commands.`,
            timestamp: Date.now()
          }
        ]
      }
    ];
  });

  const [internalActiveId, setInternalActiveId] = useState<string | null>(() => {
    if (propActiveSessionId) return propActiveSessionId;
    return internalSessions[0]?.id || null;
  });

  // Terminal mode: 'pty' for live xterm streaming, 'log' for classic line buffer
  const [terminalMode, setTerminalMode] = useState<'pty' | 'log'>('pty');
  const [touchMode, setTouchMode] = useState<'scroll' | 'select'>('scroll');
  const ptySendRef = useRef<((data: string) => void) | null>(null);
  const ptyActionsRef = useRef<PtyActions | null>(null);

  const [inputVal, setInputVal] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>(['agy', 'git status', 'systeminfo']);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPasted, setIsPasted] = useState(false);
  const [showMobileInput, setShowMobileInput] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close device dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowAddMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync prop changes if external controller is active
  useEffect(() => {
    if (propSessions && propSessions.length > 0) {
      setInternalSessions(propSessions);
    }
  }, [propSessions]);

  useEffect(() => {
    if (propActiveSessionId) {
      setInternalActiveId(propActiveSessionId);
    }
  }, [propActiveSessionId]);

  // Dynamically sync and attach sessions when available devices are discovered on the mesh
  useEffect(() => {
    if (propSessions && propSessions.length > 0) return;
    const remoteDev = availableDevices.find(d => !d.isLocal && (d.status === 'online' || d.status === 'connected'));
    if (!remoteDev) return;

    setInternalSessions(prev => {
      const existing = prev.find(s => s.targetDevice.id === remoteDev.id || s.targetDevice.ipAddress === remoteDev.ipAddress);
      if (existing) {
        if (existing.targetDevice.ipAddress !== remoteDev.ipAddress || existing.targetDevice.status !== remoteDev.status) {
          return prev.map(s => s.id === existing.id ? { ...s, targetDevice: remoteDev, isConnected: remoteDev.status !== 'offline' } : s);
        }
        return prev;
      }

      const filtered = prev.filter(s => s.targetDevice.id !== 'dev-pc' && s.targetDevice.ipAddress !== '192.168.1.105');
      const newSessId = `sess-${remoteDev.id}`;
      const newSession: TerminalSession = {
        id: newSessId,
        targetDevice: remoteDev,
        isConnected: true,
        cwd: remoteDev.os === 'windows' ? 'C:\\Projects\\LocalActive\\Repo\\Active\\project-nodus' : '/home/nodus',
        lines: [
          {
            id: `init-${Date.now()}`,
            type: 'system',
            content: `═══ Nodus Fleet Secure Remote Shell Daemon ═══\nConnected to ${remoteDev.name} (${remoteDev.ipAddress}:9120)\nReady for remote shell commands.`,
            timestamp: Date.now()
          }
        ]
      };
      return [...filtered, newSession];
    });

    setInternalActiveId(prev => {
      if (!prev || prev.includes('dev-pc') || prev.includes('local')) {
        return `sess-${remoteDev.id}`;
      }
      return prev;
    });
  }, [availableDevices, propSessions]);

  const activeSession =
    internalSessions.find(s => s.id === internalActiveId) || internalSessions[0] || null;

  // Auto-scroll to bottom on new output (log mode)
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [activeSession?.lines]);

  const handleSelectSession = (id: string) => {
    setInternalActiveId(id);
    onSetActiveSession?.(id);
    inputRef.current?.focus();
  };

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onCloseSession?.(id);
    const updated = internalSessions.filter(s => s.id !== id);
    setInternalSessions(updated);
    if (internalActiveId === id) {
      const nextId = updated[0]?.id || null;
      setInternalActiveId(nextId);
      if (nextId) onSetActiveSession?.(nextId);
    }
  };

  const handleCreateNewSession = (device: DeviceInfo) => {
    setShowAddMenu(false);
    const existing = internalSessions.find(s => s.targetDevice.id === device.id);
    if (existing) {
      setInternalActiveId(existing.id);
      onSetActiveSession?.(existing.id);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    const newSessId = `sess-${device.id}-${Date.now()}`;
    const newSess: TerminalSession = {
      id: newSessId,
      targetDevice: device,
      isConnected: device.status !== 'offline',
      cwd: device.os === 'windows' ? 'C:\\Projects\\LocalActive\\Repo\\Active\\project-nodus' : '/home/nodus',
      lines: [
        {
          id: `line-${Date.now()}`,
          type: 'system',
          content: `═══ Remote Shell Connection Initialized ═══\nNode: ${device.name} (${device.ipAddress})\nOS: ${device.os.toUpperCase()} | Status: ${device.status.toUpperCase()} · Handshake Verified\nType 'help' for fleet diagnostic commands.`,
          timestamp: Date.now()
        }
      ]
    };

    setInternalSessions(prev => [...prev, newSess]);
    setInternalActiveId(newSessId);
    onCreateSession?.(device);
    onSetActiveSession?.(newSessId);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const executeRealCommand = async (cmd: string, session: TerminalSession) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear' || trimmed.toLowerCase() === 'cls') {
      setInternalSessions(prev =>
        prev.map(s => (s.id === session.id ? { ...s, lines: [] } : s))
      );
      return;
    }

    const timestamp = Date.now();

    if (trimmed.toLowerCase() === 'help') {
      const isWin = session.targetDevice.os === 'windows';
      const helpText = isWin
        ? `Nodus Fleet Remote Console (Windows Workstation)\n----------------------------------------\nUseful Commands:\n  • agy (Antigravity CLI Agent)\n  • whoami, hostname, ipconfig\n  • dir, Get-ChildItem, cd <path>\n  • Get-Process, tasklist\n  • git status, git log -n 5\n  • clear / cls (Clear screen)`
        : `Nodus Fleet Shell (Android /system/bin/sh)\n----------------------------------------\nUseful Commands:\n  • id, uname -a, getprop ro.product.model\n  • ls -la, pwd, cd <path>\n  • ps -A, top -n 1\n  • df -h, ping -c 3 8.8.8.8\n  • clear / cls (Clear screen)`;
      const helpLine: TerminalLine = {
        id: `help-${timestamp}`,
        type: 'system',
        content: helpText,
        timestamp
      };
      setInternalSessions(prev =>
        prev.map(s => s.id === session.id ? { ...s, lines: [...s.lines, helpLine] } : s)
      );
      return;
    }

    let responseText = '';
    let responseType: TerminalLine['type'] = 'output';
    let newCwd = session.cwd;

    try {
      const termUrl = `http://${session.targetDevice.ipAddress}:9120/api/terminal/exec`;
      const res = await universalNetworkFetch<{
        status: string;
        stdout?: string;
        stderr?: string;
        exit_code?: number;
        success?: boolean;
        message?: string;
      }>(termUrl, {
        method: 'POST',
        body: JSON.stringify({
          command: trimmed,
          cwd: session.cwd,
        }),
        timeoutMs: 15000,
      });

      if (res.ok && res.status === 200 && res.data) {
        const stdout = res.data.stdout || '';
        const stderr = res.data.stderr || '';
        if (stderr && !stdout) {
          responseText = stderr;
          responseType = 'error';
        } else if (stderr && stdout) {
          responseText = `${stdout}\n[stderr]: ${stderr}`;
          responseType = 'warn';
        } else {
          responseText = stdout || `(Process completed with exit code ${res.data.exit_code ?? 0})`;
          responseType = 'output';
        }

        if (trimmed.startsWith('cd ') || trimmed === 'cd..') {
          const targetDir = trimmed.replace(/^cd\s*/, '').trim();
          if (targetDir === '..' && session.cwd) {
            const parts = session.cwd.replace(/\\$/, '').split(/[\\/]/);
            if (parts.length > 1) {
              parts.pop();
              newCwd = parts.join('\\') || 'C:\\';
            }
          } else if (targetDir && !targetDir.includes('*')) {
            if (targetDir.includes(':') || targetDir.startsWith('/')) {
              newCwd = targetDir;
            } else if (session.cwd) {
              newCwd = `${session.cwd.replace(/\\$/, '')}\\${targetDir}`;
            }
          }
        }
      } else {
        const fallbackUrl = `http://${session.targetDevice.ipAddress}:9120/api/exec`;
        const fbRes = await universalNetworkFetch<{ status: string; message: string; output?: string }>(fallbackUrl, {
          method: 'POST',
          body: JSON.stringify({ command_or_path: trimmed, working_dir: session.cwd }),
          timeoutMs: 10000,
        });

        if (fbRes.ok && fbRes.status === 200) {
          responseText = fbRes.data?.output || fbRes.data?.message || `Command '${trimmed}' executed successfully.`;
          responseType = 'success';
        } else {
          responseText = fbRes.data?.message || fbRes.error || `Execution failed (${fbRes.status}).`;
          responseType = 'error';
        }
      }
    } catch (err: any) {
      responseText = `Failed to connect to ${session.targetDevice.name}: ${err?.message || err}`;
      responseType = 'error';
    }

    const outputLine: TerminalLine = {
      id: `out-${timestamp}`,
      type: responseType,
      content: responseText,
      timestamp
    };

    setInternalSessions(prev =>
      prev.map(s =>
        s.id === session.id
          ? {
              ...s,
              cwd: newCwd,
              lines: [...s.lines, outputLine],
            }
          : s
      )
    );
  };

  const sendCtrlC = async () => {
    if (terminalMode === 'pty' && ptySendRef.current) {
      ptySendRef.current('\x03');
      return;
    }
    if (!activeSession) return;
    try {
      const url = `http://${activeSession.targetDevice.ipAddress}:9120/api/input/keyboard/hotkey`;
      await universalNetworkFetch(url, {
        method: 'POST',
        body: JSON.stringify({ keys: ['ctrl', 'c'] }),
      });
      const userLine: TerminalLine = {
        id: `sig-${Date.now()}`,
        type: 'warn',
        content: '^C (SIGINT sent to remote process)',
        timestamp: Date.now()
      };
      setInternalSessions(prev =>
        prev.map(s => (s.id === activeSession.id ? { ...s, lines: [...s.lines, userLine] } : s))
      );
    } catch (_) {}
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    if (terminalMode === 'pty' && ptySendRef.current) {
      // Send directly into ConPTY stream with enter return
      const cmd = inputVal;
      setInputVal('');
      ptySendRef.current(`${cmd}\r`);
      if (cmd.trim()) {
        setCommandHistory(prev => [...prev.filter(c => c !== cmd.trim()), cmd.trim()]);
        setHistoryIndex(-1);
      }
      return;
    }

    if (!inputVal.trim()) return;

    const cmd = inputVal.trim();
    setInputVal('');
    setCommandHistory(prev => [...prev.filter(c => c !== cmd), cmd]);
    setHistoryIndex(-1);

    // Append user input line in log mode
    const userLine: TerminalLine = {
      id: `in-${Date.now()}`,
      type: 'input',
      content: cmd,
      timestamp: Date.now()
    };

    setInternalSessions(prev =>
      prev.map(s => (s.id === activeSession.id ? { ...s, lines: [...s.lines, userLine] } : s))
    );

    if (onSendCommand) {
      onSendCommand(activeSession.id, cmd);
    } else {
      executeRealCommand(cmd, activeSession);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIdx);
      setInputVal(commandHistory[commandHistory.length - 1 - nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    }
  };

  const handleCopyBuffer = async () => {
    if (terminalMode === 'pty' && ptyActionsRef.current) {
      await ptyActionsRef.current.copyBuffer();
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      return;
    }
    if (!activeSession) return;
    const text = activeSession.lines.map(l => l.content).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClearBuffer = () => {
    if (!activeSession) return;
    if (terminalMode === 'pty' && ptySendRef.current) {
      const clearCmd = activeSession.targetDevice.os === 'windows' ? 'cls\r' : 'clear\r';
      ptySendRef.current(clearCmd);
    }
    setInternalSessions(prev =>
      prev.map(s => (s.id === activeSession.id ? { ...s, lines: [] } : s))
    );
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (terminalMode === 'pty' && ptySendRef.current) {
          ptySendRef.current(text);
        } else {
          setInputVal(prev => prev + text);
          inputRef.current?.focus();
        }
        setIsPasted(true);
        setTimeout(() => setIsPasted(false), 1200);
      }
    } catch (_) {}
  };

  const handleRestartSession = () => {
    setRestartKey(k => k + 1);
  };

  const handleQuickCommand = (cmd: string) => {
    if (!activeSession) return;

    const isInteractive = ['agy', 'claude', 'cline', 'aider', 'python', 'powershell'].some(agent =>
      cmd.toLowerCase().includes(agent)
    );

    if (isInteractive) {
      // For any interactive agent/TUI, switch to Live ConPTY mode so user sees full interactive TUI & colors
      if (terminalMode !== 'pty') {
        setTerminalMode('pty');
      }
      setTimeout(() => {
        if (ptySendRef.current) {
          ptySendRef.current(`${cmd}\r`);
        }
      }, 300);
      return;
    }

    if (terminalMode === 'pty' && ptySendRef.current) {
      ptySendRef.current(`${cmd}\r`);
    } else {
      setInputVal(cmd);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col min-h-[460px] md:h-full bg-[var(--surface-container)] border border-[var(--border-subtle)] rounded-xl shadow-xl text-[var(--text-body)]">
      {/* Session Tab Bar with high z-index */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 sm:gap-3 shrink-0 relative z-30 rounded-t-xl">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Target Host Indicator / Add Shell Dropdown */}
          <div className="relative" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="h-8 px-2.5 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-xs font-mono flex items-center gap-1.5 text-[var(--text-body)] transition cursor-pointer"
              title="Open Shell on another Node"
            >
              <Plus size={13} className="text-[var(--accent-primary)]" />
              <span className="hidden sm:inline">Connect Node</span>
            </button>

            {showAddMenu && (
              <div className="absolute left-0 top-10 w-64 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[11px] font-mono text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-1 flex justify-between items-center">
                  <span>Available Mesh Nodes</span>
                  <span className="text-[10px] text-[var(--accent-primary)] font-normal">{availableDevices.length} nodes</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {availableDevices.map(dev => {
                    const isOpen = internalSessions.some(s => s.targetDevice.id === dev.id);
                    return (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleCreateNewSession(dev);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono hover:bg-[var(--surface-container)] active:bg-[var(--surface-base)] flex items-center justify-between text-[var(--text-body)] hover:text-[var(--text-heading)] transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={dev.status === 'online' ? 'text-[#6DD58C]' : dev.status === 'connected' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}>
                            {getDeviceIcon(dev.type, 14)}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-sans font-medium text-[var(--text-heading)]">{dev.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{dev.ipAddress} · {dev.os.toUpperCase()}</span>
                          </div>
                        </div>
                        {isOpen ? (
                          <span className="text-[10px] font-mono text-[var(--accent-primary)] px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 shrink-0">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-[var(--text-body)] shrink-0">
                            Connect →
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[var(--border-subtle)] shrink-0" />

          {/* Active Session Tabs (Scrollable) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5">
            {internalSessions.map(sess => {
              const isActive = sess.id === activeSession?.id;
              return (
                <div
                  key={sess.id}
                  onClick={() => handleSelectSession(sess.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 h-8 px-2.5 sm:px-3 rounded-lg text-xs font-mono font-medium cursor-pointer transition select-none shrink-0 ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-[var(--m3-on-primary,#062E6F)] font-semibold shadow-sm'
                      : 'bg-[var(--surface-container)] text-[var(--text-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-body)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {getDeviceIcon(sess.targetDevice.type, 13)}
                  <span className="truncate max-w-[120px] sm:max-w-none">{sess.targetDevice.name}</span>
                  {internalSessions.length > 1 && (
                    <button
                      onClick={e => handleCloseTab(e, sess.id)}
                      className="p-0.5 rounded-md hover:bg-black/10 transition ml-0.5 sm:ml-1"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Engine Mode Toggle (ConPTY / Log) + Touch Mode Toggle (Scroll / Select) + Action Buttons */}
        <div className="flex items-center gap-2">
          {terminalMode === 'pty' && (
            <div className="flex items-center gap-1 bg-[var(--surface-base)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setTouchMode('scroll')}
                className={`h-7 px-2 rounded-md text-[11px] font-mono flex items-center gap-1 transition ${
                  touchMode === 'scroll'
                    ? 'bg-[var(--surface-elevated)] text-[var(--accent-primary)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-body)]'
                }`}
                title="Scroll Mode: Touch dragging scrolls terminal output smoothly"
              >
                <span>📜 Scroll</span>
              </button>
              <button
                type="button"
                onClick={() => setTouchMode('select')}
                className={`h-7 px-2 rounded-md text-[11px] font-mono flex items-center gap-1 transition ${
                  touchMode === 'select'
                    ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-body)]'
                }`}
                title="Select Mode: Touch gestures highlight text for copying"
              >
                <span>🔤 Select</span>
              </button>
            </div>
          )}

          {terminalMode === 'pty' && touchMode === 'select' && (
            <button
              type="button"
              onClick={() => ptyActionsRef.current?.selectAll()}
              className="h-7 px-2 rounded-md bg-[var(--surface-base)] hover:bg-[var(--surface-elevated)] text-[var(--text-body)] text-[11px] font-mono flex items-center gap-1 transition border border-[var(--border-subtle)]"
              title="Select all visible terminal text"
            >
              <span>Select All</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-[var(--surface-base)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setTerminalMode('pty')}
              className={`h-7 px-2.5 rounded-md text-[11px] font-mono font-medium flex items-center gap-1.5 transition ${
                terminalMode === 'pty'
                  ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] shadow-sm font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-body)]'
              }`}
              title="Interactive ConPTY stream with ANSI colors (Runs AGY, Claude, TUIs)"
            >
              <Sparkles size={11} className={terminalMode === 'pty' ? 'text-[#6DD58C]' : 'text-[var(--text-muted)]'} />
              <span>Live PTY</span>
            </button>
            <button
              type="button"
              onClick={() => setTerminalMode('log')}
              className={`h-7 px-2.5 rounded-md text-[11px] font-mono font-medium flex items-center gap-1 transition ${
                terminalMode === 'log'
                  ? 'bg-[var(--surface-elevated)] text-[var(--text-heading)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-body)]'
              }`}
              title="Classic line-by-line command output"
            >
              <span>Log Shell</span>
            </button>
          </div>

          <button
            onClick={handlePaste}
            className="h-8 px-2.5 rounded-lg bg-[var(--surface-base)] hover:bg-[var(--surface-elevated)] text-[var(--text-body)] text-xs font-mono flex items-center gap-1.5 transition border border-[var(--border-subtle)] cursor-pointer"
            title="Paste Clipboard Text into Shell (Ctrl+V)"
          >
            {isPasted ? <Check size={13} className="text-[#6DD58C]" /> : <Clipboard size={13} />}
            <span className="hidden sm:inline">Paste</span>
          </button>
          <button
            onClick={handleCopyBuffer}
            className="h-8 px-2.5 rounded-lg bg-[var(--surface-base)] hover:bg-[var(--surface-elevated)] text-[var(--text-body)] text-xs font-mono flex items-center gap-1.5 transition border border-[var(--border-subtle)] cursor-pointer"
            title="Copy Terminal Text"
          >
            {isCopied ? <Check size={13} className="text-[#6DD58C]" /> : <Copy size={13} />}
            <span className="hidden sm:inline">Copy</span>
          </button>
          <button
            onClick={handleClearBuffer}
            className="w-8 h-8 rounded-lg bg-[var(--surface-base)] hover:bg-[var(--surface-elevated)] text-[var(--text-body)] text-xs font-mono flex items-center justify-center transition border border-[var(--border-subtle)] cursor-pointer"
            title="Clear Terminal Output"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={handleRestartSession}
            className="w-8 h-8 rounded-lg bg-[var(--surface-base)] hover:bg-[var(--surface-elevated)] text-[var(--text-body)] text-xs font-mono flex items-center justify-center transition border border-[var(--border-subtle)] cursor-pointer"
            title="Restart Terminal Session"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Display: Either Live ConPTY View or Line Buffer */}
      {activeSession ? (
        terminalMode === 'pty' ? (
          <RemotePtyView
            key={`pty-${activeSession.id}-${theme || 'default'}-${restartKey}`}
            device={activeSession.targetDevice}
            cwd={activeSession.cwd}
            theme={theme}
            onSendInputRef={ptySendRef}
            touchMode={touchMode}
            actionsRef={ptyActionsRef}
          />
        ) : (
          <div
            ref={terminalScrollRef}
            className="flex-1 p-3 sm:p-5 overflow-y-auto font-mono text-xs leading-relaxed space-y-2 bg-[var(--terminal-bg,var(--surface-base))] text-[var(--text-body)] select-text shadow-inner min-h-0 relative z-0 rounded-b-xl"
          >
            {activeSession.lines.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)] font-mono">
                Terminal buffer cleared. Ready for input.
              </div>
            ) : (
              activeSession.lines.map(line => (
                <div key={line.id} className="space-y-1">
                  {line.type === 'input' ? (
                    <div className="flex items-start gap-2 text-[#6DD58C]">
                      <span className="select-none font-semibold opacity-90 shrink-0">
                        {getDefaultPrompt(activeSession.targetDevice)}
                      </span>
                      <span className="text-[var(--text-heading)] font-medium break-all">{line.content}</span>
                    </div>
                  ) : line.type === 'system' ? (
                    <div className="text-[var(--accent-primary)] bg-[var(--accent-container)]/25 border-l-2 border-[var(--accent-primary)] px-3 py-2 rounded-r-lg whitespace-pre-wrap text-[11px]">
                      {line.content}
                    </div>
                  ) : line.type === 'error' ? (
                    <div className="text-[var(--btn-danger-text)] bg-[var(--btn-danger-bg)] border-l-2 border-[var(--btn-danger-border)] px-3 py-2 rounded-r-lg whitespace-pre-wrap">
                      {line.content}
                    </div>
                  ) : line.type === 'warn' ? (
                    <div className="text-[var(--badge-warn-text)] bg-[var(--badge-warn-bg)] border-l-2 border-[var(--badge-warn-border)] px-3 py-2 rounded-r-lg whitespace-pre-wrap">
                      {line.content}
                    </div>
                  ) : (
                    <div className="text-[var(--text-body)] pl-4 whitespace-pre-wrap leading-relaxed">
                      {line.content}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] gap-3 min-h-0">
          <TerminalIcon size={48} className="text-[var(--text-muted)] opacity-50" />
          <p className="text-xs font-mono">No active terminal session. Select or open a shell above.</p>
        </div>
      )}

      {/* Unified Ergonomic Terminal Action Dock (Helper Keys + Macros + Quick Symbols + Mobile Input Toggle) */}
      <div className="px-3 sm:px-4 py-2 bg-[var(--surface-container)] border-t border-[var(--border-subtle)] flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-mono shrink-0">
        {/* Section 1: Core Touch Keys */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={sendCtrlC}
            title="Send Ctrl+C Interrupt Signal"
            className="h-7 px-2.5 rounded-md bg-[var(--btn-danger-bg)] hover:bg-[var(--btn-danger-hover)] text-[var(--btn-danger-text)] border border-[var(--btn-danger-border)] text-[11px] font-semibold transition active:scale-95 shrink-0 cursor-pointer"
          >
            Ctrl+C
          </button>
          <button
            type="button"
            onClick={() => {
              if (terminalMode === 'pty' && ptySendRef.current) {
                ptySendRef.current('\t');
              } else {
                setInputVal(prev => prev + '\t');
                inputRef.current?.focus();
              }
            }}
            className="h-7 px-2 rounded-md bg-[var(--surface-elevated)] hover:bg-[var(--control-btn-hover)] text-[var(--text-body)] border border-[var(--border-subtle)] text-[11px] font-mono transition active:scale-95 shrink-0 cursor-pointer"
            title="Tab Autocomplete"
          >
            Tab
          </button>
          <button
            type="button"
            onClick={() => {
              if (terminalMode === 'pty' && ptySendRef.current) {
                ptySendRef.current('\x1b');
              } else {
                setInputVal('');
                inputRef.current?.focus();
              }
            }}
            className="h-7 px-2 rounded-md bg-[var(--surface-elevated)] hover:bg-[var(--control-btn-hover)] text-[var(--text-body)] border border-[var(--border-subtle)] text-[11px] font-mono transition active:scale-95 shrink-0 cursor-pointer"
            title="Escape"
          >
            Esc
          </button>
          <button
            type="button"
            onClick={() => {
              if (terminalMode === 'pty' && ptySendRef.current) {
                ptySendRef.current('\r');
              }
            }}
            className="h-7 px-2.5 rounded-md bg-[var(--accent-container)] hover:opacity-90 text-[var(--accent-on-container)] border border-[var(--accent-primary)]/30 text-[11px] font-semibold transition active:scale-95 shrink-0 cursor-pointer"
            title="Enter (Send Newline)"
          >
            Enter ↵
          </button>
          <button
            type="button"
            onClick={() => {
              if (terminalMode === 'pty' && ptySendRef.current) {
                ptySendRef.current('\x1b[A');
              } else {
                if (commandHistory.length === 0) return;
                const nextIdx = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
                setHistoryIndex(nextIdx);
                setInputVal(commandHistory[commandHistory.length - 1 - nextIdx] || '');
              }
            }}
            className="h-7 px-2 rounded-md bg-[var(--surface-elevated)] hover:bg-[var(--control-btn-hover)] text-[var(--text-body)] border border-[var(--border-subtle)] text-[11px] font-mono transition active:scale-95 shrink-0 cursor-pointer"
            title="Previous Command (Up Arrow)"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => {
              if (terminalMode === 'pty' && ptySendRef.current) {
                ptySendRef.current('\x1b[B');
              } else {
                if (historyIndex > 0) {
                  const nextIdx = historyIndex - 1;
                  setHistoryIndex(nextIdx);
                  setInputVal(commandHistory[commandHistory.length - 1 - nextIdx] || '');
                } else if (historyIndex === 0) {
                  setHistoryIndex(-1);
                  setInputVal('');
                }
              }
            }}
            className="h-7 px-2 rounded-md bg-[var(--surface-elevated)] hover:bg-[var(--control-btn-hover)] text-[var(--text-body)] border border-[var(--border-subtle)] text-[11px] font-mono transition active:scale-95 shrink-0 cursor-pointer"
            title="Next Command (Down Arrow)"
          >
            ↓
          </button>
        </div>

        <div className="h-4 w-px bg-[var(--border-subtle)] shrink-0" />

        {/* Section 2: Quick Launch Command Macros */}
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { label: '🚀 AGY', cmd: 'agy' },
            { label: '🧠 Claude', cmd: 'claude' },
            { label: '🤖 Cline', cmd: 'npx cline' },
            { label: '⚡ Aider', cmd: 'aider' },
            { label: '📁 Git Status', cmd: 'git status' },
            { label: '💻 PowerShell', cmd: 'powershell' },
            { label: '🐍 Python', cmd: 'python' },
            { label: '🌐 IP Config', cmd: 'ipconfig' },
            { label: '🧹 Clear', cmd: 'clear' },
          ].map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleQuickCommand(item.cmd)}
              className="h-7 px-2.5 rounded-md text-[11px] font-mono border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:bg-[var(--control-btn-hover)] text-[var(--text-body)] hover:text-[var(--text-heading)] transition-colors whitespace-nowrap active:scale-95 shrink-0 touch-manipulation flex items-center gap-1 cursor-pointer"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[var(--border-subtle)] shrink-0" />

        {/* Section 3: Essential Terminal Symbols */}
        <div className="flex items-center gap-1 shrink-0">
          {['|', '~', '/', '\\', '`', '-', '>', '&'].map(sym => (
            <button
              key={sym}
              type="button"
              onClick={() => {
                if (terminalMode === 'pty' && ptySendRef.current) {
                  ptySendRef.current(sym);
                } else {
                  setInputVal(prev => prev + sym);
                  inputRef.current?.focus();
                }
              }}
              className="h-7 px-2 rounded-md bg-[var(--surface-elevated)] hover:bg-[var(--control-btn-hover)] text-[var(--text-body)] border border-[var(--border-subtle)] text-[11px] font-mono transition active:scale-95 shrink-0 cursor-pointer"
            >
              {sym}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[var(--border-subtle)] shrink-0" />

        {/* Section 4: Soft Keyboard Input Toggle */}
        <button
          type="button"
          onClick={() => setShowMobileInput(prev => !prev)}
          className={`h-7 px-2.5 rounded-md border text-[11px] font-mono font-medium transition active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer ${
            showMobileInput
              ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] border-[var(--accent-primary)]/40 shadow-sm'
              : 'bg-[var(--surface-elevated)] hover:bg-[var(--control-btn-hover)] text-[var(--text-body)] border-[var(--border-subtle)]'
          }`}
          title="Toggle Mobile Soft-Keyboard Input Bar"
        >
          <Keyboard size={13} />
          <span>Input Bar</span>
        </button>
      </div>

      {/* Expandable Mobile Command Input Line with Prompt Cursor */}
      {activeSession && showMobileInput && (
        <form
          onSubmit={handleCommandSubmit}
          className="p-2 sm:p-3 bg-[var(--surface-container)] border-t border-[var(--border-subtle)] flex items-center gap-2 font-mono shrink-0 animate-in slide-in-from-bottom-2 duration-150"
        >
          <span className="text-[#6DD58C] font-semibold text-xs select-none max-w-[150px] sm:max-w-[260px] truncate shrink-0">
            {activeSession.targetDevice.os === 'windows'
              ? `PS ${activeSession.cwd || 'C:\\Projects'}>`
              : `${activeSession.targetDevice.name.toLowerCase().replace(/\s+/g, '-')}:${activeSession.cwd || '~'}$`}
          </span>

          <div className="relative flex-1 flex items-center min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={terminalMode === 'pty' ? 'type command and tap Exec (or press Enter)...' : 'type remote command...'}
              className="w-full bg-transparent text-[var(--text-heading)] font-mono text-xs focus:outline-none placeholder-[var(--text-muted)] pr-6"
              autoFocus
            />
            {/* Glowing Prompt Cursor */}
            <span className="absolute right-0 w-2 h-4 bg-[var(--accent-primary)] animate-pulse opacity-80 pointer-events-none" />
          </div>

          <button
            type="submit"
            disabled={terminalMode !== 'pty' && !inputVal.trim()}
            className="h-8 px-3 sm:px-4 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--m3-on-primary,#062E6F)] text-xs font-semibold flex items-center gap-1.5 transition shadow disabled:opacity-40 shrink-0 touch-manipulation cursor-pointer"
          >
            <Send size={13} />
            <span className="hidden sm:inline">{terminalMode === 'pty' && !inputVal.trim() ? 'Enter ↵' : 'Exec'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
