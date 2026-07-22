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

#[tauri::command]
async fn discord_api_get(token: String, path: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("https://discord.com/api/v10/{}", path);
    let res = client.get(&url)
        .header("Authorization", format!("Bot {}", token))
        .header("User-Agent", "InovarAssistente (Tauri)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;
    
    if !status.is_success() {
        return Err(format!("Erro {}: {}", status, body));
    }
    
    Ok(body)
}

#[tauri::command]
async fn download_discord_image(app: AppHandle, url: String, filename: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let res = client.get(&url)
        .header("User-Agent", "InovarAssistente (Tauri)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Falha ao baixar imagem, status HTTP: {}", res.status()));
    }

    let bytes = res.bytes().await.map_err(|e| e.to_string())?;

    if let Some(app_dir) = app.path().app_data_dir().ok() {
        let imported_images_dir = app_dir.join("imported_images");
        if fs::create_dir_all(&imported_images_dir).is_err() {
            return Err("Não foi possível criar o diretório de destino".into());
        }
        let file_path = imported_images_dir.join(filename);
        fs::write(file_path, bytes).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Err("Diretório do app não localizado".into())
    }
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
            hash_password,
            discord_api_get,
            download_discord_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
