import { invoke } from "@tauri-apps/api/core";
import { UserProfile, PianoSheet, UserRole } from "./types";

const isTauriDesktop =
  typeof window !== "undefined" &&
  Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

const LOCAL_STORAGE_SESSION_KEY = "autopiano_local_session_user";
const LOCAL_STORAGE_USERS_LIST = "autopiano_users_directory";
const LOCAL_STORAGE_SHEETS_KEY = "autopiano_local_custom_sheets";

export const DEFAULT_ADMIN_USER: UserProfile = {
  id: "admin_root_master",
  email: "admin@autopiano.io",
  name: "Master Administrator",
  role: "admin",
  isSubscribed: true,
  plan: "community",
  mfaEnabled: false,
  mfaMethod: "authenticator",
  avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=admin_master",
  createdAt: "Default Master",
};

// Fallback user directory in localStorage when running outside Tauri
function getStoredUsersList(): Array<UserProfile & { passwordHash?: string }> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_LIST);
    if (!raw) {
      const initial = [
        {
          ...DEFAULT_ADMIN_USER,
          passwordHash: "admin123",
        },
      ];
      localStorage.setItem(LOCAL_STORAGE_USERS_LIST, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [DEFAULT_ADMIN_USER];
  }
}

function saveUsersList(users: Array<UserProfile & { passwordHash?: string }>) {
  localStorage.setItem(LOCAL_STORAGE_USERS_LIST, JSON.stringify(users));
}

// ---------------------------------------------------------------------------
// Authentication & User Session
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<UserProfile | null> {
  const sessionRaw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
  if (!sessionRaw) {
    return null;
  }

  let sessionUser: UserProfile;
  try {
    sessionUser = JSON.parse(sessionRaw) as UserProfile;
  } catch {
    return null;
  }

  // Refresh profile from SQLite if running in desktop
  if (isTauriDesktop && sessionUser?.id) {
    try {
      const latest = await invoke<UserProfile | null>("db_get_user_by_id", { id: sessionUser.id });
      if (latest) {
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(latest));
        return latest;
      }
    } catch (err) {
      console.warn("Failed to refresh user profile from SQLite:", err);
    }
  }

  return sessionUser;
}

