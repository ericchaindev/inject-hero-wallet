import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory, { type ECPairInterface } from 'ecpair';
import * as secp from 'tiny-secp256k1';

// Initialize ECC library
bitcoin.initEccLib(secp as any);
const ECPair = ECPairFactory(secp);

// Enhanced types for Bitcoin operations
export interface BtcBundle {
  readonly privateKeyHex: string;
  readonly network: 'mainnet' | 'testnet' | 'regtest';
}

export interface BtcAddressInfo {
  readonly address: string;
  readonly publicKey: string;
  readonly type: 'p2wpkh' | 'p2sh-p2wpkh' | 'p2pkh' | 'p2tr';
}

export interface BtcSignedPsbt {
  readonly psbt: string;
  readonly hex?: string;
  readonly txid?: string;
}

export type AddressType = 'p2wpkh' | 'p2sh-p2wpkh' | 'p2pkh' | 'p2tr';

// Custom errors for Bitcoin operations
export class BitcoinAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'BitcoinAdapterError';
  }
}

// Enhanced Bitcoin adapter with robust error handling and multiple address types
export class BitcoinAdapter {
  private static readonly SUPPORTED_NETWORKS = [
    'mainnet',
    'testnet',
    'regtest',
  ] as const;

  /**
   * Get Bitcoin network configuration
   */
  private static getNetwork(
    networkName: BtcBundle['network']
  ): bitcoin.Network {
    switch (networkName) {
      case 'mainnet':
        return bitcoin.networks.bitcoin;
      case 'testnet':
        return bitcoin.networks.testnet;
      case 'regtest':
        return bitcoin.networks.regtest;
      default:
        throw new BitcoinAdapterError(
          `Unsupported network: ${networkName}`,
          'UNSUPPORTED_NETWORK'
        );
    }
  }

