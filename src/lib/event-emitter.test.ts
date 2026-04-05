import { describe, it, expect, vi } from 'vitest';
import { SDKEventEmitter } from './event-emitter.js';
import type { BeforeRequestEvent, AfterResponseEvent, TokenRefreshEvent } from './event-emitter.js';

describe('SDKEventEmitter', () => {
  it('emits events to registered listeners', () => {
    const emitter = new SDKEventEmitter();
    const listener = vi.fn();

    emitter.on('beforeRequest', listener);
    emitter.emit('beforeRequest', { url: 'https://example.com/api', method: 'GET' });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ url: 'https://example.com/api', method: 'GET' });
  });

  it('supports multiple listeners for the same event', () => {
    const emitter = new SDKEventEmitter();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    emitter.on('afterResponse', listener1);
    emitter.on('afterResponse', listener2);

    const event: AfterResponseEvent = { url: 'https://example.com', method: 'POST', status: 200, durationMs: 42 };
    emitter.emit('afterResponse', event);

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener1).toHaveBeenCalledWith(event);
    expect(listener2).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledWith(event);
  });

  it('removes listeners with off()', () => {
    const emitter = new SDKEventEmitter();
    const listener = vi.fn();

    emitter.on('tokenRefresh', listener);
    emitter.off('tokenRefresh', listener);
    emitter.emit('tokenRefresh', { success: true });

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not call removed listeners', () => {
    const emitter = new SDKEventEmitter();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    emitter.on('beforeRequest', listener1);
    emitter.on('beforeRequest', listener2);
    emitter.off('beforeRequest', listener1);

    emitter.emit('beforeRequest', { url: 'https://example.com', method: 'GET' });

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it('does nothing when emitting with no listeners', () => {
    const emitter = new SDKEventEmitter();
    // Should not throw
    expect(() => {
      emitter.emit('beforeRequest', { url: 'https://example.com', method: 'GET' });
    }).not.toThrow();
  });

  it('handles different event types independently', () => {
    const emitter = new SDKEventEmitter();
    const beforeListener = vi.fn();
    const afterListener = vi.fn();
    const tokenListener = vi.fn();

    emitter.on('beforeRequest', beforeListener);
    emitter.on('afterResponse', afterListener);
    emitter.on('tokenRefresh', tokenListener);

    const beforeEvent: BeforeRequestEvent = { url: 'https://example.com', method: 'GET' };
    emitter.emit('beforeRequest', beforeEvent);

    expect(beforeListener).toHaveBeenCalledOnce();
    expect(afterListener).not.toHaveBeenCalled();
    expect(tokenListener).not.toHaveBeenCalled();

    const tokenEvent: TokenRefreshEvent = { success: false };
    emitter.emit('tokenRefresh', tokenEvent);

    expect(tokenListener).toHaveBeenCalledOnce();
    expect(tokenListener).toHaveBeenCalledWith(tokenEvent);
    expect(afterListener).not.toHaveBeenCalled();
  });

  it('supports adding the same listener twice (deduplicated by Set)', () => {
    const emitter = new SDKEventEmitter();
    const listener = vi.fn();

    emitter.on('beforeRequest', listener);
    emitter.on('beforeRequest', listener); // Add same reference again

    emitter.emit('beforeRequest', { url: 'https://example.com', method: 'GET' });

    // Set deduplication means it's only called once
    expect(listener).toHaveBeenCalledOnce();
  });

  it('off() is safe to call for unregistered listeners', () => {
    const emitter = new SDKEventEmitter();
    const listener = vi.fn();

    // Should not throw even though listener was never registered
    expect(() => {
      emitter.off('beforeRequest', listener);
    }).not.toThrow();
  });

  it('off() is safe to call for events with no listeners at all', () => {
    const emitter = new SDKEventEmitter();
    const listener = vi.fn();

    // Should not throw even though the event type has no listeners set
    expect(() => {
      emitter.off('tokenRefresh', listener);
    }).not.toThrow();
  });
});
