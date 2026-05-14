export function formatMoney(value) {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('id-ID');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

export function getDepositoBadgeType(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('gold')) return 'gold';
  if (lower.includes('silver')) return 'silver';
  if (lower.includes('bronze')) return 'bronze';
  return 'silver';
}
