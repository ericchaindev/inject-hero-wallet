import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { Keypair } from '@solana/web3.js';
import { mnemonicToSeedSync } from 'bip39';
import { derivePath as deriveEd25519Path } from 'ed25519-hd-key';
import { ethers } from 'ethers';
import nacl from 'tweetnacl';

import { BitcoinAdapter } from '../adapters/btc';
import { HederaAdapter } from '../adapters/hedera';
import { SolanaAdapter } from '../adapters/solana';
import { TonAdapter } from '../adapters/ton';
import { Base64Utils, CryptoUtils } from './crypto';
import type { Chain, StoredAccount, WalletState } from './keystore';
import {
  HEDERA_NETWORK,
  SOL_NETWORK,
  SUI_NETWORK,
  TON_NETWORK,
} from './networks';

const DEFAULT_MNEMONIC =
  'bottom drive obey lake curtain smoke basket hold race lonely fit walk';
export const DEFAULT_PIN = '123456';

const MNEMONIC_SEED = mnemonicToSeedSync(DEFAULT_MNEMONIC);
const MNEMONIC_SEED_HEX = MNEMONIC_SEED.toString('hex');

const EVM_PATH = "m/44'/60'/0'/0/0";
const BTC_PATH = "m/84'/0'/0'/0/0";
const SOL_PATH = "m/44'/501'/0'/0'";
const SUI_PATH = "m/44'/784'/0'/0'/0'";
const TON_PATH = "m/44'/607'/0'/0'";
const HEDERA_PATH = "m/44'/3030'/0'/0/0";

