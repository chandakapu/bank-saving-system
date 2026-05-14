import { useState, forwardRef, useImperativeHandle } from 'react';
import { customerApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Modal, ConfirmDialog, EmptyState } from './UI';
import { formatDate } from '../utils';

const Customers = forwardRef(({ showToast }, ref) => {
  const { data: customers, loading, reload } = useApi(() => customerApi.getAll());
  const [modal, setModal] = useState({ show: false, mode: 'add', customer: null });
  const [confirm, setConfirm] = useState({ show: false, id: null, name: '' });
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => { setFormName(''); setModal({ show: true, mode: 'add', customer: null }); };
  const openEdit = (c) => { setFormName(c.name); setModal({ show: true, mode: 'edit', customer: c }); };
  const closeModal = () => setModal({ show: false, mode: 'add', customer: null });

  useImperativeHandle(ref, () => ({
    openAdd: () => openAdd()
  }));

  const handleSave = async () => {
    if (!formName.trim()) { showToast('Name is required', 'error'); return; }
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        await customerApi.create(formName.trim());
        showToast('Customer created');
      } else {
        await customerApi.update(modal.customer.id, formName.trim());
        showToast('Customer updated');
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
      await customerApi.delete(confirm.id);
      showToast('Customer deleted');
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
      {customers?.length === 0 ? (
        <EmptyState icon="users-plus" title="No customers yet" subtitle="Add your first customer to get started" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {customers?.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td>{formatDate(c.created_at)}</td>
                  <td>
                    <div className="actions">
                      <button className="icon-btn" onClick={() => openEdit(c)} title="Edit">
                        <i className="ti ti-edit"></i>
                      </button>
                      <button className="icon-btn danger" onClick={() => setConfirm({ show: true, id: c.id, name: c.name })} title="Delete">
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
        title={modal.mode === 'add' ? 'Add Customer' : 'Edit Customer'}
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
          <label>Full name</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Budi Santoso"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>
      </Modal>

      <ConfirmDialog
        show={confirm.show}
        title="Delete Customer"
        message={`Are you sure you want to delete "${confirm.name}"?`}
        onCancel={() => setConfirm({ show: false, id: null, name: '' })}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
});

// Expose action config for the topbar button
Customers.topAction = { label: 'Add customer', key: 'add-customer' };

export default Customers;
