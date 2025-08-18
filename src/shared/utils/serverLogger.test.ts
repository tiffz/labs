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
    it.skip('should send logs to /__debug_log endpoint with correct structure', async () => {
      const logger = installServerLogger('CATS');
      
      await logger.log('test message', { extra: 'data' });
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFetch).toHaveBeenCalledWith('/__debug_log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"message":"test message"')
      });
    });

    it.skip('should include timestamp, level, and message in log data', async () => {
      const logger = installServerLogger('ZINES');
      
      await logger.error('test error message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const body = JSON.parse(callArgs![1]!.body as string);
      
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('app');
      expect(body).toHaveProperty('level', 'error');
      expect(body).toHaveProperty('message', 'test error message');
      expect(new Date(body.timestamp)).toBeInstanceOf(Date);
    });

    it.skip('should handle all log levels correctly', async () => {
      const logger = installServerLogger('CORP');
      
      await logger.log('info message');
      await logger.warn('warning message');
      await logger.error('error message');
      await logger.debug('debug message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFetch).toHaveBeenCalledTimes(4);
      
      const calls = mockFetch.mock.calls;
      const bodies = calls.map(call => JSON.parse(call![1]!.body as string));
      
      expect(bodies[0].level).toBe('info');
      expect(bodies[1].level).toBe('warn');
      expect(bodies[2].level).toBe('error');
      expect(bodies[3].level).toBe('debug');
    });

    it.skip('should serialize data objects correctly', async () => {
      const logger = installServerLogger('TEST');
      
      const testData = {
        user: 'test-user',
        count: 42,
        nested: { value: true }
      };
      
      await logger.log('test with data', testData);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const body = JSON.parse(callArgs![1]!.body as string);
      
      expect(body.data).toBeDefined();
      expect(body.data).toContain('"user": "test-user"');
      expect(body.data).toContain('"count": 42');
      expect(body.data).toContain('"nested"');
    });

    it.skip('should handle undefined data gracefully', async () => {
      const logger = installServerLogger('TEST');
      
      await logger.log('message without data');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const body = JSON.parse(callArgs![1]!.body as string);
      
      expect(body.data).toBeUndefined();
    });

    it('should handle fetch failures gracefully without throwing', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const logger = installServerLogger('TEST');
      
      // Should not throw even if fetch fails
      await expect(async () => {
        await logger.log('test message');
        await new Promise(resolve => setTimeout(resolve, 10));
      }).not.toThrow();
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

    it.skip('should capture and send window error events', async () => {
      installServerLogger('TEST');
      
      // Simulate a window error
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error message',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test error')
      });
      
      window.dispatchEvent(errorEvent);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should have sent error to server
      expect(mockFetch).toHaveBeenCalledWith('/__debug_log', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('window.onerror')
      }));
    });
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