import { describe, expect, it, vi } from 'vitest';
import { createIdempotencyKey, formatDate, getLocalDateValue, getPageData } from './utils';

describe('frontend utilities', () => {
  it('reads the consistent paginated response shape', () => {
    const data = [{ id: 1 }];
    expect(getPageData({ data, pagination: { page: 1 } })).toBe(data);
    expect(getPageData([])).toEqual([]);
  });

  it('formats API dates as calendar dates without UTC shifting', () => {
    expect(formatDate('2026-07-15T23:00:00.000Z')).toBe('2026-07-15');
  });

  it('creates local date input values and unique request keys', () => {
    expect(getLocalDateValue(new Date(2026, 6, 15, 12))).toBe('2026-07-15');
    const randomUUID = vi.spyOn(crypto, 'randomUUID').mockReturnValue('request-key');
    expect(createIdempotencyKey()).toBe('request-key');
    randomUUID.mockRestore();
  });
});
