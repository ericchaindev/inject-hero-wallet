# 🔍 راهنمای Debugging سریع

## مشکل فعلی: Popup باز نمی‌شود

### 📋 مراحل Debugging:

#### 1. Reload Extension

```
chrome://extensions/
→ Hero Wallet
→ کلیک روی Reload ⟳
```

#### 2. باز کردن Background Service Worker Console

```
chrome://extensions/
→ Hero Wallet
→ "service worker" (کلیک روی inspect)
```

#### 3. باز کردن صفحه تست

```
در Chrome:
→ باز کردن test-e2e-metamask-compatible.html
یا
→ رفتن به https://metamask.github.io/test-dapp/
```

#### 4. کلیک Connect Wallet

#### 5. بررسی لاگ‌های Background Service Worker

**لاگ‌های مورد انتظار:**

```javascript
// اگر wallet ندارید:
📋 Processing PAGE_REQUEST via background: eth_requestAccounts from https://...
🔍 handleEthRequestAccounts called for origin: https://...
🔍 Wallet state loaded: null
⚠️  Wallet not initialized. Opening popup window...
✅ Popup window opened: 123456789
```

**اگر این لاگ‌ها را ندیدید:**

- ❌ مشکل در ارتباط content script → background
- ✅ بررسی console صفحه وب (F12)

**اگر این لاگ‌ها را دیدید اما popup باز نشد:**

- ❌ مشکل permission یا popup blocker
- ✅ بررسی Chrome Settings → Privacy → Pop-ups

---

## 🐛 مشکلات احتمالی و راه‌حل:

### 1. Popup باز نمی‌شود (Service Worker لاگ دارد)

**علامت:**

```javascript
⚠️  Wallet not initialized. Opening popup window...
❌ Failed to open popup window: Error: ...
```

**راه‌حل:**

- بررسی manifest permissions
- بررسی popup blocker در Chrome

### 2. درخواست به background نمی‌رسد

**علامت:**

- هیچ لاگ "📋 Processing PAGE_REQUEST" در background
- فقط لاگ‌های content script و inpage

**راه‌حل:**

- Extension را reload کنید
- صفحه را refresh کنید (F5)
- Browser را restart کنید

### 3. Wallet state null است اما باید exist باشد

**علامت:**

```javascript
🔍 Wallet state loaded: null
```

**راه‌حل:**

- باید یک بار wallet ایجاد کنید
- روی آیکون extension کلیک کنید
- Create New Wallet

### 4. Popup باز می‌شود اما درست کار نمی‌کند

**راه‌حل:**

- روی popup راست‌کلیک → Inspect
- بررسی console popup
- بررسی errors

---

## 🧪 تست دستی Popup Open:

در background service worker console:

```javascript
// تست باز کردن popup
chrome.windows
  .create({
    url: chrome.runtime.getURL('src/popup/index.html'),
    type: 'popup',
    width: 400,
    height: 600,
  })
  .then((win) => {
    console.log('Popup opened:', win.id);
  })
  .catch((err) => {
    console.error('Failed:', err);
  });
```

**اگر کار کرد:**

- ✅ Permission OK
- ❌ مشکل در logic background

**اگر کار نکرد:**

- ❌ مشکل permission
- ❌ مشکل popup blocker

---

## 📊 چک‌لیست کامل:

### قبل از تست:

- [ ] Extension build شده (`npm run build`)
- [ ] Extension loaded در Chrome
- [ ] Extension reload شده
- [ ] Background service worker console باز است
- [ ] صفحه تست باز است

### حین تست:

- [ ] کلیک Connect Wallet
- [ ] لاگ "📋 Processing PAGE_REQUEST" ظاهر شد
- [ ] لاگ "🔍 handleEthRequestAccounts" ظاهر شد
- [ ] لاگ "🔍 Wallet state loaded" ظاهر شد
- [ ] لاگ "⚠️ Wallet not initialized" ظاهر شد
- [ ] لاگ "✅ Popup window opened" ظاهر شد
- [ ] Popup window واقعاً باز شد

### اگر popup باز شد:

- [ ] UI به درستی نمایش داده می‌شود
- [ ] دکمه "Create Wallet" کار می‌کند
- [ ] می‌توانید wallet ایجاد کنید

---

## 🔧 Commands مفید:

### پاک کردن Storage

```javascript
// در background console:
chrome.storage.local.clear().then(() => {
  console.log('Storage cleared');
});
```

### دریافت State فعلی

```javascript
// در background console:
chrome.storage.local.get(null).then((data) => {
  console.log('Current storage:', data);
});
```

### بررسی isUnlocked

```javascript
// در background console:
// Note: باید کد keystore.ts را import کنید یا مستقیماً چک کنید
```

---

## 📞 اگر مشکل ادامه داشت:

1. **Screenshot بگیرید** از:

   - Background service worker console
   - Page console (F12)
   - Extension page (chrome://extensions/)

2. **لاگ‌های کامل را کپی کنید**

3. **مراحل دقیق را شرح دهید:**

   - چه کردید؟
   - چه دیدید؟
   - چه انتظار داشتید؟

4. **بررسی کنید:**
   - Chrome version?
   - OS?
   - آیا متامسک نصب است؟

---

## ✅ اگر همه چیز کار کرد:

### فلوی موفق:

```
1. Click Connect → ✅
2. Background logs show → ✅
3. Popup opens → ✅
4. Create wallet → ✅
5. Mnemonic shown → ✅
6. PIN set → ✅
7. Wallet created → ✅
8. Back to test page → ✅
9. Click Connect again → ✅
10. Approval window opens → ✅
11. Approve → ✅
12. Connected! → ✅
```

---

**موفق باشید! 🚀**

اگر مشکل پیدا کردید، لاگ‌های کامل را برای من ارسال کنید.
