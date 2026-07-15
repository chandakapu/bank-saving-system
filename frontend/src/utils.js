export function formatMoney(value) {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('id-ID');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const localDate = String(dateStr).slice(0, 10);
  const [year, month, day] = localDate.split('-').map(Number);
  if (!year || !month || !day) return '—';
  return new Date(year, month - 1, day).toLocaleDateString('en-CA');
}

export function getLocalDateValue(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

const EMPTY_DATA = [];

export function getPageData(response) {
  return Array.isArray(response?.data) ? response.data : EMPTY_DATA;
}

export function createIdempotencyKey() {
  return crypto.randomUUID();
}

export function getDepositoBadgeType(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('gold')) return 'gold';
  if (lower.includes('silver')) return 'silver';
  if (lower.includes('bronze')) return 'bronze';
  return 'silver';
}
