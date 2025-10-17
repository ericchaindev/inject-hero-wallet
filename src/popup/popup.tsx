import { useCallback, useEffect, useState } from 'react';
import { getTheme, setTheme, type Theme } from '../ui/theme';
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
  const [theme, setThemeState] = useState<Theme>('dark');

  // Initialize popup state
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const t = await getTheme();
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
          setThemeState(t);
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

  const toggleTheme = useCallback(async () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    await setTheme(next);
    setThemeState(next);
  }, [theme]);

  // Using shared CSS classes from styles.css

  if (state.loading) {
    return (
      <div className="container">
        <div className="center subtitle">Loading wallet...</div>
      </div>
    );
  }

  const hasAccounts = (state.walletState?.accounts?.length ?? 0) > 0;
  const isConnected =
    state.tab?.url &&
    state.walletState?.origins?.[new URL(state.tab.url).origin]?.allowed;

  return (
    <div className="container">
      <div className="header">
        <div className="title">Hero Wallet</div>
        {state.tab?.url && (
          <span className="tag">{new URL(state.tab.url).hostname}</span>
        )}
        <button className="link-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      {state.error && <div className="error">{state.error}</div>}

      {!state.unlocked ? (
        <div className="col">
          <input
            className="input"
            type="password"
            placeholder="Enter PIN to unlock"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
          />
          <button
            className="btn btn-primary"
            onClick={handleUnlock}
            disabled={!pin.trim() || state.loading}
          >
            Unlock Wallet
          </button>
        </div>
      ) : (
        <div className="col">
          {hasAccounts && (
            <div className="panel col">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>Accounts:</strong> {state.walletState?.accounts?.length || 0}
                </div>
                {isConnected && (
                  <span className="tag" style={{ color: '#10b981', borderColor: '#065f46' }}>✓ Connected</span>
                )}
              </div>
              {state.walletState?.accounts?.slice(0, 1).map((a) => (
                <div key={a.id} className="account">
                  <span>{a.chain.toUpperCase()}</span>
                  <span className="addr">{a.address.slice(0, 6)}…{a.address.slice(-4)}</span>
                </div>
              ))}
            </div>
          )}

          {hasAccounts && !isConnected && (
            <button
              className="btn btn-success"
              onClick={connectToSite}
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : 'Connect to Site'}
            </button>
          )}

          <button className="btn btn-danger" onClick={handleLock}>Lock Wallet</button>
        </div>
      )}

      <hr className="hr" />

      <div className="center">
        <button className="link-btn" onClick={openSettings}>Open Settings</button>
      </div>
    </div>
  );
}
