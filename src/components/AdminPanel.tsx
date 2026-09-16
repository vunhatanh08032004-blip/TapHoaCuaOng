import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  UserPlus,
  Trash2,
  RotateCcw,
  Clock,
  Key,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  Search,
  Sparkles,
  AlertCircle,
  PlusCircle,
  Plus,
  Film,
  Calendar,
  Layers,
  X,
  Crown,
  Edit3,
  Save,
} from 'lucide-react';
import { api } from '../api.ts';
import { UserProfile } from '../types.ts';

interface AdminUserItem {
  id: string;
  username: string;
  passwordPlain: string;
  role: 'admin' | 'user';
  name: string;
  avatar: string;
  createdAt: number;
  expiresAt: number | null;
  maxSeries: number | null;
  maxEpisodesPerSeries: number | null;
  downloadedSeriesCount: number;
  downloadedSeries: string[];
  downloadedEpisodesCount: Record<string, number>;
  hoursRemaining: number | null;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Real-time ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Form tạo user mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newHours, setNewHours] = useState(48); // 48h = 2 ngày
  const [newMaxSeries, setNewMaxSeries] = useState(0); // 0 = Không giới hạn
  const [newMaxEpisodes, setNewMaxEpisodes] = useState(0); // 0 = Toàn bộ tập
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [creating, setCreating] = useState(false);

  // Form chỉnh sửa user
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editMaxSeries, setEditMaxSeries] = useState<number>(0);
  const [editMaxEpisodes, setEditMaxEpisodes] = useState<number>(0);
  const [editAddHours, setEditAddHours] = useState<number>(0);
  const [editResetDownloads, setEditResetDownloads] = useState<boolean>(false);
  const [editSaving, setEditSaving] = useState<boolean>(false);

  // Load danh sách user
  const loadUsers = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.getAdminUsers();
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } catch (err: any) {
      console.error('Error fetching admin users:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(true);
    const pollTimer = setInterval(() => {
      loadUsers(false);
    }, 5000);
    return () => clearInterval(pollTimer);
  }, []);

  // Tạo nhanh ngẫu nhiên username 6 ký tự
  const handleGenerateRandomUsername = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = '';
    res += uppers.charAt(Math.floor(Math.random() * uppers.length));
    for (let i = 0; i < 5; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const shuffled = res.split('').sort(() => 0.5 - Math.random()).join('');
    setNewUsername(shuffled);
  };

  // Mở modal sửa tài khoản
  const handleOpenEditModal = (u: AdminUserItem) => {
    setEditingUser(u);
    setEditPassword(u.passwordPlain || '123456');
    setEditRole(u.role);
    setEditMaxSeries(u.maxSeries || 0);
    setEditMaxEpisodes(u.maxEpisodesPerSeries || 0);
    setEditAddHours(0);
    setEditResetDownloads(false);
  };

  // Lưu thông tin sửa tài khoản
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);

    try {
      const res = await api.updateAdminUser(editingUser.id, {
        password: editPassword.trim() || undefined,
        role: editRole,
        maxSeries: Number(editMaxSeries),
        maxEpisodesPerSeries: Number(editMaxEpisodes) === 0 ? null : Number(editMaxEpisodes),
        addHours: Number(editAddHours) > 0 ? Number(editAddHours) : undefined,
        resetDownloads: editResetDownloads,
      });

      if (res.success) {
        showToast(`✅ Đã cập nhật thành công tài khoản "${editingUser.username}"!`);
        setEditingUser(null);
        loadUsers();
      } else {
        alert(res.error || 'Cập nhật thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật tài khoản');
    } finally {
      setEditSaving(false);
    }
  };

  // Tạo user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);

    try {
      const res = await api.createAdminUser({
        username: newUsername.trim() || undefined,
        password: newPassword.trim() || '123456',
        role: newRole,
        hours: newRole === 'admin' ? undefined : Number(newHours),
        maxSeries: newRole === 'admin' ? undefined : Number(newMaxSeries),
        maxEpisodesPerSeries:
          newRole === 'admin' || Number(newMaxEpisodes) === 0 ? null : Number(newMaxEpisodes),
      });

      if (res.success && res.user) {
        showToast(`🎉 Đã tạo thành công tài khoản "${res.user.username}"!`);
        setShowCreateModal(false);
        setNewUsername('');
        setNewPassword('123456');
        loadUsers();
      } else {
        setCreateError(res.error || 'Tạo tài khoản thất bại');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Lỗi khi tạo tài khoản');
    } finally {
      setCreating(false);
    }
  };

  // Xóa user
  const handleDeleteUser = async (id: string, username: string) => {
    // Xóa ngay lập tức trên UI (Real-time update)
    setUsers((prev) => prev.filter((u) => u.id !== id));
    showToast(`🗑️ Đã xóa tài khoản "${username}" thành công!`);

    try {
      const res = await api.deleteAdminUser(id);
      if (!res.success) {
        showToast(`❌ Không thể xóa tài khoản "${username}": ${res.error}`);
        loadUsers();
      }
    } catch (err: any) {
      showToast(`❌ Lỗi khi xóa tài khoản "${username}"`);
      loadUsers();
    }
  };

  // Reset quota tải của user
  const handleResetQuota = async (id: string, username: string) => {
    // Cập nhật giao diện tức thì (Real-time update)
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, downloadedSeriesCount: 0, downloadedSeries: [], downloadedEpisodesCount: {} } : u
      )
    );
    showToast(`🔄 Đã reset lượt tải cho tài khoản "${username}" về 0!`);

    try {
      const res = await api.resetAdminUserQuotas(id, { resetDownloads: true });
      if (!res.success) {
        showToast(`❌ Lỗi khi reset lượt tải: ${res.error}`);
        loadUsers();
      }
    } catch (err: any) {
      showToast(`❌ Lỗi hệ thống khi reset lượt tải`);
      loadUsers();
    }
  };

  // Gia hạn thêm giờ
  const handleExtendHours = async (id: string, username: string, hours: number) => {
    const addMs = hours * 3600 * 1000;
    // Cập nhật giao diện tức thì (Real-time update)
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const base = u.expiresAt ? Math.max(Date.now(), u.expiresAt) : Date.now();
          return { ...u, expiresAt: base + addMs };
        }
        return u;
      })
    );
    showToast(`⚡ Đã cộng thêm +${hours}h thời gian sử dụng cho "${username}"!`);

    try {
      const res = await api.resetAdminUserQuotas(id, { addHours: hours });
      if (!res.success) {
        showToast(`❌ Lỗi khi gia hạn: ${res.error}`);
        loadUsers();
      }
    } catch (err: any) {
      showToast(`❌ Lỗi hệ thống khi gia hạn`);
      loadUsers();
    }
  };

  // Sao chép thông tin gửi khách
  const handleCopyCredentials = (u: AdminUserItem) => {
    const epStr = u.maxEpisodesPerSeries ? `${u.maxEpisodesPerSeries} tập/bộ` : 'Toàn bộ tập';
    const text = `🎉 THÔNG TIN TÀI KHOẢN TẢI PHIM HỒNG QUẢ:\n- Trang web: ${window.location.origin}\n- Tài khoản: ${u.username}\n- Mật khẩu: ${u.passwordPlain || '123456'}\n- Thời hạn sử dụng: ${u.expiresAt ? `${u.hoursRemaining || 48} giờ` : 'Vĩnh viễn'}\n- Giới hạn: Tối đa ${u.maxSeries || 5} bộ phim (${epStr})\nChúc bạn xem và tải phim vui vẻ!`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(u.id);
      showToast(`📋 Đã sao chép thông tin tài khoản "${u.username}"!`);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      u.username.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="admin-container relative">
      {/* Toast Notification Floating Banner */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border-2 border-amber-500/80 text-amber-200 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles size={20} className="text-amber-400 shrink-0" />
          <span className="font-bold text-sm">{toastMsg}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="hongguo-hero">
        <div className="hero-icon">
          <ShieldCheck size={28} />
        </div>
        <div className="hero-text flex-1">
          <h2>Quản Lý Tài Khoản Người Dùng (VIP Admin)</h2>
          <p>
            Cấp tài khoản trải nghiệm 48h (5 bộ phim/Toàn bộ tập), tạo tài khoản tùy chỉnh hạn mức, theo dõi và gia hạn thời gian sử dụng.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline btn-sm flex items-center gap-1.5"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm Mới</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm flex items-center gap-1.5"
            onClick={() => {
              handleGenerateRandomUsername();
              setShowCreateModal(true);
            }}
          >
            <UserPlus size={15} />
            <span>Cấp Tài Khoản Mới</span>
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="stats-row mb-6">
        <div className="stat-card">
          <div className="stat-icon stat-total">
            <Users size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Tổng số tài khoản</span>
            <span className="stat-value">{users.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-downloading">
            <Clock size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Khách dùng thử 48h</span>
            <span className="stat-value text-sky-400">
              {users.filter((u) => u.role === 'user').length}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-completed">
            <Crown size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Quản trị viên (Admin)</span>
            <span className="stat-value text-amber-400">
              {users.filter((u) => u.role === 'admin').length}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="controls-row mb-6">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            className="input-field pr-11 pl-4 text-xs sm:text-sm py-2.5 h-11"
            placeholder="Tìm theo tên tài khoản (vd: g2c7fW, ongdangiuu)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="text-xs sm:text-sm text-slate-400 font-medium">
          Hiển thị <span className="text-amber-400 font-bold">{filteredUsers.length}</span> / {users.length} tài khoản
        </div>
      </div>

      {/* User Table List */}
      <div className="hongguo-card p-0 overflow-hidden border border-amber-500/20 rounded-2xl shadow-xl mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse admin-users-table">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/90 text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                <th className="py-4.5 px-6 min-w-[220px]">Tài Khoản</th>
                <th className="py-4.5 px-5 min-w-[120px]">Mật Khẩu</th>
                <th className="py-4.5 px-5 min-w-[140px]">Vai Trò</th>
                <th className="py-4.5 px-5 min-w-[150px]">Thời Hạn</th>
                <th className="py-4.5 px-5 min-w-[160px]">Hạn Mức Tải</th>
                <th className="py-4.5 px-5 min-w-[130px]">Tiến Độ Tải</th>
                <th className="py-4.5 px-6 text-right min-w-[180px]">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs sm:text-sm">
                    Không tìm thấy tài khoản nào phù hợp với từ khóa "{search}".
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isAdmin = u.role === 'admin';
                  const isMainAdmin = u.username.toLowerCase() === 'ongdangiuu';

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-amber-500/5 transition-colors group"
                    >
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={u.avatar}
                            alt={u.username}
                            className="w-11 h-11 rounded-xl border border-amber-500/30 bg-slate-800 object-cover shadow-sm shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm text-amber-200">{u.username}</span>
                              {isMainAdmin && (
                                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded shadow-xs">
                                  Root Admin
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 truncate">{u.name}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-5 px-5 font-mono font-bold text-amber-400 text-sm tracking-wider">
                        {u.passwordPlain || '123456'}
                      </td>

                      <td className="py-5 px-5">
                        {isAdmin ? (
                          <span className="badge-role-admin inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold">
                            <Crown size={12} />
                            Quản Trị Viên
                          </span>
                        ) : (
                          <span className="badge-role-user inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold">
                            <User size={12} />
                            Người Dùng
                          </span>
                        )}
                      </td>

                      <td className="py-5 px-5">
                        {isAdmin ? (
                          <span className="text-xs font-bold text-emerald-400">Vĩnh viễn</span>
                        ) : u.expiresAt ? (
                          (() => {
                            const diffSec = Math.max(0, Math.floor((u.expiresAt - now) / 1000));
                            if (diffSec <= 0) {
                              return <span className="text-xs text-rose-400 font-bold">Đã hết hạn</span>;
                            }
                            const days = Math.floor(diffSec / 86400);
                            const hours = Math.floor((diffSec % 86400) / 3600);
                            const mins = Math.floor((diffSec % 3600) / 60);
                            const secs = diffSec % 60;
                            const str =
                              days > 0
                                ? `Còn ${days}d ${hours}h ${mins}m ${secs}s`
                                : `Còn ${hours}h ${mins}m ${secs}s`;

                            return (
                              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-sky-300">
                                <Clock size={14} className="text-sky-400 shrink-0 animate-pulse" />
                                <span>{str}</span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-rose-400 font-bold">Đã hết hạn</span>
                        )}
                      </td>

                      <td className="py-5 px-5">
                        {isAdmin ? (
                          <span className="text-xs font-bold text-emerald-400">Không giới hạn</span>
                        ) : (
                          <div className="text-xs text-slate-300 flex flex-col gap-1">
                            <span className="font-bold text-amber-300">
                              {u.maxSeries ? `${u.maxSeries} bộ phim` : 'Không giới hạn phim'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {u.maxEpisodesPerSeries
                                ? `Tối đa ${u.maxEpisodesPerSeries} tập/bộ`
                                : 'Toàn bộ tập'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-5 px-5">
                        <div className="text-xs font-semibold text-slate-200">
                          <span className="text-amber-400 font-bold text-sm">{u.downloadedSeriesCount}</span> / {u.maxSeries ? `${u.maxSeries} phim` : '∞'}
                        </div>
                      </td>

                      <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Copy button */}
                          <button
                            type="button"
                            className="p-2.5 rounded-xl border border-white/10 hover:border-amber-500/50 bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-all shadow-xs"
                            title="Sao chép thông tin gửi cho khách"
                            onClick={() => handleCopyCredentials(u)}
                          >
                            {copiedId === u.id ? (
                              <Check size={15} className="text-emerald-400" />
                            ) : (
                              <Copy size={15} />
                            )}
                          </button>

                          {/* Edit user button */}
                          <button
                            type="button"
                            className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/30 text-amber-300 transition-all shadow-xs"
                            title="Chỉnh sửa chi tiết tài khoản"
                            onClick={() => handleOpenEditModal(u)}
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Reset quota */}
                          {!isAdmin && (
                            <button
                              type="button"
                              className="p-2.5 rounded-xl border border-white/10 hover:border-amber-500/50 bg-slate-800/80 hover:bg-amber-500/20 text-amber-400 transition-all shadow-xs"
                              title="Reset số lượt tải đã dùng về 0"
                              onClick={() => handleResetQuota(u.id, u.username)}
                            >
                              <RotateCcw size={15} />
                            </button>
                          )}

                          {/* Extend +24h */}
                          {!isAdmin && (
                            <button
                              type="button"
                              className="px-2 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 text-xs font-bold transition-all shadow-xs flex items-center gap-0.5"
                              title="Gia hạn thêm 24 giờ sử dụng"
                              onClick={() => handleExtendHours(u.id, u.username, 24)}
                            >
                              <Plus size={12} />
                              <span>24h</span>
                            </button>
                          )}

                          {/* Extend +48h */}
                          {!isAdmin && (
                            <button
                              type="button"
                              className="px-2 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 text-xs font-bold transition-all shadow-xs flex items-center gap-0.5"
                              title="Gia hạn thêm 48 giờ sử dụng"
                              onClick={() => handleExtendHours(u.id, u.username, 48)}
                            >
                              <Plus size={12} />
                              <span>48h</span>
                            </button>
                          )}

                          {/* Delete button */}
                          {!isMainAdmin && (
                            <button
                              type="button"
                              className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 transition-all shadow-xs"
                              title="Xóa tài khoản này"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Tài Khoản Mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 flex flex-col items-center justify-center min-h-screen animate-fade-in">
          <div className="admin-modal-card w-full max-w-lg relative my-auto">
            <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-7">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/25 shrink-0">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-lg sm:text-xl">
                    Cấp Tài Khoản Mới
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Thiết lập thông tin tài khoản và giới hạn tải phim</p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div className="p-4 mb-6 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle size={17} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="modal-form-group">
                <div className="flex items-center justify-between">
                  <label className="modal-form-label">
                    Tên tài khoản (6 ký tự)
                  </label>
                  <button
                    type="button"
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-bold"
                    onClick={handleGenerateRandomUsername}
                  >
                    <Sparkles size={14} />
                    Tự sinh ngẫu nhiên
                  </button>
                </div>
                <input
                  type="text"
                  required
                  className="modal-input-control font-mono text-amber-300 font-bold"
                  placeholder="Ví dụ: g2c7fW, A2sn5m..."
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-form-label">
                  Mật khẩu đăng nhập
                </label>
                <input
                  type="text"
                  required
                  className="modal-input-control font-mono"
                  placeholder="Mật khẩu (mặc định: 123456)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div className="modal-form-group mb-0">
                  <label className="modal-form-label">
                    Vai trò
                  </label>
                  <select
                    className="modal-input-control cursor-pointer font-bold"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                  >
                    <option value="user" className="bg-slate-900 text-white">Người dùng</option>
                    <option value="admin" className="bg-slate-900 text-white">Quản trị viên</option>
                  </select>
                </div>

                {newRole === 'user' && (
                  <div className="modal-form-group mb-0">
                    <label className="modal-form-label">
                      Thời hạn
                    </label>
                    <select
                      className="modal-input-control cursor-pointer font-bold text-sky-300"
                      value={newHours}
                      onChange={(e) => setNewHours(Number(e.target.value))}
                    >
                      <option value="48" className="bg-slate-900 text-white">2 ngày</option>
                      <option value="720" className="bg-slate-900 text-white">1 tháng</option>
                      <option value="2160" className="bg-slate-900 text-white">3 tháng</option>
                    </select>
                  </div>
                )}
              </div>

              {newRole === 'user' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <div className="modal-form-group mb-0">
                    <label className="modal-form-label">
                      Tối đa số bộ phim
                    </label>
                    <select
                      className="modal-input-control cursor-pointer font-bold text-amber-300"
                      value={newMaxSeries}
                      onChange={(e) => setNewMaxSeries(Number(e.target.value))}
                    >
                      <option value="0" className="bg-slate-900 text-amber-300 font-bold">Không giới hạn</option>
                      <option value="5" className="bg-slate-900 text-white">5 bộ phim</option>
                      <option value="10" className="bg-slate-900 text-white">10 bộ phim</option>
                      <option value="20" className="bg-slate-900 text-white">20 bộ phim</option>
                    </select>
                  </div>

                  <div className="modal-form-group mb-0">
                    <label className="modal-form-label">
                      Tối đa tập/mỗi bộ
                    </label>
                    <select
                      className="modal-input-control cursor-pointer font-bold text-amber-300"
                      value={newMaxEpisodes}
                      onChange={(e) => setNewMaxEpisodes(Number(e.target.value))}
                    >
                      <option value="0" className="bg-slate-900 text-amber-300 font-bold">Toàn bộ tập</option>
                      <option value="30" className="bg-slate-900 text-white">30 tập</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3.5 pt-6 mt-4 border-t border-white/10">
                <button
                  type="button"
                  className="btn btn-outline px-6 py-3 text-sm font-semibold"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" disabled={creating} className="btn btn-primary px-7 py-3 text-sm font-black shadow-lg shadow-amber-500/25">
                  {creating ? 'Đang tạo...' : 'Xác Nhận Cấp Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Chỉnh Sửa Tài Khoản */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 flex flex-col items-center justify-center min-h-screen animate-fade-in">
          <div className="admin-modal-card w-full max-w-lg relative my-auto border-2 border-amber-500/40">
            <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold shadow-lg shrink-0">
                  <Edit3 size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-lg sm:text-xl flex items-center gap-2">
                    <span>Chỉnh Sửa Tài Khoản:</span>
                    <span className="text-amber-300 font-mono">{editingUser.username}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Thay đổi mật khẩu, hạn mức và cộng thêm giờ sử dụng</p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
                onClick={() => setEditingUser(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-5">
              <div className="modal-form-group">
                <label className="modal-form-label">Mật khẩu mới</label>
                <input
                  type="text"
                  required
                  className="modal-input-control font-mono font-bold text-amber-200"
                  placeholder="Mật khẩu mới"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="modal-form-group mb-0">
                  <label className="modal-form-label">Vai trò</label>
                  <select
                    className="modal-input-control cursor-pointer font-bold"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                  >
                    <option value="user" className="bg-slate-900 text-white">Người dùng</option>
                    <option value="admin" className="bg-slate-900 text-white">Quản trị viên</option>
                  </select>
                </div>

                <div className="modal-form-group mb-0">
                  <label className="modal-form-label">Cộng thêm thời gian (+Giờ)</label>
                  <select
                    className="modal-input-control cursor-pointer font-bold text-sky-300"
                    value={editAddHours}
                    onChange={(e) => setEditAddHours(Number(e.target.value))}
                  >
                    <option value="0" className="bg-slate-900 text-slate-400">Không gia hạn thêm</option>
                    <option value="24" className="bg-slate-900 text-sky-300">+24 giờ (1 ngày)</option>
                    <option value="48" className="bg-slate-900 text-sky-300">+48 giờ (2 ngày)</option>
                    <option value="72" className="bg-slate-900 text-sky-300">+72 giờ (3 ngày)</option>
                    <option value="168" className="bg-slate-900 text-sky-300">+7 ngày (1 tuần)</option>
                    <option value="720" className="bg-slate-900 text-sky-300">+30 ngày (1 tháng)</option>
                  </select>
                </div>
              </div>

              {editRole === 'user' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="modal-form-group mb-0">
                    <label className="modal-form-label">Tối đa số bộ phim</label>
                    <select
                      className="modal-input-control cursor-pointer font-bold text-amber-300"
                      value={editMaxSeries}
                      onChange={(e) => setEditMaxSeries(Number(e.target.value))}
                    >
                      <option value="0" className="bg-slate-900 text-amber-300 font-bold">Không giới hạn</option>
                      <option value="5" className="bg-slate-900 text-white">5 bộ phim</option>
                      <option value="10" className="bg-slate-900 text-white">10 bộ phim</option>
                      <option value="20" className="bg-slate-900 text-white">20 bộ phim</option>
                    </select>
                  </div>

                  <div className="modal-form-group mb-0">
                    <label className="modal-form-label">Tối đa tập/mỗi bộ</label>
                    <select
                      className="modal-input-control cursor-pointer font-bold text-amber-300"
                      value={editMaxEpisodes}
                      onChange={(e) => setEditMaxEpisodes(Number(e.target.value))}
                    >
                      <option value="0" className="bg-slate-900 text-amber-300 font-bold">Toàn bộ tập</option>
                      <option value="30" className="bg-slate-900 text-white">30 tập</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-white/10 bg-slate-800/60 cursor-pointer hover:border-amber-500/50 transition">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    checked={editResetDownloads}
                    onChange={(e) => setEditResetDownloads(e.target.checked)}
                  />
                  <span className="text-xs font-bold text-slate-200">
                    Reset số lượt phim đã tải về 0 ngay lập tức
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-5 mt-4 border-t border-white/10">
                <button
                  type="button"
                  className="btn btn-outline px-6 py-2.5 text-sm font-semibold"
                  onClick={() => setEditingUser(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="btn btn-primary px-7 py-2.5 text-sm font-black shadow-lg shadow-amber-500/25 flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>{editSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
