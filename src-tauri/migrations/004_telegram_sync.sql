-- Migration 004: Two-Way Telegram Bot Sync and Command Support
ALTER TABLE app_settings ADD COLUMN telegram_last_update_id INTEGER DEFAULT 0;
ALTER TABLE app_settings ADD COLUMN enable_telegram_bot_commands INTEGER DEFAULT 1;
