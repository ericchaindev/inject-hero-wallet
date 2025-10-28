# 🚀 Quick Fix: والت قفل است

## ❌ مشکل:

```
Wallet is locked. Please unlock your wallet to continue.
[] 'wallets' // PancakeSwap هیچ والتی نمی‌بیند
```

---

## ✅ راه‌حل سریع (3 مرحله):

### **مرحله 1: فعال کردن Remember PIN**

1. Extension را **باز کنید** (کلیک روی آیکون Hero Wallet)

2. **PIN را وارد کنید:** `1234`

3. **✅ گزینه "Remember PIN" را تیک بزنید**

4. روی **"Unlock"** کلیک کنید

5. صبر کنید تا والت unlock شود

---

### **مرحله 2: Reload Extension**

1. به `chrome://extensions` بروید

2. Hero Wallet را پیدا کنید

3. روی دکمه **"Reload"** (🔄) کلیک کنید

---

### **مرحله 3: بررسی Auto-Unlock**

1. در `chrome://extensions`

2. زیر Hero Wallet روی **"Inspect views: service worker"** کلیک کنید

3. در Console دنبال این پیام‌ها بگردید:

```javascript
✅ Hero Wallet background script ready
🔑 Found remembered PIN, auto-unlocking wallet...
✅ Wallet auto-unlocked successfully
```

اگر این پیام‌ها را دیدید → **موفق! ✅**

اگر "No remembered PIN found" دیدید → **به مرحله 1 برگردید**

---

## 🧪 تست:

1. **Extension را دوباره Reload کنید** (برای تست auto-unlock)

2. **Service Worker logs را چک کنید:**

   - باید "Wallet auto-unlocked successfully" را ببینید

3. **به PancakeSwap بروید:**

   ```
   https://pancakeswap.finance/
   ```

4. **روی "Connect Wallet" کلیک کنید**

5. **"MetaMask" را انتخاب کنید**

6. **Approval window باید باز شود** (نه "Wallet is locked" error!)

---

## 🔍 Debug: چک کردن Remember PIN

در **Service Worker Console** (`chrome://extensions` → Inspect views: service worker):

```javascript
// چک کردن آیا PIN ذخیره شده است
chrome.storage.local.get(['hero_remembered_pin_v1'], (result) => {
  console.log('Remembered PIN storage:', result);
  if (result.hero_remembered_pin_v1) {
    console.log('✅ PIN is stored!', result.hero_remembered_pin_v1);
  } else {
    console.log(
      '❌ No PIN stored! You need to unlock with Remember PIN checked.'
    );
  }
});
```

اگر ❌ No PIN stored:

- Extension را باز کنید
- PIN: `1234` + ✅ Remember PIN
- Unlock کنید
- Extension را Reload کنید

---

## ⚡ Manual Unlock (راه حل موقت):

اگر auto-unlock کار نمی‌کند، **قبل از رفتن به PancakeSwap:**

1. Extension را باز کنید (کلیک روی آیکون)
2. PIN: `1234` را وارد کنید
3. Unlock کنید
4. **بعد** به PancakeSwap بروید

این باید کار کند، اما ایده‌آل نیست.

---

## 🎯 چرا [] 'wallets' خالی است؟

PancakeSwap از **wagmi** استفاده می‌کند که:

1. **EIP-6963** را چک می‌کند ✅ (کار می‌کند)
2. **`window.ethereum`** را چک می‌کند ✅ (کار می‌کند)
3. اما **فقط والت‌های معروف را نمایش می‌دهد**

**راه‌حل:**

- گزینه **"MetaMask"** را انتخاب کنید (چون `isMetaMask: true`)
- یا گزینه **"Injected"** / **"Browser Wallet"** (اگر وجود دارد)

**Hero Wallet به عنوان MetaMask شناسایی می‌شود** - این مشکلی نیست، استاندارد صنعتی است.

---

## 📋 Checklist:

- [ ] Extension را باز کردم
- [ ] PIN: 1234 وارد کردم
- [ ] ✅ Remember PIN را تیک زدم
- [ ] Unlock کردم
- [ ] Extension را Reload کردم
- [ ] Service Worker logs را چک کردم
- [ ] پیام "Wallet auto-unlocked successfully" را دیدم
- [ ] به PancakeSwap رفتم
- [ ] "MetaMask" را انتخاب کردم
- [ ] Approval window باز شد ✅

---

**موفق باشید! 🚀**
