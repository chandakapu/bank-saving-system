import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { authApi } from '../services/api';
import Login from './Login';

describe('admin login', () => {
  it('labels its fields and prevents duplicate Enter submissions', async () => {
    let resolveLogin;
    const login = vi.spyOn(authApi, 'login').mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));
    const authenticated = vi.fn();
    const user = userEvent.setup();
    render(<Login onAuthenticated={authenticated} />);

    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'secret{Enter}{Enter}');
    expect(login).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();

    resolveLogin({ user: { name: 'Admin' } });
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(authenticated).toHaveBeenCalledOnce();
  });

  it('shows authentication failures instead of leaving a false loading state', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(new Error('Invalid credentials'));
    const user = userEvent.setup();
    render(<Login onAuthenticated={vi.fn()} />);
    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'wrong{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });
});
