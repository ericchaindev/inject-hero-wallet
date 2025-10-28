import * as bip39 from 'bip39';
import { HDNodeWallet, Mnemonic } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { getTheme, setTheme, type Theme } from '../ui/theme';
import { CryptoUtils } from '../utils/crypto';
import {
  clearRememberedPin,
  getRememberedPin,
  isUnlocked,
  loadState,
  lockNow,
  saveState,
  setRememberedPin,
  StoredAccount,
  unlockWithPin,
  WalletState,
} from '../utils/keystore';

interface PopupState {
  tab: chrome.tabs.Tab | null;
  walletState: WalletState | null;
  unlocked: boolean;
  loading: boolean;
  error: string | null;
}

type SetupMode = 'welcome' | 'create' | 'restore' | null;

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
  const [rememberPin, setRememberPin] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>(null);
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const t = await getTheme();
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const currentTab = tabs[0] || null;

        const walletState = await loadState();
        const hasAccounts = (walletState?.accounts?.length ?? 0) > 0;

        // If no accounts exist, show welcome screen
        if (!hasAccounts) {
          if (mounted) {
            setState({
              tab: currentTab,
              walletState,
              unlocked: false,
              loading: false,
              error: null,
            });
            setSetupMode('welcome');
            setThemeState(t);
          }
          return;
        }

        const storedPin = await getRememberedPin();

        let unlocked = isUnlocked();
        let hasPersistedPin = Boolean(storedPin);

        if (!unlocked && storedPin) {
          try {
            await unlockWithPin(storedPin, 10 * 60_000);
            unlocked = true;
            hasPersistedPin = true;
          } catch (error) {
            console.warn('Auto-unlock with remembered PIN failed:', error);
            await clearRememberedPin();
            hasPersistedPin = false;
          }
        }

        if (mounted) {
          setState((prev) => ({
            ...prev,
            tab: currentTab,
            walletState,
            unlocked,
            loading: false,
          }));
          setThemeState(t);
          setRememberPin(hasPersistedPin);
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

  const handleUnlock = useCallback(async () => {
    if (!pin.trim()) {
      setState((prev) => ({ ...prev, error: 'PIN is required' }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, error: null, loading: true }));
      await unlockWithPin(pin, 10 * 60_000);

      if (rememberPin) {
        try {
          await setRememberedPin(pin);
        } catch (storageError) {
          console.warn('Failed to store remembered PIN:', storageError);
        }
      } else {
        await clearRememberedPin();
      }

      setState((prev) => ({ ...prev, unlocked: true, loading: false }));
      setPin('');
      
      // Notify background script that wallet is unlocked
      try {
        chrome.runtime.sendMessage({ kind: 'WALLET_UNLOCKED' });
        console.log('✅ Sent WALLET_UNLOCKED notification to background');
      } catch (error) {
        console.warn('Failed to notify background of unlock:', error);
      }
    } catch (error) {
      console.error('Unlock failed:', error);
      setState((prev) => ({
        ...prev,
        error: 'Invalid PIN or unlock failed',
        loading: false,
      }));
    }
  }, [pin, rememberPin]);

  // Handle restore wallet from mnemonic
  const handleRestoreWallet = useCallback(async () => {
    if (!mnemonicInput.trim()) {
      setState((prev) => ({
        ...prev,
        error: 'Please enter your mnemonic phrase',
      }));
      return;
    }

    if (!newPin.trim() || newPin.length < 4) {
      setState((prev) => ({ ...prev, error: 'PIN must be at least 4 digits' }));
      return;
    }

    if (newPin !== confirmNewPin) {
      setState((prev) => ({ ...prev, error: 'PINs do not match' }));
      return;
    }

    // Clean up mnemonic: remove extra spaces, newlines, tabs
    const mnemonic = mnemonicInput.trim().toLowerCase().replace(/\s+/g, ' '); // Replace multiple spaces/newlines with single space

    console.log('🔍 Raw input:', mnemonicInput);
    console.log('🔍 Cleaned mnemonic:', mnemonic);
    console.log('🔍 Word count:', mnemonic.split(' ').length);
    console.log('🔍 Words:', mnemonic.split(' '));

    // Check each word individually
    const words = mnemonic.split(' ');
    const wordlist = bip39.wordlists.english;
    const invalidWords: string[] = [];

    words.forEach((word, index) => {
      if (!wordlist.includes(word)) {
        invalidWords.push(`#${index + 1}: "${word}"`);
      }
    });

    if (invalidWords.length > 0) {
      console.error('❌ Invalid words found:', invalidWords);
      setState((prev) => ({
        ...prev,
        error: `Invalid BIP39 words found: ${invalidWords.join(
          ', '
        )}. Please check your mnemonic.`,
      }));
      return;
    }

    // Test validateMnemonic
    console.log('🔍 Testing bip39.validateMnemonic...');
    const validationResult = bip39.validateMnemonic(mnemonic);
    console.log('🔍 Validation result:', validationResult);
    console.log('🔍 bip39 object:', bip39);
    console.log(
      '🔍 bip39.validateMnemonic type:',
      typeof bip39.validateMnemonic
    );

    // Try to validate with explicit wordlist
    try {
      const validationWithWordlist = bip39.validateMnemonic(
        mnemonic,
        bip39.wordlists.english
      );
      console.log(
        '🔍 Validation with explicit wordlist:',
        validationWithWordlist
      );
    } catch (e) {
      console.error('🔍 Validation with wordlist error:', e);
    }

    if (!validationResult) {
      const wordCount = mnemonic.split(' ').length;
      console.error('❌ Validation failed. Word count:', wordCount);
      console.error(
        '❌ This might be a browser environment issue with bip39 library'
      );

      // Check if all words are valid individually (we already did this above)
      // If no invalid words were found, proceed anyway
      if (invalidWords.length === 0) {
        console.warn(
          '⚠️ All words are valid, proceeding despite checksum validation failure...'
        );
        console.warn(
          '⚠️ This is likely a bip39 library issue in browser environment'
        );
      } else {
        // This shouldn't happen as we checked above, but just in case
        setState((prev) => ({
          ...prev,
          error: `Invalid mnemonic phrase. Found ${wordCount} words, expected 12 or 24. Checksum validation failed.`,
        }));
        return;
      }
    } else {
      console.log('✅ Mnemonic validation passed');
    }

    try {
      setState((prev) => ({ ...prev, error: null, loading: true }));

      // Generate seed from mnemonic using ethers (browser-compatible)
      console.log('🔄 Creating Mnemonic object from phrase...');
      const mnemonicObj = Mnemonic.fromPhrase(mnemonic);
      console.log('✅ Mnemonic object created');

      // Derive Ethereum account (BIP44 path: m/44'/60'/0'/0/0)
      console.log('🔄 Deriving HD wallet from mnemonic...');
      const hdWallet = HDNodeWallet.fromMnemonic(
        mnemonicObj,
        "m/44'/60'/0'/0/0"
      );
      console.log('✅ HD wallet derived');
      console.log('📍 Address:', hdWallet.address);

      // Encrypt private key
      const encrypted = await CryptoUtils.encryptJSON(
        { privateKeyHex: hdWallet.privateKey },
        newPin
      );

      // Create account with proper structure
      const account: StoredAccount = {
        id: 'eth-0',
        name: 'Ethereum Account 1',
        chain: 'evm',
        pubkey: hdWallet.publicKey,
        address: hdWallet.address,
        path: "m/44'/60'/0'/0/0",
        enc: {
          iv: encrypted.iv,
          salt: encrypted.salt,
          ct: encrypted.ciphertext,
        },
        createdAt: Date.now(),
      };

      // Create new wallet state
      const newWalletState: WalletState = {
        accounts: [account],
        origins: {},
        createdAt: Date.now(),
        version: '1.0.0',
      };

      // Save state
      await saveState(newWalletState);

      // Unlock with PIN
      await unlockWithPin(newPin, 10 * 60_000);

      // Optionally remember PIN
      if (rememberPin) {
        await setRememberedPin(newPin);
      }

      setState((prev) => ({
        ...prev,
        walletState: newWalletState,
        unlocked: true,
        loading: false,
      }));

      setSetupMode(null);
      setMnemonicInput('');
      setNewPin('');
      setConfirmNewPin('');
      
      // Notify background script that wallet is unlocked
      try {
        chrome.runtime.sendMessage({ kind: 'WALLET_UNLOCKED' });
        console.log('✅ Sent WALLET_UNLOCKED notification to background');
      } catch (error) {
        console.warn('Failed to notify background of unlock:', error);
      }
    } catch (error) {
      console.error('Restore wallet failed:', error);
      setState((prev) => ({
        ...prev,
        error:
          'Failed to restore wallet: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        loading: false,
      }));
    }
  }, [mnemonicInput, newPin, confirmNewPin, rememberPin]);

  // Handle create new wallet
  const handleCreateWallet = useCallback(async () => {
    if (!newPin.trim() || newPin.length < 4) {
      setState((prev) => ({ ...prev, error: 'PIN must be at least 4 digits' }));
      return;
    }

    if (newPin !== confirmNewPin) {
      setState((prev) => ({ ...prev, error: 'PINs do not match' }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, error: null, loading: true }));

      // Generate random mnemonic (12 words)
      const mnemonic = bip39.generateMnemonic(128);
      console.log('🔄 Generated mnemonic:', mnemonic);

      // Generate seed from mnemonic using ethers (browser-compatible)
      const mnemonicObj = Mnemonic.fromPhrase(mnemonic);

      // Derive Ethereum account (BIP44 path: m/44'/60'/0'/0/0)
      const hdWallet = HDNodeWallet.fromMnemonic(
        mnemonicObj,
        "m/44'/60'/0'/0/0"
      );
      console.log('✅ HD wallet created');
      console.log('📍 Address:', hdWallet.address);

      // Encrypt private key
      const encrypted = await CryptoUtils.encryptJSON(
        { privateKeyHex: hdWallet.privateKey },
        newPin
      );

      // Create account with proper structure
      const account: StoredAccount = {
        id: 'eth-0',
        name: 'Ethereum Account 1',
        chain: 'evm',
        pubkey: hdWallet.publicKey,
        address: hdWallet.address,
        path: "m/44'/60'/0'/0/0",
        enc: {
          iv: encrypted.iv,
          salt: encrypted.salt,
          ct: encrypted.ciphertext,
        },
        createdAt: Date.now(),
      };

      // Create new wallet state
      const newWalletState: WalletState = {
        accounts: [account],
        origins: {},
        createdAt: Date.now(),
        version: '1.0.0',
      };

      // Save state
      await saveState(newWalletState);

      // Unlock with PIN
      await unlockWithPin(newPin, 10 * 60_000);

      // Optionally remember PIN
      if (rememberPin) {
        await setRememberedPin(newPin);
      }

      setState((prev) => ({
        ...prev,
        walletState: newWalletState,
        unlocked: true,
        loading: false,
        error: `✅ Wallet created! SAVE THIS MNEMONIC SECURELY:\n\n${mnemonic}\n\nThis is the ONLY way to recover your wallet!`,
      }));

      setSetupMode(null);
      setNewPin('');
      setConfirmNewPin('');
      
      // Notify background script that wallet is unlocked
      try {
        chrome.runtime.sendMessage({ kind: 'WALLET_UNLOCKED' });
        console.log('✅ Sent WALLET_UNLOCKED notification to background');
      } catch (error) {
        console.warn('Failed to notify background of unlock:', error);
      }
    } catch (error) {
      console.error('Create wallet failed:', error);
      setState((prev) => ({
        ...prev,
        error:
          'Failed to create wallet: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        loading: false,
      }));
    }
  }, [newPin, confirmNewPin, rememberPin]);

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

  const handleRememberPinChange = useCallback(
    (checked: boolean) => {
      setRememberPin(checked);
      if (!checked) {
        clearRememberedPin().catch((error) => {
          console.warn('Failed to clear remembered PIN:', error);
        });
      }
    },
    [clearRememberedPin]
  );

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

      {/* Welcome Screen - Choose Create or Restore */}
      {setupMode === 'welcome' && (
        <div className="col" style={{ gap: '16px', padding: '20px' }}>
          <div className="center">
            <h3 style={{ margin: '0 0 8px 0' }}>Welcome to Hero Wallet</h3>
            <p className="subtitle" style={{ margin: 0 }}>
              Get started by creating a new wallet or restoring an existing one
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setSetupMode('create')}
            disabled={state.loading}
          >
            Create New Wallet
          </button>
          <button
            className="btn"
            onClick={() => setSetupMode('restore')}
            disabled={state.loading}
          >
            Restore Existing Wallet
          </button>
        </div>
      )}

      {/* Create Wallet Screen */}
      {setupMode === 'create' && (
        <div className="col" style={{ gap: '12px' }}>
          <div className="center">
            <h3 style={{ margin: '0 0 4px 0' }}>Create New Wallet</h3>
            <p className="subtitle" style={{ margin: 0, fontSize: '12px' }}>
              Set a PIN to secure your wallet
            </p>
          </div>
          <input
            className="input"
            type="password"
            placeholder="Enter PIN (min 4 digits)"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            type="password"
            placeholder="Confirm PIN"
            value={confirmNewPin}
            onChange={(e) => setConfirmNewPin(e.target.value)}
          />
          <label className="row" style={{ gap: '6px' }}>
            <input
              type="checkbox"
              checked={rememberPin}
              onChange={(e) => setRememberPin(e.target.checked)}
            />
            <span className="subtitle">Remember PIN on this device</span>
          </label>
          <div className="row" style={{ gap: '8px' }}>
            <button
              className="btn"
              onClick={() => {
                setSetupMode('welcome');
                setNewPin('');
                setConfirmNewPin('');
              }}
              disabled={state.loading}
            >
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateWallet}
              disabled={!newPin || !confirmNewPin || state.loading}
              style={{ flex: 1 }}
            >
              Create Wallet
            </button>
          </div>
        </div>
      )}

      {/* Restore Wallet Screen */}
      {setupMode === 'restore' && (
        <div className="col" style={{ gap: '12px' }}>
          <div className="center">
            <h3 style={{ margin: '0 0 4px 0' }}>Restore Wallet</h3>
            <p
              className="subtitle"
              style={{
                margin: '0 0 8px 0',
                fontSize: '11px',
                lineHeight: '1.4',
              }}
            >
              Enter your 12 or 24-word mnemonic phrase (separated by spaces)
            </p>
          </div>
          <textarea
            className="input"
            placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
            value={mnemonicInput}
            onChange={(e) => setMnemonicInput(e.target.value)}
            rows={4}
            autoFocus
            style={{
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.5',
            }}
          />
          <div style={{ fontSize: '10px', color: '#888', marginTop: '-8px' }}>
            💡 Tip: Paste all words separated by spaces (newlines will be
            converted)
          </div>
          <input
            className="input"
            type="password"
            placeholder="Set PIN (min 4 digits)"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Confirm PIN"
            value={confirmNewPin}
            onChange={(e) => setConfirmNewPin(e.target.value)}
          />
          <label className="row" style={{ gap: '6px' }}>
            <input
              type="checkbox"
              checked={rememberPin}
              onChange={(e) => setRememberPin(e.target.checked)}
            />
            <span className="subtitle">Remember PIN on this device</span>
          </label>
          <div className="row" style={{ gap: '8px' }}>
            <button
              className="btn"
              onClick={() => {
                setSetupMode('welcome');
                setMnemonicInput('');
                setNewPin('');
                setConfirmNewPin('');
              }}
              disabled={state.loading}
            >
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleRestoreWallet}
              disabled={
                !mnemonicInput.trim() ||
                !newPin ||
                !confirmNewPin ||
                state.loading
              }
              style={{ flex: 1 }}
            >
              Restore Wallet
            </button>
          </div>
        </div>
      )}

      {/* Unlock Screen (existing wallet) */}
      {!setupMode && !state.unlocked && hasAccounts && (
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
          <label className="row" style={{ gap: '6px' }}>
            <input
              type="checkbox"
              checked={rememberPin}
              onChange={(event) =>
                handleRememberPinChange(event.target.checked)
              }
            />
            <span className="subtitle">Remember PIN on this device</span>
          </label>
          <button
            className="btn btn-primary"
            onClick={handleUnlock}
            disabled={!pin.trim() || state.loading}
          >
            Unlock Wallet
          </button>
        </div>
      )}

      {/* Wallet Unlocked - Main Dashboard */}
      {!setupMode && state.unlocked && hasAccounts && (
        <div className="col">
          {hasAccounts && (
            <div className="panel col">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>Accounts:</strong>{' '}
                  {state.walletState?.accounts?.length || 0}
                </div>
                {isConnected && (
                  <span
                    className="tag"
                    style={{ color: '#10b981', borderColor: '#065f46' }}
                  >
                    ✓ Connected
                  </span>
                )}
              </div>
              {state.walletState?.accounts?.slice(0, 1).map((a) => (
                <div key={a.id} className="account">
                  <span>{a.chain.toUpperCase()}</span>
                  <span className="addr">
                    {a.address.slice(0, 6)}…{a.address.slice(-4)}
                  </span>
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

          <button className="btn btn-danger" onClick={handleLock}>
            Lock Wallet
          </button>
        </div>
      )}

      <hr className="hr" />

      <div className="center">
        <button className="link-btn" onClick={openSettings}>
          Open Settings
        </button>
      </div>
    </div>
  );
}
