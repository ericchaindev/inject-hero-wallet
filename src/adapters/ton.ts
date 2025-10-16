import nacl from 'tweetnacl';

// Enhanced types for TON operations
export interface TonBundle {
  readonly privateKeyBytes: Uint8Array;
  readonly rpc: string;
  readonly address: string;
  readonly workchain?: number;
}

export interface TonKeyPair {
  readonly publicKey: Uint8Array;
  readonly secretKey: Uint8Array;
}

export interface TonSignatureResult {
  readonly signature: string;
  readonly publicKey: string;
}

export interface TonAddressInfo {
  readonly address: string;
  readonly workchain: number;
  readonly bounceable: boolean;
  readonly testOnly: boolean;
  readonly urlSafe: boolean;
}

// Custom errors for TON operations
export class TonAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'TonAdapterError';
  }
}

// Enhanced TON adapter with robust error handling and extended functionality
export class TonAdapter {
  private static readonly WORKCHAIN_BASE = 0;
  private static readonly WORKCHAIN_MASTER = -1;
  private static readonly SEED_LENGTH = 32;

  /**
   * Validate private key bytes
   */
  private static validatePrivateKey(privateKeyBytes: Uint8Array): void {
    if (!privateKeyBytes || privateKeyBytes.length === 0) {
      throw new TonAdapterError(
        'Private key is required',
        'MISSING_PRIVATE_KEY'
      );
    }

    if (privateKeyBytes.length < this.SEED_LENGTH) {
      throw new TonAdapterError(
        `Private key too short. Expected at least ${this.SEED_LENGTH} bytes`,
        'INVALID_PRIVATE_KEY_LENGTH'
      );
    }
  }

