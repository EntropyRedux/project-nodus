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

export function getActiveFleetSessionToken(): string {
  if (typeof window !== 'undefined') {
    const bridge = (window as any).NodusNativeBridge;
    if (bridge && typeof bridge.getSessionToken === 'function') {
      return bridge.getSessionToken() || '';
    }
    return sessionStorage.getItem('nodus_fleet_session_token') || '';
  }
  return '';
}

/**
 * Delegates network RPC calls via the Android Native Bridge (NodusNativeBridge)
 * when running inside the APK shell, falling back to standard fetch in web preview environments.
 */
export async function universalNetworkFetch(
  url: string,
  options: { method?: string; body?: any; timeoutMs?: number } = {}
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const method = options.method || 'GET';
  const bodyStr = options.body
    ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    : null;

  // 1. Primary path: Delegate to Native Android Bridge when running inside APK
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
        console.warn(`[NodusHome -> Fleet] Native bridge IPC call failed for ${url}:`, err);
      }
    }
  }

  // 2. Secondary path: Browser preview environment fallback
  try {
    const token = getActiveFleetSessionToken();
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), options.timeoutMs || 3500);
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}`, 'X-Nodus-Auth-Token': token } : {}),
      },
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
    return { ok: false, status: 0, error: err?.message || 'IPC / Network request failed' };
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
    const res = await universalNetworkFetch(`${this.baseUrl}/api/process/kill`, {
      method: 'POST',
      body: { pid },
    });
    return res.ok;
  }

  /** Launch a remote executable or script on Windows */
  async executeCommand(command: string, args = '', workingDir?: string): Promise<boolean> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/exec`, {
      method: 'POST',
      body: { command, args, workingDir },
    });
    return res.ok;
  }

  /** Synchronize clipboard text to Windows */
  async sendClipboard(text: string): Promise<boolean> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/clipboard`, {
      method: 'POST',
      body: { text },
    });
    return res.ok;
  }

  /** Send relative mouse movement */
  async sendMouseMove(dx: number, dy: number): Promise<boolean> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/input/mouse/move`, {
      method: 'POST',
      body: { dx, dy },
    });
    return res.ok;
  }

  /** Send mouse click */
  async sendMouseClick(button: 'left' | 'right' | 'middle' | 'double'): Promise<boolean> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/input/mouse/click`, {
      method: 'POST',
      body: { button },
    });
    return res.ok;
  }

  /** Send mouse scroll */
  async sendMouseScroll(dx: number, dy: number): Promise<boolean> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/input/mouse/scroll`, {
      method: 'POST',
      body: { dx, dy },
    });
    return res.ok;
  }

  /** Trigger system hotkey combination */
  async sendHotkey(keys: string[]): Promise<boolean> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/input/keyboard/hotkey`, {
      method: 'POST',
      body: { keys },
    });
    return res.ok;
  }

  /** Type Unicode text into focused window */
  async sendText(text: string): Promise<boolean> {
    const res = await universalNetworkFetch(`${this.baseUrl}/api/input/keyboard/text`, {
      method: 'POST',
      body: { text },
    });
    return res.ok;
  }
}
