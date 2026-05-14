const BASE = '/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

// --- Customers ---
export const customerApi = {
  getAll: () => request('/customers'),
  getById: (id) => request(`/customers/${id}`),
  create: (name) => request('/customers', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id, name) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  delete: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  getAccounts: (id) => request(`/customers/${id}/accounts`),
};

// --- Deposito Types ---
export const depositoApi = {
  getAll: () => request('/deposito-types'),
  getById: (id) => request(`/deposito-types/${id}`),
  create: (data) => request('/deposito-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/deposito-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/deposito-types/${id}`, { method: 'DELETE' }),
};

// --- Accounts ---
export const accountApi = {
  getAll: () => request('/accounts'),
  getById: (id) => request(`/accounts/${id}`),
  create: (data) => request('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/accounts/${id}`, { method: 'DELETE' }),
  deposit: (id, data) => request(`/accounts/${id}/deposit`, { method: 'POST', body: JSON.stringify(data) }),
  withdraw: (id, data) => request(`/accounts/${id}/withdraw`, { method: 'POST', body: JSON.stringify(data) }),
  getTransactions: (id) => request(`/accounts/${id}/transactions`),
};
