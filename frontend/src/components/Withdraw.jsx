import { useState } from 'react';
import { accountApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { formatMoney } from '../utils';

export default function Withdraw({ showToast }) {
  const { data: accounts, reload: reloadAccounts } = useApi(() => accountApi.getAll());
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Filter to only accounts with balance > 0
  const withdrawable = accounts?.filter((a) => parseFloat(a.balance) > 0) || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountId) { showToast('Please select an account', 'error'); return; }
    if (!date) { showToast('Date is required', 'error'); return; }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await accountApi.withdraw(accountId, { transaction_date: date });
      setResult(res);
      showToast('Withdrawal complete!');
      reloadAccounts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <form className="form-card" onSubmit={handleSubmit} style={{ maxWidth: 460 }}>
        <h3><i className="ti ti-arrow-up-circle"></i> Withdraw from Account</h3>
        <div className="field">
          <label htmlFor="withdraw-account">Account</label>
          <select id="withdraw-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select account...</option>
            {withdrawable.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} — {a.customer?.name} ({a.deposito_type?.name?.replace('Deposito ', '')}, Rp {formatMoney(a.balance)})
              </option>
            ))}
          </select>
          {accounts?.length > 0 && withdrawable.length === 0 && (
            <p style={{ fontSize: 12, color: '#9b9a94', marginTop: 6 }}>
              No accounts with balance &gt; 0 available for withdrawal.
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="withdraw-date">Withdrawal Date</label>
          <input id="withdraw-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
          <div className="result-row"><span>Monthly Return</span><span>{(parseFloat(result.monthly_return) * 100).toFixed(4)}%</span></div>
          <div className="result-row"><span>Interest Earned</span><span className="highlight">Rp {formatMoney(result.interest_earned)}</span></div>
          <div className="result-row"><span>Ending Balance</span><span className="highlight">Rp {formatMoney(result.ending_balance)}</span></div>
        </div>
      )}
    </div>
  );
}
