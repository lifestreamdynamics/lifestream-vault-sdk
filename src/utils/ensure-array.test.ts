import { describe, it, expect } from 'vitest';
import { ensureArray } from './ensure-array.js';

describe('ensureArray', () => {
  it('returns empty array for null', () => {
    expect(ensureArray(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(ensureArray(undefined)).toEqual([]);
  });

  it('returns the same array when given an array', () => {
    const arr = [1, 2, 3];
    expect(ensureArray(arr)).toBe(arr);
  });

  it('wraps a bare object in an array', () => {
    const obj = { id: '1', name: 'test' };
    expect(ensureArray(obj)).toEqual([{ id: '1', name: 'test' }]);
  });

  it('handles empty array input', () => {
    expect(ensureArray([])).toEqual([]);
  });

  it('preserves array element order', () => {
    const arr = ['c', 'a', 'b'];
    expect(ensureArray(arr)).toEqual(['c', 'a', 'b']);
  });

  it('wraps a string value in an array', () => {
    expect(ensureArray('hello')).toEqual(['hello']);
  });

  it('wraps a number value in an array', () => {
    expect(ensureArray(42)).toEqual([42]);
  });
});
