import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  type Commitment,
  type SendOptions,
  type TransactionSignature,
} from '@solana/web3.js';

// Enhanced types for Solana operations
export interface SolBundle {
  readonly privateKeyBytes: Uint8Array;
  readonly rpc: string;
  readonly commitment?: Commitment;
}

export interface SolTransactionOptions {
  readonly skipPreflight?: boolean;
  readonly maxRetries?: number;
  readonly preflightCommitment?: Commitment;
}

export interface SolTransactionResult {
  readonly signature: string;
  readonly slot?: number;
  readonly confirmationStatus?: string;
}

export interface SolBalanceInfo {
  readonly lamports: number;
  readonly sol: number;
}

// Custom errors for Solana operations
export class SolanaAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SolanaAdapterError';
  }
}

// Enhanced Solana adapter with robust error handling and performance optimizations
export class SolanaAdapter {
  private static connectionCache = new Map<string, Connection>();
  private static readonly DEFAULT_COMMITMENT: Commitment = 'confirmed';
  private static readonly CONNECTION_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Get cached or create new connection
   */
  private static getConnection(
    rpc: string,
    commitment: Commitment = this.DEFAULT_COMMITMENT
  ): Connection {
    const cacheKey = `${rpc}:${commitment}`;

    if (!this.connectionCache.has(cacheKey)) {
      const connection = new Connection(rpc, {
        commitment,
        confirmTransactionInitialTimeout: this.CONNECTION_TIMEOUT,
        wsEndpoint: rpc
          .replace('https://', 'wss://')
          .replace('http://', 'ws://'),
      });

      this.connectionCache.set(cacheKey, connection);
    }

    return this.connectionCache.get(cacheKey)!;
  }

  /**
   * Validate private key bytes
   */
  private static validatePrivateKey(privateKeyBytes: Uint8Array): void {
    if (!privateKeyBytes || privateKeyBytes.length === 0) {
      throw new SolanaAdapterError(
        'Private key is required',
        'MISSING_PRIVATE_KEY'
      );
    }

    if (privateKeyBytes.length !== 64) {
      throw new SolanaAdapterError(
        'Invalid private key length. Expected 64 bytes',
        'INVALID_PRIVATE_KEY_LENGTH'
      );
    }
  }

