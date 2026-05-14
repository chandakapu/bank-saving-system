import { useState, forwardRef, useImperativeHandle } from 'react';
import { accountApi, customerApi, depositoApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Modal, ConfirmDialog, EmptyState, Badge } from './UI';
import { formatMoney, getDepositoBadgeType } from '../utils';

const Accounts = forwardRef(({ showToast }, ref) => {
  const { data: accounts, loading, reload } = useApi(() => accountApi.getAll());
  const { data: customers } = useApi(() => customerApi.getAll());
  const { data: depositoTypes } = useApi(() => depositoApi.getAll());
  const [modal, setModal] = useState({ show: false, mode: 'add', item: null });
  const [confirm, setConfirm] = useState({ show: false, id: null });
  const [formCustomer, setFormCustomer] = useState('');
  const [formDeposito, setFormDeposito] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setFormCustomer(customers?.[0]?.id || '');
    setFormDeposito(depositoTypes?.[0]?.id || '');
    setModal({ show: true, mode: 'add', item: null });
  };
  const openEdit = (item) => {
    setFormDeposito(item.deposito_type?.id || '');
    setModal({ show: true, mode: 'edit', item });
  };
  const closeModal = () => setModal({ show: false, mode: 'add', item: null });

  useImperativeHandle(ref, () => ({
    openAdd: () => openAdd()
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        if (!formCustomer || !formDeposito) { showToast('Please select customer and deposito type', 'error'); setSaving(false); return; }
        await accountApi.create({ customer_id: parseInt(formCustomer), deposito_type_id: parseInt(formDeposito) });
        showToast('Account opened');
      } else {
        await accountApi.update(modal.item.id, { deposito_type_id: parseInt(formDeposito) });
        showToast('Account updated');
      }
      closeModal();
      reload();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await accountApi.delete(confirm.id);
      showToast('Account deleted');
      setConfirm({ show: false, id: null });
      reload();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;

  return (
    <>
      {accounts?.length === 0 ? (
        <EmptyState icon="wallet-off" title="No accounts yet" subtitle="Open an account for a customer" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Customer</th><th>Deposito Type</th><th>Balance (Rp)</th><th></th></tr>
            </thead>
            <tbody>
              {accounts?.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.customer?.name}</td>
                  <td>
                    <Badge type={getDepositoBadgeType(a.deposito_type?.name)}>
                      {a.deposito_type?.name?.replace('Deposito ', '')}
                    </Badge>
                  </td>
                  <td className="money">{formatMoney(a.balance)}</td>
                  <td>
                    <div className="actions">
                      <button className="icon-btn" onClick={() => openEdit(a)} title="Change deposito type">
                        <i className="ti ti-edit"></i>
                      </button>
                      <button className="icon-btn danger" onClick={() => setConfirm({ show: true, id: a.id })} title="Delete">
                        <i className="ti ti-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        show={modal.show}
        title={modal.mode === 'add' ? 'Open Account' : 'Edit Account'}
        onClose={closeModal}
        footer={
          <>
            <button className="btn" onClick={closeModal}>Cancel</button>
            <button className={`btn btn-primary ${saving ? 'loading' : ''}`} onClick={handleSave} disabled={saving}>
              {modal.mode === 'add' ? 'Open Account' : 'Update'}
            </button>
          </>
        }
      >
        {modal.mode === 'add' && (
          <div className="field">
            <label>Customer</label>
            <select value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)}>
              <option value="">Select customer...</option>
              {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label>Deposito Type</label>
          <select value={formDeposito} onChange={(e) => setFormDeposito(e.target.value)}>
            <option value="">Select type...</option>
            {depositoTypes?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({(parseFloat(d.yearly_return) * 100).toFixed(0)}%)
              </option>
            ))}
          </select>
        </div>
      </Modal>

      <ConfirmDialog
        show={confirm.show}
        title="Delete Account"
        message="Are you sure you want to delete this account?"
        onCancel={() => setConfirm({ show: false, id: null })}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
});

Accounts.topAction = { label: 'Open account', key: 'open-account' };

export default Accounts;
