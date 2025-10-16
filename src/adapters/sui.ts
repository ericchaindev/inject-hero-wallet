// Enhanced types for Sui operations
export interface SuiBundle {
  readonly privateKeyBase64: string;
  readonly rpc: string;
  readonly requestType?:
    | 'devInspect'
    | 'waitForEffects'
    | 'waitForLocalExecution';
}

export interface SuiTransactionOptions {
  readonly showInput?: boolean;
  readonly showEffects?: boolean;
  readonly showEvents?: boolean;
  readonly showObjectChanges?: boolean;
  readonly showBalanceChanges?: boolean;
}

export interface SuiTransactionResult {
  readonly digest: string;
  readonly effects?: any;
  readonly events?: any[];
  readonly objectChanges?: any[];
  readonly balanceChanges?: any[];
}

export interface SuiBalance {
  readonly coinType: string;
  readonly coinObjectCount: number;
  readonly totalBalance: string;
  readonly lockedBalance?: Record<string, any>;
}

// Custom errors for Sui operations
export class SuiAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SuiAdapterError';
  }
}

// Enhanced Sui adapter with robust error handling and performance optimizations
export class SuiAdapter {
  private static clientCache = new Map<string, any>();
  private static readonly CONNECTION_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Get cached or create new Sui client
   */
  private static async getClient(rpc: string): Promise<any> {
    if (!this.clientCache.has(rpc)) {
      try {
        const { SuiClient } = await import('@mysten/sui.js/client');
        const client = new SuiClient({
          url: rpc,
          // Add timeout configuration if supported
        });
        this.clientCache.set(rpc, client);
      } catch (error) {
        throw new SuiAdapterError(
          'Failed to import Sui SDK',
          'SDK_IMPORT_FAILED',
          error as Error
        );
      }
    }

    return this.clientCache.get(rpc)!;
  }

  /**
   * Validate private key format
   */
  private static validatePrivateKey(privateKeyBase64: string): void {
    if (!privateKeyBase64) {
      throw new SuiAdapterError(
        'Private key is required',
        'MISSING_PRIVATE_KEY'
      );
    }

    try {
      // Validate base64 format
      const decoded = Buffer.from(privateKeyBase64, 'base64');
      if (decoded.length !== 32) {
        throw new SuiAdapterError(
          'Invalid private key length. Expected 32 bytes',
          'INVALID_PRIVATE_KEY_LENGTH'
        );
      }
    } catch (error) {
      throw new SuiAdapterError(
        'Invalid private key format',
        'INVALID_PRIVATE_KEY',
        error as Error
      );
    }
  }

