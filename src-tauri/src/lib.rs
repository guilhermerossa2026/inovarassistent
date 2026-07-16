use std::fs;
use tauri::{AppHandle, Manager};
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose};

#[tauri::command]
fn read_db_file(app: AppHandle, filename: String) -> Option<String> {
    let app_dir = app.path().app_data_dir().ok()?;
    let file_path = app_dir.join(filename);
    if !file_path.exists() {
        return None;
    }
    fs::read_to_string(file_path).ok()
}

#[tauri::command]
fn write_db_file(app: AppHandle, filename: String, content: String) -> bool {
    if let Some(app_dir) = app.path().app_data_dir().ok() {
        if fs::create_dir_all(&app_dir).is_err() {
            return false;
        }
        let file_path = app_dir.join(filename);
        fs::write(file_path, content).is_ok()
    } else {
        false
    }
}

#[tauri::command]
fn write_binary_file(app: AppHandle, filename: String, base64_content: String) -> bool {
    if let Some(app_dir) = app.path().app_data_dir().ok() {
        let imported_images_dir = app_dir.join("imported_images");
        if fs::create_dir_all(&imported_images_dir).is_err() {
            return false;
        }
        let file_path = imported_images_dir.join(filename);
        if let Ok(decoded) = general_purpose::STANDARD.decode(base64_content) {
            fs::write(file_path, decoded).is_ok()
        } else {
            false
        }
    } else {
        false
    }
}

#[tauri::command]
fn read_binary_file_as_base64(app: AppHandle, filename: String) -> Option<String> {
    let app_dir = app.path().app_data_dir().ok()?;
    let file_path = app_dir.join("imported_images").join(filename);
    if !file_path.exists() {
        return None;
    }
    let data = fs::read(file_path).ok()?;
    Some(general_purpose::STANDARD.encode(data))
}

#[tauri::command]
fn hash_password(password: String) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_db_file,
            write_db_file,
            write_binary_file,
            read_binary_file_as_base64,
            hash_password
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
