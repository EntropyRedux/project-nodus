/**
 * Project Nodus - Dual-Platform Bridge RPC Protocol & Client
 * Implements HMAC-SHA256 signed JSON-RPC 2.0 over Tailscale / WebSockets for Nodus Home & Windows
 */

export interface RpcParams {
  [key: string]: unknown;
}

export interface BridgeRpcMessage {
  id: string;
  version?: '2.0';
  targetDevice?: string;
  sourceDevice?: string;
  action: 
    | 'PING'
    | 'GET_PROCESSES'
    | 'KILL_PROCESS'
    | 'RUN_COMMAND'
    | 'EXECUTE_COMMAND'
    | 'LAUNCH_INTENT'
    | 'SET_CLIPBOARD'
    | 'GET_CLIPBOARD'
    | 'LOCK_DEVICE'
    | 'LOCK_WORKSTATION'
    | 'REBOOT_DEVICE'
    | 'SET_VOLUME'
    | 'BATTERY_STATUS';
  params?: RpcParams;
  timestamp: number;
  nonce?: string;
  sig?: string;
}

export interface BridgeRpcResponse {
  id: string;
  version?: '2.0';
  status: 'OK' | 'ERROR';
  latencyMs?: number;
  result?: unknown;
  error?: string;
  timestamp: number;
}

export interface WirePacketLog {
  id: string;
  direction: 'OUTBOUND' | 'INBOUND';
  protocol: 'WSS' | 'HTTP_POST' | 'ADB_TCP' | 'NAMED_PIPE';
  source: string;
  destination: string;
  payload: string;
  timestamp: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  latencyMs?: number;
}

/**
 * Signs a canonical RPC payload using WebCrypto SubtleCrypto API (HMAC-SHA256)
 */
export async function signCanonicalPayload(
  action: string,
  timestamp: number,
  nonce: string,
  params: RpcParams,
  hmacKey: CryptoKey
): Promise<string> {
  const sortedKeys = Object.keys(params || {}).sort();
  const orderedParams: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    orderedParams[k] = params[k];
  }
  const payload = `${action}|${timestamp}|${nonce}|${JSON.stringify(orderedParams)}`;
  const sigBuffer = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Production Nodus Bridge WebSocket Client with HMAC-SHA256 Wire Security
 */
export class NodusBridgeClient {
  private ws: WebSocket | null = null;
  private hmacKey: CryptoKey;
  private pendingCalls = new Map<string, (resp: BridgeRpcResponse) => void>();
  private eventListeners = new Map<string, Set<(data: unknown) => void>>();

  private constructor(hmacKey: CryptoKey) {
    this.hmacKey = hmacKey;
  }

