import { browserX } from './browserWrapper';
import { CryptoError, CryptoUtils } from './crypto';

// Enhanced types with better type safety
export type Chain = 'evm' | 'btc' | 'sol' | 'ton' | 'sui' | 'hedera';

export interface StoredAccount {
  readonly id: string;
  readonly name: string;
  readonly chain: Chain;
  readonly pubkey: string;
  readonly address: string;
  readonly path: string;
  readonly enc: {
    readonly iv: string;
    readonly salt: string;
    readonly ct: string;
  };
  readonly createdAt: number;
}

export interface OriginPermission {
  readonly allowed: boolean;
  readonly selectedAccountId?: string;
  readonly chainOverride?: Chain;
  readonly connectedAt: number;
  readonly lastUsed: number;
}

export interface WalletState {
  readonly origins: Record<string, OriginPermission>;
  readonly accounts: StoredAccount[];
  readonly mnemonic?: {
    readonly iv: string;
    readonly salt: string;
    readonly ct: string;
  };
  readonly createdAt: number;
  readonly version: string;
}

// Enhanced error types for keystore operations
export class KeystoreError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'KeystoreError';
  }
}

// Session management with enhanced security
class SessionManager {
  private static instance: SessionManager;
  private unlocked = false;
  private pin: string | null = null;
  private lockTimer: NodeJS.Timeout | null = null;
  private unlockTime: number | null = null;
  private readonly DEFAULT_LOCK_TIME = 5 * 60 * 1000; // 5 minutes

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private constructor() {
    // Set up automatic lock on page visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Reduce session time when tab is hidden
          this.extendLock(30000); // 30 seconds when hidden
        }
      });
    }

    // Set up automatic lock on extension suspend (if available)
    if (typeof chrome !== 'undefined' && chrome.runtime?.onSuspend) {
      chrome.runtime.onSuspend.addListener(() => {
        this.lockNow();
      });
    }
  }

  isUnlocked(): boolean {
    return this.unlocked && this.pin !== null;
  }

  requireUnlocked(): void {
    if (!this.isUnlocked()) {
      throw new KeystoreError(
        'Wallet is locked - please unlock first',
        'WALLET_LOCKED'
      );
    }
  }

  async unlock(
    pin: string,
    ttlMs: number = this.DEFAULT_LOCK_TIME
  ): Promise<void> {
    if (!pin || typeof pin !== 'string') {
      throw new KeystoreError('PIN is required', 'INVALID_PIN');
    }

    if (pin.length < 4) {
      throw new KeystoreError(
        'PIN must be at least 4 characters',
        'PIN_TOO_SHORT'
      );
    }

    try {
      // Validate PIN by attempting to load wallet state
      const state = await WalletStorage.loadState();
      if (state?.mnemonic) {
        // Try to decrypt mnemonic to validate PIN
        await CryptoUtils.decryptJSON(
          pin,
          state.mnemonic.iv,
          state.mnemonic.salt,
          state.mnemonic.ct
        );
      }

      // PIN is valid, unlock session
      this.unlocked = true;
      this.pin = pin;
      this.unlockTime = Date.now();

      this.setLockTimer(ttlMs);

      console.log('Wallet unlocked successfully');
    } catch (error) {
      console.error('Unlock failed:', error);
      if (error instanceof CryptoError) {
        if (error.code === 'DECRYPTION_FAILED') {
          throw new KeystoreError('Invalid PIN', 'INVALID_PIN');
        }
      }
      throw new KeystoreError('Failed to unlock wallet', 'UNLOCK_FAILED');
    }
  }

  lockNow(): void {
    if (this.pin) {
      // Securely wipe PIN from memory
      CryptoUtils.secureWipe(this.pin);
    }

    this.unlocked = false;
    this.pin = null;
    this.unlockTime = null;

    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }

    console.log('Wallet locked');
  }

  getSessionPin(): string {
    this.requireUnlocked();
    return this.pin!;
  }

  extendLock(ttlMs: number): void {
    if (this.isUnlocked()) {
      this.setLockTimer(ttlMs);
    }
  }

  getUnlockDuration(): number {
    if (!this.unlockTime) return 0;
    return Date.now() - this.unlockTime;
  }

  private setLockTimer(ttlMs: number): void {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
    }

    this.lockTimer = setTimeout(() => {
      console.log('Auto-locking wallet due to inactivity');
      this.lockNow();
    }, ttlMs);
  }
}

