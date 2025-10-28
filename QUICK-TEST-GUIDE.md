# 🧪 راهنمای سریع تست - Create & Restore Wallet

## 🔧 آماده‌سازی

1. **Clear Extension Data** (برای تست از صفر):

   ```
   - به chrome://extensions بروید
   - روی "Remove" کلیک کنید (یا Clear storage)
   - دوباره extension را از پوشه dist بارگذاری کنید
   ```

2. **یا فقط Clear Storage**:
   - در `chrome://extensions` روی service worker کلیک کنید
   - در Console تایپ کنید:
   ```javascript
   chrome.storage.local.clear();
   ```

---

## ✅ تست 1: Create New Wallet

### مراحل:

1. Extension icon را کلیک کنید
2. باید صفحه **Welcome** را ببینید
3. روی **"Create New Wallet"** کلیک کنید
4. PIN وارد کنید: `1234`
5. Confirm PIN: `1234`
6. (اختیاری) "Remember PIN" را فعال کنید
7. روی **"Create Wallet"** کلیک کنید

### نتیجه انتظاری:

✅ یک mnemonic 12 کلمه‌ای در پیام success نمایش داده می‌شود:

```
✅ Wallet created! SAVE THIS MNEMONIC SECURELY:

word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12

This is the ONLY way to recover your wallet!
```

✅ Dashboard باز می‌شود و آدرس Ethereum شما نمایش داده می‌شود

✅ در Console خطایی نباید باشد

### ⚠️ خطاهای احتمالی:

❌ **"Failed to create wallet: Buffer is not defined"**

- این خطا حل شده است
- اگر هنوز می‌بینید: `npm run build` بزنید و extension را reload کنید

❌ **"PIN must be at least 4 digits"**

- PIN کمتر از 4 رقم است
- حداقل 4 رقم وارد کنید

❌ **"PINs do not match"**

- PIN و Confirm PIN یکسان نیستند

---

## ✅ تست 2: Restore Existing Wallet

### آماده‌سازی:

یک mnemonic تست آماده کنید. می‌توانید از این استفاده کنید:

```
bottom drive obey lake curtain smoke basket hold race lonely fit walk
```

### مراحل:

1. Extension data را پاک کنید (Clear storage)
2. Extension icon را کلیک کنید
3. باید صفحه **Welcome** را ببینید
4. روی **"Restore Existing Wallet"** کلیک کنید
5. Mnemonic را وارد کنید:
   ```
   bottom drive obey lake curtain smoke basket hold race lonely fit walk
   ```
6. PIN تعیین کنید: `5678`
7. Confirm PIN: `5678`
8. (اختیاری) "Remember PIN" را فعال کنید
9. روی **"Restore Wallet"** کلیک کنید

### نتیجه انتظاری:

✅ Wallet بازگردانی می‌شود

✅ Dashboard باز می‌شود

✅ آدرس Ethereum صحیح نمایش داده می‌شود:

