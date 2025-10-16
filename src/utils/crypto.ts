// Enhanced Cryptographic Utilities with Security Best Practices

// Constants for cryptographic parameters
const CRYPTO_CONFIG = {
  // PBKDF2 configuration - high iteration count for security
  PBKDF2_ITERATIONS: 200000, // Increased from 150k for better security
  PBKDF2_HASH: 'SHA-256',

  // AES-GCM configuration
  AES_KEY_LENGTH: 256,
  AES_IV_LENGTH: 12, // 96 bits for GCM

  // Salt configuration
  SALT_LENGTH: 32, // 256 bits

  // Key derivation algorithm
  KEY_DERIVATION_ALGO: 'PBKDF2',
  ENCRYPTION_ALGO: 'AES-GCM',
} as const;

// Enhanced error types for better error handling
export class CryptoError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

// Secure random generation utilities
export class SecureRandom {
  /**
   * Generate cryptographically secure random bytes
   */
  static generateBytes(length: number): Uint8Array {
    if (length <= 0 || length > 1024 * 1024) {
      throw new CryptoError('Invalid byte length requested', 'INVALID_LENGTH');
    }

    try {
      return crypto.getRandomValues(new Uint8Array(length));
    } catch (error) {
      throw new CryptoError(
        'Failed to generate secure random bytes',
        'RANDOM_GENERATION_FAILED'
      );
    }
  }

  /**
   * Generate secure random salt
   */
  static generateSalt(): Uint8Array {
    return this.generateBytes(CRYPTO_CONFIG.SALT_LENGTH);
  }

  /**
   * Generate secure random IV for AES-GCM
   */
  static generateIV(): Uint8Array {
    return this.generateBytes(CRYPTO_CONFIG.AES_IV_LENGTH);
  }
}

// Enhanced Base64 utilities with validation
export class Base64Utils {
  /**
   * Safely decode base64 string to Uint8Array with validation
   */
  static decode(base64: string): Uint8Array {
    if (!base64 || typeof base64 !== 'string') {
      throw new CryptoError('Invalid base64 input', 'INVALID_BASE64');
    }

    // Validate base64 format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(base64)) {
      throw new CryptoError('Invalid base64 format', 'INVALID_BASE64_FORMAT');
    }

    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return bytes;
    } catch (error) {
      throw new CryptoError('Failed to decode base64', 'BASE64_DECODE_FAILED');
    }
  }

  /**
   * Safely encode Uint8Array to base64 string
   */
  static encode(bytes: Uint8Array): string {
    if (!(bytes instanceof Uint8Array)) {
      throw new CryptoError('Input must be Uint8Array', 'INVALID_INPUT_TYPE');
    }

    try {
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      return btoa(binaryString);
    } catch (error) {
      throw new CryptoError(
        'Failed to encode to base64',
        'BASE64_ENCODE_FAILED'
      );
    }
  }
}

// Enhanced key derivation with security best practices
export class KeyDerivation {
  /**
   * Derive encryption key from PIN using PBKDF2
   */
  static async deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    // Validate inputs
    if (!pin || typeof pin !== 'string') {
      throw new CryptoError(
        'PIN is required and must be a string',
        'INVALID_PIN'
      );
    }

    if (pin.length < 4) {
      throw new CryptoError(
        'PIN must be at least 4 characters',
        'PIN_TOO_SHORT'
      );
    }

    if (
      !(salt instanceof Uint8Array) ||
      salt.length !== CRYPTO_CONFIG.SALT_LENGTH
    ) {
      throw new CryptoError(
        `Salt must be ${CRYPTO_CONFIG.SALT_LENGTH} bytes`,
        'INVALID_SALT'
      );
    }

    try {
      // Import PIN as key material
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(pin),
        CRYPTO_CONFIG.KEY_DERIVATION_ALGO,
        false, // not extractable
        ['deriveKey']
      );

      // Derive AES key using PBKDF2
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: CRYPTO_CONFIG.KEY_DERIVATION_ALGO,
          salt: salt as BufferSource,
          iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
          hash: CRYPTO_CONFIG.PBKDF2_HASH,
        },
        keyMaterial,
        {
          name: CRYPTO_CONFIG.ENCRYPTION_ALGO,
          length: CRYPTO_CONFIG.AES_KEY_LENGTH,
        },
        false, // not extractable for security
        ['encrypt', 'decrypt']
      );

      return derivedKey;
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new CryptoError(
        'Failed to derive encryption key',
        'KEY_DERIVATION_FAILED'
      );
    }
  }

  /**
   * Generate a new salt for key derivation
   */
  static generateSalt(): Uint8Array {
    return SecureRandom.generateSalt();
  }
}