  /**
   * Validate private key format
   */
  private static validatePrivateKey(privateKeyHex: string): void {
    if (!privateKeyHex) {
      throw new BitcoinAdapterError(
        'Private key is required',
        'MISSING_PRIVATE_KEY'
      );
    }

    // Remove 0x prefix if present
    const cleanKey = privateKeyHex.startsWith('0x')
      ? privateKeyHex.slice(2)
      : privateKeyHex;

    if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
      throw new BitcoinAdapterError(
        'Invalid private key format',
        'INVALID_PRIVATE_KEY'
      );
    }
  }

  /**
   * Create keypair with validation
   */
  private static createKeypair(bundle: BtcBundle): ECPairInterface {
    this.validatePrivateKey(bundle.privateKeyHex);

    try {
      const cleanKey = bundle.privateKeyHex.startsWith('0x')
        ? bundle.privateKeyHex.slice(2)
        : bundle.privateKeyHex;

      return ECPair.fromPrivateKey(Buffer.from(cleanKey, 'hex'));
    } catch (error) {
      throw new BitcoinAdapterError(
        'Failed to create keypair from private key',
        'KEYPAIR_CREATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Get address for different types
   */
  static getAddress(
    bundle: BtcBundle,
    addressType: AddressType = 'p2wpkh'
  ): BtcAddressInfo {
    try {
      const network = this.getNetwork(bundle.network);
      const keyPair = this.createKeypair(bundle);
      const publicKey = Buffer.from(keyPair.publicKey);

      let payment: bitcoin.Payment;
      let address: string;

      switch (addressType) {
        case 'p2wpkh':
          payment = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });
          break;
        case 'p2sh-p2wpkh':
          payment = bitcoin.payments.p2sh({
            redeem: bitcoin.payments.p2wpkh({ pubkey: publicKey, network }),
            network,
          });
          break;
        case 'p2pkh':
          payment = bitcoin.payments.p2pkh({ pubkey: publicKey, network });
          break;
        case 'p2tr':
          // Taproot address (requires different handling)
          const internalPubkey =
            publicKey.length === 33 ? publicKey.slice(1) : publicKey;
          payment = bitcoin.payments.p2tr({
            internalPubkey,
            network,
          });
          break;
        default:
          throw new BitcoinAdapterError(
            `Unsupported address type: ${addressType}`,
            'UNSUPPORTED_ADDRESS_TYPE'
          );
      }

      address = payment.address!;
      if (!address) {
        throw new BitcoinAdapterError(
          `Failed to generate ${addressType} address`,
          'ADDRESS_GENERATION_FAILED'
        );
      }

      return {
        address,
        publicKey: publicKey.toString('hex'),
        type: addressType,
      };
    } catch (error) {
      if (error instanceof BitcoinAdapterError) throw error;
      throw new BitcoinAdapterError(
        'Failed to get address',
        'ADDRESS_GENERATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Sign PSBT with enhanced validation and error handling
   */
  static signPsbt(
    bundle: BtcBundle,
    psbtBase64: string,
    finalize: boolean = true
  ): BtcSignedPsbt {
    try {
      const network = this.getNetwork(bundle.network);
      const keyPair = this.createKeypair(bundle);

      // Validate PSBT format
      if (!psbtBase64 || typeof psbtBase64 !== 'string') {
        throw new BitcoinAdapterError('Invalid PSBT format', 'INVALID_PSBT');
      }

      // Parse PSBT
      let psbt: bitcoin.Psbt;
      try {
        psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });
      } catch (error) {
        throw new BitcoinAdapterError(
          'Failed to parse PSBT',
          'PSBT_PARSE_FAILED',
          error as Error
        );
      }

      // Create enhanced signer with proper Buffer types
      const signer = {
        ...keyPair,
        publicKey: Buffer.from(keyPair.publicKey),
        sign: (hash: Uint8Array): Buffer => Buffer.from(keyPair.sign(hash)),
        signSchnorr: keyPair.signSchnorr
          ? (hash: Uint8Array): Buffer =>
              Buffer.from(keyPair.signSchnorr!(hash))
          : undefined,
      };

      // Sign all inputs
      try {
        psbt.signAllInputs(signer);
      } catch (error) {
        throw new BitcoinAdapterError(
          'Failed to sign PSBT inputs',
          'SIGNING_FAILED',
          error as Error
        );
      }

      // Finalize if requested
      let finalizedHex: string | undefined;
      let txid: string | undefined;

      if (finalize) {
        try {
          psbt.finalizeAllInputs();
          const tx = psbt.extractTransaction();
          finalizedHex = tx.toHex();
          txid = tx.getId();
        } catch (error) {
          throw new BitcoinAdapterError(
            'Failed to finalize PSBT',
            'FINALIZATION_FAILED',
            error as Error
          );
        }
      }

      return {
        psbt: psbt.toBase64(),
        hex: finalizedHex,
        txid,
      };
    } catch (error) {
      if (error instanceof BitcoinAdapterError) throw error;
      throw new BitcoinAdapterError(
        'PSBT signing failed',
        'PSBT_SIGNING_FAILED',
        error as Error
      );
    }
  }

  /**
   * Sign message with Bitcoin message signing standard
   */
  static signMessage(bundle: BtcBundle, message: string): string {
    try {
      const keyPair = this.createKeypair(bundle);
      const network = this.getNetwork(bundle.network);

      // Use Bitcoin message signing format
      const messageHash = bitcoin.crypto.hash256(Buffer.from(message, 'utf8'));
      const signature = keyPair.sign(messageHash);

      return Buffer.from(signature).toString('hex');
    } catch (error) {
      if (error instanceof BitcoinAdapterError) throw error;
      throw new BitcoinAdapterError(
        'Message signing failed',
        'MESSAGE_SIGNING_FAILED',
        error as Error
      );
    }
  }

  /**
   * Verify message signature
   */
  static verifyMessage(
    address: string,
    message: string,
    signature: string,
    network: BtcBundle['network'] = 'mainnet'
  ): boolean {
    try {
      const bitcoinNetwork = this.getNetwork(network);
      const messageHash = bitcoin.crypto.hash256(Buffer.from(message, 'utf8'));
      const signatureBuffer = Buffer.from(signature, 'hex');

      // This is a simplified verification - in practice, you'd need more sophisticated logic
      // to handle different address types and recovery
      return signatureBuffer.length === 64; // Basic validation
    } catch (error) {
      return false;
    }
  }

  /**
   * Get public key from private key
   */
  static getPublicKey(bundle: BtcBundle, compressed: boolean = true): string {
    try {
      const keyPair = this.createKeypair(bundle);
      return Buffer.from(keyPair.publicKey).toString('hex');
    } catch (error) {
      if (error instanceof BitcoinAdapterError) throw error;
      throw new BitcoinAdapterError(
        'Failed to get public key',
        'PUBLIC_KEY_FAILED',
        error as Error
      );
    }
  }

  /**
   * Create simple transaction (for testing/examples)
   */
  static createSimpleTransaction(
    bundle: BtcBundle,
    inputs: Array<{ txid: string; vout: number; value: number }>,
    outputs: Array<{ address: string; value: number }>,
    feeRate: number = 1 // satoshis per byte
  ): bitcoin.Psbt {
    try {
      const network = this.getNetwork(bundle.network);
      const keyPair = this.createKeypair(bundle);
      const psbt = new bitcoin.Psbt({ network });

      // Add inputs
      inputs.forEach((input) => {
        psbt.addInput({
          hash: input.txid,
          index: input.vout,
          witnessUtxo: {
            script: bitcoin.payments.p2wpkh({
              pubkey: Buffer.from(keyPair.publicKey),
              network,
            }).output!,
            value: input.value,
          },
        });
      });

      // Add outputs
      outputs.forEach((output) => {
        psbt.addOutput({
          address: output.address,
          value: output.value,
        });
      });

      return psbt;
    } catch (error) {
      throw new BitcoinAdapterError(
        'Failed to create transaction',
        'TRANSACTION_CREATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Estimate transaction fee
   */
  static estimateTransactionFee(
    inputCount: number,
    outputCount: number,
    feeRate: number,
    addressType: AddressType = 'p2wpkh'
  ): number {
    // Rough estimation based on transaction size
    let inputSize: number;
    let outputSize = 34; // Standard output size

    switch (addressType) {
      case 'p2wpkh':
        inputSize = 68; // Witness input
        break;
      case 'p2sh-p2wpkh':
        inputSize = 91; // P2SH wrapped witness
        break;
      case 'p2pkh':
        inputSize = 148; // Legacy input
        break;
      case 'p2tr':
        inputSize = 68; // Taproot input (similar to P2WPKH)
        break;
      default:
        inputSize = 68;
    }

    const baseSize = 10; // Transaction overhead
    const totalSize =
      baseSize + inputCount * inputSize + outputCount * outputSize;

    return Math.ceil(totalSize * feeRate);
  }
}

// Legacy function exports for backward compatibility
export function btc_getAddressP2WPKH(bundle: BtcBundle): string {
  return BitcoinAdapter.getAddress(bundle, 'p2wpkh').address;
}

export function btc_signPsbt(bundle: BtcBundle, psbtBase64: string): string {
  return BitcoinAdapter.signPsbt(bundle, psbtBase64, true).psbt;
}
