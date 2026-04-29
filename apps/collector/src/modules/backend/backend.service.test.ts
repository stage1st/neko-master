import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendService } from './backend.service.js';
import { StatsDatabase } from '../db/db.js';
import { AuthService } from '../auth/auth.service.js';

const wsFactory = vi.hoisted(() => {
  type HandlerMap = {
    open?: () => void;
    error?: (error: unknown) => void;
    close?: (code: number) => void;
  };

  let implementation:
    | ((socket: { emit: HandlerMap }, url: string, options?: Record<string, unknown>) => void)
    | null = null;

  class MockWebSocket {
    private handlers: HandlerMap = {};

    constructor(url: string, options?: Record<string, unknown>) {
      if (!implementation) {
        throw new Error('MockWebSocket implementation not configured');
      }
      implementation(
        {
          emit: this.handlers,
        },
        url,
        options,
      );
    }

    on(event: string, handler: (...args: unknown[]) => void): void {
      if (event === 'open') this.handlers.open = handler as () => void;
      if (event === 'error') this.handlers.error = handler as (error: unknown) => void;
      if (event === 'close') this.handlers.close = handler as (code: number) => void;
    }

    close(): void {}

    terminate(): void {}
  }

  return {
    MockWebSocket,
    setImplementation(next: typeof implementation) {
      implementation = next;
    },
  };
});

vi.mock('ws', () => ({
  default: wsFactory.MockWebSocket,
}));

describe('BackendService testConnection', () => {
  let db: StatsDatabase;
  let authService: AuthService;
  let service: BackendService;

  beforeEach(() => {
    db = new StatsDatabase(':memory:');
    authService = new AuthService(db);
    service = new BackendService(db, {} as never, authService);
    wsFactory.setImplementation(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts Clash-compatible PassWall Mihomo endpoints without adding a new type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ proxies: {} }),
      }),
    );

    wsFactory.setImplementation((socket, url, options) => {
      expect(url).toBe('ws://192.168.1.1:9090/connections');
      expect(options).toMatchObject({
        headers: {
          Authorization: 'Bearer mihomo-secret',
        },
      });

      queueMicrotask(() => {
        socket.emit.open?.();
      });
    });

    const result = await service.testConnection({
      type: 'clash',
      url: 'http://192.168.1.1:9090',
      token: 'mihomo-secret',
    });

    expect(result).toEqual({
      success: true,
      message: 'Connected to Clash-compatible API (Mihomo / PassWall-Mihomo supported)',
    });
  });

  it('returns a clear auth error when the Clash-compatible secret is wrong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
      }),
    );

    const result = await service.testConnection({
      type: 'clash',
      url: 'http://router:9090',
      token: 'wrong-secret',
    });

    expect(result).toEqual({
      success: false,
      message: 'Authentication failed. Check the Clash/Mihomo secret or PassWall external-controller secret.',
    });
  });

  it('returns an explicit incompatibility error for PassWall sing-box/xray style endpoints', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'text/html' }),
      }),
    );

    const result = await service.testConnection({
      type: 'clash',
      url: 'http://router:9090',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('PassWall only works here with Mihomo and external-controller enabled');
    expect(result.message).toContain('sing-box/xray is not supported');
  });
});
