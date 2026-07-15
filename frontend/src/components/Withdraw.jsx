import { useRef, useState } from 'react';
import { accountApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { createIdempotencyKey, formatMoney, getLocalDateValue, getPageData } from '../utils';
import { ErrorState } from './UI';

export default function Withdraw({ showToast }) {
  const { data: response, loading, error, reload: reloadAccounts } = useApi(() => accountApi.getAll());
  const accounts = getPageData(response);
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(getLocalDateValue);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef(null);

  // Filter to only accounts with balance > 0
  const withdrawable = accounts.filter((a) => parseFloat(a.balance) > 0);
  const validAccountId = withdrawable.some((account) => String(account.id) === String(accountId)) ? accountId : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!validAccountId) { showToast('Please select an account', 'error'); return; }
    if (!date) { showToast('Date is required', 'error'); return; }

    submittingRef.current = true;
    setSubmitting(true);
    setResult(null);
    try {
      idempotencyKeyRef.current ||= createIdempotencyKey();
      const res = await accountApi.withdraw(validAccountId, { transaction_date: date }, idempotencyKeyRef.current);
      setResult(res);
      showToast('Withdrawal complete!');
      idempotencyKeyRef.current = null;
      reloadAccounts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) return <div className="empty-state"><p>Loading accounts...</p></div>;
  if (error) return <ErrorState message={error.message} onRetry={reloadAccounts} />;

  return (
    <div>
      <form className="form-card" onSubmit={handleSubmit} style={{ maxWidth: 460 }}>
        <h3><i className="ti ti-arrow-up-circle"></i> Withdraw from Account</h3>
        <div className="field">
          <label htmlFor="withdraw-account">Account</label>
          <select id="withdraw-account" value={validAccountId} onChange={(e) => { setAccountId(e.target.value); setResult(null); idempotencyKeyRef.current = null; }}>
            <option value="">Select account...</option>
            {withdrawable.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} — {a.customer?.name} ({a.deposito_type?.name?.replace('Deposito ', '')}, Rp {formatMoney(a.balance)})
              </option>
            ))}
          </select>
          {accounts.length > 0 && withdrawable.length === 0 && (
            <p style={{ fontSize: 12, color: '#9b9a94', marginTop: 6 }}>
              No accounts with balance &gt; 0 available for withdrawal.
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="withdraw-date">Withdrawal Date</label>
          <input id="withdraw-date" type="date" max={getLocalDateValue()} value={date} onChange={(e) => { setDate(e.target.value); idempotencyKeyRef.current = null; }} />
        </div>
        <div className="form-footer">
          <button
            type="submit"
            className={`btn btn-primary btn-full ${submitting ? 'loading' : ''}`}
            disabled={submitting || withdrawable.length === 0}
          >
            <i className="ti ti-calculator"></i> Calculate &amp; Withdraw
          </button>
        </div>
      </form>

      {result && (
        <div className="result-card" style={{ maxWidth: 460 }}>
          <h4><i className="ti ti-circle-check"></i> Withdrawal Complete</h4>
          <div className="result-row"><span>Starting Balance</span><span>Rp {formatMoney(result.starting_balance)}</span></div>
          <div className="result-row"><span>Months Held</span><span>{result.months_held}</span></div>
          <div className="result-row"><span>Monthly Return</span><span>{(parseFloat(result.yearly_return) * 100 / 12).toFixed(4)}%</span></div>
          <div className="result-row"><span>Interest Earned</span><span className="highlight">Rp {formatMoney(result.interest_earned)}</span></div>
          <div className="result-row"><span>Ending Balance</span><span className="highlight">Rp {formatMoney(result.ending_balance)}</span></div>
        </div>
      )}
    </div>
  );
}
