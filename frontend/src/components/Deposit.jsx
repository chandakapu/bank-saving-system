import { useRef, useState } from 'react';
import { accountApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { createIdempotencyKey, formatMoney, getLocalDateValue, getPageData } from '../utils';
import { ErrorState } from './UI';

export default function Deposit({ showToast }) {
  const { data: response, loading, error, reload: reloadAccounts } = useApi(() => accountApi.getAll());
  const accounts = getPageData(response);
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateValue);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef(null);
  const validAccountId = accounts.some((account) => String(account.id) === String(accountId)) ? accountId : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!validAccountId) { showToast('Please select an account', 'error'); return; }
    if (!amount || parseFloat(amount) <= 0) { showToast('Amount must be greater than 0', 'error'); return; }
    if (!date) { showToast('Date is required', 'error'); return; }

    submittingRef.current = true;
    setSubmitting(true);
    setResult(null);
    try {
      idempotencyKeyRef.current ||= createIdempotencyKey();
      const res = await accountApi.deposit(validAccountId, {
        amount,
        transaction_date: date,
      }, idempotencyKeyRef.current);
      setResult(res);
      showToast('Deposit successful!');
      setAmount('');
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
      <form className="form-card" onSubmit={handleSubmit}>
        <h3><i className="ti ti-arrow-down-circle"></i> Deposit to Account</h3>
        <div className="field">
          <label htmlFor="deposit-account">Account</label>
          <select id="deposit-account" value={validAccountId} onChange={(e) => { setAccountId(e.target.value); setResult(null); idempotencyKeyRef.current = null; }}>
            <option value="">Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} — {a.customer?.name} ({a.deposito_type?.name?.replace('Deposito ', '')}, Rp {formatMoney(a.balance)})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="deposit-amount">Amount (Rp)</label>
          <input
            id="deposit-amount"
            type="number"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); idempotencyKeyRef.current = null; }}
            placeholder="e.g. 5000000"
            min="0.01"
            step="0.01"
          />
        </div>
        <div className="field">
          <label htmlFor="deposit-date">Deposit Date</label>
          <input id="deposit-date" type="date" max={getLocalDateValue()} value={date} onChange={(e) => { setDate(e.target.value); idempotencyKeyRef.current = null; }} />
        </div>
        <div className="form-footer">
          <button type="submit" className={`btn btn-primary btn-full ${submitting ? 'loading' : ''}`} disabled={submitting}>
            <i className="ti ti-check"></i> Confirm Deposit
          </button>
        </div>
      </form>

      {result && (
        <div className="result-card">
          <h4><i className="ti ti-circle-check"></i> Deposit Confirmed</h4>
          <div className="result-row"><span>Transaction ID</span><span>#{result.transaction_id}</span></div>
          <div className="result-row"><span>Amount</span><span>Rp {formatMoney(result.amount)}</span></div>
          <div className="result-row"><span>Date</span><span>{result.transaction_date}</span></div>
          <div className="result-row"><span>New Balance</span><span className="highlight">Rp {formatMoney(result.new_balance)}</span></div>
        </div>
      )}
    </div>
  );
}