```
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

(این آدرس برای mnemonic بالا)

✅ در Console خطایی نباید باشد

### ⚠️ خطاهای احتمالی:

❌ **"Invalid mnemonic phrase"**

- مطمئن شوید 12 کلمه وارد کرده‌اید
- کلمات را با فاصه جدا کنید
- حروف کوچک استفاده کنید
- کلمات اضافی یا نویسه خاص نباشد

❌ **"Failed to restore wallet"**

- Console را بررسی کنید
- مطمئن شوید mnemonic معتبر است

---

## ✅ تست 3: Remember PIN

### مراحل:

1. Wallet بسازید یا Restore کنید
2. گزینه **"Remember PIN on this device"** را فعال کنید
3. بعد از ایجاد/بازگردانی، popup را ببندید
4. دوباره popup را باز کنید

### نتیجه انتظاری:

✅ بدون نیاز به وارد کردن PIN، مستقیماً به Dashboard می‌روید

### غیرفعال کردن Remember PIN:

1. Dashboard را باز کنید
2. روی "Lock Wallet" کلیک کنید
3. در صفحه Unlock، checkbox "Remember PIN" را غیرفعال کنید
4. PIN را وارد کنید و Unlock کنید

---

## ✅ تست 4: Lock & Unlock

### مراحل:

1. Wallet را Unlock کنید
2. در Dashboard روی **"Lock Wallet"** کلیک کنید
3. Popup بسته می‌شود
4. دوباره popup را باز کنید
5. باید صفحه **Unlock** را ببینید
6. PIN خود را وارد کنید
7. روی **"Unlock Wallet"** کلیک کنید

### نتیجه انتظاری:

✅ بعد از Lock، صفحه Unlock نمایش داده شود

✅ با وارد کردن PIN صحیح، Dashboard باز شود

✅ با PIN اشتباه، خطای "Invalid PIN" نمایش داده شود

---

## ✅ تست 5: Connect to dApp

### مراحل:

1. Wallet را Unlock کنید
2. به https://metamask.github.io/test-dapp/ بروید
3. Extension popup را باز کنید
4. روی **"Connect to Site"** کلیک کنید
5. در صفحه test-dapp روی "Connect" کلیک کنید

### نتیجه انتظاری:

✅ در popup، tag "✓ Connected" سبز رنگ نمایش داده شود

✅ در test-dapp، آدرس شما نمایش داده شود

✅ می‌توانید از دکمه‌های Sign و Send استفاده کنید

---

## 🐛 Debugging

### بررسی Console Logs

**Service Worker Console:**

```
chrome://extensions → Inspect views: service worker
```

لاگ‌های مهم:

- `🔍 handleEthRequestAccounts called`
- `✅ Popup window opened`
- `✅ Wallet created/restored`

**Page Console:**

```
F12 → Console tab
```

لاگ‌های مهم:

- `Hero Wallet provider injected`
- `window.ethereum.isHeroWallet: true`

### بررسی Storage

در Service Worker Console:

```javascript
// بررسی wallet state
chrome.storage.local.get(null, (data) => console.log(data));

// پاک کردن data
chrome.storage.local.clear();
```

---

## 📝 Checklist

### Create Wallet:

- [ ] صفحه Welcome نمایش داده می‌شود
- [ ] Create Wallet screen باز می‌شود
- [ ] PIN validation کار می‌کند
- [ ] Mnemonic 12 کلمه‌ای تولید می‌شود
- [ ] Dashboard باز می‌شود
- [ ] Address نمایش داده می‌شود
- [ ] خطایی وجود ندارد

### Restore Wallet:

- [ ] صفحه Welcome نمایش داده می‌شود
- [ ] Restore Wallet screen باز می‌شود
- [ ] Mnemonic validation کار می‌کند
- [ ] PIN validation کار می‌کند
- [ ] Wallet بازگردانی می‌شود
- [ ] Address صحیح است
- [ ] Dashboard باز می‌شود
- [ ] خطایی وجود ندارد

### Remember PIN:

- [ ] Checkbox کار می‌کند
- [ ] PIN ذخیره می‌شود
- [ ] Auto-unlock کار می‌کند
- [ ] غیرفعال کردن کار می‌کند

### Lock/Unlock:

- [ ] Lock کار می‌کند
- [ ] Unlock screen نمایش داده می‌شود
- [ ] PIN صحیح unlock می‌کند
- [ ] PIN نادرست error می‌دهد

### Connect to dApp:

- [ ] Connect button کار می‌کند
- [ ] Connected tag نمایش داده می‌شود
- [ ] dApp آدرس را می‌بیند
- [ ] Sign/Send کار می‌کند

---

## 🎉 موفقیت!

اگر تمام تست‌ها passed شدند، wallet شما آماده استفاده است! 🚀

**نکات مهم:**

- ⚠️ همیشه mnemonic را backup کنید
- ⚠️ از testnet برای تست استفاده کنید
- ⚠️ PIN قوی انتخاب کنید
- ⚠️ mnemonic را با کسی share نکنید
