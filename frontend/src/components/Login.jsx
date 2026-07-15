import { useRef, useState } from 'react';
import logo from '../assets/logo.png';
import { authApi } from '../services/api';

export default function Login({ onAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const session = await authApi.login({ username: username.trim(), password });
      onAuthenticated(session);
    } catch (err) {
      setError(err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit} aria-labelledby="login-title">
        <img src={logo} alt="BankSave" className="login-logo" />
        <h1 id="login-title">Admin sign in</h1>
        <p>Use your administrator account to continue.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="login-username">Username</label>
          <input id="login-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <button type="submit" className={`btn btn-primary btn-full ${submitting ? 'loading' : ''}`} disabled={submitting}>Sign in</button>
      </form>
    </main>
  );
}
