import { useState, forwardRef, useImperativeHandle } from 'react';
import { depositoApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Modal, ConfirmDialog, EmptyState, Badge } from './UI';
import { getDepositoBadgeType } from '../utils';

const DepositoTypes = forwardRef(({ showToast }, ref) => {
  const { data: types, loading, reload } = useApi(() => depositoApi.getAll());
  const [modal, setModal] = useState({ show: false, mode: 'add', item: null });
  const [confirm, setConfirm] = useState({ show: false, id: null, name: '' });
  const [formName, setFormName] = useState('');
  const [formRate, setFormRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setFormName(''); setFormRate('');
    setModal({ show: true, mode: 'add', item: null });
  };
  const openEdit = (item) => {
    setFormName(item.name);
    setFormRate((parseFloat(item.yearly_return) * 100).toString());
    setModal({ show: true, mode: 'edit', item });
  };
  const closeModal = () => setModal({ show: false, mode: 'add', item: null });

  useImperativeHandle(ref, () => ({
    openAdd: () => openAdd()
  }));

  const handleSave = async () => {
    if (!formName.trim()) { showToast('Name is required', 'error'); return; }
    if (!formRate) { showToast('Yearly return is required', 'error'); return; }
    const rate = parseFloat(formRate) / 100;
    if (isNaN(rate) || rate <= 0 || rate >= 1) {
      showToast('Rate must be between 0% and 100%', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = { name: formName.trim(), yearly_return: rate };
      if (modal.mode === 'add') {
        await depositoApi.create(payload);
        showToast('Deposito type created');
      } else {
        await depositoApi.update(modal.item.id, payload);
        showToast('Deposito type updated');
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
      await depositoApi.delete(confirm.id);
      showToast('Deposito type deleted');
      setConfirm({ show: false, id: null, name: '' });
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
      {types?.length === 0 ? (
        <EmptyState icon="certificate-off" title="No deposito types" subtitle="Add a deposito type to start" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Yearly Return</th><th>Monthly Return</th><th></th></tr>
            </thead>
            <tbody>
              {types?.map((t) => {
                const yearly = parseFloat(t.yearly_return);
                const monthly = yearly / 12;
                return (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td><Badge type={getDepositoBadgeType(t.name)}>{t.name}</Badge></td>
                    <td>{(yearly * 100).toFixed(2)}%</td>
                    <td>{(monthly * 100).toFixed(2)}%</td>
                    <td>
                      <div className="actions">
                        <button className="icon-btn" onClick={() => openEdit(t)} title="Edit">
                          <i className="ti ti-edit"></i>
                        </button>
                        <button className="icon-btn danger" onClick={() => setConfirm({ show: true, id: t.id, name: t.name })} title="Delete">
                          <i className="ti ti-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        show={modal.show}
        title={modal.mode === 'add' ? 'Add Deposito Type' : 'Edit Deposito Type'}
        onClose={closeModal}
        footer={
          <>
            <button className="btn" onClick={closeModal}>Cancel</button>
            <button className={`btn btn-primary ${saving ? 'loading' : ''}`} onClick={handleSave} disabled={saving}>
              {modal.mode === 'add' ? 'Save' : 'Update'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Name</label>
          <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Deposito Platinum" autoFocus />
        </div>
        <div className="field">
          <label>Yearly return (%)</label>
          <input type="number" value={formRate} onChange={(e) => setFormRate(e.target.value)} placeholder="e.g. 9" step="0.01" min="0" max="99" />
        </div>
      </Modal>

      <ConfirmDialog
        show={confirm.show}
        title="Delete Deposito Type"
        message={`Are you sure you want to delete "${confirm.name}"?`}
        onCancel={() => setConfirm({ show: false, id: null, name: '' })}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
});

DepositoTypes.topAction = { label: 'Add deposito type', key: 'add-deposito' };

export default DepositoTypes;
