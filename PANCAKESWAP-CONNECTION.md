# 🥞 راهنمای اتصال به PancakeSwap

## ✅ مراحل اتصال

### 1. **Unlock Wallet**

- Extension را باز کنید
- PIN: `1234` را وارد کنید
- مطمئن شوید والت unlock شده است

### 2. **روش‌های اتصال**

#### 🔹 روش 1: استفاده از "MetaMask" (توصیه می‌شود)

چون `isMetaMask: true` است، Hero Wallet باید به عنوان MetaMask شناسایی شود:

1. به https://pancakeswap.finance/ بروید
2. روی **"Connect Wallet"** کلیک کنید
3. **"MetaMask"** را انتخاب کنید
4. Hero Wallet باید باز شود و درخواست اتصال را نشان دهد
5. روی **"Connect"** کلیک کنید

#### 🔹 روش 2: استفاده از "Browser Wallet" یا "Injected"

اگر PancakeSwap گزینه "Browser Wallet" یا "Injected" دارد:

1. به https://pancakeswap.finance/ بروید
2. روی **"Connect Wallet"** کلیک کنید
3. **"Browser Wallet"** یا **"Injected"** را انتخاب کنید
4. Hero Wallet باید درخواست اتصال را نشان دهد

#### 🔹 روش 3: استفاده از Console (Debug)

اگر هیچ کدام کار نکرد، این کد را در Console اجرا کنید:

```javascript
// چک کردن والت
console.log('window.ethereum:', window.ethereum);
console.log('isMetaMask:', window.ethereum?.isMetaMask);
console.log('isHeroWallet:', window.ethereum?.isHeroWallet);

// اتصال مستقیم
window.ethereum
  .request({ method: 'eth_requestAccounts' })
  .then((accounts) => console.log('Connected accounts:', accounts))
  .catch((err) => console.error('Connection error:', err));
```

---

## 🔍 تشخیص مشکلات

### ❌ مشکل: "Wallet is locked"

**راه حل:**

- Extension را باز کنید
- PIN: `1234` را وارد کنید
- صفحه PancakeSwap را refresh کنید

### ❌ مشکل: "Hero Wallet در لیست والت‌ها نیست"

**راه حل:**

1. **گزینه MetaMask را انتخاب کنید** - چون `isMetaMask: true` است
2. اگر MetaMask واقعی نصب است، آن را غیرفعال کنید:
   - به `chrome://extensions` بروید
   - MetaMask را پیدا کنید
   - روی toggle کلیک کنید تا غیرفعال شود
   - صفحه PancakeSwap را refresh کنید

### ❌ مشکل: "PancakeSwap متوجه والت نمی‌شود"

**راه حل:**

1. Service Worker را بررسی کنید:

   - به `chrome://extensions` بروید
   - زیر Hero Wallet روی **"Inspect views: service worker"** کلیک کنید
   - مطمئن شوید error ندارد

2. Extension را reload کنید:

   - به `chrome://extensions` بروید
   - روی دکمه **"Reload"** (🔄) کلیک کنید
   - صفحه PancakeSwap را refresh کنید

3. Console را چک کنید (F12):
   ```javascript
   // باید این پیام‌ها را ببینید:
   // ✅ Hero Wallet set as window.ethereum
   // 📢 Announcing EIP-6963 provider
   ```

---

## 🧪 تست با صفحه آزمایشی

قبل از PancakeSwap، این را تست کنید:

1. فایل `test-eip6963-detection.html` را در مرورگر باز کنید
2. والت را unlock کنید
3. روی **"Scan for Wallets"** کلیک کنید
4. باید **"Hero Wallet"** را ببینید با:
   - ✅ isMetaMask: true
   - ✅ isHeroWallet: true
   - ✅ chainId: 0x1

---

## 🌐 شبکه‌های پشتیبانی شده

Hero Wallet این شبکه‌ها را پشتیبانی می‌کند:

