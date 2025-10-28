# 🧪 راهنمای تست E2E کامل - Hero Wallet

این راهنما برای تست کامل End-to-End کیف پول Hero با سایت MetaMask Test DApp و صفحه تست اختصاصی ما طراحی شده است.

---

## 📋 پیش‌نیازها

### 1. آماده‌سازی Wallet

```bash
# Build the extension
npm run build

# Load in Chrome
chrome://extensions/
→ Developer mode: ON
→ Load unpacked → select dist/
```

### 2. ایجاد Wallet

1. کلیک روی آیکون Hero Wallet
2. Create New Wallet
3. **یادداشت Mnemonic** (12 کلمه)
4. تنظیم PIN
5. فعال کردن "Remember PIN"

---

## 🎯 تست با صفحه اختصاصی

### فایل: `test-e2e-metamask-compatible.html`

این صفحه تمام قابلیت‌های MetaMask Test DApp را دارد:

#### ✅ تست‌های Connection

- **eth_requestAccounts**: اتصال wallet
- **eth_accounts**: دریافت لیست حساب‌ها
- **eth_chainId**: دریافت شبکه فعلی

#### ✅ تست‌های Permission

- **wallet_requestPermissions**: درخواست دسترسی
- **wallet_getPermissions**: دریافت لیست دسترسی‌ها
- **wallet_revokePermissions**: لغو دسترسی

#### ✅ تست‌های Signing

- **personal_sign**: امضای پیام شخصی
- **eth_sign**: امضای legacy
- **eth_signTypedData_v4**: امضای داده‌های ساختاریافته

#### ✅ تست‌های Transaction

- **eth_sendTransaction**: ارسال تراکنش
- **eth_estimateGas**: تخمین گس

#### ✅ تست‌های Network

- **wallet_switchEthereumChain**: تغییر شبکه
- **wallet_addEthereumChain**: اضافه کردن شبکه جدید

#### ✅ تست‌های RPC

- **eth_getBalance**: دریافت موجودی
- **eth_blockNumber**: شماره بلاک
- **eth_gasPrice**: قیمت گس

#### ✅ تست‌های Event

- **accountsChanged**: تغییر حساب
- **chainChanged**: تغییر شبکه
- **connect**: اتصال
- **disconnect**: قطع اتصال

---

## 🌐 تست با MetaMask Test DApp

### سایت: https://metamask.github.io/test-dapp/

### مراحل تست:

#### 1. Connection

```javascript
// صفحه test-dapp
Click "Connect" button
→ Hero Wallet popup opens
→ Unlock wallet (enter PIN)
→ Approval window shows
→ Click "Approve"
→ ✅ Connected!
```

**انتظار می‌رود:**

- ✅ Popup به صورت خودکار باز شود اگر wallet locked است
- ✅ Approval window نمایش داده شود
- ✅ آدرس حساب در صفحه نمایش داده شود
- ✅ Chain ID به درستی نمایش داده شود

#### 2. Get Accounts

```javascript
Click "eth_accounts" button
```

**انتظار می‌رود:**

- ✅ اگر connected باشد، آدرس را برگرداند
- ✅ اگر connected نباشد، آرایه خالی برگرداند

#### 3. Get Chain ID

```javascript
Click "eth_chainId" button
```

**انتظار می‌رود:**

- ✅ Chain ID فعلی به صورت hex برگردد (مثلاً `0x1` برای Ethereum)

#### 4. Personal Sign

```javascript
Click "Personal Sign" button
Enter message: "Hello World"
```

**انتظار می‌رود:**

- ✅ Approval window باز شود
- ✅ پیام به درستی نمایش داده شود
- ✅ بعد از approve، signature برگردد (0x...)

#### 5. Send Transaction

```javascript
Click "Send Transaction"
To: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Value: 0.001 ETH
```

**⚠️ مهم**: حتماً روی **Sepolia Testnet** باشید!

**انتظار می‌رود:**

- ✅ Approval window با جزئیات تراکنش باز شود
- ✅ To, Value, Gas به درستی نمایش داده شود
- ✅ بعد از approve، transaction hash برگردد
- ✅ تراکنش در blockchain ثبت شود

#### 6. Switch Chain

```javascript
Click "Switch Chain"
Select: Sepolia (0xaa36a7)
```

**انتظار می‌رود:**

- ✅ Approval window برای تأیید تغییر شبکه
- ✅ بعد از approve، شبکه تغییر کند
- ✅ Event "chainChanged" emit شود
- ✅ صفحه reload شود (رفتار استاندارد)

