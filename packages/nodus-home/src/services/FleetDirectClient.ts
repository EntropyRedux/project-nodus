/**
 * Nodus Home — Direct Fleet LAN Client
 * Allows the POCO Pad tablet to directly send control actions (Media, Shortcuts, Input, Clipboard)
 * to any Windows Nodus Companion node over HTTP port 9120.
 */

export interface SystemStatusResponse {
  name: string;
  os: string;
  status: string;
  port: number;
  cpuLoad: number;
  ramUsage: string;
}

export interface RemoteProcessItem {
  pid: number;
  name: string;
  memory_kb: number;
}

export class FleetDirectClient {
  private baseUrl: string;

  constructor(hostIp: string, port = 9120) {
    this.baseUrl = `http://${hostIp}:${port}`;
  }

  /** Fetch live workstation status (CPU, RAM, OS) */
  async getStatus(): Promise<SystemStatusResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/status`, { method: 'GET' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn(`[FleetDirectClient] Failed to reach node at ${this.baseUrl}:`, e);
      return null;
    }
  }

  /** Control PC media & master volume */
  async controlMedia(action: 'volume_up' | 'volume_down' | 'volume_mute' | 'play_pause' | 'next' | 'prev'): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/media/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[FleetDirectClient] Failed to send media command:', e);
      return false;
    }
  }

  /** Lock the Windows workstation */
  async lockWorkstation(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/lock`, { method: 'POST' });
      return res.ok;
    } catch (e) {
      console.warn('[FleetDirectClient] Failed to lock workstation:', e);
      return false;
    }
  }

  /** Fetch active processes */
  async getProcesses(): Promise<RemoteProcessItem[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/processes`, { method: 'GET' });
      if (!res.ok) return [];
      const data = await res.json();
      return data.processes || [];
    } catch (e) {
      console.warn('[FleetDirectClient] Failed to query processes:', e);
      return [];
    }
  }

  /** Terminate a remote process */
  async killProcess(pid: number): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/process/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[FleetDirectClient] Failed to kill process:', e);
      return false;
    }
  }

  /** Launch a remote executable or script on Windows */
  async executeCommand(command: string, args = '', workingDir?: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args, workingDir }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[FleetDirectClient] Failed to execute remote command:', e);
      return false;
    }
  }

  /** Synchronize clipboard text to Windows */
  async sendClipboard(text: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/clipboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[FleetDirectClient] Failed to sync clipboard:', e);
      return false;
    }
  }

  /** Send relative mouse movement */
  async sendMouseMove(dx: number, dy: number): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/input/mouse/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dx, dy }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /** Send mouse click */
  async sendMouseClick(button: 'left' | 'right' | 'middle' | 'double'): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/input/mouse/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ button }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /** Send mouse scroll */
  async sendMouseScroll(dx: number, dy: number): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/input/mouse/scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dx, dy }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /** Trigger system hotkey combination */
  async sendHotkey(keys: string[]): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/input/keyboard/hotkey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /** Type Unicode text into focused window */
  async sendText(text: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/input/keyboard/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
}
