# 🔍 راهنمای سریع تست Mnemonic

## مشکل: "Invalid mnemonic phrase"

اگر با این خطا مواجه هستید، این مراحل را دنبال کنید:

### 1️⃣ تست با فایل test-mnemonic-detailed.html

این بهترین راه برای پیدا کردن مشکل است:

```bash
# فایل را در browser باز کنید
open test-mnemonic-detailed.html
```

**این فایل چه کاری انجام می‌دهد:**

- ✅ هر کلمه را جداگانه بررسی می‌کند
- ✅ نشان می‌دهد کدام کلمه نامعتبر است
- ✅ تعداد کلمات را چک می‌کند
- ✅ Checksum را validate می‌کند
- ✅ دقیقاً همان validation wallet را دارد

### 2️⃣ مراحل استفاده

1. فایل `test-mnemonic-detailed.html` را باز کنید
2. Mnemonic خود را در textarea paste کنید
3. روی دکمه "بررسی کن" کلیک کنید
4. نتایج را ببینید:

**اگر کلمه نامعتبر دارید:**

```
❌ کلمات نامعتبر BIP39 پیدا شد

کلمات نامعتبر:
#5: "currtan"  ← باید "curtain" باشد
#8: "hod"      ← باید "hold" باشد
```

**اگر checksum نادرست است:**

```
❌ Checksum نامعتبر

ممکن است:
- ترتیب کلمات اشتباه باشد
- یک یا چند کلمه اشتباه باشد
```

### 3️⃣ علل رایج

#### الف) غلط املایی

```
❌ اشتباه: currtan, hod, lonley
✅ صحیح:   curtain, hold, lonely
```

#### ب) کلمات BIP39 نیستند

```
❌ اشتباه: word1, word2, test123
✅ صحیح:   از 2048 کلمه BIP39 استفاده کنید
```

#### ج) تعداد کلمات

```
❌ اشتباه: 11 کلمه یا 13 کلمه
✅ صحیح:   دقیقاً 12 یا 24 کلمه
```

#### د) ترتیب اشتباه

```
❌ اشتباه: کلمات به ترتیب اشتباه
✅ صحیح:   دقیقاً همان ترتیبی که wallet داده
```

### 4️⃣ در Extension

بعد از build جدید، این لاگ‌ها را خواهید دید:

```javascript
// در Service Worker Console:

🔍 Raw input: bottom drive obey...
🔍 Cleaned mnemonic: bottom drive obey...
🔍 Word count: 12
🔍 Words: ['bottom', 'drive', 'obey', ...]

// اگر کلمه نامعتبر باشد:
❌ Invalid words found: ['#5: "currtan"']

// یا:
✅ Mnemonic validation passed
```

### 5️⃣ نمونه‌های تست

**✅ معتبر:**

```
bottom drive obey lake curtain smoke basket hold race lonely fit walk
```

**✅ معتبر (استاندارد):**

```
abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
```

**❌ نامعتبر (checksum):**

```
test abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
```

**❌ نامعتبر (کلمات):**

```
word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12
```

### 6️⃣ چک‌لیست

قبل از استفاده در wallet:

- [ ] در test-mnemonic-detailed.html تست کردم
- [ ] تمام کلمات سبز (valid) هستند
- [ ] تعداد کلمات 12 یا 24 است
- [ ] Checksum معتبر است
- [ ] از backup اصلی کپی کردم (نه تایپ دستی)

### 7️⃣ همچنان مشکل دارید؟

1. **Screenshot بگیرید** از نتایج test-mnemonic-detailed.html
2. **Console logs را کپی کنید** از Service Worker
3. مطمئن شوید که:
   - Extension آخرین build را دارد (`npm run build`)
   - Extension reload شده (`chrome://extensions` → Reload)
   - Storage پاک شده (`chrome.storage.local.clear()`)

### 8️⃣ فایل‌های مفید

- `test-mnemonic-detailed.html` → تست دقیق هر کلمه (فارسی، زیبا)
- `test-mnemonic-validation.html` → تست ساده (انگلیسی)
- `MNEMONIC-TROUBLESHOOTING.md` → راهنمای کامل
- Service Worker Console → لاگ‌های دقیق validation

---

## 🎯 خلاصه

1. ✅ از `test-mnemonic-detailed.html` استفاده کنید
2. ✅ هر کلمه را بررسی کنید
3. ✅ مطمئن شوید checksum valid است
4. ✅ بعد در wallet امتحان کنید

**اگر در test-mnemonic-detailed.html معتبر شد، در wallet هم کار می‌کند! 🎉**
