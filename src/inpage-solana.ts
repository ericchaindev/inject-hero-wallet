// Import Node.js polyfills for browser (Buffer, process)
import './polyfills';

// Solana Provider for Hero Wallet - IIFE Wrapped for Isolation
// Based on Wallet Standard and Phantom Wallet API

(function () {
  'use strict';

  type SolanaRequestArgs = {
    method: string;
    params?: unknown;
  };

  type SolanaEvent = 'connect' | 'disconnect' | 'accountChanged';

  interface SolanaProvider {
    isPhantom?: boolean;
    isHeroWallet?: boolean;
    publicKey: { toBase58(): string } | null;
    connect(opts?: {
      onlyIfTrusted?: boolean;
    }): Promise<{ publicKey: { toBase58(): string } }>;
    disconnect(): Promise<void>;
    signAndSendTransaction(
      transaction: unknown
    ): Promise<{ signature: string }>;
    signTransaction(transaction: unknown): Promise<unknown>;
    signAllTransactions(transactions: unknown[]): Promise<unknown[]>;
    signMessage(
      message: Uint8Array,
      display?: string
    ): Promise<{ signature: Uint8Array }>;
    request(args: SolanaRequestArgs): Promise<unknown>;
    on(event: SolanaEvent, handler: (...args: unknown[]) => void): void;
    removeListener(
      event: SolanaEvent,
      handler: (...args: unknown[]) => void
    ): void;
  }

  class HeroSolanaProvider implements SolanaProvider {
    public isPhantom = true; // For compatibility
    public isHeroWallet = true;
    public publicKey: { toBase58(): string } | null = null;

    private events = new Map<string, Set<(...args: unknown[]) => void>>();
    private _connected = false;
    private requestCounter = 0;

    constructor() {
      console.log('🟣 Hero Solana Provider initialized');
      this.setupMessageListener();
    }

    private setupMessageListener(): void {
      window.addEventListener('message', (event) => {
        // Only accept messages from same origin
        if (event.origin !== window.location.origin) return;

        const message = event.data;
        if (message?.target === 'herowallet:cs->inpage-solana') {
          this.handleResponse(message);
        }
      });
    }

    private handleResponse(message: {
      ok: boolean;
      id?: string | number;
      result?: unknown;
      error?: { code: number; message: string };
    }): void {
      console.log('🟣 Solana response received:', message);
      // Handle response events
      if (message.ok && message.result) {
        // Emit events based on result type
        const result = message.result as any;
        if (result.publicKey) {
          this.publicKey = {
            toBase58: () => result.publicKey,
          };
          this._connected = true;
          this.emit('connect', this.publicKey);
        }
      }
    }

    private async sendRequest(
      method: string,
      params?: unknown
    ): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const id = `solana_${Date.now()}_${++this.requestCounter}`;

        console.log(`🟣 Solana request: ${method}`, params);

        // Send message to content script
        window.postMessage(
          {
            target: 'herowallet:inpage->cs-solana',
            request: {
              id,
              method,
              params,
            },
          },
          window.location.origin
        );

        // Setup response handler
        const timeout = setTimeout(() => {
          reject(new Error(`Request timeout: ${method}`));
        }, 30000);

        const handleMessage = (event: MessageEvent) => {
          if (
            event.origin === window.location.origin &&
            event.data?.target === 'herowallet:cs->inpage-solana' &&
            event.data?.id === id
          ) {
            clearTimeout(timeout);
            window.removeEventListener('message', handleMessage);

            if (event.data.ok) {
              resolve(event.data.result);
            } else {
              reject(new Error(event.data.error?.message || 'Request failed'));
            }
          }
        };

        window.addEventListener('message', handleMessage);
      });
    }

    async connect(opts?: {
      onlyIfTrusted?: boolean;
    }): Promise<{ publicKey: { toBase58(): string } }> {
      console.log('🟣 Solana connect requested', opts);

      try {
        const result = (await this.sendRequest('connect', opts)) as {
          publicKey: string;
        };

        this.publicKey = {
          toBase58: () => result.publicKey,
        };
        this._connected = true;

        this.emit('connect', this.publicKey);

        return { publicKey: this.publicKey };
      } catch (error) {
        console.error('❌ Solana connect failed:', error);
        throw error;
      }
    }

    async disconnect(): Promise<void> {
      console.log('🟣 Solana disconnect requested');

      try {
        await this.sendRequest('disconnect');
        this.publicKey = null;
        this._connected = false;
        this.emit('disconnect');
      } catch (error) {
        console.error('❌ Solana disconnect failed:', error);
        throw error;
      }
    }

    async signAndSendTransaction(transaction: unknown): Promise<{
      signature: string;
    }> {
      console.log('🟣 Solana signAndSendTransaction requested');

      if (!this._connected || !this.publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        const result = (await this.sendRequest('signAndSendTransaction', {
          transaction,
        })) as { signature: string };

        return result;
      } catch (error) {
        console.error('❌ Solana signAndSendTransaction failed:', error);
        throw error;
      }
    }

    async signTransaction(transaction: unknown): Promise<unknown> {
      console.log('🟣 Solana signTransaction requested');

      if (!this._connected || !this.publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        return await this.sendRequest('signTransaction', { transaction });
      } catch (error) {
        console.error('❌ Solana signTransaction failed:', error);
        throw error;
      }
    }

    async signAllTransactions(transactions: unknown[]): Promise<unknown[]> {
      console.log('🟣 Solana signAllTransactions requested');

      if (!this._connected || !this.publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        return (await this.sendRequest('signAllTransactions', {
          transactions,
        })) as unknown[];
      } catch (error) {
        console.error('❌ Solana signAllTransactions failed:', error);
        throw error;
      }
    }

    async signMessage(
      message: Uint8Array,
      display?: string
    ): Promise<{ signature: Uint8Array }> {
      console.log('🟣 Solana signMessage requested');

      if (!this._connected || !this.publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        // Convert Uint8Array to base64 for transport
        const messageBase64 = Buffer.from(message).toString('base64');

        const result = (await this.sendRequest('signMessage', {
          message: messageBase64,
          display,
        })) as { signature: string };

        // Convert base64 signature back to Uint8Array
        return {
          signature: new Uint8Array(Buffer.from(result.signature, 'base64')),
        };
      } catch (error) {
        console.error('❌ Solana signMessage failed:', error);
        throw error;
      }
    }

    async request(args: SolanaRequestArgs): Promise<unknown> {
      console.log('🟣 Solana generic request:', args.method);
      return this.sendRequest(args.method, args.params);
    }

    on(event: SolanaEvent, handler: (...args: unknown[]) => void): void {
      if (!this.events.has(event)) {
        this.events.set(event, new Set());
      }
      this.events.get(event)!.add(handler);
    }

    removeListener(
      event: SolanaEvent,
      handler: (...args: unknown[]) => void
    ): void {
      const handlers = this.events.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    }

    private emit(event: SolanaEvent, ...args: unknown[]): void {
      const handlers = this.events.get(event);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(...args);
          } catch (error) {
            console.error(`Error in ${event} handler:`, error);
          }
        });
      }
    }
  }

  // Initialize and inject Solana provider
  console.log('🟣 Initializing Hero Solana Provider...');

  // Create provider instance
  const heroSolana = new HeroSolanaProvider();

  // Inject as window.solana
  Object.defineProperty(window, 'solana', {
    value: heroSolana,
    writable: false,
    configurable: true,
  });

  console.log('✅ window.solana injected successfully');

  // Also make it available as window.phantom for compatibility
  if (!(window as any).phantom) {
    Object.defineProperty(window, 'phantom', {
      value: { solana: heroSolana },
      writable: false,
      configurable: true,
    });
    console.log('✅ window.phantom.solana injected successfully');
  }

  // Announce provider ready
  window.dispatchEvent(
    new CustomEvent('hero-solana-provider-ready', {
      detail: { provider: heroSolana },
    })
  );
})(); // End of main IIFE