const ACCOUNT_NAMES: Record<Chain, string> = {
  evm: 'Ethereum Account',
  btc: 'Bitcoin Account',
  sol: 'Solana Account',
  ton: 'TON Account',
  sui: 'Sui Account',
  hedera: 'Hedera Account',
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toAccountIdFromPrivateKey(privateKeyHex: string): string {
  const numeric = parseInt(privateKeyHex.slice(2, 14), 16);
  const account = numeric % 1_000_000_000;
  return `0.0.${account}`;
}

function prepareEncryptedPayload(encrypted: {
  iv: string;
  salt: string;
  ciphertext: string;
}) {
  return {
    iv: encrypted.iv,
    salt: encrypted.salt,
    ct: encrypted.ciphertext,
  };
}

async function createEvmAccount(
  pin: string,
  timestamp: number
): Promise<StoredAccount> {
  const wallet =
    ethers.HDNodeWallet.fromPhrase(DEFAULT_MNEMONIC).derivePath(EVM_PATH);
  const encrypted = await CryptoUtils.encryptJSON(
    { privateKeyHex: wallet.privateKey },
    pin
  );

  return {
    id: 'hero-evm-0',
    name: ACCOUNT_NAMES.evm,
    chain: 'evm',
    pubkey: wallet.publicKey,
    address: wallet.address,
    path: EVM_PATH,
    enc: prepareEncryptedPayload(encrypted),
    createdAt: timestamp,
  };
}

async function createBitcoinAccount(
  pin: string,
  timestamp: number
): Promise<StoredAccount> {
  const wallet =
    ethers.HDNodeWallet.fromPhrase(DEFAULT_MNEMONIC).derivePath(BTC_PATH);
  const privateKeyHex = wallet.privateKey;
  const addressInfo = BitcoinAdapter.getAddress({
    privateKeyHex,
    network: 'mainnet',
  });
  const encrypted = await CryptoUtils.encryptJSON(
    { privateKeyHex, network: 'mainnet' as const },
    pin
  );

  return {
    id: 'hero-btc-0',
    name: ACCOUNT_NAMES.btc,
    chain: 'btc',
    pubkey: addressInfo.publicKey,
    address: addressInfo.address,
    path: BTC_PATH,
    enc: prepareEncryptedPayload(encrypted),
    createdAt: timestamp,
  };
}

export async function createSolanaAccount(
  pin: string,
  timestamp: number
): Promise<StoredAccount> {
  const derived = deriveEd25519Path(SOL_PATH, MNEMONIC_SEED_HEX);
  const keypair = Keypair.fromSeed(derived.key);
  const secretKey = new Uint8Array(keypair.secretKey);
  const address = SolanaAdapter.getAddress({
    privateKeyBytes: secretKey,
    rpc: SOL_NETWORK.rpc[0],
  });
  const encrypted = await CryptoUtils.encryptJSON(
    {
      privateKeyBytesB64: Base64Utils.encode(secretKey),
      rpc: SOL_NETWORK.rpc[0],
    },
    pin
  );

  return {
    id: 'hero-sol-0',
    name: ACCOUNT_NAMES.sol,
    chain: 'sol',
    pubkey: toHex(keypair.publicKey.toBytes()),
    address,
    path: SOL_PATH,
    enc: prepareEncryptedPayload(encrypted),
    createdAt: timestamp,
  };
}

async function createSuiAccount(
  pin: string,
  timestamp: number
): Promise<StoredAccount> {
  const derived = deriveEd25519Path(SUI_PATH, MNEMONIC_SEED_HEX);
  const privateKey = new Uint8Array(derived.key);
  const encrypted = await CryptoUtils.encryptJSON(
    {
      privateKeyBase64: Base64Utils.encode(privateKey),
      rpc: SUI_NETWORK.rpc[0],
    },
    pin
  );

  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const address = keypair.getPublicKey().toSuiAddress();

  return {
    id: 'hero-sui-0',
    name: ACCOUNT_NAMES.sui,
    chain: 'sui',
    pubkey: keypair.getPublicKey().toBase64(),
    address,
    path: SUI_PATH,
    enc: prepareEncryptedPayload(encrypted),
    createdAt: timestamp,
  };
}

async function createTonAccount(
  pin: string,
  timestamp: number
): Promise<StoredAccount> {
  const derived = deriveEd25519Path(TON_PATH, MNEMONIC_SEED_HEX);
  const keypair = nacl.sign.keyPair.fromSeed(new Uint8Array(derived.key));
  const secretKey = new Uint8Array(keypair.secretKey);
  const addressInfo = TonAdapter.deriveAddress({
    privateKeyBytes: secretKey,
    rpc: TON_NETWORK.rpc[0],
    address: '',
  });
  const encrypted = await CryptoUtils.encryptJSON(
    {
      privateKeyBytesB64: Base64Utils.encode(secretKey),
      rpc: TON_NETWORK.rpc[0],
      address: addressInfo.address,
    },
    pin
  );

  return {
    id: 'hero-ton-0',
    name: ACCOUNT_NAMES.ton,
    chain: 'ton',
    pubkey: toHex(keypair.publicKey),
    address: addressInfo.address,
    path: TON_PATH,
    enc: prepareEncryptedPayload(encrypted),
    createdAt: timestamp,
  };
}

async function createHederaAccount(
  pin: string,
  timestamp: number
): Promise<StoredAccount> {
  const wallet =
    ethers.HDNodeWallet.fromPhrase(DEFAULT_MNEMONIC).derivePath(HEDERA_PATH);
  const privateKeyHex = wallet.privateKey;
  const accountId = toAccountIdFromPrivateKey(privateKeyHex);
  const encrypted = await CryptoUtils.encryptJSON(
    {
      privateKeyHex,
      accountId,
      rpc: HEDERA_NETWORK.rpc[0],
      network: 'mainnet' as const,
    },
    pin
  );

  const pubkey = HederaAdapter.getPublicKey({
    privateKeyHex,
    accountId,
    rpc: HEDERA_NETWORK.rpc[0],
    network: 'mainnet',
  });

  return {
    id: 'hero-hedera-0',
    name: ACCOUNT_NAMES.hedera,
    chain: 'hedera',
    pubkey,
    address: accountId,
    path: HEDERA_PATH,
    enc: prepareEncryptedPayload(encrypted),
    createdAt: timestamp,
  };
}

export async function generateDeterministicState(
  pin: string = DEFAULT_PIN
): Promise<WalletState> {
  const timestamp = Date.now();
  const accounts: StoredAccount[] = [
    await createEvmAccount(pin, timestamp),
    await createBitcoinAccount(pin, timestamp),
    await createSolanaAccount(pin, timestamp),
    await createSuiAccount(pin, timestamp),
    await createTonAccount(pin, timestamp),
    await createHederaAccount(pin, timestamp),
  ];

  const mnemonicEncrypted = await CryptoUtils.encryptJSON(
    { mnemonic: DEFAULT_MNEMONIC },
    pin
  );

  return {
    origins: {},
    accounts,
    mnemonic: prepareEncryptedPayload(mnemonicEncrypted),
    createdAt: timestamp,
    version: '1.0.0',
  };
}
