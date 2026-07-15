import { useState, useEffect } from 'react';
import { accountApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { EmptyState, Badge, ErrorState } from './UI';
import { formatMoney, formatDate, getPageData } from '../utils';

export default function Transactions() {
  const { data: accountResponse, loading: accountsLoading, error: accountsError, reload: reloadAccounts } = useApi(() => accountApi.getAll());
  const accounts = getPageData(accountResponse);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const validSelectedAccount = accounts.some((account) => String(account.id) === String(selectedAccount)) ? selectedAccount : '';
  const visibleTransactions = accounts.length ? transactions : [];

  useEffect(() => {
    let active = true;
    const loadAllTransactions = async () => {
      setLoading(true);
      setError('');
      const results = [];
      for (let index = 0; index < accounts.length; index += 5) {
        const batch = await Promise.allSettled(accounts.slice(index, index + 5).map((account) => accountApi.getTransactions(account.id)));
        results.push(...batch);
      }
      if (!active) return;
      const allTx = [];
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const account = accounts[index];
        getPageData(result.value).forEach((tx) => allTx.push({ ...tx, _accountId: account.id, _account: account }));
      });
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length) setError(`Could not load transactions for ${failed.length} account${failed.length === 1 ? '' : 's'}. Other results are shown.`);
      allTx.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setTransactions(allTx);
      setLoading(false);
    };

    const loadTransactions = async (accId) => {
      setLoading(true);
      setError('');
      setTransactions([]);
      try {
        const txList = getPageData(await accountApi.getTransactions(accId));
        if (!active) return;
        const acc = accounts?.find((a) => a.id === parseInt(accId));
        setTransactions(txList.map((tx) => ({ ...tx, _accountId: accId, _account: acc })));
      } catch (requestError) {
        if (active) { setTransactions([]); setError(requestError.message); }
      } finally {
        if (active) setLoading(false);
      }
    };

    const clearTransactions = async () => {
      await Promise.resolve();
      if (active) { setTransactions([]); setLoading(false); }
    };

    if (!validSelectedAccount) {
      // Load all transactions from all accounts
      if (accounts && accounts.length > 0) {
        loadAllTransactions();
      }
      else clearTransactions();
      return () => { active = false; };
    }
    loadTransactions(validSelectedAccount);
    return () => { active = false; };
  }, [validSelectedAccount, accounts, reloadKey]);

  if (accountsLoading) return <div className="empty-state"><p>Loading accounts...</p></div>;
  if (accountsError) return <ErrorState message={accountsError.message} onRetry={reloadAccounts} />;

  return (
    <>
      <div className="filter-row">
        <label className="sr-only" htmlFor="transaction-account">Filter by account</label>
        <select id="transaction-account" value={validSelectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              #{a.id} — {a.customer?.name} ({a.deposito_type?.name?.replace('Deposito ', '')})
            </option>
          ))}
        </select>
      </div>

      {error && <div className="inline-error" role="alert"><span>{error}</span><button className="btn" onClick={() => setReloadKey((key) => key + 1)}>Retry</button></div>}
      {loading && <p className="loading-note" role="status">Loading transactions...</p>}

      {!loading && visibleTransactions.length === 0 && !error ? (
        <EmptyState icon="receipt-off" title="No transactions" subtitle="Make a deposit to see transactions here" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Account</th>
                <th>Type</th>
                <th>Amount (Rp)</th>
                <th>Ending Balance</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((tx) => (
                <tr key={`${tx._accountId}-${tx.id}`}>
                  <td>{tx.id}</td>
                  <td>#{tx._accountId}</td>
                  <td>
                    <Badge type={tx.type}>{tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</Badge>
                  </td>
                  <td className="money">{formatMoney(tx.amount)}</td>
                  <td className="money">
                    {tx.ending_balance != null ? formatMoney(tx.ending_balance) : '—'}
                  </td>
                  <td>{formatDate(tx.transaction_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
