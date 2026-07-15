const BASE = '/api/v1';
export const AUTH_REQUIRED_EVENT = 'bank-save:auth-required';

export async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    if (res.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
    }
    throw err;
  }
  return data;
}

async function requestAll(path) {
  const data = [];
  let page = 1;
  let pagination;
  do {
    const separator = path.includes('?') ? '&' : '?';
    const response = await request(`${path}${separator}page=${page}&limit=100`);
    data.push(...response.data);
    pagination = response.pagination;
    page += 1;
  } while (page <= pagination.pages);
  return { data, pagination: { ...pagination, page: 1, limit: data.length || pagination.limit, pages: data.length ? 1 : 0 } };
}

export const authApi = {
  getSession: () => request('/auth/session'),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

export const healthApi = {
  get: () => request('/health'),
};

// --- Customers ---
export const customerApi = {
  getAll: () => requestAll('/customers'),
  getById: (id) => request(`/customers/${id}`),
  create: (name) => request('/customers', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id, name) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  delete: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  getAccounts: (id) => requestAll(`/customers/${id}/accounts`),
};

// --- Deposito Types ---
export const depositoApi = {
  getAll: () => requestAll('/deposito-types'),
  getById: (id) => request(`/deposito-types/${id}`),
  create: (data) => request('/deposito-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/deposito-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/deposito-types/${id}`, { method: 'DELETE' }),
};

// --- Accounts ---
export const accountApi = {
  getAll: () => requestAll('/accounts'),
  getById: (id) => request(`/accounts/${id}`),
  create: (data) => request('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/accounts/${id}`, { method: 'DELETE' }),
  deposit: (id, data, idempotencyKey) => request(`/accounts/${id}/deposit`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Idempotency-Key': idempotencyKey },
  }),
  withdraw: (id, data, idempotencyKey) => request(`/accounts/${id}/withdraw`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Idempotency-Key': idempotencyKey },
  }),
  getTransactions: (id) => requestAll(`/accounts/${id}/transactions`),
};
