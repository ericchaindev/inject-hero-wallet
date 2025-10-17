import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadState, WalletState } from '../utils/keystore';
import { getTheme, setTheme, initTheme, type Theme } from './theme';

// Enhanced settings interface
interface SettingsState {
  walletState: WalletState | null;
  loading: boolean;
  error: string | null;
  showRawData: boolean;
  confirmClear: boolean;
}

function Settings() {
  const [state, setState] = useState<SettingsState>({
    walletState: null,
    loading: true,
    error: null,
    showRawData: false,
    confirmClear: false,
  });
  const [theme, setThemeState] = useState<Theme>('dark');

  // Load wallet state
  useEffect(() => {
    let mounted = true;

    const loadWalletState = async () => {
      try {
        const t = await getTheme();
        const walletState = await loadState();
        if (mounted) {
          setState((prev) => ({
            ...prev,
            walletState,
            loading: false,
          }));
          setThemeState(t);
        }
      } catch (error) {
        console.error('Failed to load wallet state:', error);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            error: 'Failed to load wallet data',
            loading: false,
          }));
        }
      }
    };

    loadWalletState();
    return () => {
      mounted = false;
    };
  }, []);

  // Clear all data with confirmation
  const handleClearAll = useCallback(async () => {
    if (!state.confirmClear) {
      setState((prev) => ({ ...prev, confirmClear: true }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      await chrome.storage.local.clear();
      setState((prev) => ({
        ...prev,
        walletState: null,
        loading: false,
        confirmClear: false,
      }));
      alert('All wallet data has been cleared successfully.');
    } catch (error) {
      console.error('Failed to clear storage:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to clear storage',
        loading: false,
        confirmClear: false,
      }));
    }
  }, [state.confirmClear]);

  // Cancel clear confirmation
  const cancelClear = useCallback(() => {
    setState((prev) => ({ ...prev, confirmClear: false }));
  }, []);

  // Toggle raw data view
  const toggleRawData = useCallback(() => {
    setState((prev) => ({ ...prev, showRawData: !prev.showRawData }));
  }, []);

  // Export wallet data
  const exportData = useCallback(() => {
    if (!state.walletState) return;

    const dataStr = JSON.stringify(state.walletState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `hero-wallet-backup-${
      new Date().toISOString().split('T')[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state.walletState]);

  const toggleTheme = useCallback(async () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    await setTheme(next);
    setThemeState(next);
  }, [theme]);

  // Styles for better UX
  const styles = {
    container: {
      maxWidth: 800,
      margin: '0 auto',
      padding: 24,
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      color: '#1f2937',
    },
    header: {
      fontSize: 28,
      fontWeight: 700,
      marginBottom: 8,
      color: '#111827',
    },
    subtitle: {
      fontSize: 16,
      color: '#6b7280',
      marginBottom: 32,
    },
    section: {
      marginBottom: 32,
      padding: 24,
      backgroundColor: '#f9fafb',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 16,
      color: '#374151',
    },
    button: {
      padding: '12px 20px',
      borderRadius: 8,
      border: 'none',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginRight: 12,
      marginBottom: 8,
    },
    buttonPrimary: {
      backgroundColor: '#3b82f6',
      color: 'white',
    },
    buttonSecondary: {
      backgroundColor: '#6b7280',
      color: 'white',
    },
    buttonDanger: {
      backgroundColor: '#ef4444',
      color: 'white',
    },
    buttonSuccess: {
      backgroundColor: '#10b981',
      color: 'white',
    },
    buttonDisabled: {
      backgroundColor: '#d1d5db',
      color: '#9ca3af',
      cursor: 'not-allowed',
    },
    pre: {
      backgroundColor: '#1f2937',
      color: '#f3f4f6',
      padding: 16,
      borderRadius: 8,
      fontSize: 12,
      fontFamily: 'Monaco, Consolas, monospace',
      overflow: 'auto',
      maxHeight: 400,
      border: '1px solid #374151',
    },
    error: {
      color: '#ef4444',
      fontSize: 14,
      marginBottom: 16,
      padding: '12px 16px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 8,
    },
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      fontSize: 16,
      color: '#6b7280',
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 16,
      marginBottom: 24,
    },
    statCard: {
      padding: 16,
      backgroundColor: 'white',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      textAlign: 'center' as const,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 700,
      color: '#3b82f6',
    },
    statLabel: {
      fontSize: 12,
      color: '#6b7280',
      marginTop: 4,
    },
    warning: {
      backgroundColor: '#fef3c7',
      border: '1px solid #f59e0b',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    },
    warningTitle: {
      fontWeight: 600,
      color: '#92400e',
      marginBottom: 8,
    },
    warningText: {
      color: '#92400e',
      fontSize: 14,
    },
  };

  if (state.loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading wallet settings...</div>
      </div>
    );
  }

  const walletState = state.walletState;
  const accountCount = walletState?.accounts?.length ?? 0;
  const originCount = Object.keys(walletState?.origins ?? {}).length;
  const createdDate = walletState?.createdAt
    ? new Date(walletState.createdAt).toLocaleDateString()
    : 'Unknown';

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={styles.header}>Hero Wallet Settings</h1>
        <button className="link-btn" onClick={toggleTheme}>
          {theme === 'dark' ? 'Light' : 'Dark'} Theme
        </button>
      </div>
      <p style={styles.subtitle}>
        Manage your wallet configuration and view account information
      </p>

      {state.error && <div style={styles.error}>{state.error}</div>}

      {/* Wallet Statistics */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Wallet Overview</h2>
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{accountCount}</div>
            <div style={styles.statLabel}>Accounts</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{originCount}</div>
            <div style={styles.statLabel}>Connected Sites</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{createdDate}</div>
            <div style={styles.statLabel}>Created</div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      {accountCount > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Accounts</h2>
          {walletState?.accounts?.map((account, index) => (
            <div
              key={account.id}
              style={{
                padding: 12,
                backgroundColor: 'white',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                marginBottom: 8,
              }}
            >
              <div>
                <strong>Account {index + 1}:</strong>{' '}
                {account.chain.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                {account.address}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connected Sites */}
      {originCount > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Connected Sites</h2>
          {Object.entries(walletState?.origins ?? {}).map(([origin, info]) => (
            <div
              key={origin}
              style={{
                padding: 12,
                backgroundColor: 'white',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                marginBottom: 8,
              }}
            >
              <div>
                <strong>{origin}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Status: {info.allowed ? '✓ Connected' : '✗ Disconnected'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Data Management */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Data Management</h2>

        <button
          onClick={exportData}
          disabled={!walletState}
          style={{
            ...styles.button,
            ...(walletState ? styles.buttonPrimary : styles.buttonDisabled),
          }}
        >
          Export Wallet Data
        </button>

        <button
          onClick={toggleRawData}
          style={{
            ...styles.button,
            ...styles.buttonSecondary,
          }}
        >
          {state.showRawData ? 'Hide' : 'Show'} Raw Data
        </button>

        {state.showRawData && walletState && (
          <pre style={styles.pre}>{JSON.stringify(walletState, null, 2)}</pre>
        )}
      </div>

      {/* Danger Zone */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Danger Zone</h2>

        {state.confirmClear && (
          <div style={styles.warning}>
            <div style={styles.warningTitle}>⚠️ Confirm Data Deletion</div>
            <div style={styles.warningText}>
              This action will permanently delete all wallet data including
              accounts, settings, and connected sites. This cannot be undone.
            </div>
          </div>
        )}

        {state.confirmClear ? (
          <div>
            <button
              onClick={handleClearAll}
              style={{
                ...styles.button,
                ...styles.buttonDanger,
              }}
            >
              ⚠️ Yes, Delete Everything
            </button>
            <button
              onClick={cancelClear}
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleClearAll}
            style={{
              ...styles.button,
              ...styles.buttonDanger,
            }}
          >
            Clear All Data
          </button>
        )}
      </div>
    </div>
  );
}

// Initialize the settings page with theme
const rootElement = document.getElementById('root');
if (rootElement) {
  initTheme().then(() => {
    createRoot(rootElement).render(<Settings />);
  });
} else {
  console.error('Root element not found');
}
