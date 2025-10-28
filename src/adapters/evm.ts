import {
  ethers,
  type TransactionRequest,
  type TransactionResponse,
} from 'ethers';

// Enhanced types with validation
export interface EvmSignerBundle {
  readonly privateKeyHex: string;
  readonly chainRpc: string;
  readonly chainId?: number;
}

export interface EvmTransactionRequest extends TransactionRequest {
  readonly chainId?: number;
}

export interface EvmTransactionResult {
  readonly hash: string;
  readonly nonce: number;
  readonly gasPrice?: bigint;
  readonly gasLimit: bigint;
  readonly to?: string;
  readonly value?: bigint;
  readonly data?: string;
}

export interface EvmSignMessageRequest {
  readonly message: string;
  readonly messageType?: 'personal' | 'typed';
  readonly typedData?: any;
}

// Custom errors for better error handling
export class EvmAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'EvmAdapterError';
  }
}

// Enhanced EVM adapter with robust error handling and performance optimizations
export class EvmAdapter {
  private static providerCache = new Map<string, ethers.JsonRpcProvider>();
  private static readonly PROVIDER_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Get cached or create new provider with timeout configuration
   */
  private static getProvider(rpc: string): ethers.JsonRpcProvider {
    if (!this.providerCache.has(rpc)) {
      const provider = new ethers.JsonRpcProvider(rpc, undefined, {
        staticNetwork: true, // Optimize for known networks
        polling: false, // Disable automatic polling
      });

      // Set timeouts
      provider.pollingInterval = 4000;
      this.providerCache.set(rpc, provider);
    }

    return this.providerCache.get(rpc)!;
  }