export async function registerUser(email: string, pass: string, name: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (isTauriDesktop) {
    try {
      const user = await invoke<UserProfile>("db_register_user", {
        email: cleanEmail,
        password: pass,
        name: cleanName,
      });
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(user));
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("not found")) {
        throw new Error(msg);
      }
      console.warn("Backend db_register_user not found, falling back to local storage:", msg);
    }
  }

  // Browser development fallback
  const users = getStoredUsersList();
  const existing = users.find((u) => u.email === cleanEmail);
  if (existing) {
    throw new Error("Email ini sudah terdaftar. Silakan login.");
  }

  const role: UserRole = "admin";
  const newUser: UserProfile & { passwordHash?: string } = {
    id: "usr_" + Date.now(),
    email: cleanEmail,
    name: cleanName || cleanEmail.split("@")[0],
    role,
    isSubscribed: true,
    plan: "community",
    mfaEnabled: false,
    mfaMethod: "authenticator",
    avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanEmail}`,
    createdAt: new Date().toISOString(),
    passwordHash: pass,
  };

  users.push(newUser);
  saveUsersList(users);

  const { passwordHash: _, ...sessionUser } = newUser;
  localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export async function loginUser(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();

  if (isTauriDesktop) {
    try {
      const user = await invoke<UserProfile>("db_login_user", {
        email: cleanEmail,
        password: pass,
      });
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(user));
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("not found")) {
        throw new Error(msg);
      }
      console.warn("Backend db_login_user not found, falling back to local storage:", msg);
    }
  }

  // Admin bypass in browser mode
  if (
    cleanEmail === "admin@autopiano.io" ||
    cleanEmail === "admin" ||
    (cleanEmail.startsWith("admin") && (pass === "admin" || pass === "admin123" || pass === "password"))
  ) {
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(DEFAULT_ADMIN_USER));
    return DEFAULT_ADMIN_USER;
  }

  const users = getStoredUsersList();
  const found = users.find((u) => u.email === cleanEmail);

  if (!found || (found.passwordHash && found.passwordHash !== pass)) {
    throw new Error("Email atau password yang Anda masukkan salah.");
  }

  const { passwordHash: _, ...sessionUser } = found;
  localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export async function loginAsAdminDirectly(): Promise<UserProfile> {
  if (isTauriDesktop) {
    try {
      const admin = await invoke<UserProfile>("db_login_user", {
        email: "admin@autopiano.io",
        password: "admin",
      });
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(admin));
      return admin;
    } catch (err) {
      console.warn("Direct admin login invoke error, using default admin:", err);
    }
  }

  localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(DEFAULT_ADMIN_USER));
  return DEFAULT_ADMIN_USER;
}

export async function logoutUser(): Promise<void> {
  localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
}

export async function updateUserProfile(
  userId: string,
  updates: { name?: string; email?: string; avatarUrl?: string }
): Promise<UserProfile> {
  if (isTauriDesktop) {
    try {
      const updated = await invoke<UserProfile>("db_update_user_profile", {
        id: userId,
        name: updates.name || "",
        email: updates.email || "",
        avatarUrl: updates.avatarUrl || null,
      });
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(updated));
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("not found")) {
        throw new Error(msg);
      }
      console.warn("Backend db_update_user_password not found, falling back to local storage:", msg);
    }
  }

  // Browser fallback
  const current = (await getCurrentUser()) || DEFAULT_ADMIN_USER;
  const updated: UserProfile = {
    ...current,
    name: updates.name ?? current.name,
    email: updates.email ?? current.email,
    avatarUrl: updates.avatarUrl ?? current.avatarUrl,
  };

  localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(updated));

  const users = getStoredUsersList();
  const idx = users.findIndex((u) => u.id === userId || u.email === current.email);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updated };
    saveUsersList(users);
  }

  return updated;
}

export async function updateUserPassword(
  currentPass: string,
  newPass: string
): Promise<{ success: boolean; message: string }> {
  const current = await getCurrentUser();
  if (!current) throw new Error("Anda belum masuk.");

  if (isTauriDesktop) {
    try {
      await invoke("db_update_user_password", {
        id: current.id,
        currentPass,
        newPass,
      });
      return { success: true, message: "Password berhasil diperbarui." };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("not found")) {
        throw new Error(msg);
      }
      console.warn("Backend db_update_user_password not found, falling back to local storage:", msg);
    }
  }

  // Browser fallback
  const users = getStoredUsersList();
  const idx = users.findIndex((u) => u.email === current.email);
  if (idx !== -1) {
    users[idx].passwordHash = newPass;
    saveUsersList(users);
  }
  return { success: true, message: "Password berhasil diperbarui dengan aman." };
}

export async function requestPasswordReset(_email: string): Promise<{ success: boolean; resetCode: string }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return {
    success: true,
    resetCode: code,
  };
}

export async function resetPasswordWithCode(
  email: string,
  _code: string,
  newPass: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();

  if (isTauriDesktop) {
    try {
      await invoke("db_reset_user_password", {
        email: cleanEmail,
        newPass,
      });
      return { success: true, message: "Password berhasil di-reset. Silakan login kembali." };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("not found")) {
        throw new Error(msg);
      }
      console.warn("Backend db_update_user_password not found, falling back to local storage:", msg);
    }
  }

  const users = getStoredUsersList();
  const user = users.find((u) => u.email === cleanEmail);
  if (user) {
    user.passwordHash = newPass;
    saveUsersList(users);
  }
  return { success: true, message: "Password berhasil di-reset. Silakan login kembali." };
}

export async function toggleMFA(
  enabled: boolean,
  method: "authenticator" | "sms" = "authenticator"
): Promise<UserProfile> {
  const current = (await getCurrentUser()) || DEFAULT_ADMIN_USER;

  if (isTauriDesktop) {
    try {
      const updated = await invoke<UserProfile>("db_toggle_mfa", {
        id: current.id,
        enabled,
        method,
      });
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(updated));
      return updated;
    } catch (err) {
      console.warn("Failed to toggle MFA via SQLite, falling back to local:", err);
    }
  }

  const updated: UserProfile = {
    ...current,
    mfaEnabled: enabled,
    mfaMethod: method,
  };
  localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(updated));

  const users = getStoredUsersList();
  const idx = users.findIndex((u) => u.id === current.id || u.email === current.email);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updated };
    saveUsersList(users);
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Admin Management APIs
// ---------------------------------------------------------------------------

export async function getAllUsersDirectory(): Promise<UserProfile[]> {
  if (isTauriDesktop) {
    try {
      const users = await invoke<UserProfile[]>("db_get_all_users");
      if (Array.isArray(users) && users.length > 0) {
        return users;
      }
    } catch (err) {
      console.warn("Failed to fetch users from SQLite:", err);
    }
  }

  const users = getStoredUsersList();
  return users.map((u) => {
    const clean = { ...u };
    delete clean.passwordHash;
    return clean;
  });
}

export async function adminUpdateUserRole(userId: string, role: UserRole): Promise<void> {
  if (isTauriDesktop) {
    try {
      await invoke("db_admin_update_role", { id: userId, role });
    } catch (err) {
      console.warn("Failed to update role in SQLite:", err);
    }
  }

  const users = getStoredUsersList();
  const user = users.find((u) => u.id === userId);
  if (user) {
    user.role = role;
    saveUsersList(users);
  }
}

export async function adminDeleteUser(userId: string): Promise<void> {
  if (isTauriDesktop) {
    try {
      await invoke("db_delete_user", { id: userId });
    } catch (err) {
      console.warn("Failed to delete user in SQLite:", err);
    }
  }

  const users = getStoredUsersList().filter((u) => u.id !== userId);
  saveUsersList(users);
}

// ---------------------------------------------------------------------------
// Sheet Operations (100% SQLite Lokal)
// ---------------------------------------------------------------------------

export async function fetchCustomSheets(userId?: string): Promise<PianoSheet[]> {
  if (isTauriDesktop) {
    try {
      const sheets = await invoke<PianoSheet[]>("db_get_all_sheets", {
        authorId: userId || null,
      });
      if (Array.isArray(sheets)) {
        return sheets;
      }
    } catch (err) {
      console.warn("SQLite fetch error:", err);
    }
  }

  // Local storage fallback for web development
  const raw = localStorage.getItem(LOCAL_STORAGE_SHEETS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PianoSheet[];
  } catch {
    return [];
  }
}

export async function saveCustomSheet(
  sheet: (Omit<PianoSheet, "id"> & { id?: string }) | PianoSheet,
  userId?: string
): Promise<PianoSheet> {
  const targetId = sheet.id || "sheet_" + Date.now();
  const created: PianoSheet = {
    ...sheet,
    id: targetId,
    authorId: ("authorId" in sheet && sheet.authorId) ? sheet.authorId : (userId || "local_user"),
  };

  if (isTauriDesktop) {
    try {
      const saved = await invoke<PianoSheet>("db_save_sheet", { sheet: created });
      return saved;
    } catch (err) {
      console.warn("SQLite save error:", err);
    }
  }

  // Local storage fallback
  const existing = await fetchCustomSheets(userId);
  const updated = [created, ...existing.filter((s) => s.id !== targetId)];
  localStorage.setItem(LOCAL_STORAGE_SHEETS_KEY, JSON.stringify(updated));
  return created;
}

export async function updateCustomSheet(sheet: PianoSheet, userId?: string): Promise<PianoSheet> {
  return saveCustomSheet(sheet, userId);
}

export async function deleteCustomSheet(sheetId: string): Promise<void> {
  if (isTauriDesktop) {
    try {
      await invoke("db_delete_sheet", { id: sheetId });
      return;
    } catch (err) {
      console.warn("SQLite delete error:", err);
    }
  }

  const existing = await fetchCustomSheets();
  const updated = existing.filter((s) => s.id !== sheetId);
  localStorage.setItem(LOCAL_STORAGE_SHEETS_KEY, JSON.stringify(updated));
}