// Enhanced encryption/decryption utilities
export class AESEncryption {
  /**
   * Encrypt data using AES-GCM
   */
  static async encrypt(
    data: string,
    key: CryptoKey,
    iv?: Uint8Array
  ): Promise<{ iv: string; ciphertext: string }> {
    if (!data || typeof data !== 'string') {
      throw new CryptoError('Data must be a non-empty string', 'INVALID_DATA');
    }

    if (!key) {
      throw new CryptoError('Encryption key is required', 'MISSING_KEY');
    }

    try {
      // Generate IV if not provided
      const initVector = iv || SecureRandom.generateIV();

      // Encode data
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);

      // Encrypt data
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: CRYPTO_CONFIG.ENCRYPTION_ALGO,
          iv: initVector as BufferSource,
        },
        key,
        encodedData
      );

      return {
        iv: Base64Utils.encode(initVector),
        ciphertext: Base64Utils.encode(new Uint8Array(encryptedData)),
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new CryptoError('Failed to encrypt data', 'ENCRYPTION_FAILED');
    }
  }

  /**
   * Decrypt data using AES-GCM
   */
  static async decrypt(
    ivB64: string,
    ciphertextB64: string,
    key: CryptoKey
  ): Promise<string> {
    if (!ivB64 || !ciphertextB64 || !key) {
      throw new CryptoError(
        'IV, ciphertext, and key are required',
        'MISSING_DECRYPT_PARAMS'
      );
    }

    try {
      // Decode IV and ciphertext
      const iv = Base64Utils.decode(ivB64);
      const ciphertext = Base64Utils.decode(ciphertextB64);

      // Validate IV length
      if (iv.length !== CRYPTO_CONFIG.AES_IV_LENGTH) {
        throw new CryptoError('Invalid IV length', 'INVALID_IV_LENGTH');
      }

      // Decrypt data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: CRYPTO_CONFIG.ENCRYPTION_ALGO,
          iv: iv as BufferSource,
        },
        key,
        ciphertext as BufferSource
      );

      // Decode result
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        'Failed to decrypt data - invalid PIN or corrupted data',
        'DECRYPTION_FAILED'
      );
    }
  }
}

// Main high-level crypto utilities
export class CryptoUtils {
  /**
   * Encrypt JSON data with PIN
   */
  static async encryptJSON(
    data: unknown,
    pin: string,
    salt?: Uint8Array
  ): Promise<{ iv: string; salt: string; ciphertext: string }> {
    try {
      // Validate and serialize data
      const jsonString = JSON.stringify(data);
      if (!jsonString) {
        throw new CryptoError(
          'Failed to serialize data to JSON',
          'JSON_SERIALIZATION_FAILED'
        );
      }

      // Generate or use provided salt
      const encryptionSalt = salt || KeyDerivation.generateSalt();

      // Derive key
      const key = await KeyDerivation.deriveKey(pin, encryptionSalt);

      // Encrypt data
      const encrypted = await AESEncryption.encrypt(jsonString, key);

      return {
        iv: encrypted.iv,
        salt: Base64Utils.encode(encryptionSalt),
        ciphertext: encrypted.ciphertext,
      };
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        'Failed to encrypt JSON data',
        'JSON_ENCRYPTION_FAILED'
      );
    }
  }

  /**
   * Decrypt JSON data with PIN
   */
  static async decryptJSON<T = unknown>(
    pin: string,
    ivB64: string,
    saltB64: string,
    ciphertextB64: string
  ): Promise<T> {
    try {
      // Decode salt and derive key
      const salt = Base64Utils.decode(saltB64);
      const key = await KeyDerivation.deriveKey(pin, salt);

      // Decrypt data
      const decryptedString = await AESEncryption.decrypt(
        ivB64,
        ciphertextB64,
        key
      );

      // Parse JSON
      const result = JSON.parse(decryptedString);
      return result as T;
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new CryptoError(
          'Decrypted data is not valid JSON',
          'INVALID_JSON'
        );
      }
      throw new CryptoError(
        'Failed to decrypt JSON data',
        'JSON_DECRYPTION_FAILED'
      );
    }
  }

  /**
   * Securely wipe sensitive data from memory (best effort)
   */
  static secureWipe(data: string | Uint8Array): void {
    try {
      if (typeof data === 'string') {
        // For strings, we can only clear the reference
        // JavaScript doesn't provide secure memory wiping
        data = '';
      } else if (data instanceof Uint8Array) {
        // For Uint8Array, fill with random data then zeros
        crypto.getRandomValues(data);
        data.fill(0);
      }
    } catch (error) {
      // Best effort - log but don't throw
      console.warn('Failed to securely wipe memory:', error);
    }
  }

  /**
   * Generate secure random string for passwords/PINs
   */
  static generateSecurePin(length: number = 6): string {
    if (length < 4 || length > 32) {
      throw new CryptoError(
        'PIN length must be between 4 and 32 characters',
        'INVALID_PIN_LENGTH'
      );
    }

    const randomBytes = SecureRandom.generateBytes(length);
    let pin = '';

    for (let i = 0; i < length; i++) {
      pin += (randomBytes[i] % 10).toString();
    }

    return pin;
  }
}

// Legacy exports for backward compatibility
export const deriveKey = KeyDerivation.deriveKey;
export const decryptJSON = CryptoUtils.decryptJSON;
