/// Tauri desktop shell entry point. Phase 1 needs no native commands — the
/// whole game runs in the webview — but this is where SQLite save/load, OS
/// notifications, and file I/O plugins will be registered in later phases.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Aetherion");
}
