# راهنمای اتصال به Solana در Hero Wallet

## ✅ وضعیت فعلی (آپدیت شده)

Hero Wallet از شبکه Solana پشتیبانی می‌کند و **حساب Solana را خودکار** ایجاد می‌کند!

## � استفاده از Solana (خودکار)

### گام 1: فقط Connect کنید!

**دیگر نیازی به کار دستی نیست!** فقط به هر dApp سولانا بروید و connect کنید:

1. به یکی از dApp های Solana بروید:
   - [Raydium](https://raydium.io/) - DEX
   - [PancakeSwap Solana](https://pancakeswap.finance) - Swap
   - [Jupiter](https://jup.ag/) - Aggregator
   - [Orca](https://www.orca.so/) - DEX
   - [Magic Eden](https://magiceden.io/) - NFT Marketplace

2. روی "Connect Wallet" کلیک کنید

3. Hero Wallet را انتخاب کنید

4. **خودکار اتفاق می‌افتد:**
   - ✅ Hero Wallet تشخیص می‌دهد حساب Solana ندارید
   - ✅ از همان mnemonic شما حساب Solana می‌سازد
   - ✅ Approval dialog باز می‌شود
   - ✅ شما فقط "Connect" را کلیک می‌کنید

5. تمام! اتصال برقرار شد 🎉

## ⚡ نکات فنی

### چگونه کار می‌کند؟

**Dynamic Import Magic:**
```javascript
// در background.ts
async function createSolanaAccountDynamic(pin: string) {
  // فقط وقتی لازم است load می‌شود!
  const { createSolanaAccount } = await import('./utils/accountSeed');
  return await createSolanaAccount(pin, Date.now());
}
```

**مزایا:**
- ✅ **Background.js کوچک:** 36KB (نه 130KB)
- ✅ **Lazy Loading:** Solana module فقط وقتی نیاز است load می‌شود (96KB)
- ✅ **Service Worker سالم:** با اندازه کوچک، crash نمی‌کند
- ✅ **EVM سریع:** بدون overhead Solana در startup

### امنیت

- ✅ از همان mnemonic شما استفاده می‌شود
- ✅ Private key رمزگذاری شده با PIN ذخیره می‌شود
- ✅ هیچ کلید خصوصی به سرور ارسال نمی‌شود
- ✅ تمام عملیات local در browser شما انجام می‌شود

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
خودکار ساخته می‌شود! فقط یک بار به هر Solana dApp connect کنید.

## 📊 مقایسه اندازه فایل‌ها

| فایل | Static Import | Dynamic Import | بهبود |
|------|--------------|----------------|-------|
| background.js | 130KB ❌ | 36KB ✅ | 72% کاهش |
| accountSeed.js (lazy) | - | 96KB | فقط وقتی نیاز |
| popup.js | 13KB | 13KB | بدون تغییر |
| vendor-chain.js | 323KB | 759KB* | بزرگتر شد |
| vendor-crypto.js | 237KB | 261KB | +10% |

\* vendor-chain شامل تمام chain adapters است که فقط یک بار load می‌شود

**نتیجه کلی:** 
- ✅ Background سبک و سریع (36KB)
- ✅ Service Worker پایدار
- ✅ Solana فقط وقتی لازم است load می‌شود
- ✅ تجربه کاربری بهتر