// Enhanced wallet storage with validation and migration
export class WalletStorage {
  private static readonly STORAGE_KEY = 'hero_state';
  private static readonly CURRENT_VERSION = '1.0.0';

  /**
   * Load wallet state from storage with validation
   */
  static async loadState(): Promise<WalletState | null> {
    try {
      const result = await browserX.storage.local.get([this.STORAGE_KEY]);
      const rawState = result[this.STORAGE_KEY];

      if (!rawState) {
        return null;
      }

      // Validate state structure
      const state = this.validateAndMigrateState(rawState);
      return state;
    } catch (error) {
      console.error('Failed to load wallet state:', error);
      throw new KeystoreError(
        'Failed to load wallet data',
        'STORAGE_LOAD_FAILED'
      );
    }
  }

  /**
   * Save wallet state to storage with validation
   */
  static async saveState(state: WalletState): Promise<void> {
    try {
      // Validate state before saving
      this.validateState(state);

      // Add version and timestamp
      const stateToSave: WalletState = {
        ...state,
        version: this.CURRENT_VERSION,
      };

      await browserX.storage.local.set({
        [this.STORAGE_KEY]: stateToSave,
      });

      console.log('Wallet state saved successfully');
    } catch (error) {
      console.error('Failed to save wallet state:', error);
      throw new KeystoreError(
        'Failed to save wallet data',
        'STORAGE_SAVE_FAILED'
      );
    }
  }

  /**
   * Clear all wallet data from storage
   */
  static async clearAll(): Promise<void> {
    try {
      await browserX.storage.local.remove([this.STORAGE_KEY]);
      console.log('Wallet data cleared');
    } catch (error) {
      console.error('Failed to clear wallet data:', error);
      throw new KeystoreError(
        'Failed to clear wallet data',
        'STORAGE_CLEAR_FAILED'
      );
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    bytesInUse: number;
    totalBytes: number;
  }> {
    try {
      if (browserX.storage.local.getBytesInUse) {
        const bytesInUse = await browserX.storage.local.getBytesInUse();
        return {
          bytesInUse,
          totalBytes: 5 * 1024 * 1024, // Chrome extension storage limit
        };
      }
      return { bytesInUse: 0, totalBytes: 0 };
    } catch (error) {
      console.warn('Failed to get storage stats:', error);
      return { bytesInUse: 0, totalBytes: 0 };
    }
  }

  private static validateState(state: unknown): asserts state is WalletState {
    if (!state || typeof state !== 'object') {
      throw new KeystoreError(
        'Invalid wallet state: not an object',
        'INVALID_STATE'
      );
    }

    const s = state as any;

    if (!s.origins || typeof s.origins !== 'object') {
      throw new KeystoreError(
        'Invalid wallet state: missing origins',
        'INVALID_STATE'
      );
    }

    if (!Array.isArray(s.accounts)) {
      throw new KeystoreError(
        'Invalid wallet state: accounts must be an array',
        'INVALID_STATE'
      );
    }

    if (typeof s.createdAt !== 'number' || s.createdAt <= 0) {
      throw new KeystoreError(
        'Invalid wallet state: invalid createdAt',
        'INVALID_STATE'
      );
    }

    // Validate accounts
    s.accounts.forEach((account: any, index: number) => {
      if (!account.id || !account.chain || !account.address) {
        throw new KeystoreError(
          `Invalid account at index ${index}`,
          'INVALID_ACCOUNT'
        );
      }
    });
  }

  private static validateAndMigrateState(rawState: any): WalletState {
    // Basic validation
    this.validateState(rawState);

    // Migration logic for older versions
    let state = rawState as WalletState;

    if (!state.version || state.version < this.CURRENT_VERSION) {
      state = this.migrateState(state);
    }

    return state;
  }

  private static migrateState(oldState: any): WalletState {
    console.log('Migrating wallet state to version', this.CURRENT_VERSION);

    // Migrate origins to include timestamps
    const migratedOrigins: Record<string, OriginPermission> = {};
    const rawOrigins = oldState.origins || {};

    Object.keys(rawOrigins).forEach((origin) => {
      const permission = rawOrigins[origin];
      migratedOrigins[origin] = {
        allowed: permission.allowed || false,
        selectedAccountId: permission.selectedAccountId,
        chainOverride: permission.chainOverride,
        connectedAt: permission.connectedAt || Date.now(),
        lastUsed: permission.lastUsed || Date.now(),
      };
    });

    // Migrate accounts to include timestamps
    const migratedAccounts: StoredAccount[] = (oldState.accounts || []).map(
      (account: any) => ({
        id: account.id,
        name: account.name,
        chain: account.chain,
        pubkey: account.pubkey,
        address: account.address,
        path: account.path,
        enc: {
          iv: account.enc.iv,
          salt: account.enc.salt,
          ct: account.enc.ct,
        },
        createdAt: account.createdAt || Date.now(),
      })
    );

    // Create migrated state
    const migratedState: WalletState = {
      origins: migratedOrigins,
      accounts: migratedAccounts,
      mnemonic: oldState.mnemonic,
      createdAt: oldState.createdAt || Date.now(),
      version: this.CURRENT_VERSION,
    };

    return migratedState;
  }
}

// Enhanced account management utilities
export class AccountManager {
  /**
   * Decrypt account data with session PIN
   */
  static async decryptAccount<T = any>(account: StoredAccount): Promise<T> {
    const session = SessionManager.getInstance();
    const pin = session.getSessionPin();

    try {
      return await CryptoUtils.decryptJSON<T>(
        pin,
        account.enc.iv,
        account.enc.salt,
        account.enc.ct
      );
    } catch (error) {
      console.error('Failed to decrypt account:', error);
      if (error instanceof CryptoError) {
        throw new KeystoreError(
          'Failed to decrypt account data',
          'ACCOUNT_DECRYPT_FAILED'
        );
      }
      throw error;
    }
  }

