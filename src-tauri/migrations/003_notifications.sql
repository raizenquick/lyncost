-- Migration 003: Telegram and Desktop Notifications settings

ALTER TABLE app_settings ADD COLUMN telegram_bot_token TEXT;
ALTER TABLE app_settings ADD COLUMN telegram_chat_id TEXT;
ALTER TABLE app_settings ADD COLUMN notify_telegram INTEGER DEFAULT 0;
ALTER TABLE app_settings ADD COLUMN notify_os INTEGER DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN notify_advance_days INTEGER DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN last_notification_check_at TEXT;
