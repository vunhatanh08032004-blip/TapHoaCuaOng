import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Folder,
  Check,
  FileText,
  Layers,
  Headphones,
  Copy,
  CheckCheck,
  HardDrive,
  Info,
  HelpCircle,
} from 'lucide-react';
import { api } from '../api.ts';
import { Settings } from '../types.ts';
import { translations } from '../i18n.ts';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [copiedZalo, setCopiedZalo] = useState(false);
  const t = translations.vi;

  const FORMAT_PRESETS = [
    { label: t.presetSeriesEp, value: 'TênPhim_TậpN', desc: 'Ví dụ: VoChongChong_Tap01.mp4' },
    { label: t.presetSeriesEpTitle, value: 'TênPhim_TậpN_TiêuĐề', desc: 'Ví dụ: VoChongChong_Tap01_GiaiThuong.mp4' },
    { label: t.presetSeriesOnly, value: 'TênPhim', desc: 'Ví dụ: VoChongChong.mp4' },
  ];

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  const update = (key: keyof Settings, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
    setSaved(false);
  };

  const selectFolder = async () => {
    const dir = await api.selectFolder();
    if (dir) update('root', dir);
  };

  const save = async () => {
    if (!settings) return;
    const res = await api.saveSettings(settings);
    if (res && res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const copyZaloNumber = () => {
    navigator.clipboard.writeText('0362838816');
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2000);
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center p-12 text-amber-400 font-semibold text-sm">
        <div className="spinner-sm mr-2" />
        Đang tải cấu hình cài đặt...
      </div>
    );
  }

  return (
    <div className="settings-page-wrapper animate-fade-in">
      {/* Header Section */}
      <div className="settings-header-banner">
        <div className="settings-header-icon">
          <SettingsIcon size={30} />
        </div>
        <div className="settings-header-text">
          <h2>{t.settingsTitle}</h2>
          <p>Tùy chỉnh thư mục lưu trữ phim, quy tắc đặt tên tập tin và tốc độ tải về</p>
        </div>
      </div>

      {/* Mục 1: Thư mục lưu trữ phim */}
      <div className="settings-block-card">
        <div className="settings-card-title-row">
          <div className="settings-card-icon-badge">
            <HardDrive size={22} />
          </div>
          <div>
            <h3>{t.downloadDirLabel}</h3>
            <p>Đường dẫn thư mục trên ổ đĩa máy tính dùng để chứa các video phim tải về</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-3.5">
            <input
              type="text"
              className="settings-input-control flex-1 text-amber-200"
              value={settings.root || ''}
              onChange={(e) => update('root', e.target.value)}
              placeholder="Ví dụ: D:\HongGuo_Downloads hoặc C:\Users\Videos"
            />
            <button
              type="button"
              className="btn btn-outline flex items-center justify-center gap-2 px-6 h-12 shrink-0 border-amber-500/30 hover:border-amber-400 text-amber-300 hover:text-white"
              onClick={selectFolder}
            >
              <Folder size={19} />
              <span>{t.chooseFolder}</span>
            </button>
          </div>

          <div className="settings-hint-row">
            <Info size={16} className="settings-hint-icon" />
            <span>{t.folderHint}</span>
          </div>
        </div>
      </div>

      {/* Mục 2: Quy tắc đặt tên file */}
      <div className="settings-block-card">
        <div className="settings-card-title-row">
          <div className="settings-card-icon-badge">
            <FileText size={22} />
          </div>
          <div>
            <h3>{t.namingRuleLabel}</h3>
            <p>Chọn mẫu định dạng tên video xuất ra hoặc tự chỉnh sửa quy tắc</p>
          </div>
        </div>

        {/* Các nút chọn quy tắc đặt tên - SÁNG LÊN KHI CHỌN */}
        <div className="format-preset-container">
          <span className="settings-section-title">
            Các mẫu định dạng có sẵn:
          </span>
          <div className="format-presets-grid">
            {FORMAT_PRESETS.map((p) => {
              const isSelected = settings.name_format === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  className={`format-preset-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => update('name_format', p.value)}
                >
                  <div className="format-preset-header">
                    <span className="format-preset-title">
                      {p.label}
                    </span>
                    {isSelected && (
                      <span className="format-preset-check">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <span className="format-preset-example">
                    {p.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="settings-custom-format-box">
          <span className="settings-section-title">
            Mẫu định dạng tùy chỉnh (Name Format Pattern):
          </span>
          <input
            type="text"
            className="settings-input-control text-amber-300"
            value={settings.name_format || ''}
            onChange={(e) => update('name_format', e.target.value)}
            placeholder="TênPhim_TậpN"
          />
          <div className="settings-hint-row">
            <Info size={16} className="settings-hint-icon" />
            <span>{t.namingHint}</span>
          </div>
        </div>
      </div>

      {/* Mục 3: Tốc độ & Số luồng tải đồng thời */}
      <div className="settings-block-card">
        <div className="settings-card-title-row">
          <div className="settings-card-icon-badge">
            <Layers size={22} />
          </div>
          <div>
            <h3>{t.concurrencyLabel}</h3>
            <p>Số lượng tập phim được tải xuống song song cùng một lúc</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="max-w-xs">
            <select
              className="settings-input-control cursor-pointer text-amber-300 font-bold"
              value={settings.max_concurrent || 3}
              onChange={(e) => update('max_concurrent', parseInt(e.target.value, 10))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n} className="bg-slate-900 text-white">
                  {n} {t.concurrentOption}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-hint-row">
            <Info size={16} className="settings-hint-icon" />
            <span>{t.concurrencyHint}</span>
          </div>
        </div>
      </div>

      {/* Mục 4: Hỗ Trợ Sự Cố */}
      <div className="zalo-support-card">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="settings-card-icon-badge">
              <Headphones size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Hỗ Trợ Sự Cố & Kỹ Thuật
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Giải đáp mọi vấn đề về tài khoản, tải phim và xử lý sự cố 24/7
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline flex items-center gap-2 px-5 py-2.5 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200"
            onClick={copyZaloNumber}
          >
            {copiedZalo ? <CheckCheck size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span className="font-bold">{copiedZalo ? 'Đã sao chép Zalo!' : 'Sao chép Zalo'}</span>
          </button>
        </div>

        <div className="zalo-contact-box">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-bold shadow-xs">
              <HelpCircle size={22} />
            </div>
            <div className="text-sm leading-relaxed">
              <span className="text-slate-200 font-medium">Vui lòng liên hệ Zalo: </span>
              <span className="zalo-phone-number">
                0362838816
              </span>
              <span className="text-slate-200 font-medium"> để được hỗ trợ nhé.</span>
            </div>
          </div>
          <span className="badge badge-warning text-xs py-1.5 px-3.5 shrink-0 font-extrabold">
            Hỗ Trợ Nhanh
          </span>
        </div>
      </div>

      {/* Mục 5: Nút Lưu Cài Đặt */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
        <button
          type="button"
          className="btn btn-primary px-10 py-3.5 text-sm font-black shadow-xl shadow-amber-500/30"
          onClick={save}
        >
          {saved ? (
            <div className="flex items-center gap-2">
              <Check size={18} />
              <span>{t.btnSavedSuccess}</span>
            </div>
          ) : (
            <span>{t.btnSaveSettings}</span>
          )}
        </button>
      </div>
    </div>
  );
}
