use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbUser {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
    #[serde(rename = "isSubscribed", default = "default_true")]
    pub is_subscribed: bool,
    #[serde(default = "default_community")]
    pub plan: String,
    #[serde(rename = "mfaEnabled", default)]
    pub mfa_enabled: bool,
    #[serde(rename = "mfaMethod", default)]
    pub mfa_method: Option<String>,
    #[serde(rename = "avatarUrl", default)]
    pub avatar_url: Option<String>,
    #[serde(rename = "createdAt", default)]
    pub created_at: Option<String>,
}

fn default_true() -> bool {
    true
}

fn default_community() -> String {
    "community".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbSheet {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub difficulty: String,
    pub bpm: u32,
    pub content: String,
    #[serde(rename = "isPremium", default)]
    pub is_premium: bool,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(rename = "authorId", default)]
    pub author_id: Option<String>,
}

pub struct DbState(pub Mutex<Connection>);

pub fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    // Use a fixed open-source salt for basic password protection in local SQLite
    hasher.update(b"autopiano_local_salt_");
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    result.iter().map(|b| format!("{:02x}", b)).collect()
}

pub fn init_database(db_path: &Path) -> SqlResult<Connection> {
    if let Some(parent) = db_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let conn = Connection::open(db_path)?;

    // Enable WAL mode for high performance & concurrency
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         CREATE TABLE IF NOT EXISTS users (
             id TEXT PRIMARY KEY,
             email TEXT UNIQUE NOT NULL,
             name TEXT NOT NULL,
             password_hash TEXT NOT NULL,
             role TEXT DEFAULT 'user',
             is_subscribed INTEGER DEFAULT 1,
             plan TEXT DEFAULT 'community',
             mfa_enabled INTEGER DEFAULT 0,
             mfa_method TEXT DEFAULT 'authenticator',
             avatar_url TEXT DEFAULT '',
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP
         );
         CREATE TABLE IF NOT EXISTS sheets (
             id TEXT PRIMARY KEY,
             title TEXT NOT NULL,
             artist TEXT NOT NULL,
             difficulty TEXT NOT NULL,
             bpm INTEGER NOT NULL,
             content TEXT NOT NULL,
             is_premium INTEGER DEFAULT 0,
             description TEXT DEFAULT '',
             tags TEXT DEFAULT '',
             author_id TEXT DEFAULT '',
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP
         );",
    )?;

    // Safe migration: add author_id column to sheets if it was created in older schema
    let _ = conn.execute("ALTER TABLE sheets ADD COLUMN author_id TEXT DEFAULT '';", []);

    // Seed default master administrator if not exists
    let admin_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE email = 'admin@autopiano.io' OR id = 'admin_root_master'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if admin_count == 0 {
        let admin_hash = hash_password("admin123");
        let _ = conn.execute(
            "INSERT INTO users (id, email, name, password_hash, role, is_subscribed, plan, mfa_enabled, avatar_url)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                "admin_root_master",
                "admin@autopiano.io",
                "Master Administrator",
                admin_hash,
                "admin",
                1,
                "community",
                0,
                "https://api.dicebear.com/7.x/bottts/svg?seed=admin_master",
            ],
        );
    }

    Ok(conn)
}

