# Lyncost v0.1.5 — Fast, Offline, Privacy-First Personal Finance

**Lyncost** is a lightweight, 100% offline personal finance and money management desktop application built with **Tauri**, **Rust**, **React**, and **SQLite**.

This release introduces complete re-branding, GNU General Public License v3.0 (GPL-3.0), universal international currency formatting, streamlined Linux desktop packaging, and an updated companion Android app.

---

## What's New in v0.1.5

### 🌐 Universal Multi-Currency & Number Formatting
- **Dynamic Localization**: Automatically formats numbers according to regional conventions (Western million/billion, South Asian lakh/crore, and non-decimal systems like JPY/KRW).
- **Flexible Currency Symbols**: Support for custom prefix/suffix placement for currencies worldwide (USD `$`, EUR `€`, GBP `£`, INR `₹`, JPY `¥`, CAD, AUD, etc.).
- **Localized Payment Methods**: Full support for global and regional payment rails (Cash, Credit Card, Debit Card, Bank Transfer, UPI, Net Banking, Crypto, Cheque).

### 🔒 Complete Privacy & 100% Offline Architecture
- **Zero Cloud Tracking**: All financial records and ledgers are stored strictly in a local SQLite database (`~/.local/share/com.lyncost.desktop/lyncost.db`).
- **No Account Required**: No third-party servers, no analytics, no subscription locks.
- **Instant Launch**: Powered by Tauri v2 and native Rust bindings — fast startup and under 50 MB RAM usage.

### 💼 Comprehensive Money Management
- **Transactions & Accounts**: Track income, expenses, account transfers, and category breakdowns with real-time balance calculations.
- **Debt & Lending Tracker**: Built-in borrow/lend ledger with due dates, settlement status, and debtor contact tracking.
- **Budgeting & Goals**: Set monthly spending thresholds with visual gauge warnings and track savings milestones.
- **Recurring Schedules**: Automate repeated monthly bills and subscription tracking.
- **Secure Backups**: 1-click JSON export and encrypted database backup/restore.

### 🐧 Polished Linux Desktop Integration
- Native desktop launcher (`lyncost.desktop`) with high-resolution vector and hicolor icons.
- Single command terminal installation script (`install.sh`) and clean uninstaller (`uninstall.sh`).
- Automated native build pipeline (`build.sh`).

---

## 📦 Downloads & Assets

| Asset | Platform | Description | Size | Checksum (SHA-256) |
| :--- | :--- | :--- | :--- | :--- |
| **`lyncost-0.1.5-linux-x86_64.tar.gz`** | Linux (x86_64) | Production desktop bundle with binary, desktop entry & installer | ~5.6 MB | `54b9f729fbe187295931349867da0262a70a035edd489b842fa832ee50e8fcee` |
| **`lyncost-mobile.apk`** | Android (Beta) | Companion mobile app for on-the-go logging | ~9.8 MB | `e3d9eb154500569828644d960fbc69225f9c824c3d0d1a6fa9534e31f4437d05` |
| **`SHA256SUMS`** | All | Verification checksums for release artifacts | 160 B | — |

---

## 🚀 Quick Install on Linux

### Option 1: Extract & Run Installer (Recommended)
```bash
# 1. Download and extract
tar -xzf lyncost-0.1.5-linux-x86_64.tar.gz
cd lyncost-0.1.5-linux-x86_64

# 2. Run the installer
./install.sh
```

### Option 2: Run Portable Binary Directly
```bash
tar -xzf lyncost-0.1.5-linux-x86_64.tar.gz
./lyncost-0.1.5-linux-x86_64/lyncost
```

---

## 🛡️ License & Copyright
Licensed under the **GNU General Public License v3.0 (GPL-3.0-or-later)**.
Copyright © 2026 **raizenquick**. Free & Open Source Software.
