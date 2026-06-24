// Windows 发布版避免额外弹出控制台窗口，保留该属性。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ai_workflow_kit_lib::run()
}
