# راهنمای اتصال به GitHub

## وضعیت فعلی

✅ Repository محلی آماده است  
❌ اتصال به GitHub remote برقرار نیست

---

## روش‌های اتصال

### 🚀 روش 1: ساخت Repository با GitHub CLI (پیشنهادی)

#### مرحله 1: لاگین به GitHub

```bash
gh auth login
```

گزینه‌ها:

- GitHub.com
- HTTPS
- Login with a web browser (راحت‌ترین)

#### مرحله 2: ساخت Repository

```bash
gh repo create inject-hero-wallet --public --source=. --remote=origin --description "Hero Wallet - Multi-chain Browser Extension Wallet with EVM and Solana support"
```

یا برای private:

```bash
gh repo create inject-hero-wallet --private --source=. --remote=origin --description "Hero Wallet - Multi-chain Browser Extension Wallet"
```

#### مرحله 3: Push

```bash
git push -u origin main
```

---

### 🌐 روش 2: ساخت دستی در GitHub

#### مرحله 1: ساخت Repository

1. به https://github.com/new بروید
2. Repository name: `inject-hero-wallet`
3. Description: `Hero Wallet - Multi-chain Browser Extension Wallet`
4. Public/Private انتخاب کنید
5. **مهم:** گزینه‌های Initialize را انتخاب **نکنید** (README, .gitignore, license)
6. Create repository بزنید

#### مرحله 2: اتصال Repository محلی

```bash
# جایگزین کنید: YOUR-USERNAME
git remote add origin https://github.com/YOUR-USERNAME/inject-hero-wallet.git
git branch -M main
git push -u origin main
```

---

### 🔑 روش 3: استفاده از Personal Access Token

#### مرحله 1: ساخت Token

1. به https://github.com/settings/tokens بروید
2. Generate new token (classic)
3. Note: `Hero Wallet Development`
4. Expiration: انتخاب کنید
5. Scopes:
   - ✅ repo (تمام sub-scopes)
   - ✅ workflow
6. Generate token
7. **مهم:** Token را کپی کنید (فقط یکبار نمایش می‌شود!)

#### مرحله 2: اتصال با Token

```bash
# جایگزین کنید: YOUR-TOKEN و YOUR-USERNAME
git remote add origin https://YOUR-TOKEN@github.com/YOUR-USERNAME/inject-hero-wallet.git
git push -u origin main
```

---

### 🔐 روش 4: استفاده از SSH

#### مرحله 1: ساخت SSH Key (اگر ندارید)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

#### مرحله 2: اضافه کردن به GitHub

```bash
# کپی کردن public key
Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard
```

1. به https://github.com/settings/keys بروید
2. New SSH key بزنید
3. Title: `Hero Wallet Dev`
4. Key: Paste کنید
5. Add SSH key

#### مرحله 3: اتصال با SSH

```bash
git remote add origin git@github.com:YOUR-USERNAME/inject-hero-wallet.git
git push -u origin main
```

---

## 📊 اطلاعات Repository فعلی

### Branch اصلی

```
main (HEAD)
```

### آخرین Commit

```
5a5e83f - feat: Add Solana provider integration
```

### فایل‌های اصلی پروژه

- ✅ `src/inpage-solana.ts` - Solana Provider
- ✅ `src/contentScript.ts` - Dual Provider Injection
- ✅ `src/background.ts` - Background Service Worker
- ✅ `test-solana.html` - Testing Page
- ✅ `dist/` - Built files (ready to load)

### آمار

```
6 files changed
1,393 insertions(+)
631 deletions(-)
```

---

## ✅ بعد از Push موفق

### تگ‌گذاری نسخه

```bash
git tag -a v1.0.0-solana -m "Hero Wallet v1.0.0 - Solana Integration"
git push origin v1.0.0-solana
```

### ساخت Release

```bash
gh release create v1.0.0-solana ./dist/*.js --title "v1.0.0 - Solana Support" --notes "First release with Solana provider integration"
```

---

## 🆘 عیب‌یابی

### خطا: Repository not found

- مطمئن شوید repository در GitHub ساخته شده
- نام repository را چک کنید
- دسترسی (public/private) را بررسی کنید

### خطا: Authentication failed

- Token منقضی شده: token جدید بسازید
- Scopes کافی: repo scope ضروری است
- SSH key: مطمئن شوید در GitHub اضافه شده

### خطا: Permission denied

- بررسی کنید owner repository شما هستید
- برای organization: دسترسی push داشته باشید

---

## 📝 دستورات سریع

```bash
# بررسی وضعیت Git
git status

# بررسی Remote
git remote -v

# بررسی GitHub CLI
gh auth status

# لیست Repository‌های شما
gh repo list

# Clone کردن در جای دیگر
git clone https://github.com/YOUR-USERNAME/inject-hero-wallet.git
```

---

## 🎯 توصیه

برای راحتی کار، **روش 1 (GitHub CLI)** را پیشنهاد می‌کنم:

```bash
# فقط یکبار لاگین
gh auth login

# ساخت و push اتوماتیک
gh repo create inject-hero-wallet --public --source=. --remote=origin --push
```

این روش:

- ✅ سریع‌ترین
- ✅ امن‌ترین
- ✅ اتوماتیک
- ✅ نیاز به Token دستی ندارد

---

**آیا کمک بیشتری نیاز دارید؟**