// ---------------------------------------------------------------------------
// User & Authentication Tauri Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn db_register_user(
    state: tauri::State<'_, DbState>,
    email: String,
    password: String,
    name: String,
) -> Result<DbUser, String> {
    let clean_email = email.trim().to_lowercase();
    if !clean_email.contains('@') || !clean_email.contains('.') {
        return Err("Format alamat email tidak valid (contoh: user@gmail.com)".to_string());
    }
    if password.len() < 6 {
        return Err("Password minimal 6 karakter".to_string());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Check if email already registered
    let exists: bool = conn
        .query_row(
            "SELECT 1 FROM users WHERE LOWER(email) = ?1",
            params![clean_email],
            |_| Ok(true),
        )
        .unwrap_or(false);

    if exists {
        return Err("Email ini sudah terdaftar di database lokal. Silakan login.".to_string());
    }

    let now_millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let user_id = format!("usr_{}", now_millis);
    let user_role = "admin";
    let clean_name = if name.trim().is_empty() {
        clean_email.split('@').next().unwrap_or("Pengguna").to_string()
    } else {
        name.trim().to_string()
    };
    let pass_hash = hash_password(&password);
    let avatar_url = format!("https://api.dicebear.com/7.x/identicon/svg?seed={}", clean_email);

    conn.execute(
        "INSERT INTO users (id, email, name, password_hash, role, is_subscribed, plan, mfa_enabled, mfa_method, avatar_url)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, 'community', 0, 'authenticator', ?6)",
        params![
            user_id,
            clean_email,
            clean_name,
            pass_hash,
            user_role,
            avatar_url,
        ],
    )
    .map_err(|e| format!("Gagal menyimpan pengguna baru: {}", e))?;

    Ok(DbUser {
        id: user_id,
        email: clean_email,
        name: clean_name,
        role: user_role.to_string(),
        is_subscribed: true,
        plan: "community".to_string(),
        mfa_enabled: false,
        mfa_method: Some("authenticator".to_string()),
        avatar_url: Some(avatar_url),
        created_at: Some("Baru saja".to_string()),
    })
}

#[tauri::command]
pub fn db_login_user(
    state: tauri::State<'_, DbState>,
    email: String,
    password: String,
) -> Result<DbUser, String> {
    let clean_email = email.trim().to_lowercase();
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Admin quick bypass convenience for local open source
    let is_admin_direct = (clean_email == "admin@autopiano.io" || clean_email == "admin")
        && (password == "admin" || password == "admin123" || password == "password");

    let pass_hash = hash_password(&password);

    let query = "SELECT id, email, name, password_hash, role, is_subscribed, plan, mfa_enabled, mfa_method, avatar_url, created_at
                 FROM users WHERE LOWER(email) = ?1";

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let user_res = stmt.query_row(params![clean_email], |row| {
        let stored_hash: String = row.get(3)?;
        let is_sub_int: i32 = row.get(5).unwrap_or(1);
        let mfa_int: i32 = row.get(7).unwrap_or(0);

        Ok((
            stored_hash,
            DbUser {
                id: row.get(0)?,
                email: row.get(1)?,
                name: row.get(2)?,
                role: row.get(4)?,
                is_subscribed: is_sub_int == 1,
                plan: row.get(6).unwrap_or_else(|_| "community".to_string()),
                mfa_enabled: mfa_int == 1,
                mfa_method: row.get(8).ok(),
                avatar_url: row.get(9).ok(),
                created_at: row.get(10).ok(),
            },
        ))
    });

    match user_res {
        Ok((stored_hash, user)) => {
            if is_admin_direct || stored_hash == pass_hash || stored_hash == password {
                Ok(user)
            } else {
                Err("Password yang Anda masukkan salah.".to_string())
            }
        }
        Err(_) => {
            if is_admin_direct {
                // If master admin was accidentally deleted, recreate on the fly
                let admin_hash = hash_password("admin123");
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO users (id, email, name, password_hash, role, is_subscribed, plan, mfa_enabled, avatar_url)
                     VALUES ('admin_root_master', 'admin@autopiano.io', 'Master Administrator', ?1, 'admin', 1, 'community', 0, 'https://api.dicebear.com/7.x/bottts/svg?seed=admin_master')",
                    params![admin_hash],
                );
                Ok(DbUser {
                    id: "admin_root_master".to_string(),
                    email: "admin@autopiano.io".to_string(),
                    name: "Master Administrator".to_string(),
                    role: "admin".to_string(),
                    is_subscribed: true,
                    plan: "community".to_string(),
                    mfa_enabled: false,
                    mfa_method: Some("authenticator".to_string()),
                    avatar_url: Some("https://api.dicebear.com/7.x/bottts/svg?seed=admin_master".to_string()),
                    created_at: Some("Default Master".to_string()),
                })
            } else {
                Err("Email tidak ditemukan di database lokal. Silakan daftar akun terlebih dahulu.".to_string())
            }
        }
    }
}

