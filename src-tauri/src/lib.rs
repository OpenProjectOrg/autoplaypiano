pub mod db;
pub mod keyboard;
pub mod parser;

use db::{
    db_admin_update_role, db_delete_sheet, db_delete_user, db_get_all_sheets, db_get_all_users,
    db_get_user_by_id, db_login_user, db_register_user, db_reset_user_password, db_save_sheet,
    db_toggle_mfa, db_update_user_password, db_update_user_profile,
};

use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
use std::thread::{self, sleep};
use std::time::Duration;
use tauri::{Emitter, Manager};

static IS_PLAYING: AtomicBool = AtomicBool::new(false);
static IS_PAUSED: AtomicBool = AtomicBool::new(false);
static SEEK_INDEX: AtomicIsize = AtomicIsize::new(-1);

#[derive(Clone, serde::Serialize)]
struct PlaybackStatus {
    is_playing: bool,
    is_paused: bool,
}

#[derive(Clone, serde::Serialize)]
struct CountdownPayload {
    remaining_sec: u32,
}

#[derive(Clone, serde::Serialize)]
struct TickPayload {
    current_index: usize,
    total_events: usize,
    note_display: String,
}

#[derive(Clone, serde::Serialize)]
struct FinishedPayload {
    completed: bool,
    message: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct FetchedSheetData {
    pub title: String,
    pub artist: String,
    pub difficulty: String,
    pub bpm: u32,
    pub content: String,
    pub transpose: String,
}

#[tauri::command]
fn parse_sheet(raw_content: String, bpm: u32) -> parser::SheetParseResult {
    parser::parse_virtual_piano_sheet(&raw_content, bpm)
}

#[tauri::command]
fn stop_playback() -> bool {
    IS_PAUSED.store(false, Ordering::SeqCst);
    let was_playing = IS_PLAYING.swap(false, Ordering::SeqCst);
    was_playing
}

#[tauri::command]
fn pause_playback() -> bool {
    if IS_PLAYING.load(Ordering::SeqCst) {
        IS_PAUSED.store(true, Ordering::SeqCst);
        true
    } else {
        false
    }
}

#[tauri::command]
fn resume_playback() -> bool {
    if IS_PLAYING.load(Ordering::SeqCst) {
        IS_PAUSED.store(false, Ordering::SeqCst);
        true
    } else {
        false
    }
}

#[tauri::command]
fn seek_playback(index: usize) -> bool {
    SEEK_INDEX.store(index as isize, Ordering::SeqCst);
    true
}

#[tauri::command]
fn get_playback_status() -> PlaybackStatus {
    PlaybackStatus {
        is_playing: IS_PLAYING.load(Ordering::SeqCst),
        is_paused: IS_PAUSED.load(Ordering::SeqCst),
    }
}

#[tauri::command]
fn fetch_playpianosheets(url: String) -> Result<FetchedSheetData, String> {
    let clean_url = url.trim();
    if !clean_url.starts_with("http") {
        return Err("URL harus diawali dengan http:// atau https://".to_string());
    }

    let output = std::process::Command::new("curl.exe")
        .args(&[
            "-s",
            "-L",
            "-A",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            clean_url,
        ])
        .output()
        .map_err(|e| format!("Gagal menjalankan request: {}", e))?;

    let html = String::from_utf8_lossy(&output.stdout);
    if html.is_empty() {
        return Err("Halaman tidak merespons atau kosong".to_string());
    }

    // Extract title & artist from <title> tag
    let mut title = "Lagu PlayPianoSheets".to_string();
    let mut artist = "Unknown Artist".to_string();

    if let Some(start) = html.find("<title>") {
        let after = &html[start + 7..];
        if let Some(end) = after.find("</title>") {
            let full_title = &after[..end];
            if let Some(by_idx) = full_title.find(" by ") {
                title = full_title[..by_idx].trim().to_string();
                let rest = &full_title[by_idx + 4..];
                artist = rest.split(" Roblox").next().unwrap_or(rest).trim().to_string();
            } else {
                title = full_title.split(" Roblox").next().unwrap_or(full_title).trim().to_string();
            }
        }
    }

    Ok(FetchedSheetData {
        title,
        artist,
        difficulty: "Normal".to_string(),
        bpm: 120,
        content: "".to_string(),
        transpose: "+4".to_string(),
    })
}

#[tauri::command]
fn start_playback(
    app: tauri::AppHandle,
    events: Vec<parser::NoteEvent>,
    countdown_sec: u32,
    speed_multiplier: f64,
    start_index: Option<usize>,
) -> Result<String, String> {
    if events.is_empty() {
        return Err("No notes to play".to_string());
    }

    if IS_PLAYING.swap(true, Ordering::SeqCst) {
        return Err("Playback is already running".to_string());
    }
    IS_PAUSED.store(false, Ordering::SeqCst);

    let speed = if speed_multiplier > 0.1 && speed_multiplier < 10.0 {
        speed_multiplier
    } else {
        1.0
    };

    let start_idx = start_index.unwrap_or(0).min(events.len().saturating_sub(1));

    thread::spawn(move || {
        // 1. Countdown loop
        let countdown = countdown_sec.clamp(0, 10);
        for sec in (1..=countdown).rev() {
            if !IS_PLAYING.load(Ordering::SeqCst) {
                let _ = app.emit("playback-finished", FinishedPayload {
                    completed: false,
                    message: "Dibatalkan saat countdown".to_string(),
                });
                return;
            }

            #[cfg(windows)]
            if keyboard::win_impl::is_esc_pressed() {
                IS_PLAYING.store(false, Ordering::SeqCst);
                IS_PAUSED.store(false, Ordering::SeqCst);
                let _ = app.emit("playback-finished", FinishedPayload {
                    completed: false,
                    message: "Dibatalkan via ESC".to_string(),
                });
                return;
            }

            let _ = app.emit("playback-countdown", CountdownPayload {
                remaining_sec: sec,
            });
            sleep(Duration::from_millis(1000));
        }

        // Final tick before play
        if !IS_PLAYING.load(Ordering::SeqCst) {
            let _ = app.emit("playback-finished", FinishedPayload {
                completed: false,
                message: "Dibatalkan sebelum mulai".to_string(),
            });
            return;
        }

        let _ = app.emit("playback-countdown", CountdownPayload {
            remaining_sec: 0,
        });
        sleep(Duration::from_millis(100));

        // 2. Playback loop
        let total = events.len();
        let mut completed = true;
        let mut idx = start_idx;

        while idx < total {
            if !IS_PLAYING.load(Ordering::SeqCst) {
                completed = false;
                break;
            }

            // A. Handle pause state before note execution
            while IS_PAUSED.load(Ordering::SeqCst) {
                if !IS_PLAYING.load(Ordering::SeqCst) {
                    completed = false;
                    break;
                }

                // Check if user sought to a new note while paused
                let sought = SEEK_INDEX.swap(-1, Ordering::SeqCst);
                if sought >= 0 && (sought as usize) < total {
                    idx = sought as usize;
                    let _ = app.emit("playback-tick", TickPayload {
                        current_index: idx,
                        total_events: total,
                        note_display: events[idx].display.clone(),
                    });
                }

                #[cfg(windows)]
                if keyboard::win_impl::is_esc_pressed() {
                    IS_PLAYING.store(false, Ordering::SeqCst);
                    IS_PAUSED.store(false, Ordering::SeqCst);
                    completed = false;
                    break;
                }
                sleep(Duration::from_millis(20));
            }

            if !completed || !IS_PLAYING.load(Ordering::SeqCst) {
                break;
            }

            #[cfg(windows)]
            if keyboard::win_impl::is_esc_pressed() {
                IS_PLAYING.store(false, Ordering::SeqCst);
                IS_PAUSED.store(false, Ordering::SeqCst);
                completed = false;
                break;
            }

            let event = &events[idx];

            let _ = app.emit("playback-tick", TickPayload {
                current_index: idx,
                total_events: total,
                note_display: event.display.clone(),
            });

            #[cfg(windows)]
            {
                if event.is_chord {
                    let targets: Vec<keyboard::win_impl::KeyTarget> = event
                        .keys
                        .iter()
                        .filter_map(|&k| keyboard::win_impl::char_to_key_target(k))
                        .collect();
                    keyboard::win_impl::press_chord(&targets, 34);
                } else if let Some(&single_ch) = event.keys.first() {
                    if let Some(target) = keyboard::win_impl::char_to_key_target(single_ch) {
                        keyboard::win_impl::press_single_key(target, 32);
                    }
                }
            }

            // Delay after note adjusted by speed
            let delay_ms = ((event.delay_after_ms as f64) / speed).round() as u64;
            let safe_delay = delay_ms.max(20);

            // Sleep in small 10ms slices so ESC or Pause responds immediately
            let slice_ms = 10;
            let slices = safe_delay / slice_ms;
            let remainder = safe_delay % slice_ms;

            let mut was_paused_in_delay = false;
            for _ in 0..slices {
                if !IS_PLAYING.load(Ordering::SeqCst) {
                    completed = false;
                    break;
                }

                // Check if user paused mid-delay
                if IS_PAUSED.load(Ordering::SeqCst) {
                    was_paused_in_delay = true;
                    // Current note was already pressed, advance position to next note
                    if idx + 1 < total {
                        idx += 1;
                        let _ = app.emit("playback-tick", TickPayload {
                            current_index: idx,
                            total_events: total,
                            note_display: events[idx].display.clone(),
                        });
                    }

                    while IS_PAUSED.load(Ordering::SeqCst) {
                        if !IS_PLAYING.load(Ordering::SeqCst) {
                            completed = false;
                            break;
                        }

                        let sought = SEEK_INDEX.swap(-1, Ordering::SeqCst);
                        if sought >= 0 && (sought as usize) < total {
                            idx = sought as usize;
                            let _ = app.emit("playback-tick", TickPayload {
                                current_index: idx,
                                total_events: total,
                                note_display: events[idx].display.clone(),
                            });
                        }

                        #[cfg(windows)]
                        if keyboard::win_impl::is_esc_pressed() {
                            IS_PLAYING.store(false, Ordering::SeqCst);
                            IS_PAUSED.store(false, Ordering::SeqCst);
                            completed = false;
                            break;
                        }
                        sleep(Duration::from_millis(20));
                    }
                    break; // Exit slice loop immediately on resume so the target note starts promptly
                }

                #[cfg(windows)]
                if keyboard::win_impl::is_esc_pressed() {
                    IS_PLAYING.store(false, Ordering::SeqCst);
                    IS_PAUSED.store(false, Ordering::SeqCst);
                    completed = false;
                    break;
                }
                sleep(Duration::from_millis(slice_ms));
            }

            if !completed || !IS_PLAYING.load(Ordering::SeqCst) {
                break;
            }

            if !was_paused_in_delay {
                if remainder > 0 {
                    sleep(Duration::from_millis(remainder));
                }
                idx += 1;
            }
        }

        IS_PLAYING.store(false, Ordering::SeqCst);
        IS_PAUSED.store(false, Ordering::SeqCst);

        let _ = app.emit("playback-finished", FinishedPayload {
            completed,
            message: if completed {
                "Selesai memainkan lagu!".to_string()
            } else {
                "Dihentikan".to_string()
            },
        });
    });

    Ok("Playback started".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize local SQLite database
            let db_path = match app.path().app_data_dir() {
                Ok(dir) => dir.join("autopiano.db"),
                Err(_) => std::path::PathBuf::from("autopiano.db"),
            };
            let conn = db::init_database(&db_path).expect("Failed to initialize SQLite database");
            app.manage(db::DbState(std::sync::Mutex::new(conn)));

            let handle = app.handle().clone();
            thread::spawn(move || loop {
                sleep(Duration::from_millis(35));

                #[cfg(windows)]
                {
                    if keyboard::win_impl::is_esc_pressed() {
                        if IS_PLAYING.load(Ordering::SeqCst) {
                            IS_PLAYING.store(false, Ordering::SeqCst);
                            IS_PAUSED.store(false, Ordering::SeqCst);
                            let _ = handle.emit("hotkey-esc-pressed", ());
                            sleep(Duration::from_millis(250));
                        }
                    }

                    if keyboard::win_impl::is_f6_pressed() {
                        if IS_PLAYING.load(Ordering::SeqCst) {
                            let was_paused = IS_PAUSED.load(Ordering::SeqCst);
                            IS_PAUSED.store(!was_paused, Ordering::SeqCst);
                            if was_paused {
                                let _ = handle.emit("playback-resumed", ());
                            } else {
                                let _ = handle.emit("playback-paused", ());
                            }
                        } else {
                            let _ = handle.emit("hotkey-f6-pressed", ());
                        }
                        sleep(Duration::from_millis(350));
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            parse_sheet,
            start_playback,
            stop_playback,
            pause_playback,
            resume_playback,
            seek_playback,
            get_playback_status,
            fetch_playpianosheets,
            db_get_all_sheets,
            db_save_sheet,
            db_delete_sheet,
            db_register_user,
            db_login_user,
            db_get_user_by_id,
            db_update_user_profile,
            db_update_user_password,
            db_reset_user_password,
            db_toggle_mfa,
            db_get_all_users,
            db_admin_update_role,
            db_delete_user
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
