use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Clone, serde::Serialize)]
struct BuildLog {
    line: String,
    stream: String,
}

#[derive(Clone, serde::Serialize)]
struct BuildResult {
    success: bool,
    pdf_path: Option<String>,
    error: Option<String>,
}

#[tauri::command]
async fn read_tex_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
async fn write_tex_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
async fn build_latex(app: AppHandle, path: String) -> Result<BuildResult, String> {
    let tex_path = PathBuf::from(&path);
    let parent_dir = tex_path.parent().ok_or("Invalid path")?;
    let tex_file_name = tex_path
        .file_stem()
        .ok_or("Invalid file name")?
        .to_str()
        .ok_or("Invalid file name")?;
    let pdf_path = parent_dir.join(format!("{}.pdf", tex_file_name));

    let mut cmd = Command::new("latexmk");
    cmd.arg("-pdf")
        .arg("-interaction=nonstopmode")
        .arg("-shell-escape")
        .arg(&path)
        .current_dir(parent_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn latexmk: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    let app_stdout = app.clone();
    let app_stderr = app.clone();

    let stdout_handle = tokio::spawn(async move {
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            let _ = app_stdout.emit("build-log", BuildLog {
                line,
                stream: "stdout".to_string(),
            });
        }
    });

    let stderr_handle = tokio::spawn(async move {
        while let Ok(Some(line)) = stderr_reader.next_line().await {
            let _ = app_stderr.emit("build-log", BuildLog {
                line,
                stream: "stderr".to_string(),
            });
        }
    });

    let status = child.wait().await.map_err(|e| format!("Build failed: {}", e))?;

    let _ = stdout_handle.await;
    let _ = stderr_handle.await;

    if status.success() && pdf_path.exists() {
        Ok(BuildResult {
            success: true,
            pdf_path: Some(pdf_path.to_string_lossy().to_string()),
            error: None,
        })
    } else {
        Ok(BuildResult {
            success: false,
            pdf_path: None,
            error: Some(format!("Build failed with status: {:?}", status.code())),
        })
    }
}

#[tauri::command]
fn get_pdf_path(tex_path: String) -> Result<String, String> {
    let tex_path = PathBuf::from(&tex_path);
    let parent_dir = tex_path.parent().ok_or("Invalid path")?;
    let tex_file_name = tex_path
        .file_stem()
        .ok_or("Invalid file name")?
        .to_str()
        .ok_or("Invalid file name")?;
    let pdf_path = parent_dir.join(format!("{}.pdf", tex_file_name));
    Ok(pdf_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    log::info!("Starting ALE - A LaTeX Editor");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_tex_file,
            write_tex_file,
            build_latex,
            get_pdf_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