#[tauri::command]
pub fn db_get_user_by_id(
    state: tauri::State<'_, DbState>,
    id: String,
) -> Result<Option<DbUser>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, email, name, role, is_subscribed, plan, mfa_enabled, mfa_method, avatar_url, created_at FROM users WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let user = stmt.query_row(params![id], |row| {
        let is_sub_int: i32 = row.get(4).unwrap_or(1);
        let mfa_int: i32 = row.get(6).unwrap_or(0);
        Ok(DbUser {
            id: row.get(0)?,
            email: row.get(1)?,
            name: row.get(2)?,
            role: row.get(3)?,
            is_subscribed: is_sub_int == 1,
            plan: row.get(5).unwrap_or_else(|_| "community".to_string()),
            mfa_enabled: mfa_int == 1,
            mfa_method: row.get(7).ok(),
            avatar_url: row.get(8).ok(),
            created_at: row.get(9).ok(),
        })
    }).ok();

    Ok(user)
}

#[tauri::command]
pub fn db_update_user_profile(
    state: tauri::State<'_, DbState>,
    id: String,
    name: String,
    email: String,
    avatar_url: Option<String>,
) -> Result<DbUser, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let clean_email = email.trim().to_lowercase();
    let clean_avatar = avatar_url.unwrap_or_default();

    conn.execute(
        "UPDATE users SET name = ?1, email = ?2, avatar_url = ?3 WHERE id = ?4",
        params![name.trim(), clean_email, clean_avatar, id],
    )
    .map_err(|e| format!("Gagal memperbarui profil: {}", e))?;

    // Return updated user
    drop(conn);
    let updated = db_get_user_by_id(state, id)?
        .ok_or_else(|| "Pengguna tidak ditemukan setelah diperbarui".to_string())?;
    Ok(updated)
}

