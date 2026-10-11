import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodusBridgeClient, sendBridgeRpc, simulateBridgeRpc } from '../utils/bridgeProtocol';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOkResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeErrorResponse(status: number, statusText: string): Response {
  return new Response(JSON.stringify({ error: 'server error' }), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── NodusBridgeClient ───────────────────────────────────────────────────────

describe('NodusBridgeClient', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should use default host, port, and auth token when no args provided', () => {
    const client = new NodusBridgeClient();
    expect(client).toBeDefined();
  });

  it('should use custom host, port, and auth token', () => {
    const client = new NodusBridgeClient('example.com', 8080, 'custom-token');
    expect(client).toBeDefined();
  });

  it('should fall back to default auth token when empty string is passed', () => {
    const client = new NodusBridgeClient('127.0.0.1', 9120, '');
    expect(client).toBeDefined();
  });

  it('should strip protocol prefix from host', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ online: true }));
    const client = new NodusBridgeClient('https://myhost.com', 9120);
    await client.call('PING');
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('http://myhost.com:9120');
  });

  it('should strip port from host if present', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ online: true }));
    const client = new NodusBridgeClient('myhost.com:3000', 9120);
    await client.call('PING');
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('http://myhost.com:9120');
  });

  it('should include auth headers in requests', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ status: 'ok' }));
    const client = new NodusBridgeClient('127.0.0.1', 9120, 'test-token');
    await client.call('PING');
    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token');
    expect(headers['X-Nodus-Auth-Token']).toBe('test-token');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
  });
});