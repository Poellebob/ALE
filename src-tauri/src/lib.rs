// src-tauri/src/lib.rs
//
// Tauri backend for ALE.
//
// Exposed commands
// ────────────────
//   read_tex_file   – read a UTF-8 file from disk
//   write_tex_file  – write a UTF-8 string to a path
//   build_latex     – spawn latexmk, stream stdout/stderr as events
//   get_pdf_path    – derive the PDF path for a given .tex path
//
// Build events
// ────────────
//   "build-log"  →  BuildLog { line: String, stream: "stdout"|"stderr" }
//
// See docs/02-backend.md for architecture notes.

use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

// ── Event payloads ────────────────────────────────────────────────────

#[derive(Clone, serde::Serialize)]
struct BuildLog {
    line:   String,
    stream: String, // "stdout" or "stderr"
}

#[derive(Clone, serde::Serialize)]
struct BuildResult {
    success:  bool,
    pdf_path: Option<String>,
    error:    Option<String>,
}

// ── Commands ──────────────────────────────────────────────────────────

/// Read a text file from disk and return its contents.
#[tauri::command]
async fn read_tex_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Cannot read '{}': {}", path, e))
}

/// Write a UTF-8 string to a path, creating the file if it does not exist.
#[tauri::command]
async fn write_tex_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content)
        .map_err(|e| format!("Cannot write '{}': {}", path, e))
}

/// Spawn `latexmk -pdf` on the given .tex file.
///
/// stdout and stderr are each captured in a separate async task and
/// forwarded to the frontend as `build-log` events so the log panel
/// can display them as they arrive.
///
/// Returns a BuildResult indicating success and the path to the PDF.
#[tauri::command]
async fn build_latex(app: AppHandle, path: String) -> Result<BuildResult, String> {
    let tex_path  = PathBuf::from(&path);
    let parent    = tex_path.parent().ok_or("Path has no parent directory")?;
    let stem      = tex_path
        .file_stem()
        .ok_or("Path has no file stem")?
        .to_str()
        .ok_or("File stem is not valid UTF-8")?;

    let pdf_path = parent.join(format!("{}.pdf", stem));

    let mut child = Command::new("latexmk")
        .arg("-pdf")
        .arg("-interaction=nonstopmode")
        .arg("-shell-escape")
        .arg(&path)
        .current_dir(parent)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start latexmk: {}", e))?;

    // Take ownership of the piped streams before spawning tasks
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    // Each task forwards one line at a time as a Tauri event
    let app_out = app.clone();
    let app_err = app.clone();

    let h_out = tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_out.emit("build-log", BuildLog {
                line,
                stream: "stdout".into(),
            });
        }
    });

    let h_err = tokio::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_err.emit("build-log", BuildLog {
                line,
                stream: "stderr".into(),
            });
        }
    });

    // Wait for the process to finish, then drain both stream tasks
    let status = child
        .wait()
        .await
        .map_err(|e| format!("latexmk wait() failed: {}", e))?;

    let _ = h_out.await;
    let _ = h_err.await;

    if status.success() && pdf_path.exists() {
        Ok(BuildResult {
            success:  true,
            pdf_path: Some(pdf_path.to_string_lossy().into_owned()),
            error:    None,
        })
    } else {
        Ok(BuildResult {
            success:  false,
            pdf_path: None,
            error:    Some(format!(
                "latexmk exited with code {:?}",
                status.code()
            )),
        })
    }
}

/// Given a .tex path, return the expected .pdf path (same directory, same stem).
#[tauri::command]
fn get_pdf_path(tex_path: String) -> Result<String, String> {
    let p    = PathBuf::from(&tex_path);
    let dir  = p.parent().ok_or("Invalid path")?;
    let stem = p.file_stem().ok_or("Invalid file stem")?.to_str().ok_or("Invalid UTF-8")?;
    Ok(dir.join(format!("{}.pdf", stem)).to_string_lossy().into_owned())
}

// ── Entry point ───────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info"),
    )
    .init();

    log::info!("Starting ALE — A LaTeX Editor");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_tex_file,
            write_tex_file,
            build_latex,
            get_pdf_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
