const test = require('node:test');
const assert = require('node:assert/strict');

const enabled = process.env.TEST_DATABASE === '1';

test('authenticated financial flow is atomic, validated, snapshotted, and idempotent', { skip: !enabled }, async (t) => {
  for (const name of ['HOST', 'PORT', 'USER', 'PASSWORD', 'NAME']) {
    if (process.env[`TEST_DB_${name}`] !== undefined) process.env[`DB_${name}`] = process.env[`TEST_DB_${name}`];
  }
  const suffix = `${process.pid}_${Date.now()}`;
  process.env.ADMIN_USERNAME = `integration_${suffix}`;
  process.env.ADMIN_PASSWORD = `strong-test-password-${suffix}`;
  process.env.COOKIE_SECURE = 'false';
  process.env.CORS_ORIGINS = 'http://integration.test';

  const app = require('../src/app');
  const { pool } = require('../src/config/database');
  const { bootstrapAdmin } = require('../src/controllers/auth.controller');
  await bootstrapAdmin();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  let cookie;
  let customerId;
  let accountId;
  let boundaryAccountId;
  let typeId;

  async function request(path, options = {}) {
    const headers = { origin: 'http://integration.test', 'content-type': 'application/json', ...options.headers };
    if (cookie) headers.cookie = cookie;
    return fetch(`${base}${path}`, { ...options, headers });
  }

  t.after(async () => {
    for (const id of [accountId, boundaryAccountId].filter(Boolean)) {
      await pool.query('DELETE FROM idempotency_keys WHERE account_id = ?', [id]);
      await pool.query('DELETE FROM transactions WHERE account_id = ?', [id]);
      await pool.query('DELETE FROM accounts WHERE id = ?', [id]);
    }
    if (customerId) await pool.query('DELETE FROM customers WHERE id = ?', [customerId]);
    if (typeId) await pool.query('DELETE FROM deposito_types WHERE id = ?', [typeId]);
    await pool.query('DELETE FROM admins WHERE username = ?', [process.env.ADMIN_USERNAME]);
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  assert.equal((await request('/customers')).status, 401);
  const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }) });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie').split(';', 1)[0];
  assert.match(cookie, /^admin_session=/);

  const malformed = await request('/customers', { method: 'POST', body: '{' });
  assert.equal(malformed.status, 400);
  const customer = await request('/customers', { method: 'POST', body: JSON.stringify({ name: `Test ${suffix}` }) });
  customerId = (await customer.json()).id;
  const typeResponse = await request('/deposito-types', { method: 'POST', body: JSON.stringify({ name: `Type ${suffix}`, yearly_return: '0.0500' }) });
  const type = await typeResponse.json();
  typeId = type.id;
  const account = await request('/accounts', { method: 'POST', body: JSON.stringify({ customer_id: customerId, deposito_type_id: typeId }) });
  const accountBody = await account.json();
  accountId = accountBody.id;
  assert.equal(accountBody.deposito_type.yearly_return, type.yearly_return);

  const today = new Date().toISOString().slice(0, 10);
  const depositBody = JSON.stringify({ amount: '100.00', transaction_date: today });
  const first = await request(`/accounts/${accountId}/deposit`, { method: 'POST', headers: { 'Idempotency-Key': `deposit-${suffix}` }, body: depositBody });
  assert.equal(first.status, 201);
  const firstBody = await first.json();
  const replay = await request(`/accounts/${accountId}/deposit`, { method: 'POST', headers: { 'Idempotency-Key': `deposit-${suffix}` }, body: depositBody });
  assert.deepEqual(await replay.json(), firstBody);
  const conflict = await request(`/accounts/${accountId}/deposit`, { method: 'POST', headers: { 'Idempotency-Key': `deposit-${suffix}` }, body: JSON.stringify({ amount: '1.00', transaction_date: today }) });
  assert.equal(conflict.status, 409);
  const concurrent = await Promise.all([
    request(`/accounts/${accountId}/deposit`, { method: 'POST', headers: { 'Idempotency-Key': `concurrent-a-${suffix}` }, body: JSON.stringify({ amount: '1.00', transaction_date: today }) }),
    request(`/accounts/${accountId}/deposit`, { method: 'POST', headers: { 'Idempotency-Key': `concurrent-b-${suffix}` }, body: JSON.stringify({ amount: '2.00', transaction_date: today }) }),
  ]);
  assert.deepEqual(concurrent.map((response) => response.status), [201, 201]);
  const overflow = await request(`/accounts/${accountId}/deposit`, { method: 'POST', headers: { 'Idempotency-Key': `overflow-${suffix}` }, body: JSON.stringify({ amount: '9999999999999.99', transaction_date: today }) });
  assert.equal(overflow.status, 400);
  const afterConcurrency = await request(`/accounts/${accountId}`);
  assert.equal((await afterConcurrency.json()).balance, '103.00');

  await request(`/deposito-types/${typeId}`, { method: 'PUT', body: JSON.stringify({ yearly_return: '0.0900' }) });
  const snapshotted = await request(`/accounts/${accountId}`);
  assert.equal((await snapshotted.json()).deposito_type.yearly_return, '0.0500');
  const typeChange = await request(`/accounts/${accountId}`, { method: 'PUT', body: JSON.stringify({ deposito_type_id: typeId }) });
  assert.equal(typeChange.status, 409);

  const withdrawal = await request(`/accounts/${accountId}/withdraw`, { method: 'POST', headers: { 'Idempotency-Key': `withdraw-${suffix}` }, body: JSON.stringify({ transaction_date: today }) });
  assert.equal(withdrawal.status, 201);
  assert.equal((await withdrawal.json()).ending_balance, '103.00');
  const ledger = await request(`/accounts/${accountId}/transactions`);
  assert.equal((await ledger.json()).pagination.total, 4);

  const boundaryAccount = await request('/accounts', { method: 'POST', body: JSON.stringify({ customer_id: customerId, deposito_type_id: typeId }) });
  boundaryAccountId = (await boundaryAccount.json()).id;
  await request(`/accounts/${boundaryAccountId}/deposit`, {
    method: 'POST', headers: { 'Idempotency-Key': `boundary-deposit-${suffix}` },
    body: JSON.stringify({ amount: '100.00', transaction_date: '2024-01-31' }),
  });
  const boundaryWithdrawal = await request(`/accounts/${boundaryAccountId}/withdraw`, {
    method: 'POST', headers: { 'Idempotency-Key': `boundary-withdraw-${suffix}` },
    body: JSON.stringify({ transaction_date: '2024-02-29' }),
  });
  const boundaryBody = await boundaryWithdrawal.json();
  assert.equal(boundaryBody.months_held, 0);
  assert.equal(boundaryBody.interest_earned, '0.00');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const failedLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: `${process.env.ADMIN_USERNAME}-${attempt}`, password: 'wrong-password' }),
    });
    assert.equal(failedLogin.status, 401);
  }
  const throttled = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: process.env.ADMIN_USERNAME.toUpperCase(), password: process.env.ADMIN_PASSWORD }),
  });
  assert.equal(throttled.status, 429);
  assert.ok(Number(throttled.headers.get('retry-after')) > 0);
});
