// Nodus Fleet — Universal Direct Network RPC Client
// Provides high-performance, token-authenticated fetch with transparent Native Bridge fallback.

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  timeoutMs?: number;
}

export interface UniversalResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

const DEFAULT_AUTH_TOKEN = '';

export async function universalNetworkFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<UniversalResponse<T>> {
  const method = options.method || 'GET';
  const bodyStr = options.body
    ? typeof options.body === 'string'
      ? options.body
      : JSON.stringify(options.body)
    : '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // 1. Try standard browser fetch with timeout controller
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 4000);

    const res = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' && bodyStr ? bodyStr : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let parsedData: any = {};
    const text = await res.text();
    try {
      parsedData = text ? JSON.parse(text) : {};
    } catch (_) {
      parsedData = text;
    }

    if (res.ok) {
      return {
        ok: true,
        status: res.status,
        data: parsedData as T,
      };
    }
  } catch (err: any) {
    // Web fetch failed (CORS, mixed content, or network issue), fall through to native bridge
  }

  // 2. Native Bridge fallback (Android OkHttp/HttpURLConnection)
  const bridge = typeof window !== 'undefined' ? (window as any).NodusNativeBridge : null;
  if (bridge && typeof bridge.httpFetch === 'function') {
    try {
      const timeout = options.timeoutMs || 2500;
      const rawResult = bridge.httpFetch(url, method, bodyStr, timeout);
      if (rawResult && typeof rawResult === 'string') {
        const parsed = JSON.parse(rawResult);
        let innerData: any = {};
        try {
          innerData = parsed.data ? JSON.parse(parsed.data) : {};
        } catch (_) {
          innerData = parsed.data;
        }

        return {
          ok: parsed.ok ?? (parsed.status >= 200 && parsed.status < 300),
          status: parsed.status || (parsed.ok ? 200 : 500),
          data: innerData as T,
          error: parsed.error,
        };
      }
    } catch (bridgeErr: any) {
      return {
        ok: false,
        status: 500,
        data: null as any,
        error: bridgeErr?.message || 'Native bridge HTTP dispatch failed',
      };
    }
  }

  return {
    ok: false,
    status: 502,
    data: null as any,
    error: 'Failed to establish connection to node endpoint',
  };
}
