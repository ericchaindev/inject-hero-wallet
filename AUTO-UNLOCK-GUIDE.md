# 🔓 راهنمای Auto-Unlock والت

## ✨ قابلیت جدید: Auto-Unlock

والت Hero حالا می‌تواند **خودکار unlock شود** وقتی که:

- Extension بارگذاری می‌شود
- Service Worker شروع می‌شود
- مرورگر راه‌اندازی می‌شود

این به این معنی است که **دیگر نیازی نیست هر بار که به PancakeSwap می‌روید، PIN را وارد کنید!**

---

## 🎯 چگونه کار می‌کند؟

### 1. **فعال کردن Remember PIN**

هنگام unlock کردن والت، گزینه **"Remember PIN"** را تیک بزنید:

```
┌─────────────────────────────┐
│  🔒 Unlock Wallet           │
├─────────────────────────────┤
│  PIN: [1234]                │
│  ☑️ Remember PIN            │
│  [Unlock]                   │
└─────────────────────────────┘
```

### 2. **PIN به صورت امن ذخیره می‌شود**

- PIN با استفاده از **extension ID** رمزنگاری می‌شود
- در `chrome.storage.local` ذخیره می‌شود
- فقط این extension می‌تواند آن را decrypt کند

### 3. **Auto-Unlock خودکار**

وقتی service worker راه‌اندازی می‌شود:

```typescript
✅ Hero Wallet background script ready
🔑 Found remembered PIN, auto-unlocking wallet...
✅ Wallet auto-unlocked successfully
```

---

## 🔒 امنیت

### ✅ امن است چون:

1. **PIN رمزنگاری شده است:**

   ```typescript
   const secret = `remember-pin::${chrome.runtime.id}`;
   const encrypted = await CryptoUtils.encryptJSON({ pin }, secret);
   ```

2. **فقط این extension می‌تواند decrypt کند:**

   - از `chrome.runtime.id` استفاده می‌کند
   - هر extension یک ID منحصر به فرد دارد

3. **Auto-lock بعد از 30 دقیقه:**

   ```typescript
   await unlockWithPin(rememberedPin, 30 * 60 * 1000); // 30 minutes
   ```

4. **Lock خودکار وقتی:**
   - Tab hidden می‌شود → Lock بعد از 30 ثانیه
   - Extension suspend می‌شود → Lock فوری
   - Browser بسته می‌شود → Lock فوری

### ⚠️ توجه:

- اگر کامپیوتر شما shared است، **Remember PIN را فعال نکنید**
- اگر روی کامپیوتر عمومی هستید، **Remember PIN را فعال نکنید**
- PIN شما در local storage است، نه روی سرور

---

## 📋 مراحل استفاده

### **Step 1: Extension را reload کنید**

```
chrome://extensions → Hero Wallet → Reload (🔄)
```

### **Step 2: والت را unlock کنید با Remember PIN**

1. Extension را باز کنید
2. PIN: `1234` را وارد کنید
3. ✅ **"Remember PIN"** را تیک بزنید
4. روی "Unlock" کلیک کنید

### **Step 3: Extension را دوباره reload کنید (تست)**

```
chrome://extensions → Hero Wallet → Reload (🔄)
```

### **Step 4: Service Worker logs را چک کنید**

```
chrome://extensions → Hero Wallet → Inspect views: service worker
```

باید این پیام‌ها را ببینید:

```
✅ Hero Wallet background script ready
🔑 Found remembered PIN, auto-unlocking wallet...
✅ Wallet auto-unlocked successfully
```

### **Step 5: به PancakeSwap بروید**

```
https://pancakeswap.finance/
```

حالا وقتی روی "Connect Wallet" → "MetaMask" کلیک می‌کنید:

- ✅ **Approval window باز می‌شود** (نه "Wallet is locked" error!)
- ✅ می‌توانید بلافاصله connect شوید

---

## 🧪 تست Auto-Unlock

### Test 1: Extension Reload

```powershell
1. chrome://extensions
2. Hero Wallet → Reload
3. Inspect views: service worker
4. Check logs:
   ✅ "🔑 Found remembered PIN"
   ✅ "✅ Wallet auto-unlocked"
```

### Test 2: Browser Restart

```powershell
1. مرورگر را ببندید
2. مرورگر را باز کنید
3. chrome://extensions → Inspect views: service worker
4. Check logs:
   ✅ "🔑 Found remembered PIN"
   ✅ "✅ Wallet auto-unlocked"
```

### Test 3: PancakeSwap Connection

```powershell
1. https://pancakeswap.finance/
2. Connect Wallet → MetaMask
3. Approval window باید باز شود (نه error!)
4. Connect → Success! ✅
```

---

## 🔧 Troubleshooting

### ❌ "No remembered PIN found"

**مشکل:** Remember PIN فعال نیست

**راه‌حل:**

1. Extension را باز کنید
2. والت را unlock کنید
3. ✅ **"Remember PIN"** را تیک بزنید
4. Extension را reload کنید

### ❌ "Auto-unlock failed: Invalid PIN"

**مشکل:** PIN ذخیره شده invalid است

**راه‌حل:**

```typescript
// Clear remembered PIN
chrome.storage.local.remove(['hero_remembered_pin_v1']);

// Then unlock again with correct PIN + Remember PIN checked
```

### ❌ "Wallet is locked" بعد از auto-unlock

**مشکل:** Session timeout شده (بعد از 30 دقیقه)

**راه‌حل:**

- Extension را reload کنید
- یا یک بار دیگر unlock کنید

---

## 🎛️ تنظیمات Auto-Lock

### تغییر مدت زمان Lock:

در `background.ts`:

```typescript
// فعلی: 30 دقیقه
await unlockWithPin(rememberedPin, 30 * 60 * 1000);

// تغییر به 60 دقیقه:
await unlockWithPin(rememberedPin, 60 * 60 * 1000);

// تغییر به 2 ساعت:
await unlockWithPin(rememberedPin, 2 * 60 * 60 * 1000);
```

### غیرفعال کردن Auto-Lock:

```typescript
// Infinite session (توصیه نمی‌شود!)
await unlockWithPin(rememberedPin, Infinity);
```

---

## 📊 Session Management

### کنسول service worker:

```javascript
// چک کردن وضعیت unlock
// (این کد در service worker کار می‌کند، نه در page console)

// در background script:
console.log('Unlocked:', isUnlocked());

// مدت زمان unlock شده:
console.log('Unlock duration:', getUnlockDuration(), 'ms');
```

---

## 🚀 نتیجه

با **Auto-Unlock**:

- ✅ والت همیشه آماده است
- ✅ نیازی به unlock دستی نیست
- ✅ PancakeSwap بلافاصله connect می‌شود
- ✅ تجربه کاربری بهتر
- ✅ هنوز هم امن است (Auto-lock بعد از 30 دقیقه)

بدون **Auto-Unlock**:

- ❌ هر بار باید PIN وارد کنید
- ❌ "Wallet is locked" error
- ❌ نیاز به unlock دستی قبل از connect

---

## 📝 نکات مهم

1. **همیشه Remember PIN را enable کنید** (مگر روی کامپیوتر عمومی)
2. **Extension را reload کنید** بعد از enable کردن Remember PIN
3. **Service Worker logs را چک کنید** برای تأیید auto-unlock
4. **Auto-lock بعد از 30 دقیقه** برای امنیت
5. **PIN رمزنگاری شده ذخیره می‌شود** - امن است

---

**موفق باشید! 🎉**