  /**
   * Create keypair with validation
   */
  private static async createKeypair(bundle: SuiBundle): Promise<any> {
    this.validatePrivateKey(bundle.privateKeyBase64);

    try {
      const { Ed25519Keypair } = await import(
        '@mysten/sui.js/keypairs/ed25519'
      );
      const { fromB64 } = await import('@mysten/sui.js/utils');

      return Ed25519Keypair.fromSecretKey(fromB64(bundle.privateKeyBase64));
    } catch (error) {
      throw new SuiAdapterError(
        'Failed to create keypair from private key',
        'KEYPAIR_CREATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Execute operation with retry logic
   */
  private static async withRetry<T>(
    operation: () => Promise<T>,
    attempts: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry for certain error types
        if (
          error instanceof SuiAdapterError &&
          [
            'INVALID_PRIVATE_KEY',
            'MISSING_PRIVATE_KEY',
            'SDK_IMPORT_FAILED',
          ].includes(error.code)
        ) {
          throw error;
        }

        if (i === attempts - 1) break;

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }

    throw new SuiAdapterError(
      `Operation failed after ${attempts} attempts`,
      'MAX_RETRIES_EXCEEDED',
      lastError!
    );
  }

  /**
   * Get address from private key
   */
  static async getAddress(bundle: SuiBundle): Promise<string> {
    return this.withRetry(async () => {
      try {
        const keypair = await this.createKeypair(bundle);
        return keypair.getPublicKey().toSuiAddress();
      } catch (error) {
        if (error instanceof SuiAdapterError) throw error;
        throw new SuiAdapterError(
          'Failed to get address',
          'ADDRESS_GENERATION_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Get public key from bundle
   */
  static async getPublicKey(bundle: SuiBundle): Promise<string> {
    return this.withRetry(async () => {
      try {
        const keypair = await this.createKeypair(bundle);
        return keypair.getPublicKey().toBase64();
      } catch (error) {
        if (error instanceof SuiAdapterError) throw error;
        throw new SuiAdapterError(
          'Failed to get public key',
          'PUBLIC_KEY_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Sign and execute transaction with enhanced options
   */
  static async signAndExecuteTransaction(
    bundle: SuiBundle,
    txBytesBase64: string,
    options: SuiTransactionOptions = {}
  ): Promise<SuiTransactionResult> {
    return this.withRetry(async () => {
      try {
        const { TransactionBlock } = await import(
          '@mysten/sui.js/transactions'
        );
        const { fromB64 } = await import('@mysten/sui.js/utils');

        const keypair = await this.createKeypair(bundle);
        const client = await this.getClient(bundle.rpc);

        // Deserialize the transaction from base64
        const txBytes = fromB64(txBytesBase64);
        const txBlock = TransactionBlock.from(txBytes);

        // Execute with options
        const result = await client.signAndExecuteTransactionBlock({
          transactionBlock: txBlock,
          signer: keypair,
          requestType: bundle.requestType || 'waitForEffects',
          options: {
            showInput: options.showInput ?? false,
            showEffects: options.showEffects ?? true,
            showEvents: options.showEvents ?? false,
            showObjectChanges: options.showObjectChanges ?? false,
            showBalanceChanges: options.showBalanceChanges ?? false,
          },
        });

        return {
          digest: result.digest,
          effects: result.effects,
          events: result.events,
          objectChanges: result.objectChanges,
          balanceChanges: result.balanceChanges,
        };
      } catch (error) {
        this.handleTransactionError(error as Error);
        throw error; // This won't be reached due to handleTransactionError throwing
      }
    });
  }

  /**
   * Sign transaction without executing
   */
  static async signTransaction(
    bundle: SuiBundle,
    txBytesBase64: string
  ): Promise<string> {
    return this.withRetry(async () => {
      try {
        const { TransactionBlock } = await import(
          '@mysten/sui.js/transactions'
        );
        const { fromB64, toB64 } = await import('@mysten/sui.js/utils');

        const keypair = await this.createKeypair(bundle);
        const txBytes = fromB64(txBytesBase64);
        const txBlock = TransactionBlock.from(txBytes);

        const signedTx = await keypair.signTransactionBlock(
          txBlock.serialize()
        );
        return toB64(signedTx.signature);
      } catch (error) {
        throw new SuiAdapterError(
          'Failed to sign transaction',
          'TRANSACTION_SIGNING_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Get account balance
   */
  static async getBalance(
    bundle: SuiBundle,
    coinType?: string
  ): Promise<SuiBalance[]> {
    return this.withRetry(async () => {
      try {
        const address = await this.getAddress(bundle);
        const client = await this.getClient(bundle.rpc);

        if (coinType) {
          const balance = await client.getBalance({
            owner: address,
            coinType,
          });
          return [
            {
              coinType: balance.coinType,
              coinObjectCount: balance.coinObjectCount,
              totalBalance: balance.totalBalance,
              lockedBalance: balance.lockedBalance,
            },
          ];
        } else {
          const balances = await client.getAllBalances({
            owner: address,
          });
          return balances.map((balance: any) => ({
            coinType: balance.coinType,
            coinObjectCount: balance.coinObjectCount,
            totalBalance: balance.totalBalance,
            lockedBalance: balance.lockedBalance,
          }));
        }
      } catch (error) {
        throw new SuiAdapterError(
          'Failed to get balance',
          'BALANCE_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Get transaction details
   */
  static async getTransaction(bundle: SuiBundle, digest: string): Promise<any> {
    return this.withRetry(async () => {
      try {
        const client = await this.getClient(bundle.rpc);
        return await client.getTransactionBlock({
          digest,
          options: {
            showInput: true,
            showEffects: true,
            showEvents: true,
            showObjectChanges: true,
            showBalanceChanges: true,
          },
        });
      } catch (error) {
        throw new SuiAdapterError(
          'Failed to get transaction',
          'TRANSACTION_FETCH_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Sign personal message
   */
  static async signMessage(
    bundle: SuiBundle,
    message: Uint8Array
  ): Promise<string> {
    return this.withRetry(async () => {
      try {
        const keypair = await this.createKeypair(bundle);
        const { toB64 } = await import('@mysten/sui.js/utils');

        const signature = await keypair.signPersonalMessage(message);
        return toB64(signature.signature);
      } catch (error) {
        throw new SuiAdapterError(
          'Failed to sign message',
          'MESSAGE_SIGNING_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Create simple transfer transaction
   */
  static async createTransferTransaction(
    bundle: SuiBundle,
    toAddress: string,
    amount: string,
    coinType: string = '0x2::sui::SUI'
  ): Promise<string> {
    return this.withRetry(async () => {
      try {
        const { TransactionBlock } = await import(
          '@mysten/sui.js/transactions'
        );
        const { toB64 } = await import('@mysten/sui.js/utils');

        const fromAddress = await this.getAddress(bundle);
        const txb = new TransactionBlock();

        // Add transfer command
        const [coin] = txb.splitCoins(txb.gas, [txb.pure(amount)]);
        txb.transferObjects([coin], txb.pure(toAddress));

        // Set sender
        txb.setSender(fromAddress);

        // Serialize transaction
        const serializedTx = await txb.build({
          client: await this.getClient(bundle.rpc),
        });

        return toB64(serializedTx);
      } catch (error) {
        throw new SuiAdapterError(
          'Failed to create transfer transaction',
          'TRANSFER_CREATION_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Handle transaction errors with specific error codes
   */
  private static handleTransactionError(error: Error): never {
    const message = error.message.toLowerCase();

    if (message.includes('insufficient') || message.includes('balance')) {
      throw new SuiAdapterError(
        'Insufficient balance for transaction',
        'INSUFFICIENT_BALANCE',
        error
      );
    }

    if (message.includes('invalid signature')) {
      throw new SuiAdapterError(
        'Invalid transaction signature',
        'INVALID_SIGNATURE',
        error
      );
    }

    if (message.includes('object not found')) {
      throw new SuiAdapterError(
        'Referenced object not found',
        'OBJECT_NOT_FOUND',
        error
      );
    }

    if (message.includes('transaction expired')) {
      throw new SuiAdapterError(
        'Transaction expired',
        'TRANSACTION_EXPIRED',
        error
      );
    }

    throw new SuiAdapterError(
      'Transaction failed',
      'TRANSACTION_FAILED',
      error
    );
  }

  /**
   * Clear client cache
   */
  static clearClientCache(): void {
    this.clientCache.clear();
  }
}

// Legacy function exports for backward compatibility
export async function sui_getAddress(bundle: SuiBundle): Promise<string> {
  return SuiAdapter.getAddress(bundle);
}

export async function sui_signAndExecute(
  bundle: SuiBundle,
  txBytesBase64: string
): Promise<any> {
  return SuiAdapter.signAndExecuteTransaction(bundle, txBytesBase64);
}
