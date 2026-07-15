import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_REQUIRED_EVENT, accountApi, customerApi, request } from './api';

afterEach(() => vi.restoreAllMocks());

describe('API client', () => {
  it('uses same-origin API URLs and includes cookie credentials', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    await request('/health');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health', expect.objectContaining({ credentials: 'include' }));
  });

  it('sends idempotency keys for money operations', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await accountApi.deposit(4, { amount: 100 }, 'deposit-key');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/accounts/4/deposit', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': 'deposit-key' }),
    }));
  });

  it('loads every bounded collection page', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 1 }], pagination: { page: 1, limit: 100, total: 2, pages: 2 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 2 }], pagination: { page: 2, limit: 100, total: 2, pages: 2 } }), { status: 200 }));
    await expect(customerApi.getAll()).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('notifies the application when an authenticated request expires', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 }));
    const listener = vi.fn();
    window.addEventListener(AUTH_REQUIRED_EVENT, listener, { once: true });
    await expect(request('/accounts')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledOnce();
  });
});
