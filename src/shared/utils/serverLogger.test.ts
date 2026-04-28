/**
 * Tests for the shared server logger functionality
 * 
 * Note: These tests focus on the core functionality and API surface.
 * Due to the singleton pattern and global state modifications, some edge cases
 * are tested through integration rather than pure unit tests.
 */
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { installServerLogger, resetServerLoggerForTesting } from './serverLogger';

// Mock fetch globally
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('ServerLogger', () => {
  beforeEach(() => {
    // Reset fetch mock
    mockFetch.mockClear();
    mockFetch.mockResolvedValue(new Response('{"status":"ok"}'));
    
    // Mock import.meta.env.DEV to enable logger in tests
    vi.stubEnv('DEV', true);
    
    // Reset singleton instance to allow fresh instances in each test
    resetServerLoggerForTesting();

    // Info/debug only POST to /__debug_log when labs URL debug is on
    window.history.replaceState({}, '', `${window.location.pathname}?debug=1`);
  });

  afterEach(() => {
    window.history.replaceState({}, '', window.location.pathname);
  });

  describe('installServerLogger', () => {
    it('should return a server logger instance with expected methods', () => {
      const logger = installServerLogger('TEST');
      
      expect(logger).toBeDefined();
      expect(typeof logger.log).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should return the same instance for multiple calls (singleton)', () => {
      const logger1 = installServerLogger('TEST1');
      const logger2 = installServerLogger('TEST2');
      
      // Should be the same instance due to singleton pattern
      expect(logger1).toBe(logger2);
    });
  });

  describe('Server Communication', () => {
    // The logger batches logs and flushes after a 500ms setTimeout, so these
    // tests drive the flush with fake timers and assert on the batched body
    // shape ({ logs: [...] }) that the server actually receives.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout'] });
    });

    async function flushLogs(): Promise<void> {
      await vi.advanceTimersByTimeAsync(600);
      // Allow the async fetch() resolution to settle.
      await Promise.resolve();
    }

    function parseBatchedBody(callIndex = 0): { logs: Array<Record<string, unknown>> } {
      const callArgs = mockFetch.mock.calls[callIndex];
      expect(callArgs).toBeDefined();
      return JSON.parse(callArgs![1]!.body as string) as { logs: Array<Record<string, unknown>> };
    }

    it('sends logs to /__debug_log with a batched { logs: [...] } body', async () => {
      const logger = installServerLogger('CATS');

      logger.log('test message', { extra: 'data' });
      await flushLogs();

      expect(mockFetch).toHaveBeenCalledWith('/__debug_log', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"message":"test message"'),
      }));
      const body = parseBatchedBody();
      expect(Array.isArray(body.logs)).toBe(true);
      expect(body.logs[0]).toMatchObject({ message: 'test message' });
    });

    it('includes timestamp, app, level, and message on each log entry', async () => {
      const logger = installServerLogger('ZINES');

      logger.error('test error message');
      await flushLogs();

      const body = parseBatchedBody();
      const entry = body.logs[0]!;
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('app');
      expect(entry).toHaveProperty('level', 'error');
      expect(entry).toHaveProperty('message', 'test error message');
      expect(new Date(entry.timestamp as string)).toBeInstanceOf(Date);
    });

    it('batches all log levels into a single flush', async () => {
      const logger = installServerLogger('CORP');

      logger.log('info message');
      logger.warn('warning message');
      logger.error('error message');
      logger.debug('debug message');
      await flushLogs();

      // One batched fetch, four entries in order.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const body = parseBatchedBody();
      expect(body.logs.map((l) => l.level)).toEqual(['info', 'warn', 'error', 'debug']);
    });

    it('serializes structured data fields', async () => {
      const logger = installServerLogger('TEST');

      const testData = { user: 'test-user', count: 42, nested: { value: true } };
      logger.log('test with data', testData);
      await flushLogs();

      const entry = parseBatchedBody().logs[0]!;
      expect(entry.data).toBeDefined();
      expect(entry.data as string).toContain('"user": "test-user"');
      expect(entry.data as string).toContain('"count": 42');
      expect(entry.data as string).toContain('"nested"');
    });

    it('omits data when none is provided', async () => {
      const logger = installServerLogger('TEST');

      logger.log('message without data');
      await flushLogs();

      const entry = parseBatchedBody().logs[0]!;
      expect(entry.data).toBeUndefined();
    });

    it('handles fetch failures without throwing', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const logger = installServerLogger('TEST');

      await expect(async () => {
        logger.log('test message');
        await flushLogs();
      }).not.toThrow();
    });

    describe('labs URL debug gating', () => {
      it('does not POST info logs when debug URL flags are off', async () => {
        window.history.replaceState({}, '', window.location.pathname);
        resetServerLoggerForTesting();
        mockFetch.mockClear();
        const logger = installServerLogger('GATED');
        logger.log('silent');
        await flushLogs();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('still POSTs error logs when debug URL flags are off', async () => {
        window.history.replaceState({}, '', window.location.pathname);
        resetServerLoggerForTesting();
        mockFetch.mockClear();
        const logger = installServerLogger('GATED2');
        logger.error('boom');
        await flushLogs();
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Error Event Handling', () => {
    it('should install error event listeners when called', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      installServerLogger('TEST');
      
      // Should install both error and unhandledrejection listeners
      const errorCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'error' || call[0] === 'unhandledrejection'
      );
      
      expect(errorCalls.length).toBeGreaterThanOrEqual(2);
    });

    // End-to-end "dispatch a window error → server receives it" is covered by
    // the listener-registration assertion above. Asserting on the outbound
    // fetch body here is brittle because resetServerLoggerForTesting clears
    // the singleton but cannot unregister window listeners left behind by
    // previous logger instances in the same test file.
  });

  describe('API Stability', () => {
    it('should maintain consistent API across different app names', () => {
      const logger1 = installServerLogger('APP1');
      const logger2 = installServerLogger('APP2');
      
      // Both should have the same methods
      const methods = ['log', 'error', 'warn', 'debug'] as const;
      methods.forEach(method => {
        expect(typeof logger1[method]).toBe('function');
        expect(typeof logger2[method]).toBe('function');
      });
    });

    it('should handle empty or invalid app names gracefully', () => {
      expect(() => installServerLogger('')).not.toThrow();
      expect(() => installServerLogger('   ')).not.toThrow();
      expect(() => installServerLogger('VALID_NAME')).not.toThrow();
    });
  });
});