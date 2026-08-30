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

export async function universalNetworkFetch(
  url: string,
  options: { method?: string; body?: any; timeoutMs?: number } = {}
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const method = options.method || 'GET';
  const bodyStr = options.body
    ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    : null;

  // 1. Try Native Android Bridge first if running inside APK
  if (typeof window !== 'undefined') {
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.httpFetch === 'function') {
      try {
        const raw = bridge.httpFetch(url, method, bodyStr);
        if (raw && typeof raw === 'string') {
          const parsed = JSON.parse(raw);
          let data = null;
          try {
            data = parsed.body ? JSON.parse(parsed.body) : null;
          } catch (_) {
            data = parsed.body;
          }
          return {
            ok: !!parsed.ok,
            status: parsed.status || 0,
            data,
            error: parsed.error,
          };
        }
      } catch (err: any) {
        console.warn('[universalNetworkFetch] Native bridge error:', err);
      }
    }
  }

  // 2. Standard Web fetch fallback
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), options.timeoutMs || 3500);
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr || undefined,
      signal: controller.signal,
    });
    clearTimeout(tid);
    let data = null;
    try {
      data = await res.json();
    } catch (_) {}
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message || 'Network request failed' };
  }
}

export class FleetDirectClient {
  private baseUrl: string;

  constructor(hostIp: string, port = 9120) {
    this.baseUrl = `http://${hostIp}:${port}`;
  }

  /** Fetch live workstation status (CPU, RAM, OS) */
  async getStatus(): Promise<SystemStatusResponse | null> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/status`);
    return res.ok ? (res.data as SystemStatusResponse) : null;
  }

  /** Control PC media & master volume */
  async controlMedia(action: 'volume_up' | 'volume_down' | 'volume_mute' | 'play_pause' | 'next' | 'prev'): Promise<boolean> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/media/control`, {
      method: 'POST',
      body: { action },
    });
    return res.ok;
  }

  /** Lock the Windows workstation */
  async lockWorkstation(): Promise<boolean> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/lock`, { method: 'POST' });
    return res.ok;
  }

  /** Fetch active processes */
  async getProcesses(): Promise<RemoteProcessItem[]> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/processes`);
    if (res.ok && res.data && Array.isArray(res.data.processes)) {
      return res.data.processes;
    }
    return [];
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