  /**
   * Initializes and connects to a Nodus Go Agent over Tailnet
   */
  static async connect(tailnetHost: string, rawKeyHex: string, port = 8890): Promise<NodusBridgeClient> {
    const keyBytes = new Uint8Array(rawKeyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const client = new NodusBridgeClient(hmacKey);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    client.ws = new WebSocket(`${protocol}//${tailnetHost}:${port}/ws`);

    await new Promise<void>((resolve, reject) => {
      if (!client.ws) return reject(new Error('WebSocket initialization failed'));
      client.ws.onopen = () => resolve();
      client.ws.onerror = (err) => reject(err);
    });

    client.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id && client.pendingCalls.has(msg.id)) {
          client.pendingCalls.get(msg.id)?.(msg);
          client.pendingCalls.delete(msg.id);
        } else if (msg.event) {
          client.eventListeners.get(msg.event)?.forEach((handler) => handler(msg.data));
        }
      } catch (e) {
        console.error('[NodusBridgeClient] Message parse error:', e);
      }
    };

    return client;
  }

  /**
   * Dispatches an HMAC-signed RPC call
   */
  async call(action: BridgeRpcMessage['action'], params: RpcParams = {}): Promise<BridgeRpcResponse> {
    const id = `rpc-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const sig = await signCanonicalPayload(action, timestamp, nonce, params, this.hmacKey);

    const msg: BridgeRpcMessage = {
      id,
      version: '2.0',
      action,
      params,
      timestamp,
      nonce,
      sig,
    };

    return new Promise((resolve) => {
      this.pendingCalls.set(id, resolve);
      this.ws?.send(JSON.stringify(msg));
    });
  }

  /**
   * Subscribes to server-pushed unsolicited events
   */
  on(event: string, handler: (data: unknown) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
    return () => this.eventListeners.get(event)?.delete(handler);
  }
}

// Backward-compatibility alias
export const NovaBridgeClient = NodusBridgeClient;

/**
 * Simulates or dispatches an RPC transaction for UI visualizer and code studio
 */
export async function simulateBridgeRpc(
  action: BridgeRpcMessage['action'],
  targetDevice: string,
  params: RpcParams = {}
): Promise<{ request: BridgeRpcMessage; response: BridgeRpcResponse; packet: WirePacketLog }> {
  const reqId = `rpc-${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();
  const latency = Math.floor(Math.random() * 6 + 2); // 2ms - 8ms local mesh latency

  const request: BridgeRpcMessage = {
    id: reqId,
    version: '2.0',
    targetDevice,
    sourceDevice: 'nodus-host (Nodus Home)',
    action,
    params,
    timestamp: Math.floor(now / 1000),
    nonce: Math.random().toString(36).substring(2, 10),
    sig: 'hmac-sha256-verified',
  };

  await new Promise((resolve) => setTimeout(resolve, latency));

  let resultData: unknown = { status: 'acknowledged' };
  let errorMsg: string | undefined = undefined;

  switch (action) {
    case 'PING':
      resultData = { pong: true, serverTime: Date.now(), bridge: 'Nodus Go tsnet Agent v1.0' };
      break;
    case 'GET_PROCESSES':
      resultData = [
        { pid: 1420, name: 'dwm.exe', memoryMb: 420, cpu: 3.2 },
        { pid: 4892, name: 'explorer.exe', memoryMb: 340, cpu: 1.8 },
        { pid: 11240, name: 'Code.exe', memoryMb: 1420, cpu: 5.4 },
        { pid: 8312, name: 'msedge.exe', memoryMb: 1850, cpu: 8.9 },
      ];
      break;
    case 'KILL_PROCESS':
      resultData = { killedPid: params.pid, success: true, signal: 'SIGKILL' };
      break;
    case 'RUN_COMMAND':
    case 'EXECUTE_COMMAND':
      resultData = { output: `[ExitCode 0] Executed allowlisted command: ${params.commandId || params.command || 'open-vscode'}` };
      break;
    case 'LAUNCH_INTENT':
      resultData = { launched: params.packageName, flags: ['FLAG_ACTIVITY_NEW_TASK'] };
      break;
    case 'SET_CLIPBOARD':
      resultData = { synced: true, length: String(params.text || '').length };
      break;
    case 'LOCK_DEVICE':
    case 'LOCK_WORKSTATION':
      resultData = { lockState: 'LOCKED', securityLevel: 'Secured' };
      break;
    case 'REBOOT_DEVICE':
      resultData = { initiated: true, delaySeconds: 0 };
      break;
    case 'SET_VOLUME':
      resultData = { masterVolume: params.volume ?? 80 };
      break;
    case 'BATTERY_STATUS':
      resultData = { level: 91, isCharging: true, temperatureC: 32.4 };
      break;
    default:
      errorMsg = `Unhandled action: ${action}`;
  }

  const response: BridgeRpcResponse = {
    id: reqId,
    version: '2.0',
    status: errorMsg ? 'ERROR' : 'OK',
    latencyMs: latency,
    result: resultData,
    error: errorMsg,
    timestamp: Date.now(),
  };

  const packet: WirePacketLog = {
    id: reqId,
    direction: 'OUTBOUND',
    protocol: 'WSS',
    source: 'nodus-controller.tailXXXX.ts.net',
    destination: targetDevice,
    payload: JSON.stringify(request, null, 2),
    timestamp: new Date().toLocaleTimeString(),
    status: 'SUCCESS',
    latencyMs: latency,
  };

  return { request, response, packet };
}
