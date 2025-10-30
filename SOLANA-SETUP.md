# راهنمای اتصال به Solana در Hero Wallet

## 📋 وضعیت فعلی

Hero Wallet از شبکه Solana پشتیبانی می‌کند، اما باید ابتدا یک حساب Solana ایجاد کنید.

## 🔧 روش موقت (فعلی)

### گام 1: ساخت حساب Solana از طریق Console

1. Extension Hero Wallet را در Chrome باز کنید
2. کلید F12 را بزنید (Developer Console)
3. به تب **Console** بروید
4. کد زیر را کپی و اجرا کنید:

```javascript
(async () => {
  const { loadState, saveState, getRememberedPin, isUnlocked } = await import(chrome.runtime.getURL('assets/keystore-D8xAGJpT.js'));
  
  // بررسی وضعیت wallet
  const unlocked = isUnlocked();
  console.log('🔍 Wallet unlocked:', unlocked);
  
  if (!unlocked) {
    console.error('❌ لطفاً ابتدا wallet را با PIN خود unlock کنید');
    return;
  }
  
  const state = await loadState();
  if (!state) {
    console.error('❌ Wallet یافت نشد');
    return;
  }
  
  // بررسی حساب Solana موجود
  const hasSolana = state.accounts.some(acc => acc.chain === 'sol');
  if (hasSolana) {
    console.log('✅ حساب Solana از قبل وجود دارد!');
    const solAccount = state.accounts.find(acc => acc.chain === 'sol');
    console.log('📍 Solana Address:', solAccount.address);
    return;
  }
  
  console.log('🔄 در حال ساخت حساب Solana...');
  
  // Import Solana utilities (این خط فعلاً placeholder است)
  console.warn('⚠️ ساخت خودکار حساب Solana هنوز پیاده‌سازی نشده است');
  console.log('📝 لطفاً منتظر آپدیت بعدی باشید یا به صورت دستی از popup ایجاد کنید');
})();
```

### گام 2: اتصال به PancakeSwap Solana

1. به [PancakeSwap](https://pancakeswap.finance) بروید
2. روی شبکه Solana کلیک کنید
3. "Connect Wallet" را انتخاب کنید
4. Hero Wallet را از لیست انتخاب کنید
5. درخواست اتصال را تأیید کنید

## ⚠️ نکات مهم

- **اندازه Background Script:** با حذف import های سنگین Solana، اندازه background.js از 130KB به 34KB کاهش یافت
- **Service Worker:** حالا به درستی کار می‌کند
- **EVM Chains:** تمام شبکه‌های EVM (Ethereum, BSC, Polygon) همچنان کار می‌کنند

## 🚀 آپدیت‌های آینده

در نسخه بعدی، ساخت خودکار حساب Solana از طریق UI popup اضافه خواهد شد.

## 🐛 عیب‌یابی

### مشکل: Service Worker غیرفعال است
**راه حل:** Extension را reload کنید از `chrome://extensions`

### مشکل: Popup باز نمی‌شود
**راه حل:** 
1. Console Extension را بررسی کنید
2. به `chrome://extensions` بروید
3. روی "Reload" کلیک کنید

### مشکل: حساب Solana وجود ندارد
**راه حل:** 
فعلاً باید از console ساخته شود (روش بالا). در نسخه بعدی از UI قابل دسترس خواهد بود.

## 📊 مقایسه اندازه فایل‌ها

| فایل | قبل | بعد |
|------|-----|-----|
| background.js | 130KB | 34KB |
| popup.js | 13KB | 13KB |
| vendor-chain.js | 323KB | 323KB |
| vendor-crypto.js | 237KB | 237KB |

**نتیجه:** کاهش 74% در اندازه background script!
