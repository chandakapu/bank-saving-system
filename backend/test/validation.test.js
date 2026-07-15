const test = require('node:test');
const assert = require('node:assert/strict');
const { positiveInteger, money, date, pagination } = require('../src/lib/validation');

test('money accepts cents exactly and rejects malformed or sub-cent values', () => {
  assert.equal(money('12.3'), '12.30');
  assert.equal(money(12.34), '12.34');
  for (const value of ['1.001', '1x', '-1', '0', '01.00', '', null]) {
    assert.throws(() => money(value));
  }
});

test('IDs, dates, and pagination are strict and bounded', () => {
  assert.equal(positiveInteger('42'), 42);
  assert.throws(() => positiveInteger('1x'));
  assert.throws(() => date('2026-02-30'));
  assert.deepEqual(pagination({ page: '2', limit: '25' }), { page: 2, limit: 25, offset: 25 });
  assert.throws(() => pagination({ limit: '101' }));
});
