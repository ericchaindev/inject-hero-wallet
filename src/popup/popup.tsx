import { useCallback, useEffect, useState } from 'react';
import {
  isUnlocked,
  loadState,
  lockNow,
  unlockWithPin,
  WalletState,
} from '../utils/keystore';

// Enhanced types for better type safety
interface PopupState {
  tab: chrome.tabs.Tab | null;
  walletState: WalletState | null;
  unlocked: boolean;
  loading: boolean;
  error: string | null;
}

export default function App() {
  const [state, setState] = useState<PopupState>({
    tab: null,
    walletState: null,
    unlocked: isUnlocked(),
    loading: true,
    error: null,
  });

  const [pin, setPin] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Initialize popup state
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Get current tab
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const currentTab = tabs[0] || null;

        // Load wallet state
        const walletState = await loadState();

        if (mounted) {
          setState((prev) => ({
            ...prev,
            tab: currentTab,
            walletState,
            loading: false,
          }));
        }
      } catch (error) {
        console.error('Failed to initialize popup:', error);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'Failed to load wallet data',
          }));
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Handle wallet unlock
  const handleUnlock = useCallback(async () => {
    if (!pin.trim()) {
      setState((prev) => ({ ...prev, error: 'PIN is required' }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, error: null, loading: true }));
      await unlockWithPin(pin, 10 * 60_000);
      setState((prev) => ({ ...prev, unlocked: true, loading: false }));
      setPin(''); // Clear PIN for security
    } catch (error) {
      console.error('Unlock failed:', error);
      setState((prev) => ({
        ...prev,
        error: 'Invalid PIN or unlock failed',
        loading: false,
      }));
    }
  }, [pin]);

  // Handle wallet lock
  const handleLock = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      lockNow();
      setState((prev) => ({ ...prev, unlocked: false, loading: false }));
    } catch (error) {
      console.error('Lock failed:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to lock wallet',
        loading: false,
      }));
    }
  }, []);

  // Handle site connection
  const connectToSite = useCallback(async () => {
    if (!state.tab?.id || !state.tab.url) {
      setState((prev) => ({ ...prev, error: 'No active tab found' }));
      return;
    }

    try {
      setConnecting(true);
      setState((prev) => ({ ...prev, error: null }));

      await chrome.runtime.sendMessage({
        kind: 'PAGE_REQUEST',
        from: 'popup',
        url: state.tab.url,
        tabId: state.tab.id,
        request: { method: 'herowallet_connect' },
      });

      // Close popup after successful connection
      window.close();
    } catch (error) {
      console.error('Connection failed:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to connect to site',
      }));
      setConnecting(false);
    }
  }, [state.tab]);

  // Handle key press for PIN input
  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleUnlock();
      }
    },
    [handleUnlock]
  );

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState((prev) => ({ ...prev, error: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Open settings page
  const openSettings = useCallback(() => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/ui/settings.html'),
    });
  }, []);

  // Styles for better UX
  const styles = {
    container: {
      width: 350,
      minHeight: 200,
      padding: 16,
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      backgroundColor: '#ffffff',
      color: '#1f2937',
    },
    header: {
      fontSize: 20,
      fontWeight: 600,
      margin: '0 0 8px 0',
      color: '#111827',
    },
    url: {
      fontSize: 12,
      color: '#6b7280',
      marginBottom: 16,
      wordBreak: 'break-all' as const,
      backgroundColor: '#f9fafb',
      padding: '4px 8px',
      borderRadius: 4,
      border: '1px solid #e5e7eb',
    },
    input: {
      width: '100%',
      padding: 12,
      borderRadius: 8,
      border: '2px solid #e5e7eb',
      fontSize: 14,
      marginBottom: 12,
      boxSizing: 'border-box' as const,
      transition: 'border-color 0.2s',
    },
    inputFocus: {
      borderColor: '#3b82f6',
      outline: 'none',
    },
    button: {
      width: '100%',
      padding: 12,
      borderRadius: 8,
      border: 'none',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginBottom: 8,
    },
    buttonPrimary: {
      backgroundColor: '#3b82f6',
      color: 'white',
    },
    buttonSuccess: {
      backgroundColor: '#10b981',
      color: 'white',
    },
    buttonDanger: {
      backgroundColor: '#ef4444',
      color: 'white',
    },
    buttonDisabled: {
      backgroundColor: '#d1d5db',
      color: '#9ca3af',
      cursor: 'not-allowed',
    },
    link: {
      color: '#3b82f6',
      textDecoration: 'none',
      fontSize: 14,
      fontWeight: 500,
    },
    error: {
      color: '#ef4444',
      fontSize: 12,
      marginBottom: 12,
      padding: '8px 12px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 6,
    },
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontSize: 14,
      color: '#6b7280',
    },
    accountInfo: {
      backgroundColor: '#f8fafc',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
    },
  };

  if (state.loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading wallet...</div>
      </div>
    );
  }

  const hasAccounts = (state.walletState?.accounts?.length ?? 0) > 0;
  const isConnected =
    state.tab?.url &&
    state.walletState?.origins?.[new URL(state.tab.url).origin]?.allowed;

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Hero Wallet</h1>

      {state.tab?.url && (
        <div style={styles.url}>{new URL(state.tab.url).hostname}</div>
      )}

      {state.error && <div style={styles.error}>{state.error}</div>}

      {!state.unlocked ? (
        <div>
          <input
            type="password"
            placeholder="Enter PIN to unlock"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyPress={handleKeyPress}
            style={styles.input}
            autoFocus
          />
          <button
            onClick={handleUnlock}
            disabled={!pin.trim() || state.loading}
            style={{
              ...styles.button,
              ...(pin.trim() && !state.loading
                ? styles.buttonPrimary
                : styles.buttonDisabled),
            }}
          >
            Unlock Wallet
          </button>
        </div>
      ) : (
        <div>
          {hasAccounts && (
            <div style={styles.accountInfo}>
              <div>
                <strong>Accounts:</strong>{' '}
                {state.walletState?.accounts?.length || 0}
              </div>
              {isConnected && (
                <div style={{ color: '#10b981', marginTop: 4 }}>
                  ✓ Connected to this site
                </div>
              )}
            </div>
          )}

          {hasAccounts && !isConnected && (
            <button
              onClick={connectToSite}
              disabled={connecting}
              style={{
                ...styles.button,
                ...(connecting ? styles.buttonDisabled : styles.buttonSuccess),
              }}
            >
              {connecting ? 'Connecting...' : 'Connect to Site'}
            </button>
          )}

          <button
            onClick={handleLock}
            style={{
              ...styles.button,
              ...styles.buttonDanger,
            }}
          >
            Lock Wallet
          </button>
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button
          onClick={openSettings}
          style={{
            ...styles.link,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Open Settings
        </button>
      </div>
    </div>
  );
}
