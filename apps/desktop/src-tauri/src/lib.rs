mod agent_runtime;
mod http_health_runtime;
mod persistence;
mod quota_runtime;

use agent_runtime::{list_agent_adapters, start_agent_run, stop_agent_run};
use http_health_runtime::check_http_health;
use persistence::{
    create_component_instance, get_persistence_health, load_component_runtime_state,
    load_default_canvas, load_latest_canvas_snapshot, save_canvas_snapshot,
    update_component_instance_config, upsert_component_runtime_state,
};
use quota_runtime::refresh_quota_file;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let persistence_state =
                tauri::async_runtime::block_on(persistence::initialize_persistence(app_data_dir))?;

            app.manage(persistence_state);
            app.manage(agent_runtime::AgentRuntimeState::default());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_http_health,
            create_component_instance,
            get_persistence_health,
            list_agent_adapters,
            load_component_runtime_state,
            load_default_canvas,
            load_latest_canvas_snapshot,
            refresh_quota_file,
            save_canvas_snapshot,
            start_agent_run,
            stop_agent_run,
            update_component_instance_config,
            upsert_component_runtime_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
