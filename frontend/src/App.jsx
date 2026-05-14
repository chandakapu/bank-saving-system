import { useState, useRef } from 'react';
import { Toast } from './components/UI';
import { useToast } from './hooks/useToast';
import logo from './assets/logo.png';
import Customers from './components/Customers';
import DepositoTypes from './components/DepositoTypes';
import Accounts from './components/Accounts';
import Deposit from './components/Deposit';
import Withdraw from './components/Withdraw';
import Transactions from './components/Transactions';

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

  const screen = SCREENS[active];

  // Each CRUD screen exposes a topAction trigger via ref
  const handleTopAction = () => {
    if (actionRef.current) actionRef.current();
  };

  const renderScreen = () => {
    const props = { showToast, actionRef };
    switch (active) {
      case 'customers':    return <CustomersWrapper {...props} />;
      case 'deposito':     return <DepositoWrapper {...props} />;
      case 'accounts':     return <AccountsWrapper {...props} />;
      case 'deposit':      return <Deposit showToast={showToast} />;
      case 'withdraw':     return <Withdraw showToast={showToast} />;
      case 'transactions': return <Transactions />;
      default: return null;
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="BankSave Logo" className="brand-logo" />
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Management</div>
          {['customers', 'deposito', 'accounts'].map((key) => (
            <button
              key={key}
              className={`nav-item ${active === key ? 'active' : ''}`}
              onClick={() => setActive(key)}
            >
              <i className={`ti ${SCREENS[key].icon}`}></i>
              <span>{SCREENS[key].title}</span>
            </button>
          ))}
          <div className="nav-section-label">Operations</div>
          {['deposit', 'withdraw', 'transactions'].map((key) => (
            <button
              key={key}
              className={`nav-item ${active === key ? 'active' : ''}`}
              onClick={() => setActive(key)}
            >
              <i className={`ti ${SCREENS[key].icon}`}></i>
              <span>{SCREENS[key].title}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="status-dot"></div>
          <span>API Connected</span>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">{screen.title}</h1>
          </div>
          {screen.action && (
            <button className="btn btn-primary" onClick={handleTopAction}>
              <i className="ti ti-plus"></i>
              <span>{screen.action}</span>
            </button>
          )}
        </header>
        <div className="content">
          {renderScreen()}
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  );
}

// Wrapper components to wire up the topbar action button
function CustomersWrapper({ showToast, actionRef }) {
  const [triggerAdd, setTriggerAdd] = useState(0);
  actionRef.current = () => setTriggerAdd((n) => n + 1);
  return <CustomersWithTrigger showToast={showToast} triggerAdd={triggerAdd} />;
}

function CustomersWithTrigger({ showToast, triggerAdd }) {
  return <Customers showToast={showToast} triggerAdd={triggerAdd} />;
}

function DepositoWrapper({ showToast, actionRef }) {
  const [triggerAdd, setTriggerAdd] = useState(0);
  actionRef.current = () => setTriggerAdd((n) => n + 1);
  return <DepositoWithTrigger showToast={showToast} triggerAdd={triggerAdd} />;
}

function DepositoWithTrigger({ showToast, triggerAdd }) {
  return <DepositoTypes showToast={showToast} triggerAdd={triggerAdd} />;
}

function AccountsWrapper({ showToast, actionRef }) {
  const [triggerAdd, setTriggerAdd] = useState(0);
  actionRef.current = () => setTriggerAdd((n) => n + 1);
  return <AccountsWithTrigger showToast={showToast} triggerAdd={triggerAdd} />;
}

function AccountsWithTrigger({ showToast, triggerAdd }) {
  return <Accounts showToast={showToast} triggerAdd={triggerAdd} />;
}
