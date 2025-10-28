# GitHub Repository Setup Script
# راهنمای اتوماتیک اتصال به GitHub

Write-Host "`n=== Hero Wallet - GitHub Setup ===" -ForegroundColor Cyan
Write-Host "این اسکریپت به شما کمک می‌کند repository را به GitHub متصل کنید`n" -ForegroundColor Yellow

# بررسی وضعیت Git
Write-Host "[1/5] بررسی وضعیت Git..." -ForegroundColor Green
$gitStatus = git status --short
if ($gitStatus) {
    Write-Host "⚠️  تغییرات commit نشده وجود دارد:" -ForegroundColor Yellow
    git status --short
    $commit = Read-Host "`nآیا می‌خواهید ابتدا commit کنید؟ (y/n)"
    if ($commit -eq 'y') {
        $message = Read-Host "پیام commit"
        git add .
        git commit -m $message
        Write-Host "✅ Commit انجام شد" -ForegroundColor Green
    }
}

# بررسی GitHub CLI
Write-Host "`n[2/5] بررسی GitHub CLI..." -ForegroundColor Green
$ghVersion = gh --version 2>$null
if ($ghVersion) {
    Write-Host "✅ GitHub CLI نصب است: $($ghVersion[0])" -ForegroundColor Green
    
    # بررسی authentication
    $authStatus = gh auth status 2>&1
    if ($authStatus -match "Logged in") {
        Write-Host "✅ شما به GitHub لاگین هستید" -ForegroundColor Green
        $useGH = $true
    } else {
        Write-Host "❌ شما به GitHub لاگین نیستید" -ForegroundColor Red
        $login = Read-Host "آیا می‌خواهید الان لاگین کنید؟ (y/n)"
        if ($login -eq 'y') {
            gh auth login
            $useGH = $true
        } else {
            $useGH = $false
        }
    }
} else {
    Write-Host "❌ GitHub CLI نصب نیست" -ForegroundColor Red
    Write-Host "برای نصب: winget install GitHub.cli" -ForegroundColor Yellow
    $useGH = $false
}

# انتخاب روش
Write-Host "`n[3/5] انتخاب روش اتصال..." -ForegroundColor Green
if ($useGH) {
    Write-Host @"
روش‌های موجود:
1. GitHub CLI (پیشنهادی) - خودکار
2. HTTPS با Token دستی
3. SSH
4. فقط نمایش دستورات
"@
    $method = Read-Host "روش مورد نظر را انتخاب کنید (1-4)"
} else {
    Write-Host @"
روش‌های موجود:
1. HTTPS با Token دستی
2. SSH
3. فقط نمایش دستورات
"@
    $method = Read-Host "روش مورد نظر را انتخاب کنید (1-3)"
    if ($method -eq '1') { $method = '2' }
    elseif ($method -eq '2') { $method = '3' }
    elseif ($method -eq '3') { $method = '4' }
}

# اطلاعات Repository
Write-Host "`n[4/5] اطلاعات Repository..." -ForegroundColor Green
$repoName = Read-Host "نام repository (پیش‌فرض: inject-hero-wallet)"
if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = "inject-hero-wallet" }

$repoDesc = Read-Host "توضیحات (پیش‌فرض: Hero Wallet - Multi-chain Extension)"
if ([string]::IsNullOrWhiteSpace($repoDesc)) { $repoDesc = "Hero Wallet - Multi-chain Browser Extension Wallet" }

$isPrivate = Read-Host "Private repository? (y/n, پیش‌فرض: n)"
$visibility = if ($isPrivate -eq 'y') { '--private' } else { '--public' }

# اجرای روش انتخابی
Write-Host "`n[5/5] اجرا..." -ForegroundColor Green