  /**
   * Validate private key format
   */
  private static validatePrivateKey(privateKeyHex: string): void {
    if (!privateKeyHex) {
      throw new EvmAdapterError(
        'Private key is required',
        'MISSING_PRIVATE_KEY'
      );
    }

    // Remove 0x prefix if present
    const cleanKey = privateKeyHex.startsWith('0x')
      ? privateKeyHex.slice(2)
      : privateKeyHex;

    if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
      throw new EvmAdapterError(
        'Invalid private key format',
        'INVALID_PRIVATE_KEY'
      );
    }
  }

  /**
   * Create wallet with validation
   */
  private static createWallet(
    bundle: EvmSignerBundle,
    provider?: ethers.JsonRpcProvider
  ): ethers.Wallet {
    this.validatePrivateKey(bundle.privateKeyHex);

    try {
      const wallet = new ethers.Wallet(bundle.privateKeyHex, provider);
      return wallet;
    } catch (error) {
      throw new EvmAdapterError(
        'Failed to create wallet',
        'WALLET_CREATION_FAILED',
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
          error instanceof EvmAdapterError &&
          ['INVALID_PRIVATE_KEY', 'MISSING_PRIVATE_KEY'].includes(error.code)
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

    throw new EvmAdapterError(
      `Operation failed after ${attempts} attempts`,
      'MAX_RETRIES_EXCEEDED',
      lastError!
    );
  }

  /**
   * Get address from private key (synchronous operation)
   */
  static getAddress(bundle: EvmSignerBundle): string {
    try {
      const wallet = this.createWallet(bundle);
      return wallet.address;
    } catch (error) {
      if (error instanceof EvmAdapterError) throw error;
      throw new EvmAdapterError(
        'Failed to get address',
        'ADDRESS_GENERATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Sign a message with enhanced type support
   */
  static async signMessage(
    bundle: EvmSignerBundle,
    request: EvmSignMessageRequest
  ): Promise<string> {
    return this.withRetry(async () => {
      const wallet = this.createWallet(bundle);

      try {
        if (request.messageType === 'typed' && request.typedData) {
          // EIP-712 typed data signing
          const { domain, types, message } = request.typedData;
          return await wallet.signTypedData(domain, types, message);
        } else {
          // Personal message signing (EIP-191)
          // If message is hex-encoded, convert to bytes for proper signing
          let messageToSign: string | Uint8Array = request.message;

          if (
            typeof request.message === 'string' &&
            request.message.startsWith('0x')
          ) {
            // Hex-encoded message - convert to bytes
            // ethers.js will properly handle the bytes and add EIP-191 prefix
            messageToSign = ethers.getBytes(request.message);
          }

          return await wallet.signMessage(messageToSign);
        }
      } catch (error) {
        throw new EvmAdapterError(
          'Failed to sign message',
          'MESSAGE_SIGNING_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Send transaction with enhanced validation and monitoring
   */
  static async sendTransaction(
    bundle: EvmSignerBundle,
    tx: EvmTransactionRequest
  ): Promise<EvmTransactionResult> {
    return this.withRetry(async () => {
      const provider = this.getProvider(bundle.chainRpc);
      const wallet = this.createWallet(bundle, provider);

      try {
        // Validate transaction
        this.validateTransaction(tx);

        // Set chain ID if not provided
        if (!tx.chainId && bundle.chainId) {
          tx = { ...tx, chainId: bundle.chainId };
        }

        // Send transaction with timeout
        const sentTx = await Promise.race([
          wallet.sendTransaction(tx),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Transaction timeout')),
              this.PROVIDER_TIMEOUT
            )
          ),
        ]);

        return this.formatTransactionResult(sentTx);
      } catch (error) {
        this.handleTransactionError(error as Error);
      }
    });
  }

  /**
   * Estimate gas for transaction
   */
  static async estimateGas(
    rpc: string,
    tx: EvmTransactionRequest
  ): Promise<bigint> {
    return this.withRetry(async () => {
      const provider = this.getProvider(rpc);

      try {
        this.validateTransaction(tx);

        const gasEstimate = await Promise.race([
          provider.estimateGas(tx),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Gas estimation timeout')),
              this.PROVIDER_TIMEOUT
            )
          ),
        ]);

        return gasEstimate;
      } catch (error) {
        throw new EvmAdapterError(
          'Failed to estimate gas',
          'GAS_ESTIMATION_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Get current gas price
   */
  static async getGasPrice(rpc: string): Promise<bigint> {
    return this.withRetry(async () => {
      const provider = this.getProvider(rpc);

      try {
        const feeData = await provider.getFeeData();
        return feeData.gasPrice || 0n;
      } catch (error) {
        throw new EvmAdapterError(
          'Failed to get gas price',
          'GAS_PRICE_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Get transaction count (nonce)
   */
  static async getTransactionCount(
    rpc: string,
    address: string
  ): Promise<number> {
    return this.withRetry(async () => {
      const provider = this.getProvider(rpc);

      try {
        return await provider.getTransactionCount(address, 'pending');
      } catch (error) {
        throw new EvmAdapterError(
          'Failed to get transaction count',
          'NONCE_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Get balance for address
   */
  static async getBalance(rpc: string, address: string): Promise<bigint> {
    return this.withRetry(async () => {
      const provider = this.getProvider(rpc);

      try {
        return await provider.getBalance(address);
      } catch (error) {
        throw new EvmAdapterError(
          'Failed to get balance',
          'BALANCE_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Wait for transaction confirmation
   */
  static async waitForTransaction(
    rpc: string,
    txHash: string,
    confirmations: number = 1,
    timeout: number = 300000 // 5 minutes
  ): Promise<ethers.TransactionReceipt | null> {
    const provider = this.getProvider(rpc);

    try {
      return await provider.waitForTransaction(txHash, confirmations, timeout);
    } catch (error) {
      throw new EvmAdapterError(
        'Transaction confirmation failed',
        'CONFIRMATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Validate transaction structure
   */
  private static validateTransaction(tx: EvmTransactionRequest): void {
    if (!tx.to && !tx.data) {
      throw new EvmAdapterError(
        'Transaction must have either "to" address or "data"',
        'INVALID_TRANSACTION'
      );
    }

    if (tx.value && BigInt(tx.value.toString()) < 0n) {
      throw new EvmAdapterError(
        'Transaction value cannot be negative',
        'INVALID_VALUE'
      );
    }

    if (tx.gasLimit && BigInt(tx.gasLimit.toString()) <= 0n) {
      throw new EvmAdapterError(
        'Gas limit must be positive',
        'INVALID_GAS_LIMIT'
      );
    }
  }

  /**
   * Format transaction result
   */
  private static formatTransactionResult(
    tx: TransactionResponse
  ): EvmTransactionResult {
    return {
      hash: tx.hash,
      nonce: tx.nonce,
      gasPrice: tx.gasPrice || undefined,
      gasLimit: tx.gasLimit,
      to: tx.to || undefined,
      value: tx.value || undefined,
      data: tx.data || undefined,
    };
  }

  /**
   * Handle transaction errors with specific error codes
   */
  private static handleTransactionError(error: Error): never {
    const message = error.message.toLowerCase();

    if (message.includes('insufficient funds')) {
      throw new EvmAdapterError(
        'Insufficient funds for transaction',
        'INSUFFICIENT_FUNDS',
        error
      );
    }

    if (
      message.includes('gas too low') ||
      message.includes('intrinsic gas too low')
    ) {
      throw new EvmAdapterError('Gas limit too low', 'GAS_TOO_LOW', error);
    }

    if (message.includes('gas price too low')) {
      throw new EvmAdapterError(
        'Gas price too low',
        'GAS_PRICE_TOO_LOW',
        error
      );
    }

    if (message.includes('nonce too low')) {
      throw new EvmAdapterError('Nonce too low', 'NONCE_TOO_LOW', error);
    }

    if (message.includes('nonce too high')) {
      throw new EvmAdapterError('Nonce too high', 'NONCE_TOO_HIGH', error);
    }

    if (message.includes('replacement underpriced')) {
      throw new EvmAdapterError(
        'Replacement transaction underpriced',
        'REPLACEMENT_UNDERPRICED',
        error
      );
    }

    throw new EvmAdapterError(
      'Transaction failed',
      'TRANSACTION_FAILED',
      error
    );
  }

  /**
   * Clear provider cache (useful for testing or network changes)
   */
  static clearProviderCache(): void {
    this.providerCache.clear();
  }
}

// Legacy function exports for backward compatibility
export async function evm_getAddress(bundle: EvmSignerBundle): Promise<string> {
  return EvmAdapter.getAddress(bundle);
}

export async function evm_signMessage(
  bundle: EvmSignerBundle,
  message: string
): Promise<string> {
  return EvmAdapter.signMessage(bundle, { message, messageType: 'personal' });
}

export async function evm_sendTransaction(
  bundle: EvmSignerBundle,
  tx: TransactionRequest
): Promise<string> {
  // Convert TransactionRequest to EvmTransactionRequest
  const evmTx: EvmTransactionRequest = {
    ...tx,
    chainId: tx.chainId ? Number(tx.chainId) : undefined,
  };
  const result = await EvmAdapter.sendTransaction(bundle, evmTx);
  return result.hash;
}

export async function evm_estimateGas(
  rpc: string,
  tx: TransactionRequest
): Promise<string> {
  // Convert TransactionRequest to EvmTransactionRequest
  const evmTx: EvmTransactionRequest = {
    ...tx,
    chainId: tx.chainId ? Number(tx.chainId) : undefined,
  };
  const gas = await EvmAdapter.estimateGas(rpc, evmTx);
  return gas.toString();
}
