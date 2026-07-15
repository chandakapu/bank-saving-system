import { useEffect, useState, useRef } from 'react';
import { ErrorState, Toast } from './components/UI';
import { useToast } from './hooks/useToast';
import { useApi } from './hooks/useApi';
import { AUTH_REQUIRED_EVENT, authApi, healthApi } from './services/api';
import logo from './assets/logo.png';
import Customers from './components/Customers';
import DepositoTypes from './components/DepositoTypes';
import Accounts from './components/Accounts';
import Deposit from './components/Deposit';
import Withdraw from './components/Withdraw';
import Transactions from './components/Transactions';
import Login from './components/Login';

const SCREENS = {
  customers:    { title: 'Customers',      icon: 'ti-users',             action: 'Add customer' },
  deposito:     { title: 'Deposito Types', icon: 'ti-certificate',       action: 'Add deposito type' },
  accounts:     { title: 'Accounts',       icon: 'ti-wallet',            action: 'Open account' },
  deposit:      { title: 'Deposit',        icon: 'ti-arrow-down-circle', action: null },
  withdraw:     { title: 'Withdraw',       icon: 'ti-arrow-up-circle',   action: null },
  transactions: { title: 'Transactions',   icon: 'ti-list-details',      action: null },
};

export default function App() {
  const [active, setActive] = useState('customers');
  const { toast, showToast } = useToast();
  const actionRef = useRef(null);
  const { data: session, loading: sessionLoading, error: sessionError, reload: reloadSession, setData: setSession } = useApi(authApi.getSession);
  const [health, setHealth] = useState('checking');

  useEffect(() => {
    let activeRequest = true;
    const checkHealth = async () => {
      try {
        await healthApi.get();
        if (activeRequest) setHealth('connected');
      } catch {
        if (activeRequest) setHealth('disconnected');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => { activeRequest = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const requireLogin = () => setSession(null);
    window.addEventListener(AUTH_REQUIRED_EVENT, requireLogin);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, requireLogin);
  }, [setSession]);

  const screen = SCREENS[active];

  // Each CRUD screen exposes a topAction trigger via ref
  const handleTopAction = () => {
    if (actionRef.current && actionRef.current.openAdd) {
      actionRef.current.openAdd();
    }
  };

  const renderScreen = () => {
    switch (active) {
      case 'customers':    return <Customers showToast={showToast} ref={actionRef} />;
      case 'deposito':     return <DepositoTypes showToast={showToast} ref={actionRef} />;
      case 'accounts':     return <Accounts showToast={showToast} ref={actionRef} />;
      case 'deposit':      return <Deposit showToast={showToast} />;
      case 'withdraw':     return <Withdraw showToast={showToast} />;
      case 'transactions': return <Transactions />;
      default: return null;
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setSession(null);
    } catch (error) {
      showToast(`Sign out failed: ${error.message}`, 'error');
    }
  };

  if (sessionLoading) return <main className="login-page"><div className="empty-state"><p>Checking session...</p></div></main>;
  if (sessionError?.status === 401) return <Login onAuthenticated={setSession} />;
  if (sessionError) return <main className="login-page"><ErrorState title="Unable to verify your session" message={sessionError.message} onRetry={reloadSession} /></main>;
  if (!session) return <Login onAuthenticated={setSession} />;

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="BankSave Logo" className="brand-logo" />
        </div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          <div className="nav-section-label">Management</div>
          {['customers', 'deposito', 'accounts'].map((key) => (
            <button
              key={key}
              className={`nav-item ${active === key ? 'active' : ''}`}
              onClick={() => setActive(key)}
              aria-label={SCREENS[key].title}
              aria-current={active === key ? 'page' : undefined}
            >
              <i className={`ti ${SCREENS[key].icon}`} aria-hidden="true"></i>
              <span>{SCREENS[key].title}</span>
            </button>
          ))}
          <div className="nav-section-label">Operations</div>
          {['deposit', 'withdraw', 'transactions'].map((key) => (
            <button
              key={key}
              className={`nav-item ${active === key ? 'active' : ''}`}
              onClick={() => setActive(key)}
              aria-label={SCREENS[key].title}
              aria-current={active === key ? 'page' : undefined}
            >
              <i className={`ti ${SCREENS[key].icon}`} aria-hidden="true"></i>
              <span>{SCREENS[key].title}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer" title={`API ${health}`}>
          <div className={`status-dot ${health}`} aria-hidden="true"></div>
          <span>API {health === 'checking' ? 'Checking' : health === 'connected' ? 'Connected' : 'Unavailable'}</span>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">{screen.title}</h1>
          </div>
          <div className="topbar-actions">
            {screen.action && (
              <button className="btn btn-primary" onClick={handleTopAction}>
                <i className="ti ti-plus" aria-hidden="true"></i>
                <span>{screen.action}</span>
              </button>
            )}
            <button className="btn logout-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </header>
        <div className="content">
          {renderScreen()}
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  );
}
