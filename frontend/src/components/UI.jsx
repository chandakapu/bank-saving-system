import { useEffect, useEffectEvent, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export function Toast({ toast }) {
  return (
    <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'} aria-live={toast.type === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
      {toast.message}
    </div>
  );
}

export function Modal({ show, title, onClose, children, footer, descriptionId }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const handleClose = useEffectEvent(onClose);

  useEffect(() => {
    if (!show) return undefined;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const appRoot = document.getElementById('root');
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden');
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute('aria-hidden', 'true');
    }
    const focusable = () => [...dialog.querySelectorAll('input:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    (dialog.querySelector('.modal-body input:not([disabled]), .modal-body select:not([disabled]), .modal-body button:not([disabled])') || focusable()[0])?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose();
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (appRoot) {
        appRoot.inert = false;
        if (previousAriaHidden === null) appRoot.removeAttribute('aria-hidden');
        else appRoot.setAttribute('aria-hidden', previousAriaHidden);
      }
      previousFocus?.focus();
    };
  }, [show]);

  if (!show) return null;
  return createPortal(
    <div className="modal-overlay show" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <div className="modal-header">
          <h3 id={titleId}>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close dialog">
            <i className="ti ti-x"></i>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ show, title, message, onCancel, onConfirm, loading }) {
  const descriptionId = useId();
  if (!show) return null;
  return (
    <Modal show title={title || 'Confirm'} descriptionId={descriptionId} onClose={onCancel} footer={<><button className="btn" onClick={onCancel} disabled={loading}>Cancel</button><button className={`btn btn-danger ${loading ? 'loading' : ''}`} onClick={onConfirm} disabled={loading}>Delete</button></>}>
      <p id={descriptionId}>{message}</p>
    </Modal>
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

export function ErrorState({ message, onRetry, title = 'Unable to load data' }) {
  return (
    <div className="empty-state error-state" role="alert">
      <i className="ti ti-alert-circle"></i>
      <p>{title}</p>
      <span>{message}</span>
      {onRetry && <button className="btn" onClick={onRetry}>Retry</button>}
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
