import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getWritableDataDir } from './dataDir.ts';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  passwordPlain: string;
  role: 'admin' | 'user';
  name: string;
  avatar: string;
  createdAt: number;
  expiresAt: number | null; // null for admin, timestamp for user
  maxSeries: number | null;
  maxEpisodesPerSeries: number | null;
  downloadedSeries: string[];
  downloadedEpisodesCount: Record<string, number>;
}

const USERS_FILE = path.join(getWritableDataDir(), 'users.json');

// Memory store for active sessions
interface Session {
  userId: string;
  createdAt: number;
  expiresAt: number;
}
const sessionStore = new Map<string, Session>();

// Ensure users file exists with admin account
export function ensureUsersFile(): UserAccount[] {
  const dataDir = getWritableDataDir();
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (err) {
    console.warn('[Auth] Không thể tạo thư mục dataDir:', err);
  }

  const now = Date.now();
  const admin: UserAccount = {
    id: 'admin_1',
    username: 'Ongdangiuu',
    passwordPlain: '080306',
    role: 'admin',
    name: 'Ong Đáng Yêu (Admin VIP)',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ongdangiuu&backgroundColor=fbbf24',
    createdAt: now,
    expiresAt: null,
    maxSeries: null,
    maxEpisodesPerSeries: null,
    downloadedSeries: [],
    downloadedEpisodesCount: {},
  };

  if (fs.existsSync(USERS_FILE)) {
    try {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        // Tự động dọn dẹp các tài khoản đã hết hạn thời gian
        const pruned = pruneExpiredUsers(data);
        
        // Đảm bảo duy nhất tài khoản Admin luôn có mặt
        let changed = false;
        if (!pruned.some((u) => u.username.toLowerCase() === 'ongdangiuu')) {
          pruned.unshift(admin);
          changed = true;
        }
        if (changed || pruned.length !== data.length) {
          fs.writeFileSync(USERS_FILE, JSON.stringify(pruned, null, 2), 'utf-8');
        }
        return pruned;
      }
    } catch (e) {
      console.warn('[Auth] Lỗi đọc users.json, tạo lại file mới:', e);
    }
  }

  // Khởi tạo ban đầu CHỈ CÓ TÀI KHOẢN ADMIN (Không tự ý tạo lại user bạn đã xóa)
  const initial = [admin];
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Auth] Lỗi ghi users.json:', e);
  }
  return initial;
}

// Tự động xóa các tài khoản đã quá hạn dùng thử
function pruneExpiredUsers(users: UserAccount[]): UserAccount[] {
  const now = Date.now();
  return users.filter((u) => {
    if (u.role === 'admin') return true;
    if (u.expiresAt && now > u.expiresAt) {
      console.log(`[Auth] Tài khoản ${u.username} đã quá hạn. Tự động xóa khỏi hệ thống.`);
      return false;
    }
    return true;
  });
}

export function loadUsers(): UserAccount[] {
  return ensureUsersFile();
}

export function saveUsers(users: UserAccount[]): void {
  try {
    const dataDir = getWritableDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    // Ghi đè file ngay lập tức
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('[Auth] Lỗi lưu users.json:', err.message);
  }
}

export function sanitizeUser(u: UserAccount) {
  const now = Date.now();
  const hoursRemaining = u.expiresAt
    ? Math.max(0, Math.round(((u.expiresAt - now) / (1000 * 60 * 60)) * 10) / 10)
    : null;

  return {
    id: u.id,
    username: u.username,
    role: u.role,
    name: u.name,
    avatar: u.avatar,
    createdAt: u.createdAt,
    expiresAt: u.expiresAt,
    maxSeries: u.maxSeries,
    maxSeriesLimit: u.maxSeries,
    maxEpisodesPerSeries: u.maxEpisodesPerSeries,
    maxEpisodesPerSeriesLimit: u.maxEpisodesPerSeries,
    downloadedSeriesCount: (u.downloadedSeries || []).length,
    downloadedEpisodesCount: u.downloadedEpisodesCount || {},
    hoursRemaining,
  };
}

export function loginUser(usernameInput: string, passwordInput: string) {
  const users = loadUsers();
  const uname = String(usernameInput || '').trim();
  const pass = String(passwordInput || '').trim();

  const user = users.find(
    (u) => u.username.toLowerCase() === uname.toLowerCase()
  );

  if (!user) {
    return { success: false, error: 'Tên tài khoản không tồn tại hoặc đã hết hạn!' };
  }

  // Kiểm tra thời hạn
  if (user.expiresAt && Date.now() > user.expiresAt) {
    const valid = pruneExpiredUsers(users);
    saveUsers(valid);
    return { success: false, error: 'Tài khoản đã hết hạn và đã tự động bị xoá khỏi hệ thống!' };
  }

  // Kiểm tra mật khẩu
  if (user.passwordPlain !== pass && user.password !== pass) {
    return { success: false, error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại!' };
  }

  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  const sessionDuration = user.role === 'admin'
    ? 30 * 24 * 3600 * 1000
    : Math.min(48 * 3600 * 1000, Math.max(3600 * 1000, (user.expiresAt || 0) - Date.now()));

  sessionStore.set(token, {
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + sessionDuration,
  });

  return {
    success: true,
    token,
    user: sanitizeUser(user),
  };
}

export function getUserFromToken(token: string): UserAccount | null {
  if (!token) return null;
  const session = sessionStore.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessionStore.delete(token);
    return null;
  }

  const users = loadUsers();
  const user = users.find((u) => u.id === session.userId);
  if (!user) {
    sessionStore.delete(token);
    return null;
  }

  if (user.expiresAt && Date.now() > user.expiresAt) {
    sessionStore.delete(token);
    const valid = pruneExpiredUsers(users);
    saveUsers(valid);
    return null;
  }

  return user;
}

