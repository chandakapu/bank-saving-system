export function Toast({ toast }) {
  return (
    <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>
      {toast.message}
    </div>
  );
}

export function Modal({ show, title, onClose, children, footer }) {
  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="ti ti-x"></i>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ show, title, message, onCancel, onConfirm, loading }) {
  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>{title || 'Confirm'}</h3></div>
        <div className="modal-body"><p>{message}</p></div>
        <div className="modal-footer">
          <button className="btn" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={`btn btn-danger ${loading ? 'loading' : ''}`} onClick={onConfirm} disabled={loading}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="empty-state">
      <i className={`ti ti-${icon}`}></i>
      <p>{title}</p>
      <span>{subtitle}</span>
    </div>
  );
}

export function Badge({ type, children }) {
  const classMap = {
    gold: 'badge-gold',
    silver: 'badge-silver',
    bronze: 'badge-bronze',
    deposit: 'badge-deposit',
    withdrawal: 'badge-withdraw',
  };
  return <span className={`badge ${classMap[type] || ''}`}>{children}</span>;
}


