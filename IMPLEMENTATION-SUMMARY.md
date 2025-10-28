# 🎉 تغییرات پیاده‌سازی شده - Restore Wallet UI

## ✅ تغییرات انجام شده

### 1. افزودن Imports جدید (popup.tsx)

```typescript
import { StoredAccount, ... } from '../utils/keystore';
import { CryptoUtils } from '../utils/crypto';
import { validateMnemonic, mnemonicToSeedSync } from 'bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDNodeWallet } from 'ethers';
```

### 2. افزودن Type و State های جدید

```typescript
type SetupMode = 'welcome' | 'create' | 'restore' | null;

const [setupMode, setSetupMode] = useState<SetupMode>(null);
const [mnemonicInput, setMnemonicInput] = useState('');
const [newPin, setNewPin] = useState('');
const [confirmNewPin, setConfirmNewPin] = useState('');
```

### 3. اصلاح Initialize Function

- اضافه کردن چک برای `hasAccounts`
- اگر حساب وجود نداشت، نمایش صفحه Welcome:

```typescript
if (!hasAccounts) {
  setSetupMode('welcome');
  return;
}
```

### 4. پیاده‌سازی `handleRestoreWallet`

این تابع کارهای زیر را انجام می‌دهد:

1. ✅ اعتبارسنجی mnemonic phrase (12 یا 24 کلمه)
2. ✅ اعتبارسنجی PIN (حداقل 4 رقم)
3. ✅ تطبیق PIN و Confirm PIN
4. ✅ تولید seed از mnemonic
5. ✅ Derive کردن Ethereum account از BIP44 path: `m/44'/60'/0'/0/0`
6. ✅ رمزنگاری private key با PIN
7. ✅ ساخت `StoredAccount` با ساختار صحیح:
   - `id`, `name`, `chain`, `pubkey`, `address`, `path`
   - `enc` (encrypted private key با iv, salt, ct)
   - `createdAt`
8. ✅ ساخت `WalletState` با `accounts`, `origins`, `createdAt`, `version`
9. ✅ ذخیره state
10. ✅ Unlock کردن خودکار با PIN جدید
11. ✅ (اختیاری) ذخیره PIN در storage

### 5. پیاده‌سازی `handleCreateWallet`

این تابع کارهای زیر را انجام می‌دهد:

1. ✅ اعتبارسنجی PIN
2. ✅ تولید mnemonic تصادفی 12 کلمه‌ای
3. ✅ تولید seed از mnemonic
4. ✅ Derive کردن Ethereum account
5. ✅ رمزنگاری private key
6. ✅ ساخت account و wallet state
7. ✅ ذخیره state
8. ✅ Unlock خودکار
9. ✅ نمایش mnemonic به کاربر برای backup
10. ✅ (اختیاری) ذخیره PIN

### 6. افزودن UI Screens

#### A. Welcome Screen

- انتخاب بین Create و Restore
- دو دکمه:
  - "Create New Wallet" → `setupMode='create'`
  - "Restore Existing Wallet" → `setupMode='restore'`

#### B. Create Wallet Screen

- Input: New PIN
- Input: Confirm PIN
- Checkbox: Remember PIN
- دکمه‌ها:
  - "Back" → بازگشت به Welcome
  - "Create Wallet" → اجرای `handleCreateWallet`
- پس از موفقیت: نمایش mnemonic برای backup

#### C. Restore Wallet Screen

- Textarea: Mnemonic phrase (12 یا 24 کلمه)
- Input: Set PIN
- Input: Confirm PIN
- Checkbox: Remember PIN
- دکمه‌ها:
  - "Back" → بازگشت به Welcome
  - "Restore Wallet" → اجرای `handleRestoreWallet`

#### D. Unlock Screen (unchanged)

- نمایش فقط وقتی wallet وجود دارد ولی lock است
- Input: PIN
- Checkbox: Remember PIN
- دکمه: Unlock Wallet

#### E. Main Dashboard (unchanged)

- نمایش accounts
- دکمه Connect to Site
- دکمه Lock Wallet

## 🔒 امنیت

### Private Key Encryption

از `CryptoUtils.encryptJSON` استفاده می‌شود:

```typescript
const encrypted = await CryptoUtils.encryptJSON(
  { privateKeyHex: ethAccount.privateKey },
  newPin
);
```

ساختار encrypted:

```typescript
{
  iv: string,      // Initialization Vector
  salt: string,    // Salt for key derivation
  ct: string       // Ciphertext (encrypted data)
}
```