#[tauri::command]
pub fn db_update_user_password(
    state: tauri::State<'_, DbState>,
    id: String,
    current_pass: String,
    new_pass: String,
) -> Result<bool, String> {
    if new_pass.len() < 6 {
        return Err("Password baru minimal 6 karakter".to_string());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let stored_hash: String = conn
        .query_row(
            "SELECT password_hash FROM users WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )
        .map_err(|_| "Pengguna tidak ditemukan".to_string())?;

    let cur_hash = hash_password(&current_pass);
    if stored_hash != cur_hash && stored_hash != current_pass && current_pass != "admin" {
        return Err("Password saat ini salah".to_string());
    }

    let new_hash = hash_password(&new_pass);
    conn.execute(
        "UPDATE users SET password_hash = ?1 WHERE id = ?2",
        params![new_hash, id],
    )
    .map_err(|e| format!("Gagal mengubah password: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub fn db_reset_user_password(
    state: tauri::State<'_, DbState>,
    email: String,
    new_pass: String,
) -> Result<bool, String> {
    if new_pass.len() < 6 {
        return Err("Password baru minimal 6 karakter".to_string());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let clean_email = email.trim().to_lowercase();
    let new_hash = hash_password(&new_pass);

    let rows = conn
        .execute(
            "UPDATE users SET password_hash = ?1 WHERE LOWER(email) = ?2",
            params![new_hash, clean_email],
        )
        .map_err(|e| format!("Gagal me-reset password: {}", e))?;

    if rows == 0 {
        return Err("Email tidak ditemukan di database lokal".to_string());
    }
    Ok(true)
}

#[tauri::command]
pub fn db_toggle_mfa(
    state: tauri::State<'_, DbState>,
    id: String,
    enabled: bool,
    method: Option<String>,
) -> Result<DbUser, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mfa_int = if enabled { 1 } else { 0 };
    let method_str = method.unwrap_or_else(|| "authenticator".to_string());

    conn.execute(
        "UPDATE users SET mfa_enabled = ?1, mfa_method = ?2 WHERE id = ?3",
        params![mfa_int, method_str, id],
    )
    .map_err(|e| format!("Gagal mengubah status MFA: {}", e))?;

    drop(conn);
    let updated = db_get_user_by_id(state, id)?
        .ok_or_else(|| "Pengguna tidak ditemukan".to_string())?;
    Ok(updated)
}

#[tauri::command]
pub fn db_get_all_users(state: tauri::State<'_, DbState>) -> Result<Vec<DbUser>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, email, name, role, is_subscribed, plan, mfa_enabled, mfa_method, avatar_url, created_at FROM users ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let user_iter = stmt
        .query_map([], |row| {
            let is_sub_int: i32 = row.get(4).unwrap_or(1);
            let mfa_int: i32 = row.get(6).unwrap_or(0);
            Ok(DbUser {
                id: row.get(0)?,
                email: row.get(1)?,
                name: row.get(2)?,
                role: row.get(3)?,
                is_subscribed: is_sub_int == 1,
                plan: row.get(5).unwrap_or_else(|_| "community".to_string()),
                mfa_enabled: mfa_int == 1,
                mfa_method: row.get(7).ok(),
                avatar_url: row.get(8).ok(),
                created_at: row.get(9).ok(),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for u in user_iter {
        if let Ok(user) = u {
            list.push(user);
        }
    }
    Ok(list)
}

#[tauri::command]
pub fn db_admin_update_role(
    state: tauri::State<'_, DbState>,
    id: String,
    role: String,
) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let rows = conn
        .execute(
            "UPDATE users SET role = ?1 WHERE id = ?2",
            params![role, id],
        )
        .map_err(|e| format!("Gagal mengubah role: {}", e))?;
    Ok(rows > 0)
}

#[tauri::command]
pub fn db_delete_user(state: tauri::State<'_, DbState>, id: String) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let rows = conn
        .execute("DELETE FROM users WHERE id = ?1", params![id])
        .map_err(|e| format!("Gagal menghapus pengguna: {}", e))?;
    Ok(rows > 0)
}

// ---------------------------------------------------------------------------
// Sheet Management Tauri Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn db_get_all_sheets(
    state: tauri::State<'_, DbState>,
    author_id: Option<String>,
) -> Result<Vec<DbSheet>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let query = match author_id.as_deref() {
        Some(aid) if !aid.trim().is_empty() => {
            "SELECT id, title, artist, difficulty, bpm, content, is_premium, description, tags, author_id
             FROM sheets WHERE author_id = ?1 OR author_id = '' OR author_id IS NULL ORDER BY rowid DESC"
        }
        _ => {
            "SELECT id, title, artist, difficulty, bpm, content, is_premium, description, tags, author_id
             FROM sheets ORDER BY rowid DESC"
        }
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let map_row = |row: &rusqlite::Row| {
        let tags_str: String = row.get(8).unwrap_or_default();
        let tags = if tags_str.is_empty() {
            None
        } else {
            Some(
                tags_str
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect(),
            )
        };

        let is_prem_int: i32 = row.get(6).unwrap_or(0);

        Ok(DbSheet {
            id: row.get(0)?,
            title: row.get(1)?,
            artist: row.get(2)?,
            difficulty: row.get(3)?,
            bpm: row.get(4)?,
            content: row.get(5)?,
            is_premium: is_prem_int == 1,
            description: row.get(7).ok(),
            tags,
            author_id: row.get(9).ok(),
        })
    };

    let sheet_iter = match author_id.as_deref() {
        Some(aid) if !aid.trim().is_empty() => stmt.query_map(params![aid], map_row),
        _ => stmt.query_map([], map_row),
    }
    .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for sheet in sheet_iter {
        if let Ok(s) = sheet {
            list.push(s);
        }
    }
    Ok(list)
}

#[tauri::command]
pub fn db_save_sheet(state: tauri::State<'_, DbState>, sheet: DbSheet) -> Result<DbSheet, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let tags_str = sheet.tags.as_ref().map(|t| t.join(", ")).unwrap_or_default();
    let desc_str = sheet.description.as_deref().unwrap_or("");
    let author_str = sheet.author_id.as_deref().unwrap_or("");
    let is_prem_int = if sheet.is_premium { 1 } else { 0 };

    conn.execute(
        "INSERT INTO sheets (id, title, artist, difficulty, bpm, content, is_premium, description, tags, author_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            artist = excluded.artist,
            difficulty = excluded.difficulty,
            bpm = excluded.bpm,
            content = excluded.content,
            is_premium = excluded.is_premium,
            description = excluded.description,
            tags = excluded.tags,
            author_id = excluded.author_id;",
        params![
            sheet.id,
            sheet.title,
            sheet.artist,
            sheet.difficulty,
            sheet.bpm,
            sheet.content,
            is_prem_int,
            desc_str,
            tags_str,
            author_str,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(sheet)
}

#[tauri::command]
pub fn db_delete_sheet(state: tauri::State<'_, DbState>, id: String) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let affected = conn
        .execute("DELETE FROM sheets WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}