| شبکه                | Chain ID | RPC                          |
| ------------------- | -------- | ---------------------------- |
| Ethereum Mainnet    | 0x1      | https://eth.llamarpc.com     |
| Polygon             | 0x89     | https://polygon.llamarpc.com |
| **BSC (BNB Chain)** | **0x38** | **https://bsc.llamarpc.com** |
| Sepolia             | 0xaa36a7 | https://rpc.sepolia.org      |
| Goerli              | 0x5      | https://rpc.goerli.eth.limo  |
| Optimism            | 0xa      | https://mainnet.optimism.io  |
| Arbitrum            | 0xa4b1   | https://arb1.arbitrum.io/rpc |
| Localhost 8545      | 0x539    | http://127.0.0.1:8545        |
| Localhost 31337     | 0x7a69   | http://127.0.0.1:31337       |

**⚠️ نکته مهم:** PancakeSwap روی **BSC (Binance Smart Chain)** کار می‌کند!

- Chain ID: `0x38`
- وقتی متصل شدید، شبکه را به **BNB Chain** تغییر دهید

---

## 📝 نکات مهم

1. **همیشه والت را unlock کنید** قبل از اینکه به PancakeSwap بروید
2. **به عنوان MetaMask شناسایی می‌شود** - این مشکلی نیست، استاندارد است
3. **شبکه را به BSC تغییر دهید** برای استفاده از PancakeSwap
4. **اگر MetaMask نصب است، آن را غیرفعال کنید** تا تداخل نکند

---

## 🚀 مراحل کامل (از ابتدا تا انتها)

### Step 1: آماده‌سازی

```
1. Extension را در chrome://extensions reload کنید
2. Extension را باز کنید
3. PIN: 1234 را وارد کنید
4. مطمئن شوید والت unlock است
```

### Step 2: تست اولیه

```
1. test-eip6963-detection.html را باز کنید
2. روی "Scan for Wallets" کلیک کنید
3. Hero Wallet را ببینید ✅
4. روی "Connect to This Wallet" کلیک کنید
5. آدرس: 0x1B11c86904b26202655c9143d3558c939A8c764c ✅
```

### Step 3: اتصال به PancakeSwap

```
1. به https://pancakeswap.finance/ بروید
2. روی "Connect Wallet" کلیک کنید
3. "MetaMask" را انتخاب کنید
4. Approval window باید باز شود
5. روی "Connect" کلیک کنید
6. Wallet متصل شد! ✅
```

### Step 4: تغییر شبکه به BSC

```
1. در Hero Wallet روی network selector کلیک کنید
2. "BNB Chain (BSC)" را انتخاب کنید
3. یا PancakeSwap خودش درخواست تغییر شبکه می‌کند
4. روی "Switch Network" کلیک کنید
```

---

## 💡 چرا به عنوان MetaMask شناسایی می‌شود؟

این یک **استاندارد صنعتی** است:

- ✅ **Brave Wallet** → `isMetaMask: true`
- ✅ **Coinbase Wallet** → `isMetaMask: true`
- ✅ **Trust Wallet** → `isMetaMask: true`
- ✅ **Rainbow Wallet** → `isMetaMask: true`

چرا؟

- dApp ها فقط MetaMask را چک می‌کنند
- `isMetaMask: true` = "من EIP-1193 compatible هستم"
- این باعث compatibility با 99% dApp ها می‌شود

اما ما همچنین `isHeroWallet: true` داریم برای شناسایی منحصر به فرد! 🎯

---

## 📞 پشتیبانی

اگر مشکلی دارید:

1. **Console Logs را چک کنید** (F12 → Console)
2. **Service Worker را بررسی کنید** (chrome://extensions → Inspect views)
3. **Test page را اجرا کنید** (test-eip6963-detection.html)
4. **این مستند را دوباره بخوانید** 📖

---

**موفق باشید! 🚀**