export function invalidateToken(token: string): void {
  sessionStore.delete(token);
}

export function checkDownloadPermission(
  user: UserAccount,
  seriesId: string,
  episodeCount: number
): { allowed: boolean; error?: string } {
  if (user.role === 'admin') {
    return { allowed: true };
  }

  if (user.expiresAt && Date.now() > user.expiresAt) {
    return {
      allowed: false,
      error: 'Tài khoản dùng thử đã hết hạn. Vui lòng liên hệ Admin.',
    };
  }

  const downloadedSeries = user.downloadedSeries || [];
  const isExistingSeries = downloadedSeries.includes(seriesId);
  const maxSeries = user.maxSeries ?? 5;

  if (!isExistingSeries && downloadedSeries.length >= maxSeries) {
    return {
      allowed: false,
      error: `Tài khoản đã đạt giới hạn tối đa ${maxSeries} bộ phim. Vui lòng liên hệ Admin Ongdangiuu để mở rộng!`,
    };
  }

  const maxEp = user.maxEpisodesPerSeries;
  if (maxEp !== null && maxEp !== undefined && maxEp > 0) {
    const currentEpCount = user.downloadedEpisodesCount?.[seriesId] || 0;
    if (currentEpCount + episodeCount > maxEp) {
      const remain = Math.max(0, maxEp - currentEpCount);
      return {
        allowed: false,
        error: `Tài khoản chỉ được tải tối đa ${maxEp} tập mỗi bộ phim (Bạn đã tải: ${currentEpCount}/${maxEp} tập, chỉ còn tải thêm được ${remain} tập)!`,
      };
    }
  }

  return { allowed: true };
}

export function recordUserDownload(
  user: UserAccount,
  seriesId: string,
  episodeCount: number
): void {
  if (user.role === 'admin') return;

  const users = loadUsers();
  const found = users.find((u) => u.id === user.id);
  if (!found) return;

  if (!found.downloadedSeries) found.downloadedSeries = [];
  if (!found.downloadedSeries.includes(seriesId)) {
    found.downloadedSeries.push(seriesId);
  }

  if (!found.downloadedEpisodesCount) found.downloadedEpisodesCount = {};
  found.downloadedEpisodesCount[seriesId] =
    (found.downloadedEpisodesCount[seriesId] || 0) + episodeCount;

  saveUsers(users);
}

