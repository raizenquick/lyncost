# Lyncost

<div align="center">

**Fast, 100% Offline Personal Finance & Investment Tracker for Linux & Android**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Platform: Linux](https://img.shields.io/badge/Platform-Linux-orange.svg)]()
[![Android Beta](https://img.shields.io/badge/Android%20Beta-v0.2.1-3DDC84.svg?logo=android&logoColor=white)](dist-packages/lyncost-mobile.apk)
[![Built with: Tauri v2](https://img.shields.io/badge/Built%20with-Tauri%20v2-24C8D8.svg)](https://tauri.app/)
[![Architecture & Guide](https://img.shields.io/badge/Documentation-Project%20Guide-8A2BE2.svg)](PROJECT_GUIDE.md)

*Modeled on the productivity of top personal finance suites, built completely local, private, and bloat-free.*

</div>

---

## Highlights

- **100% Offline & Private**: Zero telemetry, zero cloud synchronizations, and zero bank logins. Your financial data stays exclusively on your machine in a local SQLite database with WAL durability.
- **Cross-Platform Vault**: Native Linux desktop application alongside an offline Android mobile beta companion.
- **Double-Entry Style Ledger Math**: Account balances are never directly overwritten. Every balance is mathematically derived from atomic ledger rows (`account_ledger`), guaranteeing auditability and consistency.
- **International Number & Currency Support**:
  - Toggle between **International Millions** (`$1,234,567.89`) and **Indian Lakhs/Crores** (`₹12,34,567.89`).
  - Customizable Base Currency (`USD`, `EUR`, `GBP`, `INR`, `CAD`, `AUD`, `JPY`, `CHF`, etc.) with offline exchange rates.
  - Flexible date formats (`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`).
- **Investment Portfolio Tracker**: Track stocks, cryptocurrencies, mutual funds, and custom assets. Manage cost basis, manual price updates with historical pricing records, and real-time unrealized P&L.
- **Live Budget Pace Projections**: Know whether you will overshoot your budget *before* the month ends with automatic velocity pace warnings.
- **Consolidated Net Worth Engine**: Automated daily snapshots plotting your combined net worth (Bank + Cash + Investments - Debts) over time.
- **Biometric & PIN Lock Protection**: 6-digit PIN protection hashed securely with bcrypt on desktop, and biometric fingerprint unlock on mobile.
- **Automated Daily Backups**: Automated snapshot rotation keeping the newest 10 backups, plus one-click export to external USB storage.

---

## Installation

### 🐧 Linux Desktop (One-Line Fast Install)

Run this command in any Linux terminal (Ubuntu, Arch, Fedora, Debian, Mint, Pop!_OS, openSUSE, etc.):

```bash
curl -fsSL https://raw.githubusercontent.com/raizenquick/lyncost/main/install.sh | bash
```

- **User-Level**: Installs to `~/.local/bin/lyncost` (no `sudo` or root password needed).
- **Desktop Integrated**: Adds high-res icon and application launcher shortcut to your app menu.
- **Zero Dependencies**: Fully compiled standalone binary with SQLite embedded.

### 📱 Lyncost Mobile for Android (Public Beta)

Download the native Android APK directly to test the offline mobile companion:

- **Direct Download**: [lyncost-mobile.apk](https://raw.githubusercontent.com/raizenquick/lyncost/main/dist-packages/lyncost-mobile.apk) (~10.2 MB)
- **Version**: `v0.2.1 Beta`
- **Requires**: Android 8.0+ (Oreo) or later.
- **Features**: Biometric fingerprint auth, offline SQLite vault, scheduled bill alerts, quick expense logging, zero network tracking.
- **How to Install**:
  1. Download `lyncost-mobile.apk` to your Android device.
  2. Tap the downloaded APK and select **Install**.
  3. If prompted by Android, tap *"Allow from this source"* to complete installation.

### One-Line Clean Uninstall

To completely remove Lyncost at any time:

```bash
curl -fsSL https://raw.githubusercontent.com/raizenquick/lyncost/main/uninstall.sh | bash
```

- Removes the binary, desktop entry, and icon assets.
- Asks whether you wish to keep or wipe your local database vault.

---

### Build From Source

```bash
git clone https://github.com/raizenquick/lyncost.git
cd lyncost
npm install
npm run release
```

The compiled binary will be placed at `~/.local/bin/lyncost` and `src-tauri/target/release/lyncost`.

---

## Key Features Breakdown

### 1. Account & Multi-Currency Engine
- Multiple account types: Bank accounts, physical cash wallets, investment accounts, credit cards, and loans.
- Multi-currency conversions: Every transaction retains its native account currency and records a converted base currency amount (`base_amount`) calculated using your configured offline exchange rates.

### 2. Transaction Management & Ledger
- Supports Income, Expense, and atomic Transfers (`transfer_out` on source, `transfer_in` on target).
- Transaction verification flag (Confirmed vs Pending).
- One-click **Clone** button on past transactions to duplicate entries with today's date.
- Category hierarchy with custom icons and color pickers.
- Multi-tag tagging system.

### 3. Recurring Payments & Smart Catch-Up
- Daily, weekly, monthly, and yearly recurring transaction engine.
- **Smart catch-up**: If Lyncost is not opened for weeks or months, it automatically computes and posts all missed recurring cycles sequentially without skipping or corrupting ledger state.

### 4. Budgets & Pace Warnings
- Period options: Weekly, Monthly, or Custom Date Ranges.
- Visual progress meters, category filters, and rollover support.
- Mathematical pace projection: `(spent / days_elapsed) * total_days` alerts you early if spending velocity exceeds budget limits.

### 5. Upcoming Bills & Reminders
- Bill tracking with due-date countdowns and overdue badges.
- One-click "Mark as Paid" that records a verified, ledger-backed transaction in your selected account.

### 6. Shopping List & Warranty Vault
- Interactive quick-check shopping checklist with instant toggle and clear.
- Warranty organizer: Records purchase date, warranty duration, auto-calculates expiration, and alerts when warranties expire in less than 30 days.

### 7. Bank Statement CSV Importer
- Import bank transactions from any CSV statement offline.
- Automatic column matching, multi-format date parser (`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`), duplicate detection, and import summary reports.

### 8. Investment Portfolio
- Track holdings across Stocks, Cryptos, Mutual Funds, and ETFs.
- Manual price updates (single asset or bulk price matrix) with historical price tracking over time.
- Calculates cost basis, current market value, unrealized P&L, and percentage returns.

### 9. Deep Financial Analytics & CSV Export
- **Spending by Category**: Donut chart + Ranked horizontal bar chart + detailed breakdown.
- **Income vs Expense Trend**: Grouped bar charts showing net savings rate.
- **Net Worth Trend**: Historical growth trajectory.
- **Investment Performance**: Individual holding returns and asset allocation.
- **CSV Export**: Clean spreadsheet export buttons on every report.

### 10. Security & Durability
- 6-digit security PIN hashed with bcrypt.
- Automated daily backup snapshots rotated to keep the last 10 versions.
- Off-machine USB export to back up your database to physical drives.
---

## Building from Source

### Prerequisites
- Node.js 18+ and npm
- Rust 1.77+ and Cargo
- Linux development libraries:
  - **Arch Linux**: `sudo pacman -S webkit2gtk-4.1 gtk3 base-devel openssl`
  - **Debian / Ubuntu**: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev build-essential libssl-dev`
  - **Fedora**: `sudo dnf install webkit2gtk4.1-devel gtk3-devel openssl-devel @development-tools`

### Build Steps
```bash
# 1. Clone repository
git clone https://github.com/raizenquick/lyncost.git
cd lyncost

# 2. Install frontend dependencies
npm install

# 3. Run development build
npm run tauri dev

# 4. Build optimized release binary
npm run build
npx tauri build --bundles deb

# 5. Build distribution packages (.deb, .pkg.tar.zst, .tar.gz)
./packaging/build_packages.sh
```

All generated distribution packages and checksums will be placed in `./dist-packages/`.

---

## License

Lyncost is 100% free and open-source software, licensed under the **[GNU General Public License v3.0 (GPL-3.0)](LICENSE)**.

```text
Copyright (C) 2026 raizenquick <raizenquick@users.noreply.github.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
```

See the full [LICENSE](LICENSE) file for the complete terms and conditions.

