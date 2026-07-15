import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState, Modal, Toast } from './UI';

describe('shared UI', () => {
  it('does not render hidden dialogs and closes an open dialog with Escape', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal show={false} title="Edit" onClose={onClose}><input aria-label="Name" /></Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<Modal show title="Edit" onClose={onClose}><input aria-label="Name" /></Modal>);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Name')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('exposes load errors and a retry control', () => {
    const retry = vi.fn();
    render(<ErrorState message="Network unavailable" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('announces toast updates', () => {
    render(<Toast toast={{ show: true, type: 'error', message: 'Failed' }} />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });
});