  /**
   * Create keypair with validation
   */
  private static createKeypair(bundle: TonBundle): TonKeyPair {
    this.validatePrivateKey(bundle.privateKeyBytes);

    try {
      // Use first 32 bytes as seed for TON keypair
      const seed = bundle.privateKeyBytes.slice(0, this.SEED_LENGTH);
      const keypair = nacl.sign.keyPair.fromSeed(seed);

      return {
        publicKey: keypair.publicKey,
        secretKey: keypair.secretKey,
      };
    } catch (error) {
      throw new TonAdapterError(
        'Failed to create keypair from private key',
        'KEYPAIR_CREATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Sign message with TON signature format
   */
  static signMessage(
    bundle: TonBundle,
    message: Uint8Array
  ): TonSignatureResult {
    try {
      const keypair = this.createKeypair(bundle);
      const signature = nacl.sign.detached(message, keypair.secretKey);

      return {
        signature: Buffer.from(signature).toString('base64'),
        publicKey: Buffer.from(keypair.publicKey).toString('hex'),
      };
    } catch (error) {
      if (error instanceof TonAdapterError) throw error;
      throw new TonAdapterError(
        'Failed to sign message',
        'MESSAGE_SIGNING_FAILED',
        error as Error
      );
    }
  }

  /**
   * Sign transaction data
   */
  static signTransaction(
    bundle: TonBundle,
    transactionData: Uint8Array
  ): TonSignatureResult {
    try {
      // For TON transactions, we typically need to sign the transaction hash
      const hash = this.hashTransactionData(transactionData);
      return this.signMessage(bundle, hash);
    } catch (error) {
      if (error instanceof TonAdapterError) throw error;
      throw new TonAdapterError(
        'Failed to sign transaction',
        'TRANSACTION_SIGNING_FAILED',
        error as Error
      );
    }
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
      const signatureBytes = Buffer.from(signature, 'base64');
      const publicKeyBytes = Buffer.from(publicKey, 'hex');

      return nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get public key from bundle
   */
  static getPublicKey(bundle: TonBundle): string {
    try {
      const keypair = this.createKeypair(bundle);
      return Buffer.from(keypair.publicKey).toString('hex');
    } catch (error) {
      if (error instanceof TonAdapterError) throw error;
      throw new TonAdapterError(
        'Failed to get public key',
        'PUBLIC_KEY_FAILED',
        error as Error
      );
    }
  }

  /**
   * Derive address from public key (simplified implementation)
   */
  static deriveAddress(bundle: TonBundle): TonAddressInfo {
    try {
      const publicKey = this.getPublicKey(bundle);

      // This is a simplified address derivation
      // In practice, TON addresses are more complex and involve contract deployment
      const hash = this.hashPublicKey(Buffer.from(publicKey, 'hex'));
      const addressBytes = hash.slice(0, 32); // Take first 32 bytes

      // Format as base64url (TON standard)
      const address = Buffer.from(addressBytes)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      return {
        address: `${bundle.workchain || this.WORKCHAIN_BASE}:${address}`,
        workchain: bundle.workchain || this.WORKCHAIN_BASE,
        bounceable: true,
        testOnly: false,
        urlSafe: true,
      };
    } catch (error) {
      if (error instanceof TonAdapterError) throw error;
      throw new TonAdapterError(
        'Failed to derive address',
        'ADDRESS_DERIVATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Create transaction cell (simplified)
   */
  static createTransactionCell(
    fromAddress: string,
    toAddress: string,
    amount: bigint,
    seqno: number,
    message?: string
  ): Uint8Array {
    try {
      // This is a very simplified transaction cell creation
      // In practice, TON uses a complex cell serialization format (TL-B)
      const data = {
        from: fromAddress,
        to: toAddress,
        amount: amount.toString(),
        seqno,
        message: message || '',
        timestamp: Date.now(),
      };

      return new TextEncoder().encode(JSON.stringify(data));
    } catch (error) {
      throw new TonAdapterError(
        'Failed to create transaction cell',
        'CELL_CREATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Hash transaction data (using SHA-256)
   */
  private static hashTransactionData(data: Uint8Array): Uint8Array {
    // Simple SHA-256 hash - in practice, TON might use different hashing
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Use Web Crypto API in browser
      return new Uint8Array(32); // Placeholder - implement proper hashing
    } else {
      // Use Node.js crypto in build environment
      const nodeCrypto = require('crypto');
      const hash = nodeCrypto.createHash('sha256').update(data).digest();
      return new Uint8Array(hash);
    }
  }

  /**
   * Hash public key for address derivation
   */
  private static hashPublicKey(publicKey: Uint8Array): Uint8Array {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Use Web Crypto API in browser
      return new Uint8Array(32); // Placeholder - implement proper hashing
    } else {
      // Use Node.js crypto in build environment
      const nodeCrypto = require('crypto');
      const hash = nodeCrypto.createHash('sha256').update(publicKey).digest();
      return new Uint8Array(hash);
    }
  }

  /**
   * Convert address formats (utility function)
   */
  static convertAddress(
    address: string,
    options: {
      bounceable?: boolean;
      testOnly?: boolean;
      urlSafe?: boolean;
    } = {}
  ): string {
    try {
      // This is a placeholder for address format conversion
      // In practice, TON has specific rules for address formats
      let converted = address;

      if (options.urlSafe) {
        converted = converted.replace(/\+/g, '-').replace(/\//g, '_');
      }

      return converted;
    } catch (error) {
      throw new TonAdapterError(
        'Failed to convert address format',
        'ADDRESS_CONVERSION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Validate TON address format
   */
  static validateAddress(address: string): boolean {
    try {
      // Basic TON address validation
      // Format: workchain:hash (e.g., "0:abc123...")
      const parts = address.split(':');
      if (parts.length !== 2) return false;

      const workchain = parseInt(parts[0]);
      const hash = parts[1];

      // Workchain should be -1 or 0
      if (workchain !== -1 && workchain !== 0) return false;

      // Hash should be valid base64/hex
      return hash.length > 0 && /^[A-Za-z0-9+/\-_=]+$/.test(hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Create message payload for contract interaction
   */
  static createMessagePayload(
    opcode: number,
    data: Record<string, any>
  ): Uint8Array {
    try {
      // Simplified message payload creation
      const payload = {
        op: opcode,
        ...data,
      };

      return new TextEncoder().encode(JSON.stringify(payload));
    } catch (error) {
      throw new TonAdapterError(
        'Failed to create message payload',
        'PAYLOAD_CREATION_FAILED',
        error as Error
      );
    }
  }
}

// Legacy function exports for backward compatibility
export function ton_sign(bundle: TonBundle, message: Uint8Array): string {
  return TonAdapter.signMessage(bundle, message).signature;
}
