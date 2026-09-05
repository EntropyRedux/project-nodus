import { create } from 'zustand';
import { DeviceInfo } from '../types/desktop';
import { TerminalLine, TerminalSession } from '../types/ui-contracts';
import { TauriService } from '../services/TauriCommands';

function cleanAnsi(text: string): string {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\[\d+(?:;\d+)*m/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

interface TerminalState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  isExecuting: boolean;
  initDefaultSession: (hostDevice?: DeviceInfo) => Promise<void>;
  createSession: (device: DeviceInfo) => Promise<string>;
  closeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  clearBuffer: (sessionId: string) => void;
  sendCommand: (sessionId: string, command: string) => Promise<void>;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isExecuting: false,

  initDefaultSession: async (hostDevice?: DeviceInfo) => {
    if (get().sessions.length > 0) return;

    const device: DeviceInfo = hostDevice || {
      id: 'this-pc',
      name: 'Host Workstation PC',
      type: 'desktop',
      os: 'windows',
      status: 'online',
      ipAddress: '127.0.0.1',
      isLocal: true,
    };

    const initialCwd = await TauriService.getDefaultWorkingDir();

    const initialSession: TerminalSession = {
      id: `sess-${device.id}-${Date.now()}`,
      targetDevice: device,
      isConnected: true,
      cwd: initialCwd,
      lines: [
        {
          id: `line-${Date.now()}-1`,
          type: 'system',
          content: `═══ Nodus Shell Engine v3.4.2 ═══\nConnected to ${device.name} (${device.isLocal ? 'Local Host Workstation' : device.ipAddress})\nWorking directory: ${initialCwd}\nType 'help', 'systeminfo', 'dir', 'cd', or any PowerShell / system command below.`,
          timestamp: Date.now(),
        },
      ],
    };

    set({
      sessions: [initialSession],
      activeSessionId: initialSession.id,
    });
  },

  createSession: async (device: DeviceInfo) => {
    const newId = `sess-${device.id}-${Date.now()}`;
    const initialCwd = device.isLocal
      ? await TauriService.getDefaultWorkingDir()
      : (device.os === 'windows' ? 'C:\\' : '/');

    const newSession: TerminalSession = {
      id: newId,
      targetDevice: device,
      isConnected: device.status !== 'offline',
      cwd: initialCwd,
      lines: [
        {
          id: `line-${Date.now()}-1`,
          type: 'system',
          content: `═══ Remote Shell Connection Initialized ═══\nTarget Node: ${device.name} (${device.isLocal ? 'Local Host Workstation' : device.ipAddress})\nWorking directory: ${initialCwd}\nStatus: Handshake verified · Interactive terminal ready`,
          timestamp: Date.now(),
        },
      ],
    };

    set((state) => ({
      sessions: [...state.sessions, newSession],
      activeSessionId: newId,
    }));

    return newId;
  },

  closeSession: (sessionId: string) => {
    const current = get().sessions;
    const filtered = current.filter((s) => s.id !== sessionId);
    let nextActiveId = get().activeSessionId;

    if (nextActiveId === sessionId) {
      nextActiveId = filtered.length > 0 ? filtered[filtered.length - 1].id : null;
    }

    set({
      sessions: filtered,
      activeSessionId: nextActiveId,
    });
  },

  setActiveSession: (sessionId: string) => {
    set({ activeSessionId: sessionId });
  },

  clearBuffer: (sessionId: string) => {
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, lines: [] } : s)),
    }));
  },

  sendCommand: async (sessionId: string, command: string) => {
    const cleanCmd = command.trim();
    if (!cleanCmd) return;

    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // Handle client-side 'cls' or 'clear'
    const lowerCmd = cleanCmd.toLowerCase();
    if (lowerCmd === 'clear' || lowerCmd === 'cls') {
      get().clearBuffer(sessionId);
      return;
    }

    const inputLine: TerminalLine = {
      id: `in-${Date.now()}`,
      type: 'input',
      content: cleanCmd,
      timestamp: Date.now(),
    };

    // Append input line immediately
    set((state) => ({
      isExecuting: true,
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, lines: [...s.lines, inputLine] } : s
      ),
    }));

    try {
      let result: { stdout: string; stderr: string; exit_code: number; success: boolean; cwd?: string };

      if (session.targetDevice.isLocal || session.targetDevice.id === 'this-pc') {
        result = await TauriService.runTerminalCommand(cleanCmd, session.cwd);
      } else {
        result = await TauriService.runRemoteTerminalCommand(
          session.targetDevice.ipAddress,
          9120,
          cleanCmd,
          session.cwd
        );
      }

      const outLines: TerminalLine[] = [];
      const timestamp = Date.now();

      const cleanedStdout = cleanAnsi(result.stdout || '');
      const cleanedStderr = cleanAnsi(result.stderr || '');

      if (cleanedStdout.trim()) {
        outLines.push({
          id: `out-${timestamp}`,
          type: 'output',
          content: cleanedStdout.trimEnd(),
          timestamp,
        });
      }

      if (cleanedStderr.trim()) {
        outLines.push({
          id: `err-${timestamp}`,
          type: 'error',
          content: cleanedStderr.trimEnd(),
          timestamp,
        });
      }

      if (!result.stdout && !result.stderr) {
        // Silent successful command (like cd, mkdir, etc.)
        if (!result.success) {
          outLines.push({
            id: `out-${timestamp}`,
            type: 'warn',
            content: `Command exited with code ${result.exit_code}.`,
            timestamp,
          });
        }
      }

      set((state) => ({
        isExecuting: false,
        sessions: state.sessions.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                cwd: result.cwd || s.cwd,
                lines: [...s.lines, ...outLines],
              }
            : s
        ),
      }));
    } catch (e: any) {
      const errLine: TerminalLine = {
        id: `err-${Date.now()}`,
        type: 'error',
        content: `Execution error: ${e?.message || e}`,
        timestamp: Date.now(),
      };

      set((state) => ({
        isExecuting: false,
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, lines: [...s.lines, errLine] } : s
        ),
      }));
    }
  },
}));