switch ($method) {
    '1' {
        # GitHub CLI
        Write-Host "`nدر حال ساخت repository با GitHub CLI..." -ForegroundColor Cyan
        $cmd = "gh repo create $repoName $visibility --source=. --remote=origin --description `"$repoDesc`""
        Write-Host "دستور: $cmd" -ForegroundColor Gray
        
        $confirm = Read-Host "`nآیا مطمئن هستید؟ (y/n)"
        if ($confirm -eq 'y') {
            Invoke-Expression $cmd
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ Repository ساخته شد!" -ForegroundColor Green
                
                $push = Read-Host "`nآیا می‌خواهید الان push کنید؟ (y/n)"
                if ($push -eq 'y') {
                    git push -u origin main
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "`n🎉 موفق! Repository شما آماده است:" -ForegroundColor Green
                        gh repo view --web
                    }
                }
            } else {
                Write-Host "`n❌ خطا در ساخت repository" -ForegroundColor Red
            }
        }
    }
    
    '2' {
        # HTTPS با Token
        Write-Host "`n=== راهنمای استفاده از Token ===" -ForegroundColor Cyan
        Write-Host @"
مراحل:
1. به https://github.com/settings/tokens بروید
2. Generate new token (classic) بزنید
3. Note: Hero Wallet Development
4. Scopes: repo (تمام sub-scopes)
5. Generate token و کپی کنید

"@
        $username = Read-Host "نام کاربری GitHub"
        $token = Read-Host "Personal Access Token" -AsSecureString
        $tokenPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))
        
        Write-Host "`nابتدا باید repository را در GitHub بسازید:" -ForegroundColor Yellow
        Write-Host "https://github.com/new" -ForegroundColor Cyan
        Read-Host "`nبعد از ساخت repository، Enter بزنید"
        
        git remote add origin "https://$tokenPlain@github.com/$username/$repoName.git"
        git push -u origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n🎉 موفق!" -ForegroundColor Green
            Start-Process "https://github.com/$username/$repoName"
        }
    }
    
    '3' {
        # SSH
        Write-Host "`n=== راهنمای استفاده از SSH ===" -ForegroundColor Cyan
        
        # بررسی SSH key
        $sshKeyExists = Test-Path "$env:USERPROFILE\.ssh\id_ed25519.pub"
        if (-not $sshKeyExists) {
            Write-Host "SSH key وجود ندارد. در حال ساخت..." -ForegroundColor Yellow
            $email = Read-Host "ایمیل GitHub"
            ssh-keygen -t ed25519 -C $email
        }
        
        # کپی کردن public key
        $publicKey = Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
        Set-Clipboard -Value $publicKey
        Write-Host "`n✅ Public key به clipboard کپی شد" -ForegroundColor Green
        
        Write-Host @"
        
مراحل:
1. به https://github.com/settings/keys بروید
2. New SSH key بزنید
3. Title: Hero Wallet Dev
4. Key: Ctrl+V (از clipboard paste کنید)
5. Add SSH key

"@
        $username = Read-Host "`nنام کاربری GitHub"
        Read-Host "بعد از اضافه کردن SSH key، Enter بزنید"
        
        Write-Host "`nابتدا باید repository را در GitHub بسازید:" -ForegroundColor Yellow
        Write-Host "https://github.com/new" -ForegroundColor Cyan
        Read-Host "`nبعد از ساخت repository، Enter بزنید"
        
        git remote add origin "git@github.com:$username/$repoName.git"
        git push -u origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n🎉 موفق!" -ForegroundColor Green
            Start-Process "https://github.com/$username/$repoName"
        }
    }
    
    '4' {
        # فقط نمایش دستورات
        Write-Host "`n=== دستورات مورد نیاز ===" -ForegroundColor Cyan
        Write-Host @"
        
# روش 1: GitHub CLI
gh auth login
gh repo create $repoName $visibility --source=. --remote=origin --description "$repoDesc"
git push -u origin main

# روش 2: HTTPS با Token
# 1. ساخت Token: https://github.com/settings/tokens
# 2. ساخت Repo: https://github.com/new
git remote add origin https://YOUR-TOKEN@github.com/YOUR-USERNAME/$repoName.git
git push -u origin main

# روش 3: SSH
# 1. ساخت SSH Key: ssh-keygen -t ed25519 -C "your_email@example.com"
# 2. اضافه به GitHub: https://github.com/settings/keys
# 3. ساخت Repo: https://github.com/new
git remote add origin git@github.com:YOUR-USERNAME/$repoName.git
git push -u origin main

"@
        Write-Host "✅ دستورات آماده است" -ForegroundColor Green
    }
}

Write-Host "`n=== تمام ===" -ForegroundColor Cyan
Write-Host "راهنمای کامل: GITHUB-SETUP.md" -ForegroundColor Yellow
