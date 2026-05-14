import { useState } from 'react';
import { accountApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { formatMoney } from '../utils';

export default function Deposit({ showToast }) {
  const { data: accounts, reload: reloadAccounts } = useApi(() => accountApi.getAll());
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountId) { showToast('Please select an account', 'error'); return; }
    if (!amount || parseFloat(amount) <= 0) { showToast('Amount must be greater than 0', 'error'); return; }
    if (!date) { showToast('Date is required', 'error'); return; }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await accountApi.deposit(accountId, {
        amount: parseFloat(amount),
        transaction_date: date,
      });
      setResult(res);
      showToast('Deposit successful!');
      setAmount('');
      reloadAccounts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <form className="form-card" onSubmit={handleSubmit}>
        <h3><i className="ti ti-arrow-down-circle"></i> Deposit to Account</h3>
        <div className="field">
          <label htmlFor="deposit-account">Account</label>
          <select id="deposit-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select account...</option>
            {accounts?.map((a) => (
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
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 5000000"
            min="1"
          />
        </div>
        <div className="field">
          <label htmlFor="deposit-date">Deposit Date</label>
          <input id="deposit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