### BIP44 Derivation Path

- Ethereum standard: `m/44'/60'/0'/0/0`
- Compatible با MetaMask و سایر walletها

### Mnemonic Validation

- استفاده از `bip39.validateMnemonic()` با wordlist انگلیسی
- پشتیبانی از 12 و 24 کلمه

## 📋 جریان کار (Workflow)

### Create Wallet Flow

```
1. Open Popup → Welcome Screen
2. Click "Create New Wallet" → Create Screen
3. Enter PIN & Confirm → Click "Create Wallet"
4. Generate mnemonic → Encrypt private key → Save state
5. Auto-unlock → Show mnemonic to user
6. Main Dashboard
```

### Restore Wallet Flow

```
1. Open Popup → Welcome Screen
2. Click "Restore Existing Wallet" → Restore Screen
3. Enter mnemonic + PIN → Click "Restore Wallet"
4. Validate mnemonic → Derive account → Encrypt → Save
5. Auto-unlock
6. Main Dashboard
```

### Unlock Flow (existing wallet)

```
1. Open Popup → Unlock Screen (if not remembered)
2. Enter PIN → Click "Unlock"
3. Main Dashboard
```

## 🧪 تست

### تست Create Wallet

1. حذف Extension data (Clear storage)
2. Reload extension
3. Open popup → باید Welcome screen نشان دهد
4. کلیک "Create New Wallet"
5. وارد کردن PIN: "1234" / "1234"
6. کلیک "Create Wallet"
7. باید mnemonic 12 کلمه‌ای نمایش دهد
8. Check: Main dashboard نشان داده شود
9. Check: Account address نمایش داده شود

### تست Restore Wallet

1. یک mnemonic تست داشته باشید
2. حذف Extension data
3. Reload extension
4. Open popup → Welcome screen
5. کلیک "Restore Existing Wallet"
6. وارد کردن mnemonic تست
7. وارد کردن PIN: "5678" / "5678"
8. کلیک "Restore Wallet"
9. Check: Account با address صحیح restore شود
10. Check: Main dashboard نشان داده شود

### تست Remember PIN

1. در Create/Restore screen گزینه "Remember PIN" را فعال کنید
2. Wallet بسازید یا restore کنید
3. Extension popup را ببندید
4. دوباره باز کنید
5. Check: باید بدون نیاز به PIN unlock شود

### تست Validation

1. **Invalid Mnemonic**:

   - Enter: "invalid words here test"
   - Expected: Error "Invalid mnemonic phrase"

2. **Short PIN**:

   - Enter: "12"
   - Expected: Error "PIN must be at least 4 digits"

3. **PIN Mismatch**:
   - Enter: "1234" / "5678"
   - Expected: Error "PINs do not match"

## 📂 فایل‌های تغییر یافته

### ✏️ Modified Files

- `src/popup/popup.tsx` - اضافه شدن UI و logic برای Create/Restore

### 📄 New Files

- `WALLET-SETUP-GUIDE.md` - راهنمای کامل راه‌اندازی و استفاده
- `IMPLEMENTATION-SUMMARY.md` - این فایل

## 🎯 نتیجه

✅ **مشکل حل شد**: حالا کاربران می‌توانند:

1. Wallet جدید بسازند (با mnemonic تصادفی)
2. Wallet موجود را با mnemonic خود restore کنند
3. PIN برای امنیت تعیین کنند
4. به dAppها متصل شوند
5. تراکنش‌ها را امضا کنند

✅ **E2E عملیاتی است**: تمام فرآیندها واقعاً پیاده‌سازی شده‌اند، نه فقط console.log!

✅ **متناسب با استانداردها**:

- BIP39 برای mnemonic
- BIP44 برای key derivation
- EIP-1193 برای provider API
- EIP-6963 برای wallet discovery

## 🚀 مراحل بعدی (اختیاری)

برای آینده می‌توانید این قابلیت‌ها را اضافه کنید:

1. ✨ پشتیبانی از multiple accounts از یک mnemonic
2. ✨ نمایش mnemonic در Settings (با احراز هویت PIN)
3. ✨ Export private key از Settings
4. ✨ پشتیبانی از hardware wallet
5. ✨ پشتیبانی از multi-chain (Bitcoin, Solana, etc.)

---

**تمام تغییرات موفقیت‌آمیز build و test شده‌اند! ✅**