---

## 🔍 بررسی لاگ‌ها

### 1. Console لاگ صفحه (F12 → Console)

**لاگ‌های موفق:**

```javascript
✅ Ethereum provider detected!
✅ Connected: 0x1234...
✅ Chain ID: 0x1
💰 Balance: 0.5 ETH
✍️  Signing message: "Hello World"
✅ Signature: 0xabc...
💸 Sending 0.001 ETH to 0x742...
✅ Transaction sent! Hash: 0xdef...
```

**لاگ‌های خطا (مجاز):**

```javascript
❌ Please create or restore your wallet first.  // اگر wallet ندارید
❌ Wallet is locked.  // اگر wallet قفل است
❌ User rejected the request  // اگر در approval reject کردید
❌ Insufficient funds  // اگر موجودی کافی ندارید
```

### 2. Background Service Worker

```
chrome://extensions/
→ Hero Wallet
→ "service worker" (inspect)
```

**لاگ‌های موفق:**

```javascript
📋 Processing PAGE_REQUEST: eth_requestAccounts
✅ Connected: 0x1234...
📋 Processing PAGE_REQUEST: personal_sign
🎨 Opening approval window
✅ Signature created: 0xabc...
📋 Processing PAGE_REQUEST: eth_sendTransaction
✅ Transaction sent: 0xdef...
```

### 3. Content Script

**لاگ‌های موفق:**

```javascript
📨 Content script received: eth_requestAccounts
🚀 Sending to background
📥 Hero Wallet: Response ✅
```

---

## ✅ چک‌لیست تست کامل

### پایه (Basic Tests)

- [ ] نصب extension و بارگذاری موفق
- [ ] ایجاد wallet با mnemonic
- [ ] تنظیم PIN و فعال‌سازی Remember PIN
- [ ] باز شدن popup و نمایش صحیح UI

### اتصال (Connection Tests)

- [ ] eth_requestAccounts با wallet جدید
- [ ] eth_requestAccounts با wallet قفل شده
- [ ] eth_requestAccounts با wallet unlock شده
- [ ] eth_accounts با connection موجود
- [ ] eth_accounts بدون connection
- [ ] eth_chainId

### دسترسی (Permission Tests)

- [ ] wallet_requestPermissions
- [ ] wallet_getPermissions با دسترسی
- [ ] wallet_getPermissions بدون دسترسی
- [ ] wallet_revokePermissions

### امضا (Signing Tests)

- [ ] personal_sign با پیام ساده
- [ ] personal_sign با پیام طولانی
- [ ] eth_sign (legacy)
- [ ] eth_signTypedData_v4
- [ ] Reject کردن signing request

### تراکنش (Transaction Tests)

- [ ] eth_sendTransaction روی Sepolia
- [ ] eth_estimateGas
- [ ] Reject کردن transaction
- [ ] Transaction با insufficient funds

### شبکه (Network Tests)

- [ ] wallet_switchEthereumChain به Ethereum
- [ ] wallet_switchEthereumChain به Polygon
- [ ] wallet_switchEthereumChain به BSC
- [ ] wallet_switchEthereumChain به Sepolia
- [ ] wallet_addEthereumChain با Avalanche
- [ ] wallet_addEthereumChain با Arbitrum

### RPC (Read Methods)

- [ ] eth_getBalance
- [ ] eth_blockNumber
- [ ] eth_gasPrice
- [ ] eth_call (contract call)

### رویدادها (Events)

- [ ] accountsChanged event
- [ ] chainChanged event
- [ ] connect event
- [ ] disconnect event

---

## 🐛 مشکلات رایج و راه‌حل

### 1. "Wallet not initialized"

**علت**: Wallet هنوز create/restore نشده

**راه‌حل**:

1. کلیک روی آیکون extension
2. Create New Wallet یا Restore Wallet
3. Follow the steps

**انتظار**: Popup باید به صورت خودکار باز شود

### 2. "Wallet is locked"

**علت**: Session timeout شده (5 دقیقه)

**راه‌حل**:

1. کلیک روی آیکون extension
2. وارد کردن PIN
3. Unlock

**انتظار**: Popup باید به صورت خودکار باز شود

### 3. "User rejected request"

**علت**: در approval window روی Reject کلیک شده

**راه‌حل**: دوباره تلاش کنید و Approve کنید

**این خطا طبیعی است**