export function generateRandomUsername(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let res = '';
  res += uppers.charAt(Math.floor(Math.random() * uppers.length));
  for (let i = 0; i < 5; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res.split('').sort(() => 0.5 - Math.random()).join('');
}

export function listAllUsersForAdmin(): any[] {
  const users = loadUsers();
  const now = Date.now();
  return users.map((u) => {
    const hoursRemaining = u.expiresAt
      ? Math.max(0, Math.round(((u.expiresAt - now) / (1000 * 60 * 60)) * 10) / 10)
      : null;
    return {
      id: u.id,
      username: u.username,
      passwordPlain: u.passwordPlain || '123456',
      role: u.role,
      name: u.name,
      avatar: u.avatar,
      createdAt: u.createdAt,
      expiresAt: u.expiresAt,
      maxSeries: u.maxSeries,
      maxSeriesLimit: u.maxSeries,
      maxEpisodesPerSeries: u.maxEpisodesPerSeries,
      maxEpisodesPerSeriesLimit: u.maxEpisodesPerSeries,
      downloadedSeriesCount: (u.downloadedSeries || []).length,
      downloadedSeries: u.downloadedSeries || [],
      downloadedEpisodesCount: u.downloadedEpisodesCount || {},
      hoursRemaining,
    };
  });
}

// Thêm tài khoản mới -> Ghi ngay vào file
export function createUserForAdmin(opts: {
  username?: string;
  password?: string;
  role?: 'admin' | 'user';
  name?: string;
  hours?: number;
  maxSeries?: number;
  maxEpisodesPerSeries?: number;
}): { success: boolean; user?: any; error?: string } {
  const users = loadUsers();
  let username = (opts.username || '').trim();
  if (!username) {
    let tries = 0;
    do {
      username = generateRandomUsername();
      tries++;
    } while (users.some((u) => u.username.toLowerCase() === username.toLowerCase()) && tries < 20);
  }

  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: 'Tên tài khoản này đã tồn tại trong hệ thống!' };
  }

  const role = opts.role === 'admin' ? 'admin' : 'user';
  const passwordPlain = (opts.password || '123456').trim();
  const now = Date.now();
  const hours = opts.hours && opts.hours > 0 ? opts.hours : 48;
  const expiresAt = role === 'admin' ? null : now + hours * 60 * 60 * 1000;
  const maxSeries = role === 'admin' ? null : (opts.maxSeries === 0 || opts.maxSeries === null ? null : (opts.maxSeries ?? 5));
  const maxEpisodesPerSeries = role === 'admin' ? null : (opts.maxEpisodesPerSeries === 0 || opts.maxEpisodesPerSeries === null ? null : (opts.maxEpisodesPerSeries ?? null));
  const name = opts.name?.trim() || (role === 'admin' ? `Admin (${username})` : `Khách Trải Nghiệm (${username})`);
  const bgColors = ['fbbf24', '38bdf8', '10b981', 'f43f5e', '8b5cf6', 'ec4899', 'f97316'];
  const randomColor = bgColors[Math.floor(Math.random() * bgColors.length)];
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}&backgroundColor=${randomColor}`;

  const newUser: UserAccount = {
    id: `user_${username}_${Date.now().toString(36)}`,
    username,
    passwordPlain,
    role,
    name,
    avatar,
    createdAt: now,
    expiresAt,
    maxSeries,
    maxEpisodesPerSeries,
    downloadedSeries: [],
    downloadedEpisodesCount: {},
  };

  users.push(newUser);
  saveUsers(users); // Ghi đè file ngay lập tức

  return {
    success: true,
    user: sanitizeUser(newUser),
  };
}

// XÓA TÀI KHOẢN: XÓA SẠCH VĨNH VIỄN 100% KHỎI FILE USERS.JSON
export function deleteUserForAdmin(userId: string): { success: boolean; error?: string } {
  const users = loadUsers();
  const targetIndex = users.findIndex((u) => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
  
  if (targetIndex === -1) {
    return { success: false, error: 'Không tìm thấy tài khoản để xóa!' };
  }

  const target = users[targetIndex];
  if (target.username.toLowerCase() === 'ongdangiuu') {
    return { success: false, error: 'Không thể xóa tài khoản Quản trị viên chính (Ongdangiuu)!' };
  }

  // Lọc bỏ hoàn toàn khỏi danh sách
  const updated = users.filter((u) => u.id !== target.id && u.username.toLowerCase() !== target.username.toLowerCase());
  
  // Ghi đè lại file users.json ngay lập tức
  saveUsers(updated);

  // Hủy phiên đăng nhập của người này nếu đang online
  for (const [token, session] of sessionStore.entries()) {
    if (session.userId === target.id) {
      sessionStore.delete(token);
    }
  }

  console.log(`[Auth] Đã xóa vĩnh viễn tài khoản: ${target.username} khỏi file users.json`);
  return { success: true };
}

export function updateUserForAdmin(
  userId: string,
  opts?: {
    password?: string;
    role?: 'user' | 'admin';
    resetDownloads?: boolean;
    addHours?: number;
    hours?: number;
    maxSeries?: number;
    maxEpisodesPerSeries?: number | null;
  }
): { success: boolean; user?: any; error?: string } {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId || u.username === userId);
  if (!target) {
    return { success: false, error: 'Không tìm thấy tài khoản!' };
  }

  if (opts?.password && opts.password.trim()) {
    target.passwordPlain = opts.password.trim();
    target.password = opts.password.trim();
  }

  if (opts?.role && (opts.role === 'user' || opts.role === 'admin')) {
    target.role = opts.role;
  }

  if (opts?.resetDownloads) {
    target.downloadedSeries = [];
    target.downloadedEpisodesCount = {};
  }

  if (opts?.addHours && opts.addHours > 0) {
    const base = target.expiresAt ? Math.max(Date.now(), target.expiresAt) : Date.now();
    target.expiresAt = base + opts.addHours * 3600 * 1000;
  } else if (opts?.hours !== undefined) {
    if (opts.hours <= 0) {
      target.expiresAt = Date.now();
    } else {
      target.expiresAt = Date.now() + opts.hours * 3600 * 1000;
    }
  }

  if (opts?.maxSeries !== undefined) {
    target.maxSeries = opts.maxSeries;
  }

  if (opts?.maxEpisodesPerSeries !== undefined) {
    target.maxEpisodesPerSeries = opts.maxEpisodesPerSeries;
  }

  saveUsers(users);
  return { success: true, user: sanitizeUser(target) };
}

export function resetUserQuotasForAdmin(
  userId: string,
  opts?: { resetDownloads?: boolean; addHours?: number; setMaxSeries?: number }
): { success: boolean; error?: string } {
  const res = updateUserForAdmin(userId, opts);
  return { success: res.success, error: res.error };
}