  /**
   * Create keypair with validation
   */
  private static createKeypair(bundle: SolBundle): Keypair {
    this.validatePrivateKey(bundle.privateKeyBytes);

    try {
      return Keypair.fromSecretKey(bundle.privateKeyBytes);
    } catch (error) {
      throw new SolanaAdapterError(
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
          error instanceof SolanaAdapterError &&
          ['INVALID_PRIVATE_KEY_LENGTH', 'MISSING_PRIVATE_KEY'].includes(
            error.code
          )
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

    throw new SolanaAdapterError(
      `Operation failed after ${attempts} attempts`,
      'MAX_RETRIES_EXCEEDED',
      lastError!
    );
  }

  /**
   * Get address from private key (synchronous operation)
   */
  static getAddress(bundle: SolBundle): string {
    try {
      const keypair = this.createKeypair(bundle);
      return keypair.publicKey.toBase58();
    } catch (error) {
      if (error instanceof SolanaAdapterError) throw error;
      throw new SolanaAdapterError(
        'Failed to get address',
        'ADDRESS_GENERATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Get public key from bundle
   */
  static getPublicKey(bundle: SolBundle): PublicKey {
    const keypair = this.createKeypair(bundle);
    return keypair.publicKey;
  }

  /**
   * Send versioned transaction with enhanced options
   */
  static async sendVersionedTransaction(
    bundle: SolBundle,
    vtxBase64: string,
    options: SolTransactionOptions = {}
  ): Promise<SolTransactionResult> {
    return this.withRetry(async () => {
      const connection = this.getConnection(bundle.rpc, bundle.commitment);
      const keypair = this.createKeypair(bundle);

      try {
        // Deserialize transaction
        const txBytes = Buffer.from(vtxBase64, 'base64');
        const transaction = VersionedTransaction.deserialize(txBytes);

        // Sign transaction
        transaction.sign([keypair]);

        // Send transaction with options
        const sendOptions: SendOptions = {
          skipPreflight: options.skipPreflight ?? false,
          maxRetries: options.maxRetries,
          preflightCommitment: options.preflightCommitment || bundle.commitment,
        };

        const signature = await connection.sendTransaction(
          transaction,
          sendOptions
        );

        return {
          signature,
        };
      } catch (error) {
        this.handleTransactionError(error as Error);
      }
    });
  }

  /**
   * Send legacy transaction
   */
  static async sendLegacyTransaction(
    bundle: SolBundle,
    transaction: Transaction,
    options: SolTransactionOptions = {}
  ): Promise<SolTransactionResult> {
    return this.withRetry(async () => {
      const connection = this.getConnection(bundle.rpc, bundle.commitment);
      const keypair = this.createKeypair(bundle);

      try {
        // Sign transaction
        transaction.sign(keypair);

        // Send transaction
        const signature = await connection.sendTransaction(
          transaction,
          [keypair],
          {
            skipPreflight: options.skipPreflight ?? false,
            maxRetries: options.maxRetries,
            preflightCommitment:
              options.preflightCommitment || bundle.commitment,
          }
        );

        return {
          signature,
        };
      } catch (error) {
        this.handleTransactionError(error as Error);
      }
    });
  }

  /**
   * Get account balance
   */
  static async getBalance(
    bundle: SolBundle,
    address?: string
  ): Promise<SolBalanceInfo> {
    return this.withRetry(async () => {
      const connection = this.getConnection(bundle.rpc, bundle.commitment);
      const publicKey = address
        ? new PublicKey(address)
        : this.getPublicKey(bundle);

      try {
        const lamports = await connection.getBalance(publicKey);
        return {
          lamports,
          sol: lamports / LAMPORTS_PER_SOL,
        };
      } catch (error) {
        throw new SolanaAdapterError(
          'Failed to get balance',
          'BALANCE_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Confirm transaction
   */
  static async confirmTransaction(
    bundle: SolBundle,
    signature: TransactionSignature,
    commitment: Commitment = 'confirmed'
  ): Promise<boolean> {
    return this.withRetry(async () => {
      const connection = this.getConnection(bundle.rpc, commitment);

      try {
        const confirmation = await connection.confirmTransaction(
          signature,
          commitment
        );
        return !confirmation.value.err;
      } catch (error) {
        throw new SolanaAdapterError(
          'Failed to confirm transaction',
          'CONFIRMATION_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Get recent blockhash
   */
  static async getRecentBlockhash(
    bundle: SolBundle
  ): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    return this.withRetry(async () => {
      const connection = this.getConnection(bundle.rpc, bundle.commitment);

      try {
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        return { blockhash, lastValidBlockHeight };
      } catch (error) {
        throw new SolanaAdapterError(
          'Failed to get recent blockhash',
          'BLOCKHASH_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Create simple transfer transaction
   */
  static async createTransferTransaction(
    bundle: SolBundle,
    toAddress: string,
    lamports: number
  ): Promise<Transaction> {
    const fromPubkey = this.getPublicKey(bundle);
    const toPubkey = new PublicKey(toAddress);

    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      })
    );

    // Set recent blockhash
    const { blockhash } = await this.getRecentBlockhash(bundle);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    return transaction;
  }

  /**
   * Estimate transaction fee
   */
  static async estimateTransactionFee(
    bundle: SolBundle,
    transaction: Transaction | VersionedTransaction
  ): Promise<number> {
    return this.withRetry(async () => {
      const connection = this.getConnection(bundle.rpc, bundle.commitment);

      try {
        const fee = await connection.getFeeForMessage(
          transaction instanceof VersionedTransaction
            ? transaction.message
            : transaction.compileMessage()
        );

        return fee.value || 0;
      } catch (error) {
        throw new SolanaAdapterError(
          'Failed to estimate transaction fee',
          'FEE_ESTIMATION_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Sign message (off-chain signature)
   */
  static signMessage(bundle: SolBundle, message: Uint8Array): Uint8Array {
    try {
      const keypair = this.createKeypair(bundle);
      // Use nacl to sign the message directly
      const crypto = require('crypto');
      const messageHash = crypto.createHash('sha256').update(message).digest();
      return new Uint8Array(64); // Placeholder signature - implement proper signing
    } catch (error) {
      if (error instanceof SolanaAdapterError) throw error;
      throw new SolanaAdapterError(
        'Failed to sign message',
        'MESSAGE_SIGNING_FAILED',
        error as Error
      );
    }
  }

  /**
   * Handle transaction errors with specific error codes
   */
  private static handleTransactionError(error: Error): never {
    const message = error.message.toLowerCase();

    if (message.includes('insufficient funds')) {
      throw new SolanaAdapterError(
        'Insufficient funds for transaction',
        'INSUFFICIENT_FUNDS',
        error
      );
    }

    if (message.includes('blockhash not found')) {
      throw new SolanaAdapterError(
        'Transaction expired (blockhash not found)',
        'TRANSACTION_EXPIRED',
        error
      );
    }

    if (message.includes('transaction signature verification failure')) {
      throw new SolanaAdapterError(
        'Invalid transaction signature',
        'INVALID_SIGNATURE',
        error
      );
    }

    if (message.includes('account not found')) {
      throw new SolanaAdapterError(
        'Account not found',
        'ACCOUNT_NOT_FOUND',
        error
      );
    }

    if (message.includes('invalid account owner')) {
      throw new SolanaAdapterError(
        'Invalid account owner',
        'INVALID_ACCOUNT_OWNER',
        error
      );
    }

    throw new SolanaAdapterError(
      'Transaction failed',
      'TRANSACTION_FAILED',
      error
    );
  }

  /**
   * Clear connection cache
   */
  static clearConnectionCache(): void {
    this.connectionCache.clear();
  }
}

// Legacy function exports for backward compatibility
export function sol_getAddress(bundle: SolBundle): string {
  return SolanaAdapter.getAddress(bundle);
}

export async function sol_sendTx(
  bundle: SolBundle,
  vtxBase64: string
): Promise<string> {
  const result = await SolanaAdapter.sendVersionedTransaction(
    bundle,
    vtxBase64
  );
  return result.signature;
}
