/**
 * Project Nodus - REST & WebSocket RPC Protocol Client
 * Dispatches authenticated REST/RPC calls to Nodus Desktop and Android Companion endpoints.
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
    | 'BATTERY_STATUS'
    | 'GET_TELEMETRY'
    | 'LIST_DIRECTORY'
    | 'TRANSFER_FILE'
    | 'GET_INSTALLED_APPS';
  params?: RpcParams;
  timestamp: number;
  authToken?: string;
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
  protocol: 'REST' | 'IPC';
  source: string;
  destination: string;
  payload: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  latencyMs: number;
}

export class NodusBridgeClient {
  private host: string;
  private port: number;
  private authToken: string;

  constructor(host: string = '127.0.0.1', port: number = 9120, authToken: string = '') {
    this.host = host;
    this.port = port;
    this.authToken = authToken;
  }

  async call(action: BridgeRpcMessage['action'], params: RpcParams = {}): Promise<BridgeRpcResponse> {
    const id = `rpc-${Math.random().toString(36).substring(2, 9)}`;
    const startTime = performance.now();
    const cleanHost = this.host.replace(/^https?:\/\//, '').split(':')[0];
    const baseUrl = `http://${cleanHost}:${this.port}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      headers['X-Nodus-Auth-Token'] = this.authToken;
    }

    try {
      let res: Response;
      switch (action) {
        case 'PING':
        case 'GET_TELEMETRY':
          res = await fetch(`${baseUrl}/api/status`, { method: 'GET', headers });
          break;
        case 'GET_PROCESSES':
          res = await fetch(`${baseUrl}/api/processes`, { method: 'GET', headers });
          break;
        case 'KILL_PROCESS':
          res = await fetch(`${baseUrl}/api/process/kill`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ pid: params.pid }),
          });
          break;
        case 'EXECUTE_COMMAND':
        case 'RUN_COMMAND':
          res = await fetch(`${baseUrl}/api/exec`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              command: params.command || params.commandOrPath,
              args: params.args,
              workingDir: params.workingDir,
              runAsAdmin: params.runAsAdmin,
            }),
          });
          break;
        case 'LOCK_DEVICE':
        case 'LOCK_WORKSTATION':
          res = await fetch(`${baseUrl}/api/system/control`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'lock' }),
          });
          break;
        case 'REBOOT_DEVICE':
          res = await fetch(`${baseUrl}/api/system/control`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'restart' }),
          });
          break;
        case 'GET_CLIPBOARD':
          res = await fetch(`${baseUrl}/api/clipboard`, { method: 'GET', headers });
          break;
        case 'SET_CLIPBOARD':
          res = await fetch(`${baseUrl}/api/clipboard`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ text: params.text, imageData: params.imageData }),
          });
          break;
        case 'GET_INSTALLED_APPS':
          res = await fetch(`${baseUrl}/api/shortcuts`, { method: 'GET', headers });
          break;
        default:
          res = await fetch(`${baseUrl}/api/status`, { method: 'GET', headers });
          break;
      }

      const latencyMs = Math.round(performance.now() - startTime);
      if (res.ok) {
        const data = await res.json();
        return {
          id,
          version: '2.0',
          status: 'OK',
          latencyMs,
          result: data,
          timestamp: Date.now(),
        };
      } else {
        return {
          id,
          version: '2.0',
          status: 'ERROR',
          latencyMs,
          error: `HTTP ${res.status} (${res.statusText})`,
          timestamp: Date.now(),
        };
      }
    } catch (e: any) {
      return {
        id,
        version: '2.0',
        status: 'ERROR',
        latencyMs: Math.round(performance.now() - startTime),
        error: e?.message || 'Network unreachable',
        timestamp: Date.now(),
      };
    }
  }
}

export async function sendBridgeRpc(
  action: BridgeRpcMessage['action'],
  targetDevice: string,
  params: RpcParams = {},
  authToken: string = ''
): Promise<{ request: BridgeRpcMessage; response: BridgeRpcResponse; packet: WirePacketLog }> {
  const reqId = `rpc-${Math.random().toString(36).substring(2, 9)}`;
  const startTime = performance.now();

  const request: BridgeRpcMessage = {
    id: reqId,
    version: '2.0',
    targetDevice,
    action,
    params,
    timestamp: Date.now(),
  };

  const client = new NodusBridgeClient(targetDevice, 9120, authToken);
  const response = await client.call(action, params);
  const latency = Math.round(performance.now() - startTime);

  const packet: WirePacketLog = {
    id: reqId,
    direction: 'OUTBOUND',
    protocol: 'REST',
    source: 'nodus-home',
    destination: targetDevice,
    payload: JSON.stringify(request, null, 2),
    timestamp: new Date().toLocaleTimeString(),
    status: response.status === 'OK' ? 'SUCCESS' : 'FAILED',
    latencyMs: latency,
  };

  return { request, response, packet };
}

export const simulateBridgeRpc = sendBridgeRpc;
