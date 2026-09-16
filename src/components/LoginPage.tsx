import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  MessageCircle,
  Clock,
  X,
  ChevronDown,
  KeyRound,
} from 'lucide-react';
import BeeLogo from './BeeLogo.tsx';
import { api } from '../api.ts';
import { UserProfile } from '../types.ts';

interface SavedCredential {
  username: string;
  password: string;
}

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Lấy danh sách tài khoản + mật khẩu đã từng đăng nhập thành công
  const [savedAccounts, setSavedAccounts] = useState<SavedCredential[]>(() => {
    try {
      const saved = localStorage.getItem('thco_saved_credentials');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Tự động điền tài khoản và mật khẩu gần nhất khi mở app hoặc vừa đăng xuất
  useEffect(() => {
    if (savedAccounts.length > 0 && !username) {
      setUsername(savedAccounts[0].username);
      setPassword(savedAccounts[0].password);
    }
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hàm lưu cả tài khoản và mật khẩu vào bộ nhớ khi đăng nhập thành công
  const saveCredential = (u: string, p: string) => {
    try {
      const cleanUser = u.trim();
      const cleanPass = p.trim();
      if (!cleanUser) return;

      const filtered = savedAccounts.filter((item) => item.username !== cleanUser);
      const next: SavedCredential[] = [
        { username: cleanUser, password: cleanPass },
        ...filtered,
      ].slice(0, 5); // Lưu tối đa 5 tài khoản gần nhất

      setSavedAccounts(next);
      localStorage.setItem('thco_saved_credentials', JSON.stringify(next));
    } catch {}
  };

  // Hàm xóa 1 tài khoản khỏi lịch sử
  const removeSavedItem = (e: React.MouseEvent, userToRemove: string) => {
    e.stopPropagation();
    const next = savedAccounts.filter((item) => item.username !== userToRemove);
    setSavedAccounts(next);
    localStorage.setItem('thco_saved_credentials', JSON.stringify(next));
    if (username === userToRemove) {
      setUsername('');
      setPassword('');
    }
  };

  // Chọn tài khoản -> Tự động điền CẢ TÊN VÀ MẬT KHẨU
  const handleSelectAccount = (acc: SavedCredential) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setShowDropdown(false);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tên tài khoản!');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu!');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.login(username.trim(), password.trim());
      if (res.success && res.user) {
        // Lưu lại cả tên và mật khẩu khi đăng nhập thành công
        saveCredential(username, password);
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Đăng nhập không thành công, vui lòng thử lại!');
      }
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối máy chủ: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* 3D Ambient Glowing Orbs Background */}
      <div className="login-ambient-orb orb-1" />
      <div className="login-ambient-orb orb-2" />
      <div className="login-ambient-orb orb-3" />
      <div className="login-ambient-grid" />

      {/* Main 3D Card Stage */}
      <div className="login-stage">
        <div className="login-card-3d">
          <div className="card-top-shine" />

          {/* Logo & Header */}
          <div className="login-header">
            <div className="login-logo-3d-box">
              <BeeLogo size={52} />
              <div className="logo-sparkle-dot" />
            </div>
            <h1 className="login-title">Tạp Hóa Của Ong</h1>
            <p className="login-subtitle">
              Hệ thống tải phim ngắn Hồng Quả tốc độ cao chuyên nghiệp
            </p>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleLogin}>
            {/* Username Input with Custom Dropdown */}
            <div className="form-group" ref={dropdownRef}>
              <label className="form-label" htmlFor="login-username">
                Tài khoản đăng nhập
              </label>
              <div className="input-with-icon relative">
                <div className="input-icon-left">
                  <User size={18} />
                </div>
                <input
                  id="login-username"
                  type="text"
                  className="login-input pr-10"
                  placeholder="Nhập hoặc chọn tài khoản..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  autoComplete="off"
                  autoFocus
                />
                {savedAccounts.length > 0 && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 p-1 transition"
                    onClick={() => setShowDropdown(!showDropdown)}
                    title="Xem danh sách tài khoản đã lưu"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        showDropdown ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                )}

                {/* Hộp gợi ý (Hiện khi bấm vào ô hoặc bấm mũi tên) */}
                {showDropdown && savedAccounts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-xl shadow-2xl p-1.5 space-y-1 animate-fade-in">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-2.5 py-1 border-b border-white/5">
                      <span className="flex items-center gap-1 text-amber-400">
                        <Clock size={12} />
                        <span>Tài khoản đã lưu:</span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Tự điền kèm mật khẩu
                      </span>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {savedAccounts.map((acc) => (
                        <div
                          key={acc.username}
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-amber-500/15 cursor-pointer text-xs transition group"
                          onClick={() => handleSelectAccount(acc)}
                        >
                          <div className="flex items-center gap-2">
                            <User
                              size={13}
                              className="text-slate-400 group-hover:text-amber-400"
                            />
                            <span className="font-bold text-amber-300 font-mono">
                              {acc.username}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                              <KeyRound size={10} />
                              ••••••
                            </span>
                          </div>
                          <button
                            type="button"
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition opacity-60 hover:opacity-100"
                            onClick={(e) => removeSavedItem(e, acc.username)}
                            title="Xóa tài khoản này khỏi danh sách nhớ"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Mật khẩu
              </label>
              <div className="input-with-icon">
                <div className="input-icon-left">
                  <Lock size={18} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="login-error-box animate-shake">
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
              id="login-submit-button"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner-sm" />
                  <span>Đang kiểm tra đăng nhập...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight size={17} />
                </div>
              )}
            </button>
          </form>

          {/* Contact / Registration Notice */}
          <div className="login-security-notice flex flex-col items-center justify-center text-center gap-1.5 py-3 px-4">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-300">
              <MessageCircle size={15} className="text-amber-400 shrink-0" />
              <span>
                Liên hệ Zalo: <strong className="text-amber-400 font-extrabold tracking-wider underline underline-offset-2">0362838816</strong>
              </span>
            </div>
            <span className="text-slate-300 text-[11.5px] leading-relaxed">
              để đăng ký tài khoản nếu muốn sử dụng
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}