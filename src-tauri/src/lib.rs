pub mod commands;
pub mod db;
pub mod models;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db_path = db::get_db_path(app.handle())
                .expect("Failed to determine database storage path");
            let conn = db::init_database(&db_path)
                .expect("Failed to initialize database and migrations");

            app.manage(db::AppState {
                db: Mutex::new(conn),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_settings,
            commands::set_initial_pin,
            commands::verify_pin,
            commands::wipe_all_data,
            commands::get_accounts,
            commands::create_account,
            commands::update_account,
            commands::archive_account,
            commands::delete_account,
            commands::get_account_ledger,
            commands::get_categories,
            commands::create_category,
            commands::update_category,
            commands::delete_category,
            commands::get_tags,
            commands::get_transactions,
            commands::create_transaction,
            commands::update_transaction,
            commands::delete_transaction,
            commands::get_recurring_rules,
            commands::create_recurring_rule,
            commands::update_recurring_rule,
            commands::delete_recurring_rule,
            commands::process_recurring_rules,
            commands::get_month_summary,
            commands::get_budgets,
            commands::create_budget,
            commands::update_budget,
            commands::delete_budget,
            commands::get_goals,
            commands::create_goal,
            commands::update_goal,
            commands::delete_goal,
            commands::contribute_to_goal,
            commands::get_bills,
            commands::create_bill,
            commands::update_bill,
            commands::delete_bill,
            commands::mark_bill_paid,
            commands::unmark_bill_paid,
            commands::get_shopping_items,
            commands::create_shopping_item,
            commands::update_shopping_item,
            commands::toggle_shopping_item,
            commands::delete_shopping_item,
            commands::clear_completed_shopping_items,
            commands::get_warranties,
            commands::create_warranty,
            commands::update_warranty,
            commands::delete_warranty,
            commands::import_csv_transactions,
            commands::get_holdings,
            commands::get_portfolio_summary,
            commands::create_holding,
            commands::update_holding,
            commands::archive_holding,
            commands::delete_holding,
            commands::update_holding_price,
            commands::bulk_update_holding_prices,
            commands::get_holding_price_history,
            commands::get_exchange_rates,
            commands::set_exchange_rate,
            commands::delete_exchange_rate,
            commands::get_debts,
            commands::get_debt_transactions,
            commands::create_debt,
            commands::update_debt,
            commands::record_debt_payment,
            commands::draw_debt_funds,
            commands::spend_from_debt,
            commands::delete_debt,
            commands::get_net_worth_summary,
            commands::get_net_worth_history,
            commands::check_and_snapshot_net_worth,
            commands::record_net_worth_snapshot,
            commands::get_category_spending_report,
            commands::get_income_expense_trend,
            commands::get_investment_performance_report,
            commands::get_backups_list,
            commands::create_backup,
            commands::check_and_run_daily_backup,
            commands::restore_backup,
            commands::set_base_currency,
            commands::set_app_theme,
            commands::change_pin,
            commands::update_notification_settings,
            commands::check_and_send_due_reminders,
            commands::send_os_desktop_notification,
            commands::check_app_update,
            commands::install_app_update,
            commands::restart_application,
            commands::get_payment_methods,
            commands::create_payment_method,
            commands::update_payment_method,
            commands::delete_payment_method,
            commands::apply_regional_payment_presets,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

