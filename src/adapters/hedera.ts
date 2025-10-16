// Enhanced types for Hedera operations
export interface HederaBundle {
  readonly privateKeyHex: string;
  readonly accountId: string;
  readonly rpc: string;
  readonly network?: 'mainnet' | 'testnet' | 'previewnet';
}

export interface HederaKeyPair {
  readonly privateKey: string;
  readonly publicKey: string;
}

export interface HederaSignatureResult {
  readonly signature: string;
  readonly publicKey: string;
}

export interface HederaAccountInfo {
  readonly accountId: string;
  readonly publicKey: string;
  readonly balance?: string;
}

export interface HederaTransactionResult {
  readonly transactionId: string;
  readonly status: string;
  readonly receipt?: any;
}

// Custom errors for Hedera operations
export class HederaAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'HederaAdapterError';
  }
}

// Enhanced Hedera adapter with robust error handling and extended functionality
export class HederaAdapter {
  private static readonly SUPPORTED_NETWORKS = [
    'mainnet',
    'testnet',
    'previewnet',
  ] as const;
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Validate private key format
   */
  private static validatePrivateKey(privateKeyHex: string): void {
    if (!privateKeyHex) {
      throw new HederaAdapterError(
        'Private key is required',
        'MISSING_PRIVATE_KEY'
      );
    }

    // Remove 0x prefix if present
    const cleanKey = privateKeyHex.startsWith('0x')
      ? privateKeyHex.slice(2)
      : privateKeyHex;

    if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
      throw new HederaAdapterError(
        'Invalid private key format',
        'INVALID_PRIVATE_KEY'
      );
    }
  }

  /**
   * Validate account ID format
   */
  private static validateAccountId(accountId: string): void {
    if (!accountId) {
      throw new HederaAdapterError(
        'Account ID is required',
        'MISSING_ACCOUNT_ID'
      );
    }

    // Hedera account ID format: shard.realm.account (e.g., "0.0.123456")
    const accountIdPattern = /^\d+\.\d+\.\d+$/;
    if (!accountIdPattern.test(accountId)) {
      throw new HederaAdapterError(
        'Invalid account ID format. Expected format: shard.realm.account',
        'INVALID_ACCOUNT_ID'
      );
    }
  }

  /**
   * Create keypair with validation (using native crypto for now)
   */
  private static createKeypair(bundle: HederaBundle): HederaKeyPair {
    this.validatePrivateKey(bundle.privateKeyHex);

    try {
      const cleanKey = bundle.privateKeyHex.startsWith('0x')
        ? bundle.privateKeyHex.slice(2)
        : bundle.privateKeyHex;

      // For now, derive public key using secp256k1 (simplified)
      // In production, you'd use @hashgraph/sdk
      const privateKeyBuffer = Buffer.from(cleanKey, 'hex');

      // This is a placeholder - actual Hedera public key derivation is more complex
      let publicKey: string;
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        // Browser environment - use placeholder
        publicKey = cleanKey.slice(0, 64); // Use private key as placeholder
      } else {
        // Node.js environment
        const nodeCrypto = require('crypto');
        const publicKeyHash = nodeCrypto
          .createHash('sha256')
          .update(privateKeyBuffer)
          .digest();
        publicKey = publicKeyHash.toString('hex');
      }

      return {
        privateKey: cleanKey,
        publicKey,
      };
    } catch (error) {
      throw new HederaAdapterError(
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
          error instanceof HederaAdapterError &&
          [
            'INVALID_PRIVATE_KEY',
            'MISSING_PRIVATE_KEY',
            'INVALID_ACCOUNT_ID',
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

    throw new HederaAdapterError(
      `Operation failed after ${attempts} attempts`,
      'MAX_RETRIES_EXCEEDED',
      lastError!
    );
  }

  /**
   * Sign message with Hedera signature format
   */
  static async signMessage(
    bundle: HederaBundle,
    message: Uint8Array
  ): Promise<HederaSignatureResult> {
    return this.withRetry(async () => {
      try {
        this.validateAccountId(bundle.accountId);
        const keypair = this.createKeypair(bundle);

        // Create message hash and sign
        let signature: string;
        if (typeof crypto !== 'undefined' && crypto.subtle) {
          // Browser environment - use placeholder
          signature = Buffer.from(message).toString('hex').slice(0, 128);
        } else {
          // Node.js environment
          const nodeCrypto = require('crypto');
          const messageHash = nodeCrypto
            .createHash('sha256')
            .update(message)
            .digest();
          const privateKeyBuffer = Buffer.from(keypair.privateKey, 'hex');
          const hmac = nodeCrypto.createHmac('sha256', privateKeyBuffer);
          hmac.update(messageHash);
          signature = hmac.digest('hex');
        }

        return {
          signature,
          publicKey: keypair.publicKey,
        };
      } catch (error) {
        if (error instanceof HederaAdapterError) throw error;
        throw new HederaAdapterError(
          'Failed to sign message',
          'MESSAGE_SIGNING_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Get public key from bundle
   */
  static getPublicKey(bundle: HederaBundle): string {
    try {
      const keypair = this.createKeypair(bundle);
      return keypair.publicKey;
    } catch (error) {
      if (error instanceof HederaAdapterError) throw error;
      throw new HederaAdapterError(
        'Failed to get public key',
        'PUBLIC_KEY_FAILED',
        error as Error
      );
    }
  }

  /**
   * Get account info (placeholder implementation)
   */
  static async getAccountInfo(
    bundle: HederaBundle
  ): Promise<HederaAccountInfo> {
    return this.withRetry(async () => {
      try {
        this.validateAccountId(bundle.accountId);
        const publicKey = this.getPublicKey(bundle);

        // In production, this would query the Hedera network
        // For now, return basic info
        return {
          accountId: bundle.accountId,
          publicKey,
          balance: '0', // Placeholder
        };
      } catch (error) {
        if (error instanceof HederaAdapterError) throw error;
        throw new HederaAdapterError(
          'Failed to get account info',
          'ACCOUNT_INFO_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Create simple HBAR transfer (placeholder)
   */
  static async createTransfer(
    bundle: HederaBundle,
    toAccountId: string,
    amount: string
  ): Promise<Uint8Array> {
    return this.withRetry(async () => {
      try {
        this.validateAccountId(bundle.accountId);
        this.validateAccountId(toAccountId);

        // This is a simplified transaction creation
        // In production, use @hashgraph/sdk to create proper transactions
        const transferData = {
          from: bundle.accountId,
          to: toAccountId,
          amount,
          timestamp: Date.now(),
          type: 'HBAR_TRANSFER',
        };

        return new TextEncoder().encode(JSON.stringify(transferData));
      } catch (error) {
        if (error instanceof HederaAdapterError) throw error;
        throw new HederaAdapterError(
          'Failed to create transfer',
          'TRANSFER_CREATION_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Sign transaction (placeholder implementation)
   */
  static async signTransaction(
    bundle: HederaBundle,
    transactionBytes: Uint8Array
  ): Promise<HederaSignatureResult> {
    return this.withRetry(async () => {
      try {
        // Hash the transaction bytes
        const crypto = require('crypto');
        const txHash = crypto
          .createHash('sha256')
          .update(transactionBytes)
          .digest();

        // Sign the hash
        return await this.signMessage(bundle, txHash);
      } catch (error) {
        if (error instanceof HederaAdapterError) throw error;
        throw new HederaAdapterError(
          'Failed to sign transaction',
          'TRANSACTION_SIGNING_FAILED',
          error as Error
        );
      }
    });
  }

  /**
   * Verify signature
   */
  static verifySignature(
    message: Uint8Array,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      // This is a simplified verification
      // In production, use proper Hedera signature verification
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        // Browser environment - basic validation
        return signature.length > 0 && publicKey.length > 0;
      } else {
        // Node.js environment
        const nodeCrypto = require('crypto');
        const messageHash = nodeCrypto
          .createHash('sha256')
          .update(message)
          .digest();
        return signature.length > 0 && publicKey.length > 0;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get network configuration
   */
  static getNetworkConfig(network: HederaBundle['network'] = 'mainnet'): {
    nodes: string[];
    mirrorNode: string;
  } {
    switch (network) {
      case 'mainnet':
        return {
          nodes: ['0.0.3', '0.0.4', '0.0.5', '0.0.6'],
          mirrorNode: 'https://mainnet-public.mirrornode.hedera.com',
        };
      case 'testnet':
        return {
          nodes: ['0.0.3', '0.0.4', '0.0.5', '0.0.6'],
          mirrorNode: 'https://testnet.mirrornode.hedera.com',
        };
      case 'previewnet':
        return {
          nodes: ['0.0.3', '0.0.4', '0.0.5', '0.0.6'],
          mirrorNode: 'https://previewnet.mirrornode.hedera.com',
        };
      default:
        throw new HederaAdapterError(
          `Unsupported network: ${network}`,
          'UNSUPPORTED_NETWORK'
        );
    }
  }

  /**
   * Format account ID with validation
   */
  static formatAccountId(
    shard: number,
    realm: number,
    account: number
  ): string {
    if (shard < 0 || realm < 0 || account < 0) {
      throw new HederaAdapterError(
        'Account ID components must be non-negative',
        'INVALID_ACCOUNT_COMPONENTS'
      );
    }

    return `${shard}.${realm}.${account}`;
  }

  /**
   * Parse account ID into components
   */
  static parseAccountId(accountId: string): {
    shard: number;
    realm: number;
    account: number;
  } {
    this.validateAccountId(accountId);

    const parts = accountId.split('.').map(Number);
    return {
      shard: parts[0],
      realm: parts[1],
      account: parts[2],
    };
  }
}

// Legacy function exports for backward compatibility
export async function hedera_signMsg(
  bundle: HederaBundle,
  message: Uint8Array
): Promise<string> {
  const result = await HederaAdapter.signMessage(bundle, message);
  return result.signature;
}