  /**
   * Find account by address and chain
   */
  static findAccount(
    state: WalletState,
    address: string,
    chain?: Chain
  ): StoredAccount | undefined {
    return state.accounts.find((account) => {
      const addressMatch =
        account.address.toLowerCase() === address.toLowerCase();
      const chainMatch = !chain || account.chain === chain;
      return addressMatch && chainMatch;
    });
  }

  /**
   * Get selected account for origin
   */
  static getSelectedAccount(
    state: WalletState,
    origin: string,
    chain?: Chain
  ): StoredAccount | undefined {
    const permission = state.origins[origin];
    if (!permission?.allowed || !permission.selectedAccountId) {
      return undefined;
    }

    return state.accounts.find((account) => {
      const idMatch = account.id === permission.selectedAccountId;
      const chainMatch = !chain || account.chain === chain;
      return idMatch && chainMatch;
    });
  }
}

// Public API with singleton session manager
const sessionManager = SessionManager.getInstance();

export function isUnlocked(): boolean {
  return sessionManager.isUnlocked();
}

export function requireUnlocked(): void {
  sessionManager.requireUnlocked();
}

export async function unlockWithPin(
  pin: string,
  ttlMs: number = 5 * 60 * 1000
): Promise<void> {
  await sessionManager.unlock(pin, ttlMs);
}

export function lockNow(): void {
  sessionManager.lockNow();
}

export function getSessionPin(): string {
  return sessionManager.getSessionPin();
}

export function extendSession(ttlMs: number): void {
  sessionManager.extendLock(ttlMs);
}

export function getUnlockDuration(): number {
  return sessionManager.getUnlockDuration();
}

// Storage API
export async function loadState(): Promise<WalletState | null> {
  return WalletStorage.loadState();
}

export async function saveState(state: WalletState): Promise<void> {
  return WalletStorage.saveState(state);
}

export async function clearAllData(): Promise<void> {
  sessionManager.lockNow();
  return WalletStorage.clearAll();
}

// Account API
export async function decryptAccount<T = any>(
  account: StoredAccount
): Promise<T> {
  return AccountManager.decryptAccount<T>(account);
}
