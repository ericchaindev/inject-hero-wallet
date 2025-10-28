# 🔧 حل مشکل "Invalid mnemonic phrase"

## 🎯 علل رایج و راه‌حل‌ها

### 1. ✅ فاصله‌های اضافی یا newline

**مشکل:** وقتی mnemonic را کپی می‌کنید، ممکن است فاصله‌های اضافی یا newline داشته باشد.

**نمونه اشتباه:**

```
bottom  drive   obey
lake curtain smoke
basket hold race lonely fit walk
```

**راه‌حل:** نگران نباشید! wallet خودکار این موارد را پاک می‌کند:

- فاصه‌های اضافی → یک فاصه
- Newline ها → فاصه
- Tabs → فاضه

**تست کنید:** از فایل `test-mnemonic-validation.html` استفاده کنید.

---

### 2. ✅ تعداد کلمات نادرست

**مشکل:** تعداد کلمات باید دقیقاً 12 یا 24 کلمه باشد.

**بررسی:**

```javascript
// در Console service worker:
const mnemonic = 'your mnemonic here';
const words = mnemonic.trim().split(' ');
console.log('Word count:', words.length);
```

**خطاهای رایج:**

- ❌ 11 کلمه → یک کلمه کم است
- ❌ 13 کلمه → یک کلمه اضافی است
- ❌ 5 کلمه → خیلی کم است

**راه‌حل:** اطمینان حاصل کنید دقیقاً 12 یا 24 کلمه دارید.

---

### 3. ✅ کلمات نامعتبر BIP39

**مشکل:** همه کلمات باید از لیست BIP39 انگلیسی باشند (2048 کلمه).

**کلمات نامعتبر:**

```
word1, word2, test123, hello123
```

**کلمات معتبر:**

```
abandon, ability, able, about, above, absent, absorb, ...
```

**راه‌حل:**

1. از [BIP39 wordlist](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt) استفاده کنید
2. اطمینان حاصل کنید همه کلمات حروف کوچک هستند
3. هیچ عدد یا کاراکتر خاص نباشد

---

### 4. ✅ Checksum اشتباه

**مشکل:** آخرین کلمه (یا چند بیت از آن) checksum است. اگر ترتیب کلمات اشتباه باشد، checksum valid نیست.

**نمونه:**

```
✅ Correct: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
❌ Wrong:   test abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
```

**راه‌حل:**

- اطمینان حاصل کنید mnemonic را از منبع اصلی کپی کرده‌اید
- ترتیب کلمات را تغییر ندهید
- از backup اصلی استفاده کنید

---

### 5. ✅ حروف بزرگ و کوچک

**مشکل:** BIP39 فقط حروف کوچک را قبول می‌کند.

**نمونه اشتباه:**

```
Bottom Drive Obey Lake Curtain Smoke Basket Hold Race Lonely Fit Walk
```

**نمونه صحیح:**

```
bottom drive obey lake curtain smoke basket hold race lonely fit walk
```

**راه‌حل:** wallet خودکار به lowercase تبدیل می‌کند، اما بهتر است خودتان lowercase وارد کنید.

---

## 🧪 تست و Debugging

### استفاده از test-mnemonic-validation.html

1. فایل `test-mnemonic-validation.html` را در browser باز کنید
2. Mnemonic خود را paste کنید
3. روی "Validate" کلیک کنید
4. نتایج را ببینید:
   - ✅ **Valid**: mnemonic صحیح است
   - ❌ **Invalid**: دلیل خطا نمایش داده می‌شود

### استفاده از Console

در Service Worker Console:

```javascript
// Test validation
import('https://cdn.jsdelivr.net/npm/bip39@3.1.0/+esm').then((bip39) => {
  const mnemonic = 'your mnemonic here';
  const cleaned = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  const isValid = bip39.validateMnemonic(cleaned);
  console.log('Is valid:', isValid);
  console.log('Word count:', cleaned.split(' ').length);
});
```

---

## 📝 Checklist تست

قبل از restore کردن:

- [ ] تعداد کلمات 12 یا 24 است
- [ ] همه کلمات با فاصه جدا شده‌اند
- [ ] هیچ فاصله اضافی در ابتدا یا انتها نیست
- [ ] همه کلمات حروف کوچک هستند
- [ ] هیچ عدد یا کاراکتر خاص (مثل کاما، نقطه) وجود ندارد
- [ ] از backup اصلی کپی شده است (نه تایپ دستی)
- [ ] در test-mnemonic-validation.html تست شده و valid است

---

## 🎯 نمونه‌های تست

### ✅ Valid 12-word:

```
bottom drive obey lake curtain smoke basket hold race lonely fit walk
```

### ✅ Valid 24-word (Standard test):

```
abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art
```

### ❌ Invalid (wrong checksum):

```
bottom drive obey lake curtain smoke basket hold race lonely fit test
```

### ❌ Invalid (not BIP39 words):

```
word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12
```

### ❌ Invalid (wrong count):

```
abandon abandon abandon abandon abandon
```

---

## 🆘 هنوز مشکل دارید؟

### Debug Steps:

1. **Clear Extension Storage:**

   ```javascript
   // در Service Worker Console:
   chrome.storage.local.clear();
   ```

2. **Reload Extension:**

   - به `chrome://extensions` بروید
   - روی refresh کلیک کنید

3. **Check Console Logs:**

   - Service Worker Console را باز کنید
   - به دنبال این لاگ‌ها باشید:
     ```
     🔍 Validating mnemonic: ...
     🔍 Word count: ...
     ```

4. **Test با mnemonic معروف:**

   - از mnemonic های تست استاندارد استفاده کنید
   - اگر این‌ها کار کرد، مشکل از mnemonic شماست

5. **فایل test-mnemonic-validation.html:**
   - این فایل دقیقاً همان validation wallet را دارد
   - نتایج دقیق و مفصل نمایش می‌دهد

---

## 📞 Support

اگر بعد از تمام این مراحل هنوز مشکل دارید:

1. Screenshot از error را بگیرید
2. Console logs را کپی کنید
3. mnemonic خود را در test-mnemonic-validation.html تست کنید
4. نتایج را report کنید (⚠️ هیچوقت mnemonic واقعی خود را share نکنید!)

---

## ✅ Success!

بعد از validate شدن mnemonic:

1. در wallet روی "Restore Wallet" کلیک کنید
2. Mnemonic را paste کنید
3. PIN تعیین کنید
4. منتظر بمانید تا wallet restore شود
5. Dashboard باز می‌شود و address شما نمایش داده می‌شود

🎉 **تبریک! Wallet شما restore شد!**