### 4. Approval window باز نمی‌شود

**علت**: Pop-up blocker

**راه‌حل**:

1. در Chrome Settings
2. Privacy and security → Site Settings
3. Pop-ups and redirects
4. Allow for metamask.github.io

### 5. Transaction fails با "Insufficient funds"

**راه‌حل**:

1. Switch به Sepolia Testnet
2. دریافت test ETH از faucet:
   - https://sepoliafaucet.com/
   - https://faucet.sepolia.dev/

### 6. "Cannot assign to read only property 'ethereum'"

**علت**: MetaMask SDK سعی می‌کند window.ethereum را override کند

**راه‌حل**: این خطا در SDK است، نه Hero Wallet. Hero Wallet باید اولین provider باشد.

**Fix**: Extension را قبل از بارگذاری صفحه load کنید.

---

## 📊 نتایج انتظاری

### موفقیت‌آمیز (Successful)

#### Connection

```json
{
  "method": "eth_requestAccounts",
  "result": ["0x1234567890abcdef1234567890abcdef12345678"]
}
```

#### Personal Sign

```json
{
  "method": "personal_sign",
  "result": "0xabc123def456..."
}
```

#### Send Transaction

```json
{
  "method": "eth_sendTransaction",
  "result": "0xdef789abc012..."
}
```

#### Switch Chain

```json
{
  "method": "wallet_switchEthereumChain",
  "result": null
}
```

### خطاها (Errors)

#### User Rejected

```json
{
  "code": 4001,
  "message": "User rejected the request"
}
```

#### Wallet Not Initialized

```json
{
  "code": 4100,
  "message": "Please create or restore your wallet first..."
}
```

#### Unrecognized Chain

```json
{
  "code": 4902,
  "message": "Unrecognized chain ID"
}
```

---

## 🎬 فلوی کامل تست

```
1. نصب Extension
   ↓
2. Create Wallet (Mnemonic + PIN)
   ↓
3. باز کردن test-e2e-metamask-compatible.html
   ↓
4. Connect Wallet
   ↓ (Popup opens → Unlock → Approve)
5. ✅ Connected!
   ↓
6. Get Accounts → ✅ Returns [0x...]
   ↓
7. Get Chain ID → ✅ Returns 0x1
   ↓
8. Personal Sign → ✅ Opens approval → Returns signature
   ↓
9. Switch to Sepolia → ✅ Switches network
   ↓
10. Get Sepolia ETH from faucet
   ↓
11. Send Transaction → ✅ Opens approval → Returns TX hash
   ↓
12. ✅ همه تست‌ها موفق!
```

---

## 🔄 Automation Testing (آینده)

برای تست خودکار می‌توان از Playwright یا Puppeteer استفاده کرد:

```javascript
// Example Playwright test
test('Connect wallet E2E', async ({ page, context }) => {
  // Load extension
  const extensionId = await loadExtension(context);

  // Navigate to test page
  await page.goto('test-e2e-metamask-compatible.html');

  // Click connect
  await page.click('button:has-text("Connect Wallet")');

  // Handle popup
  const popup = await context.waitForEvent('page');
  await popup.fill('#pin-input', '1234');
  await popup.click('button:has-text("Unlock")');

  // Handle approval
  const approval = await context.waitForEvent('page');
  await approval.click('button:has-text("Approve")');

  // Verify connection
  const account = await page.textContent('#accountAddress');
  expect(account).toMatch(/0x[a-fA-F0-9]{40}/);
});
```

---

## 📞 پشتیبانی

اگر مشکلی دارید:

1. **لاگ‌ها را جمع‌آوری کنید**:

   - F12 → Console (page)
   - Background service worker console
   - Content script console

2. **مراحل را مستند کنید**:

   - چه دکمه‌ای زدید؟
   - چه خطایی دیدید؟
   - چه چیزی انتظار داشتید؟

3. **Issue باز کنید** در GitHub با:
   - لاگ‌های کامل
   - مراحل Reproduce
   - Screenshot ها

---

## ✨ بهترین شیوه‌ها

1. **همیشه از Testnet استفاده کنید** برای تست تراکنش‌ها
2. **مستندسازی کنید** هر مشکلی که پیدا می‌کنید
3. **تست کنید** تمام edge case ها (reject, timeout, insufficient funds)
4. **مقایسه کنید** با MetaMask برای consistency
5. **به‌روز نگه دارید** extension را با آخرین تغییرات

---

**موفق باشید! 🚀**
