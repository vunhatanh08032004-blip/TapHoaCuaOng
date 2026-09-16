import React, { useState, useEffect } from 'react';
import { Film, Download, Settings, LogOut, Crown, Clock, User, Sparkles, ShieldCheck, Users } from 'lucide-react';
import HongguoDownload from './components/HongguoDownload.tsx';
import DownloadManager from './components/DownloadManager.tsx';
import SettingsPage from './components/Settings.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import BeeLogo from './components/BeeLogo.tsx';
import LoginPage from './components/LoginPage.tsx';
import { api } from './api.ts';
import { AppInfo, UserProfile } from './types.ts';
import { translations } from './i18n.ts';

export default function App() {
  const [page, setPage] = useState('download');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const t = translations.vi;

  // Kiểm tra phiên đăng nhập hiện tại
  useEffect(() => {
    api.getAppInfo().then((info) => {
      setAppInfo(info);
    });

    api
      .getMe()
      .then((res) => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => {
        setLoadingAuth(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    setCurrentUser(null);
    setPage('download');
  };

  const handleNavigate = (targetPage: string) => {
    if (targetPage === 'hongguo') {
      setPage('download');
    } else {
      setPage(targetPage);
    }
  };

  const isDownloadActive = page === 'download' || page === 'hongguo';

  const menu = [
    { id: 'download', label: t.menuDownload, icon: Film },
    { id: 'manager', label: t.menuManager, icon: Download },
    { id: 'settings', label: t.menuSettings, icon: Settings },
    ...(currentUser?.role === 'admin'
      ? [{ id: 'admin', label: 'Quản Lý User', icon: ShieldCheck, badge: 'VIP' }]
      : []),
  ];

  // Trạng thái đang tải xác thực ban đầu
  if (loadingAuth) {
    return (
      <div className="login-page-container">
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="login-logo-3d-box">
            <BeeLogo size={48} />
          </div>
          <div className="flex items-center gap-2 text-amber-300 text-sm font-medium">
            <div className="spinner-sm" />
            <span>Đang khởi tạo hệ thống Tạp Hóa Của Ong...</span>
          </div>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập -> Hiển thị trang đăng nhập 3D
  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="app-layout">
      {/* Thanh bên trái */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="bee-logo-wrapper">
            <BeeLogo size={36} />
          </div>
          <div>
            <div className="brand-text">Tạp Hóa Của Ong</div>
            <div className="brand-sub">
              {t.appName} v{appInfo ? appInfo.version : '1.0.0'}
            </div>
          </div>
        </div>

        <nav className="sidebar-menu">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'download' ? isDownloadActive : page === item.id;
            return (
              <div
                key={item.id}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer with current user quick glance */}
        <div className="sidebar-footer">
          <div className="footer-welcome-badge">
            <BeeLogo size={18} />
            <span>Chào mừng {currentUser.username}</span>
          </div>
        </div>
      </aside>

      {/* Khu vực nội dung chính */}
      <div className="main-wrapper">
        {/* Top Header with 3D User Card & Logout Button */}
        <header className="app-top-header">
          <div className="header-left-info">
            <div className="header-app-badge">
              <Sparkles size={16} className="text-amber-500" />
              <span>Hệ Thống Tải Phim Hồng Quả</span>
            </div>
          </div>

          <div className="header-user-bar">
            {/* 3D User Card */}
            <div className="user-info-card">
              <div
                className={`user-avatar-wrapper ${
                  currentUser.role === 'admin' ? 'admin-glow' : 'user-glow'
                }`}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="user-avatar-img"
                  referrerPolicy="no-referrer"
                />
                <span className="user-avatar-status" />
              </div>

              <div className="user-details">
                <div className="user-username-line">
                  <span className="user-username">{currentUser.username}</span>
                  {currentUser.role === 'admin' ? (
                    <span className="badge-role-admin">
                      <Crown size={11} />
                      VIP Admin
                    </span>
                  ) : (
                    <span className="badge-role-user">
                      <Clock size={11} />
                      User 48H
                    </span>
                  )}
                </div>

                <div className="user-limit-stats">
                  {currentUser.role === 'admin' ? (
                    <span className="limit-tag text-emerald-400 font-semibold">
                      VIP Tải Không Giới Hạn
                    </span>
                  ) : (
                    <>
                      <span className="limit-tag text-amber-300">
                        🎬 {currentUser.downloadedSeriesCount}/{currentUser.maxSeries ?? 5} bộ phim (
                        {currentUser.maxEpisodesPerSeries ? `${currentUser.maxEpisodesPerSeries} tập/bộ` : 'Toàn bộ tập'}
                        )
                      </span>
                      {currentUser.hoursRemaining !== null && (
                        <span className="limit-tag text-sky-300">
                          • Còn {currentUser.hoursRemaining}h
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              className="logout-btn-3d"
              onClick={handleLogout}
              title="Đăng xuất khỏi hệ thống"
              id="header-logout-btn"
            >
              <LogOut size={15} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Nội dung trang: giữ nguyên trạng thái các tab khi chuyển đổi */}
        <main className="main-content">
          <div style={{ display: isDownloadActive ? 'block' : 'none', height: '100%' }}>
            <HongguoDownload
              onNavigate={handleNavigate}
              currentUser={currentUser}
              onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
            />
          </div>
          <div style={{ display: page === 'manager' ? 'block' : 'none', height: '100%' }}>
            <DownloadManager onNavigate={handleNavigate} currentUser={currentUser} />
          </div>
          <div style={{ display: page === 'settings' ? 'block' : 'none', height: '100%' }}>
            <SettingsPage />
          </div>
          {currentUser?.role === 'admin' && (
            <div style={{ display: page === 'admin' ? 'block' : 'none', height: '100%' }}>
              <AdminPanel />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
