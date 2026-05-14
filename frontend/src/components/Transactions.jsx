import { useState, useEffect } from 'react';
import { accountApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { EmptyState, Badge, formatMoney, formatDate } from './UI';

export default function Transactions() {
  const { data: accounts } = useApi(() => accountApi.getAll());
  const [selectedAccount, setSelectedAccount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedAccount || !accounts) {
      // Load all transactions from all accounts
      if (accounts && accounts.length > 0) {
        loadAllTransactions();
      }
      return;
    }
    loadTransactions(selectedAccount);
  }, [selectedAccount, accounts]);

  const loadAllTransactions = async () => {
    setLoading(true);
    try {
      const allTx = [];
      for (const a of accounts) {
        const txList = await accountApi.getTransactions(a.id);
        txList.forEach((tx) => { tx._accountId = a.id; tx._account = a; });
        allTx.push(...txList);
      }
      allTx.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setTransactions(allTx);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (accId) => {
    setLoading(true);
    try {
      const txList = await accountApi.getTransactions(accId);
      const acc = accounts?.find((a) => a.id === parseInt(accId));
      txList.forEach((tx) => { tx._accountId = accId; tx._account = acc; });
      setTransactions(txList);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="empty-state"><p>Loading transactions...</p></div>;

  return (
    <>
      <div className="filter-row">
        <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
          <option value="">All accounts</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.id}>
              #{a.id} — {a.customer?.name} ({a.deposito_type?.name?.replace('Deposito ', '')})
            </option>
          ))}
        </select>
      </div>

      {transactions.length === 0 ? (
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
              {transactions.map((tx) => (
                <tr key={`${tx._accountId}-${tx.id}`}>
                  <td>{tx.id}</td>
                  <td>#{tx._accountId}</td>
                  <td>
                    <Badge type={tx.type}>{tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</Badge>
                  </td>
                  <td className="money">{formatMoney(tx.amount)}</td>
                  <td className="money">
                    {tx.ending_balance ? formatMoney(tx.ending_balance) : '—'}
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
