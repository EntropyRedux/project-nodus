import React, { useState, useEffect, useRef } from 'react';
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
  Check,
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
  return `nodus@${device.name.toLowerCase().replace(/\s+/g, '-')}:~$`;
}

export const RemoteTerminal: React.FC<RemoteTerminalProps> = ({
  sessions: propSessions,
  activeSessionId: propActiveSessionId,
  availableDevices,
  onSendCommand,
  onCreateSession,
  onCloseSession,
  onSetActiveSession
}) => {
  // Setup default sessions if none provided
  const [internalSessions, setInternalSessions] = useState<TerminalSession[]>(() => {
    if (propSessions && propSessions.length > 0) return propSessions;
    const targetDev = availableDevices.find(d => !d.isLocal) || availableDevices[0] || {
      id: 'dev-pc',
      name: 'Workstation Host',
      type: 'desktop' as const,
      os: 'windows' as const,
      ipAddress: '192.168.1.105',
      status: 'online' as const
    };

    return [
      {
        id: `sess-${targetDev.id}`,
        targetDevice: targetDev,
        isConnected: targetDev.status !== 'offline',
        cwd: targetDev.os === 'windows' ? 'C:\\Users\\NodusAdmin' : '/home/nodus',
        lines: [
          {
            id: 'init-1',
            type: 'system',
            content: `═══ Nodus Fleet Secure Remote Shell Daemon ═══\nConnected to ${targetDev.name} (${targetDev.ipAddress}:9120)\nReady for remote shell commands.`,
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

  const [inputVal, setInputVal] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>(['systeminfo', 'help']);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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

  const activeSession =
    internalSessions.find(s => s.id === internalActiveId) || internalSessions[0] || null;

  // Auto-scroll to bottom on new output
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
      cwd: device.os === 'windows' ? 'C:\\Users\\NodusAdmin' : '/home/nodus',
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
    let responseText = '';
    let responseType: TerminalLine['type'] = 'output';
    let newCwd = session.cwd;

    try {
      // 1. Try modern /api/terminal/exec engine with cwd support
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

        // Handle simple directory navigation state updates
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
        // 2. Fallback to /api/exec
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
    if (!inputVal.trim() || !activeSession) return;

    const cmd = inputVal.trim();
    setInputVal('');
    setCommandHistory(prev => [...prev.filter(c => c !== cmd), cmd]);
    setHistoryIndex(-1);

    // Append user input line
    const userLine: TerminalLine = {
      id: `in-${Date.now()}`,
      type: 'input',
      content: cmd,
      timestamp: Date.now()
    };

    setInternalSessions(prev =>
      prev.map(s => (s.id === activeSession.id ? { ...s, lines: [...s.lines, userLine] } : s))
    );

    // If external onSendCommand provided, invoke it
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

  const handleCopyBuffer = () => {
    if (!activeSession) return;
    const text = activeSession.lines.map(l => l.content).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClearBuffer = () => {
    if (!activeSession) return;
    setInternalSessions(prev =>
      prev.map(s => (s.id === activeSession.id ? { ...s, lines: [] } : s))
    );
  };

  const handleQuickCommand = (cmd: string) => {
    if (!activeSession) return;
    setInputVal(cmd);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col min-h-[460px] md:h-full bg-[#1D2024] border border-white/5 rounded-xl shadow-xl text-slate-100">
      {/* Session Tab Bar with high z-index */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-[#282A2F] border-b border-white/5 flex items-center justify-between gap-2 sm:gap-3 shrink-0 relative z-30 rounded-t-xl">
        {/* Left container: +New Shell button + divider + scrollable session tabs */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
          {/* New Shell Button & Dropdown Menu (Positioned on the left side) */}
          <div className="relative shrink-0" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setShowAddMenu(prev => !prev)}
              className="h-8 px-2.5 sm:px-3 rounded-lg bg-[#111318] hover:bg-[#33353A] active:bg-[#3d4047] text-slate-200 hover:text-white transition flex items-center gap-1.5 text-xs font-mono font-medium border border-white/10 shadow-sm cursor-pointer touch-manipulation"
              title="Open New Shell Session"
            >
              <Plus size={13} className="text-[#A8C7FA] shrink-0" />
              <span>New Shell</span>
            </button>

            {/* Dropdown Menu for Available Devices */}
            {showAddMenu && (
              <div className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-32px)] rounded-xl bg-[#282A2F] border border-[#A8C7FA]/30 shadow-[0_16px_40px_rgba(0,0,0,0.85)] p-2 z-50 space-y-1 backdrop-blur-xl">
                <div className="px-3 py-1.5 text-[11px] uppercase font-semibold text-slate-400 font-mono flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                  <span>Connect Shell To:</span>
                  <span className="text-[10px] text-[#A8C7FA] font-normal">{availableDevices.length} nodes</span>
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
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono hover:bg-[#33353A] active:bg-[#3d4047] flex items-center justify-between text-slate-200 hover:text-white transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={dev.status === 'online' ? 'text-[#6DD58C]' : dev.status === 'connected' ? 'text-[#A8C7FA]' : 'text-slate-500'}>
                            {getDeviceIcon(dev.type, 14)}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-sans font-medium text-slate-100">{dev.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{dev.ipAddress} · {dev.os.toUpperCase()}</span>
                          </div>
                        </div>
                        {isOpen ? (
                          <span className="text-[10px] font-mono text-[#A8C7FA] px-1.5 py-0.5 rounded bg-[#A8C7FA]/10 border border-[#A8C7FA]/20 shrink-0">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200 shrink-0">
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

          <div className="h-4 w-px bg-white/10 shrink-0" />

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
                      ? 'bg-[#A8C7FA] text-[#062E6F] font-semibold shadow-sm'
                      : 'bg-[#1D2024] text-slate-400 hover:bg-[#33353A] hover:text-slate-200 border border-white/5'
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

        {/* Action buttons on tab bar: Copy, Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyBuffer}
            className="w-8 h-8 rounded-lg bg-[#111318] hover:bg-[#33353A] text-slate-300 text-xs font-mono flex items-center justify-center transition border border-white/5"
            title="Copy Terminal Text"
          >
            {isCopied ? <Check size={14} className="text-[#6DD58C]" /> : <Copy size={14} />}
          </button>
          <button
            onClick={handleClearBuffer}
            className="w-8 h-8 rounded-lg bg-[#111318] hover:bg-[#33353A] text-slate-300 text-xs font-mono flex items-center justify-center transition border border-white/5"
            title="Clear Terminal Output"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Screen Buffer Output */}
      {activeSession ? (
        <div
          ref={terminalScrollRef}
          className="flex-1 p-3 sm:p-5 overflow-y-auto font-mono text-xs leading-relaxed space-y-2 bg-[#111318] select-text shadow-inner min-h-0 relative z-0 rounded-b-xl"
        >
          {activeSession.lines.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono">
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
                    <span className="text-white font-medium break-all">{line.content}</span>
                  </div>
                ) : line.type === 'system' ? (
                  <div className="text-[#A8C7FA] bg-[#00497D]/25 border-l-2 border-[#A8C7FA] px-3 py-2 rounded-r-lg whitespace-pre-wrap text-[11px]">
                    {line.content}
                  </div>
                ) : line.type === 'error' ? (
                  <div className="text-[#FFB4AB] bg-[#93000A]/20 border-l-2 border-[#FFB4AB] px-3 py-2 rounded-r-lg whitespace-pre-wrap">
                    {line.content}
                  </div>
                ) : line.type === 'warn' ? (
                  <div className="text-[#FFD87A] bg-amber-950/30 border-l-2 border-[#FFD87A] px-3 py-2 rounded-r-lg whitespace-pre-wrap">
                    {line.content}
                  </div>
                ) : (
                  <div className="text-slate-300 pl-4 whitespace-pre-wrap leading-relaxed">
                    {line.content}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 min-h-0">
          <TerminalIcon size={48} className="text-slate-600" />
          <p className="text-xs font-mono">No active terminal session. Select or open a shell above.</p>
        </div>
      )}

      {/* Quick AI Coding Agent & Command Macro Pills for Tablet & Mobile Tap */}
      <div className="px-3 sm:px-5 py-2 bg-[#1D2024] border-t border-white/5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar text-xs font-mono shrink-0">
        <span className="text-[#A8C7FA] font-semibold text-[11px] uppercase shrink-0 flex items-center gap-1">
          <Sparkles size={12} className="text-[#A8C7FA]" />
          <span>Agents & Tools:</span>
        </span>
        {[
          { label: '🤖 Cline', cmd: 'npx cline' },
          { label: '⚡ Aider', cmd: 'aider' },
          { label: '🧠 Claude', cmd: 'claude' },
          { label: '🐍 Python', cmd: 'python -i' },
          { label: '💻 PowerShell', cmd: 'powershell.exe' },
          { label: '🚀 Dev Server', cmd: 'npm run dev' },
          { label: '📁 Git Status', cmd: 'git status' },
          { label: '⚙️ Tasklist', cmd: 'tasklist' },
          { label: '🌐 IP Config', cmd: 'ipconfig /all' },
        ].map(item => (
          <button
            key={item.label}
            type="button"
            onClick={() => handleQuickCommand(item.cmd)}
            className="h-7 px-2.5 bg-[#282A2F] hover:bg-[#33353A] active:bg-[#3d4047] rounded-md text-[11px] font-mono text-slate-200 hover:text-white border border-white/10 transition-colors whitespace-nowrap active:scale-95 shrink-0 touch-manipulation flex items-center gap-1 cursor-pointer"
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Virtual Touch Macro Keypad (Essential for tablet/phone typing without physical keys) */}
      <div className="px-3 sm:px-5 py-1.5 bg-[#17191D] border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-mono shrink-0">
        <button
          type="button"
          onClick={sendCtrlC}
          title="Send Ctrl+C Interrupt Signal"
          className="h-6 px-2 rounded bg-[#93000A]/30 hover:bg-[#93000A]/50 active:bg-[#93000A]/70 text-[#FFB4AB] border border-[#FFB4AB]/30 text-[11px] font-semibold transition active:scale-95 shrink-0 cursor-pointer"
        >
          Ctrl+C
        </button>
        <button
          type="button"
          onClick={() => {
            setInputVal(prev => prev + '\t');
            inputRef.current?.focus();
          }}
          className="h-6 px-2 rounded bg-[#282A2F] hover:bg-[#33353A] text-slate-300 border border-white/5 text-[11px] font-mono transition active:scale-95 shrink-0 cursor-pointer"
        >
          Tab
        </button>
        <button
          type="button"
          onClick={() => {
            setInputVal('');
            inputRef.current?.focus();
          }}
          className="h-6 px-2 rounded bg-[#282A2F] hover:bg-[#33353A] text-slate-300 border border-white/5 text-[11px] font-mono transition active:scale-95 shrink-0 cursor-pointer"
        >
          Esc
        </button>
        <button
          type="button"
          onClick={() => {
            if (commandHistory.length === 0) return;
            const nextIdx = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
            setHistoryIndex(nextIdx);
            setInputVal(commandHistory[commandHistory.length - 1 - nextIdx] || '');
          }}
          className="h-6 px-2 rounded bg-[#282A2F] hover:bg-[#33353A] text-slate-300 border border-white/5 text-[11px] font-mono transition active:scale-95 shrink-0 cursor-pointer"
        >
          ↑ Prev
        </button>
        <button
          type="button"
          onClick={() => {
            if (historyIndex > 0) {
              const nextIdx = historyIndex - 1;
              setHistoryIndex(nextIdx);
              setInputVal(commandHistory[commandHistory.length - 1 - nextIdx] || '');
            } else if (historyIndex === 0) {
              setHistoryIndex(-1);
              setInputVal('');
            }
          }}
          className="h-6 px-2 rounded bg-[#282A2F] hover:bg-[#33353A] text-slate-300 border border-white/5 text-[11px] font-mono transition active:scale-95 shrink-0 cursor-pointer"
        >
          ↓ Next
        </button>
        {['|', '~', '/', '\\', '`', '-', '>', '&', '..'].map(sym => (
          <button
            key={sym}
            type="button"
            onClick={() => {
              setInputVal(prev => prev + sym);
              inputRef.current?.focus();
            }}
            className="h-6 px-2 rounded bg-[#282A2F] hover:bg-[#33353A] text-slate-300 border border-white/5 text-[11px] font-mono transition active:scale-95 shrink-0 cursor-pointer"
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Interactive Command Input Line with Glowing Prompt Cursor */}
      {activeSession && (
        <form
          onSubmit={handleCommandSubmit}
          className="p-2.5 sm:p-4 bg-[#1D2024] border-t border-white/5 flex items-center gap-2 font-mono shrink-0"
        >
          <span className="text-[#6DD58C] font-semibold text-xs select-none max-w-[150px] sm:max-w-[280px] truncate shrink-0">
            {activeSession.targetDevice.os === 'windows'
              ? `PS ${activeSession.cwd || 'C:\\Users\\NodusAdmin'}>`
              : `${activeSession.targetDevice.name.toLowerCase().replace(/\s+/g, '-')}:${activeSession.cwd || '~'}$`}
          </span>

          <div className="relative flex-1 flex items-center min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="type remote command or launch AI agent..."
              className="w-full bg-transparent text-white font-mono text-xs focus:outline-none placeholder-slate-500 pr-6"
              autoFocus
            />
            {/* Glowing Prompt Cursor */}
            <span className="absolute right-0 w-2 h-4 bg-[#A8C7FA] animate-pulse opacity-80 pointer-events-none" />
          </div>

          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="h-8 sm:h-9 px-3 sm:px-4 rounded-lg bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-semibold flex items-center gap-1.5 transition shadow disabled:opacity-40 shrink-0 touch-manipulation cursor-pointer"
          >
            <Send size={13} />
            <span className="hidden sm:inline">Exec</span>
          </button>
        </form>
      )}
    </div>
  );
};
