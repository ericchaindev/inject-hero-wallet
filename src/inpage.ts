// Type definitions with strict compliance
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// Internal types for communication
type RequestArgs = {
  id?: string | number;
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

type RpcResponse = {
  target: 'herowallet:cs->inpage';
  ok: boolean;
  id?: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type WalletPermission = {
  invoker: string;
  parentCapability: string;
  caveats?: Array<{ type: string; value: unknown }>;
};

// EIP-1193 Provider Events
type ProviderConnectInfo = {
  chainId: string;
};

type ProviderRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

// Standard EIP-1193 Provider interface
interface EIP1193Provider {
  // Core methods
  request(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<unknown>;

  // Event handling
  on(eventName: string, listener: (...args: unknown[]) => void): void;
  removeListener(
    eventName: string,
    listener: (...args: unknown[]) => void
  ): void;

  // Provider identification
  readonly isConnected?: () => boolean;
  readonly chainId?: string;
  readonly selectedAddress?: string | null;
}

// EIP-6963 types
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

// Enhanced HeroProvider class with full EIP-1193 compliance
class HeroProvider implements EIP1193Provider {
  private events = new Map<string, Set<(...args: unknown[]) => void>>();
  private _chainId = '0x1'; // Default to Ethereum mainnet
  private _selectedAddress: string | null = null;
  private _isConnected = false;
  private _accounts: string[] = [];
  private readonly _isHeroWallet = true;
  private readonly _isMetaMask = false; // For compatibility
  private requestTimeouts = new Map<string | number, number>();
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly requestTimeout = 30000; // 30 seconds
  private _networkVersion = '1'; // Network version as string

  private setupErrorHandling(): void {
    // Handle unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener(
        'unhandledrejection',
        this.handleUnhandledRejection.bind(this)
      );
    }
  }

  private handleGlobalError(event: ErrorEvent): void {
    if (event.error?.stack?.includes('HeroProvider')) {
      console.error('Hero Wallet Provider Error:', event.error);
      this.emit('error', event.error);
    }
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    if (event.reason?.stack?.includes('HeroProvider')) {
      console.error('Hero Wallet Provider Unhandled Rejection:', event.reason);
      this.emit('error', event.reason);
    }
  }

  // EIP-1193 compliant request method
  async request<T = unknown>(args: RequestArgs): Promise<T> {
    if (!args || typeof args !== 'object') {
      throw this.createError(4200, 'Invalid request arguments');
    }

    if (!args.method || typeof args.method !== 'string') {
      throw this.createError(
        4200,
        'Method name is required and must be a string'
      );
    }

    const id = args.id ?? this.generateRequestId();
    console.log(`🚀 Hero Wallet: Requesting ${args.method} (ID: ${id})`);

    return await new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        if (id !== undefined && id !== null) {
          const handle = this.requestTimeouts.get(id);
          if (handle !== undefined) {
            clearTimeout(handle);
            this.requestTimeouts.delete(id);
          }
        }
      };

      const onMessage = (ev: MessageEvent<RpcResponse>) => {
        const msg = ev.data;
        if (!msg || msg.target !== 'herowallet:cs->inpage' || msg.id !== id)
          return;

        console.log(
          `📥 Hero Wallet: Response for ${args.method} (ID: ${id})`,
          msg.ok ? '✅' : '❌'
        );

        cleanup();

        if (msg.ok) {
          this.updateInternalState(args.method, msg.result);
          resolve(msg.result as T);
        } else {
          const error = this.createError(
            msg.error?.code || 4001,
            msg.error?.message || 'Request failed',
            msg.error?.data
          );
          reject(error);
        }
      };

      window.addEventListener('message', onMessage);

      const timeoutHandle = window.setTimeout(() => {
        console.warn(`⏰ Hero Wallet: Request ${id} timed out`);
        cleanup();
        reject(this.createError(4901, `Request timeout: ${args.method}`));
      }, this.requestTimeout);

      if (id !== undefined && id !== null) {
        this.requestTimeouts.set(id, timeoutHandle);
      }

      try {
        console.log(
          `📤 Hero Wallet: Sending ${args.method} to content script (ID: ${id})`
        );
        this.postMessage({
          target: 'herowallet:inpage->cs',
          payload: { ...args, id },
        });
      } catch (error) {
        cleanup();
        reject(error as Error);
      }
    });
  }

  private generateRequestId(): string {
    return `hero_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createError(
    code: number,
    message: string,
    data?: unknown
  ): ProviderRpcError {
    return Object.assign(new Error(message), { code, data });
  }

  private postMessage(message: unknown): void {
    try {
      window.postMessage(message, '*');
    } catch (error) {
      console.error('Failed to post message:', error);
      throw this.createError(4900, 'Failed to communicate with wallet');
    }
  }

  private updateInternalState(method: string, result: unknown): void {
    try {
      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          if (Array.isArray(result) && result.length > 0) {
            const newAddress = result[0] as string;
            if (this._selectedAddress !== newAddress) {
              this._selectedAddress = newAddress;
              this._accounts = result as string[];
              this._isConnected = true;
              this.emit('accountsChanged', result);
              this.emit('connect', { chainId: this._chainId });
            }
          } else if (this._selectedAddress !== null) {
            this._selectedAddress = null;
            this._accounts = [];
            this._isConnected = false;
            this.emit('accountsChanged', []);
            this.emit(
              'disconnect',
              this.createError(4900, 'User disconnected')
            );
          }
          break;

        case 'eth_chainId':
          if (typeof result === 'string' && result !== this._chainId) {
            const oldChainId = this._chainId;
            this._chainId = result;
            this._networkVersion = parseInt(result, 16).toString();
            this.emit('chainChanged', result);
            console.log(`Chain changed from ${oldChainId} to ${result}`);
          }
          break;
      }
    } catch (error) {
      console.error('Error updating internal state:', error);
    }
  }

  // Ethereum provider compatibility getters
  get accounts(): string[] {
    return this._selectedAddress ? [this._selectedAddress] : [];
  }

  get networkVersion(): string {
    return this._networkVersion;
  }

  set networkVersion(version: string) {
    this._networkVersion = version;
  }

  get selectedAddress(): string | null {
    return this._selectedAddress;
  }

  set selectedAddress(address: string | null) {
    this._selectedAddress = address;
  }

  get chainId(): string {
    return this._chainId;
  }

  set chainId(id: string) {
    this._chainId = id;
  }

  get connected(): boolean {
    return this._isConnected;
  }

  set connected(status: boolean) {
    this._isConnected = status;
  }

  // Additional Ethereum provider compatibility properties
  get isHeroWallet(): boolean {
    return this._isHeroWallet;
  }

  get isMetaMask(): boolean {
    return this._isMetaMask;
  }

  // Legacy provider compatibility
  get autoRefreshOnNetworkChange(): boolean {
    return false;
  }

  get listeners(): Record<string, ((...args: unknown[]) => void)[]> {
    const listenersObj: Record<string, ((...args: unknown[]) => void)[]> = {};
    this.events.forEach((listeners, eventName) => {
      listenersObj[eventName] = Array.from(listeners);
    });
    return listenersObj;
  }

  set listeners(obj: Record<string, ((...args: unknown[]) => void)[]>) {
    this.events.clear();
    Object.entries(obj).forEach(([eventName, listeners]) => {
      this.events.set(eventName, new Set(listeners));
    });
  }

  // Enhanced event handling with type safety
  on(eventName: string, listener: (...args: unknown[]) => void): void {
    if (typeof eventName !== 'string' || typeof listener !== 'function') {
      throw this.createError(4200, 'Invalid event listener parameters');
    }
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName)!.add(listener);
  }

  addListener(eventName: string, listener: (...args: unknown[]) => void): void {
    this.on(eventName, listener);
  }

  once(eventName: string, listener: (...args: unknown[]) => void): void {
    const onceWrapper = (...args: unknown[]) => {
      this.removeListener(eventName, onceWrapper);
      listener(...args);
    };
    this.on(eventName, onceWrapper);
  }

  removeListener(
    eventName: string,
    listener: (...args: unknown[]) => void
  ): void {
    const listeners = this.events.get(eventName);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.events.delete(eventName);
      }
    }
  }

  // Alias for removeListener (common in many implementations)
  off(eventName: string, listener: (...args: unknown[]) => void): void {
    this.removeListener(eventName, listener);
  }

  // Remove all listeners for an event
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }

  private emit(eventName: string, ...args: unknown[]): void {
    const listeners = this.events.get(eventName);
    if (listeners && listeners.size > 0) {
      // Use setTimeout to make events asynchronous (EIP-1193 requirement)
      setTimeout(() => {
        listeners.forEach((listener: (...args: unknown[]) => void) => {
          try {
            listener(...args);
          } catch (error) {
            console.error(`Error in ${eventName} listener:`, error);
          }
        });
      }, 0);
    }
  }

  // Connection status
  isConnected(): boolean {
    return this._isConnected && this._selectedAddress !== null;
  }

  // Legacy methods for backward compatibility
  enable(): Promise<string[]> {
    console.warn(
      'ethereum.enable() is deprecated. Use ethereum.request({method: "eth_requestAccounts"}) instead.'
    );
    return this.request({ method: 'eth_requestAccounts' }) as Promise<string[]>;
  }

  send(methodOrPayload: unknown, callbackOrParams?: unknown): unknown {
    console.warn(
      'ethereum.send() is deprecated. Use ethereum.request() instead.'
    );

    if (typeof methodOrPayload === 'string') {
      // Legacy send(method, params) format
      return this.request({
        method: methodOrPayload,
        params: callbackOrParams as unknown[] | Record<string, unknown>,
      });
    } else if (methodOrPayload && typeof methodOrPayload === 'object') {
      // Legacy send(payload, callback) format
      const result = this.request(
        methodOrPayload as {
          method: string;
          params?: unknown[] | Record<string, unknown>;
        }
      );
      if (callbackOrParams && typeof callbackOrParams === 'function') {
        result
          .then((res) => (callbackOrParams as Function)(null, { result: res }))
          .catch((err) => (callbackOrParams as Function)(err));
      }
      return result;
    }

    throw this.createError(4200, 'Invalid send() arguments');
  }

  sendAsync(
    payload: { method: string; params?: unknown[] | Record<string, unknown> },
    callback: (error: Error | null, result?: { result: unknown }) => void
  ): void {
    console.warn(
      'ethereum.sendAsync() is deprecated. Use ethereum.request() instead.'
    );

    if (typeof callback !== 'function') {
      throw this.createError(4200, 'Callback function required for sendAsync');
    }

    this.request(payload)
      .then((result) => callback(null, { result }))
      .catch((error) => callback(error));
  }

  // Additional utility methods
  async getChainId(): Promise<string> {
    return this.request({ method: 'eth_chainId' }) as Promise<string>;
  }

  async getAccounts(): Promise<string[]> {
    return this.request({ method: 'eth_accounts' }) as Promise<string[]>;
  }

  async requestAccounts(): Promise<string[]> {
    return this.request({ method: 'eth_requestAccounts' }) as Promise<string[]>;
  }

  // Additional utility methods for better dApp compatibility
  async getNetworkVersion(): Promise<string> {
    const chainId = await this.getChainId();
    return parseInt(chainId, 16).toString();
  }

  async getBalance(address?: string): Promise<string> {
    const account = address || this._selectedAddress;
    if (!account) {
      throw this.createError(4100, 'No account selected');
    }
    return this.request({
      method: 'eth_getBalance',
      params: [account, 'latest'],
    }) as Promise<string>;
  }

  async getBlockNumber(): Promise<string> {
    return this.request({ method: 'eth_blockNumber' }) as Promise<string>;
  }

  async getGasPrice(): Promise<string> {
    return this.request({ method: 'eth_gasPrice' }) as Promise<string>;
  }

  // Permission management methods
  async requestPermissions(
    permissions: { eth_accounts: {} }[]
  ): Promise<WalletPermission[]> {
    const requested =
      permissions && permissions.length > 0
        ? permissions
        : [{ eth_accounts: {} }];
    return this.request({
      method: 'wallet_requestPermissions',
      params: requested,
    }) as Promise<WalletPermission[]>;
  }

  async getPermissions(): Promise<WalletPermission[]> {
    return this.request({
      method: 'wallet_getPermissions',
    }) as Promise<WalletPermission[]>;
  }

  // Test method to verify communication
  async ping(): Promise<{ pong: boolean; timestamp: number }> {
    console.log('🏓 Sending ping to background script');
    return this.request({ method: 'herowallet_ping' }) as Promise<{
      pong: boolean;
      timestamp: number;
    }>;
  }

  // Global debugging method
  static debugTest(): void {
    if (
      typeof window !== 'undefined' &&
      (window as any).ethereum?.isHeroWallet
    ) {
      console.log('🧪 Running Hero Wallet debug test...');
      const provider = (window as any).ethereum;
      provider
        .ping()
        .then((result: any) => {
          console.log('✅ Debug test successful:', result);
        })
        .catch((error: any) => {
          console.error('❌ Debug test failed:', error);
        });
    } else {
      console.error('❌ Hero Wallet provider not found');
    }
  }
}

(() => {
  console.log('Hero Wallet inpage script loaded at:', document.readyState);
  console.log(
    'Current window.ethereum:',
    (window as any).ethereum ? 'exists' : 'not found'
  );

  const provider = new HeroProvider();

  const registerWithProvidersArray = (existing: any | undefined) => {
    const registry: any[] = Array.isArray(existing?.providers)
      ? [...existing.providers]
      : existing
      ? [existing]
      : [];

    if (!registry.includes(provider)) {
      registry.push(provider);
    }

    if (existing) {
      try {
        existing.providers = registry;
      } catch (error) {
        console.warn(
          'Hero Wallet: Unable to extend existing providers list',
          error
        );
      }
    }

    (provider as any).providers = registry;

    return registry;
  };

  // Set up window.ethereum while coexisting with other injected wallets
  const setupWindowEthereum = () => {
    const globalAny = window as any;
    const existing = globalAny.ethereum;

    if (!existing) {
      console.log('Hero Wallet: Setting up window.ethereum');
      Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: false,
        configurable: true,
      });
      const registry = registerWithProvidersArray(provider);
      globalAny.heroWalletProviders = registry;
      console.log('✅ Hero Wallet set as window.ethereum');
      window.dispatchEvent(new Event('ethereum#initialized'));
      return;
    }

    console.log('Hero Wallet: window.ethereum already exists:', existing);
    console.log('  isMetaMask:', existing?.isMetaMask);
    console.log('  isHeroWallet:', existing?.isHeroWallet);

    const providersRegistry = registerWithProvidersArray(existing);

    if (!providersRegistry.includes(existing)) {
      providersRegistry.unshift(existing);
    }

    if (!providersRegistry.includes(provider)) {
      providersRegistry.push(provider);
    }

    try {
      globalAny.ethereum.providers = providersRegistry;
    } catch (error) {
      console.warn(
        'Hero Wallet: Unable to update global providers list',
        error
      );
    }

    globalAny.heroWalletProviders = providersRegistry;

    if (!existing.isMetaMask && !existing.isHeroWallet) {
      console.log(
        'Hero Wallet: Added to provider registry without overriding existing default'
      );
    }
  };

  // Set up immediately
  setupWindowEthereum();

  // Legacy herowallet exposure
  if (!(window as any).herowallet) {
    Object.defineProperty(window, 'herowallet', {
      value: provider,
      writable: false,
    });
    window.dispatchEvent(new Event('herowallet#initialized'));
    console.log('✅ Hero Wallet legacy provider exposed');
  }

  // Expose debug function globally
  if (!(window as any).heroWalletDebugTest) {
    Object.defineProperty(window, 'heroWalletDebugTest', {
      value: HeroProvider.debugTest,
      writable: false,
    });
    console.log('🧪 Hero Wallet debug test function exposed');
  }

  // EIP-6963 provider info
  const info: EIP6963ProviderInfo = {
    uuid: '350670db-19fa-4704-a166-e52e178b59d2', // Static UUID for Hero Wallet
    name: 'Hero Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMwMDc4RkYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik04IDJMMTQgOEw4IDE0TDIgOEw4IDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+',
    rdns: 'com.herowallet',
  };

  // Create the EIP-6963 provider detail
  const providerDetail: EIP6963ProviderDetail = {
    info,
    provider,
  };

  // Create announce event
  const createAnnounceEvent = () => {
    return new CustomEvent('eip6963:announceProvider', {
      detail: providerDetail,
    }) as EIP6963AnnounceProviderEvent;
  };

  // Listen for EIP-6963 discovery requests
  window.addEventListener('eip6963:requestProvider', (event) => {
    console.log('🔍 EIP-6963 provider requested, announcing...', event);
    window.dispatchEvent(createAnnounceEvent());
  });

  // Announce immediately
  console.log('📢 Announcing EIP-6963 provider immediately');
  window.dispatchEvent(createAnnounceEvent());

  // Setup window.ethereum again after a short delay (in case something overrides it)
  setTimeout(() => {
    setupWindowEthereum();
    console.log('📢 Announcing EIP-6963 provider after delay');
    window.dispatchEvent(createAnnounceEvent());
  }, 50);

  // Also announce after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('📄 DOM loaded, re-announcing EIP-6963 provider');
      setupWindowEthereum();
      window.dispatchEvent(createAnnounceEvent());
    });
  }

  // Additional delays for different timing scenarios
  setTimeout(() => {
    console.log('📢 Final EIP-6963 provider announcement (1s)');
    setupWindowEthereum();
    window.dispatchEvent(createAnnounceEvent());
  }, 1000);

  // Log final state
  setTimeout(() => {
    console.log('🔍 Final Hero Wallet state check:');
    console.log('  window.ethereum exists:', !!(window as any).ethereum);
    console.log(
      '  window.ethereum.isHeroWallet:',
      (window as any).ethereum?.isHeroWallet
    );
    console.log('  window.herowallet exists:', !!(window as any).herowallet);
    console.log(
      '  window.herowallet.isHeroWallet:',
      (window as any).herowallet?.isHeroWallet
    );
  }, 2000);
})();
