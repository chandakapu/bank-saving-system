import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { customerApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Modal, ConfirmDialog, EmptyState, ErrorState } from './UI';
import { formatDate, getPageData } from '../utils';

const Customers = forwardRef(({ showToast }, ref) => {
  const { data: response, loading, error, reload } = useApi(() => customerApi.getAll());
  const customers = getPageData(response);
  const [modal, setModal] = useState({ show: false, mode: 'add', customer: null });
  const [confirm, setConfirm] = useState({ show: false, id: null, name: '' });
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const savingRef = useRef(false);
  const deletingRef = useRef(false);

  const openAdd = () => { setFormName(''); setModal({ show: true, mode: 'add', customer: null }); };
  const openEdit = (c) => { setFormName(c.name); setModal({ show: true, mode: 'edit', customer: c }); };
  const closeModal = () => setModal({ show: false, mode: 'add', customer: null });

  useImperativeHandle(ref, () => ({
    openAdd: () => openAdd()
  }));

  const handleSave = async () => {
    if (savingRef.current) return;
    if (!formName.trim()) { showToast('Name is required', 'error'); return; }
    savingRef.current = true;
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
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await customerApi.delete(confirm.id);
      showToast('Customer deleted');
      setConfirm({ show: false, id: null, name: '' });
      reload();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  return (
    <>
      {customers.length === 0 ? (
        <EmptyState icon="users-plus" title="No customers yet" subtitle="Add your first customer to get started" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {customers.map((c) => (
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
          <label htmlFor="customer-name">Full name</label>
          <input
            id="customer-name"
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Budi Santoso"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
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
