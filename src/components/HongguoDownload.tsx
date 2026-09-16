import React, { useState, useEffect } from 'react';
import {
  Film,
  Download,
  Folder,
  RefreshCw,
  Sparkles,
  Play,
  Square,
  CheckSquare,
  Image as ImageIcon,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api.ts';
import { SeriesData, UserProfile } from '../types.ts';
import { translations } from '../i18n.ts';
import VideoPlayerModal from './VideoPlayerModal.tsx';

interface HongguoDownloadProps {
  onNavigate?: (tab: string) => void;
  currentUser?: UserProfile | null;
  onUserUpdated?: (user: UserProfile) => void;
}

// Bộ nhớ đệm giữ nguyên trạng thái khi người dùng chuyển tab và quay lại
let cachedInputUrl = '';
let cachedSeriesData: SeriesData | null = null;
let cachedSelectedVids = new Set<string>();
let cachedSuccessMsg = '';
let cachedErrorMsg = '';

export default function HongguoDownload({
  onNavigate,
  currentUser,
  onUserUpdated,
}: HongguoDownloadProps) {
  const [inputUrl, setInputUrlState] = useState(cachedInputUrl);
  const [loading, setLoading] = useState(false);
  const [seriesData, setSeriesDataState] = useState<SeriesData | null>(cachedSeriesData);
  const [selectedVids, setSelectedVidsState] = useState<Set<string>>(cachedSelectedVids);
  const [errorMsg, setErrorMsgState] = useState(cachedErrorMsg);
  const [successMsg, setSuccessMsgState] = useState(cachedSuccessMsg);
  const [submitting, setSubmitting] = useState(false);

  const isUserRole = currentUser?.role === 'user';
  const userMaxEp = currentUser?.maxEpisodesPerSeries;
  const userMaxSeries = currentUser?.maxSeries ?? 5;
  const isEpUnlimited = !isUserRole || userMaxEp === null || userMaxEp === undefined;

  const [presets, setPresets] = useState<any[]>([]);

  useEffect(() => {
    api.getPresets().then((list) => {
      if (Array.isArray(list)) setPresets(list);
    });
  }, []);

  const setInputUrl = (val: string) => {
    cachedInputUrl = val;
    setInputUrlState(val);
  };

  const setSeriesData = (data: SeriesData | null) => {
    cachedSeriesData = data;
    setSeriesDataState(data);
  };

  const setSelectedVids = (vids: Set<string>) => {
    cachedSelectedVids = vids;
    setSelectedVidsState(vids);
  };

  const setErrorMsg = (msg: string) => {
    cachedErrorMsg = msg;
    setErrorMsgState(msg);
  };

  const setSuccessMsg = (msg: string) => {
    cachedSuccessMsg = msg;
    setSuccessMsgState(msg);
  };

  // Preview video state
  const [previewVideo, setPreviewVideo] = useState<{
    vid: string;
    title: string;
    seriesTitle: string;
    streamUrl: string;
  } | null>(null);

  const t = translations.vi;

  // Phân tích phim ngắn
  const handleResolve = async (customUrl?: string) => {
    const target = (customUrl || inputUrl).trim();
    if (!target) {
      setErrorMsg(t.msgEnterLink);
      return;
    }

    if (customUrl) {
      setInputUrl(customUrl);
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.hongguoResolve(target);
      if (res.success && res.data) {
        setSeriesData(res.data);
        const allIds = new Set<string>();
        if (res.data.cover) {
          allIds.add('cover');
        }

        if (isUserRole && !isEpUnlimited && userMaxEp) {
          // Tài khoản user có giới hạn số tập/bộ
          res.data.episodes.slice(0, userMaxEp).forEach((ep) => allIds.add(ep.vid));
          setSuccessMsg(
            `Đã phân tích: "${res.data.series_title}" (${res.data.total} tập). Tự động chọn ${userMaxEp} tập đầu theo giới hạn tài khoản.`
          );
        } else {
          // Tài khoản admin hoặc user được tải full tập trong 5 bộ
          res.data.episodes.forEach((ep) => allIds.add(ep.vid));
          setSuccessMsg(
            t.msgResolveSuccess
              .replace('{title}', res.data.series_title)
              .replace('{total}', String(res.data.total))
          );
        }
        setSelectedVids(allIds);
      } else {
        setErrorMsg(res.error || t.msgResolveFail);
      }
    } catch (err: any) {
      setErrorMsg(t.msgResolveFail + ': ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // Bật/tắt chọn từng mục thủ công (tập phim hoặc ảnh bìa)
  const toggleItem = (id: string) => {
    const next = new Set<string>(selectedVids);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (isUserRole && !isEpUnlimited && userMaxEp && id !== 'cover') {
        const currentEpCount = Array.from(next).filter((x) => x !== 'cover').length;
        if (currentEpCount >= userMaxEp) {
          setErrorMsg(`Tài khoản trải nghiệm chỉ được chọn tối đa ${userMaxEp} tập cho mỗi bộ phim!`);
          return;
        }
      }
      next.add(id);
    }
    setSelectedVids(next);
  };

  // Chọn tất cả (tất cả các tập + ảnh bìa, hoặc tối đa theo giới hạn với user)
  const handleSelectAll = () => {
    if (!seriesData) return;
    const next = new Set<string>();
    if (seriesData.cover) next.add('cover');

    if (isUserRole && !isEpUnlimited && userMaxEp) {
      seriesData.episodes.slice(0, userMaxEp).forEach((ep) => next.add(ep.vid));
      setSuccessMsg(`Đã chọn ${userMaxEp} tập theo giới hạn tài khoản trải nghiệm.`);
    } else {
      seriesData.episodes.forEach((ep) => next.add(ep.vid));
    }
    setSelectedVids(next);
  };

  // Đảo chọn (đảo chọn các tập + ảnh bìa)
  const handleInvertSelect = () => {
    if (!seriesData) return;
    if (isUserRole && !isEpUnlimited && userMaxEp) {
      setErrorMsg(`Đảo chọn bị khóa để bảo toàn giới hạn ${userMaxEp} tập của tài khoản trải nghiệm.`);
      return;
    }
    const next = new Set<string>();
    if (seriesData.cover && !selectedVids.has('cover')) {
      next.add('cover');
    }
    seriesData.episodes.forEach((ep) => {
      if (!selectedVids.has(ep.vid)) {
        next.add(ep.vid);
      }
    });
    setSelectedVids(next);
  };

  // Bỏ chọn tất cả
  const handleDeselectAll = () => {
    setSelectedVids(new Set<string>());
  };

  // Gửi danh sách mục đã chọn vào hàng đợi tải (ảnh bìa lưu chung thư mục với các tập phim)
  const handleBatchDownload = async () => {
    if (!seriesData) return;

    const isCoverSelected = selectedVids.has('cover') && !!seriesData.cover;
    const selectedEps = seriesData.episodes.filter((ep) => selectedVids.has(ep.vid));

    if (!isCoverSelected && selectedEps.length === 0) {
      setErrorMsg(t.msgSelectAtLeastOne);
      return;
    }

    if (isUserRole && !isEpUnlimited && userMaxEp && selectedEps.length > userMaxEp) {
      setErrorMsg(`Tài khoản trải nghiệm chỉ được tải tối đa ${userMaxEp} tập cho mỗi bộ phim!`);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Gửi tác vụ tải phim và ảnh bìa lưu chung vào thư mục bộ phim
      const res = await api.hongguoDownloadBatch({
        seriesId: seriesData.series_id,
        seriesTitle: seriesData.series_title,
        episodes: selectedEps,
        coverUrl: isCoverSelected ? seriesData.cover : undefined,
      });

      if (res.success) {
        const totalQueued = res.count ?? (selectedEps.length + (isCoverSelected ? 1 : 0));
        setSuccessMsg(t.msgQueueSuccess.replace('{count}', String(totalQueued)));
        if ((res as any).user && onUserUpdated) {
          onUserUpdated((res as any).user);
        }
      } else {
        setErrorMsg(res.error || 'Lỗi gửi yêu cầu tải');
      }
    } catch (err: any) {
      setErrorMsg('Lỗi ngoại lệ: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPreview = (ep: any) => {
    setPreviewVideo({
      vid: ep.vid,
      title: `${t.episodeIndexPrefix} ${ep.vid_index} ${ep.title ? '- ' + ep.title : ''}`,
      seriesTitle: seriesData?.series_title || 'Hongguo',
      streamUrl: api.getStreamUrl(ep.vid),
    });
  };

  const totalSelectableCount =
    (seriesData?.episodes?.length || 0) + (seriesData?.cover ? 1 : 0);

  return (
    <div className="hongguo-container">
      {/* Hero Banner */}
      <div className="hongguo-hero">
        <div className="hero-icon">
          <Film size={30} />
        </div>
        <div className="hero-text">
          <h2>{t.heroTitle}</h2>
          <p>{t.heroDesc}</p>
        </div>
      </div>

      {/* User Trial Limit Notification Banner */}
      {isUserRole && currentUser && (
        <div className="user-trial-banner">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-amber-400 shrink-0" />
            <span>
              Tài khoản dùng thử <strong>{currentUser.username}</strong>:{' '}
              {isEpUnlimited ? (
                <>
                  Giới hạn tối đa <strong>{currentUser.maxSeries ?? 5} bộ phim</strong> (
                  <strong>Tải toàn bộ tập trong {currentUser.maxSeries ?? 5} bộ</strong>, đã dùng{' '}
                  {currentUser.downloadedSeriesCount}/{currentUser.maxSeries ?? 5} bộ).
                </>
              ) : (
                <>
                  Giới hạn tối đa <strong>{currentUser.maxSeries ?? 10} bộ phim</strong> (Đã dùng:{' '}
                  {currentUser.downloadedSeriesCount}/{currentUser.maxSeries ?? 10}), tối đa{' '}
                  <strong>{userMaxEp} tập/phim</strong>.
                </>
              )}
            </span>
          </div>
          <div className="user-trial-chips">
            <span className="trial-chip">
              <Clock size={12} />
              Còn lại: {currentUser.hoursRemaining ?? 48}h
            </span>
            <span className="trial-chip">
              <Film size={12} />
              Đã tải: {currentUser.downloadedSeriesCount}/{currentUser.maxSeries ?? 5} bộ
            </span>
          </div>
        </div>
      )}

      {/* Thẻ nhập liên kết */}
      <div className="download-input-card">
        <div className="download-card-title">
          <Sparkles size={22} className="text-amber-400 shrink-0" />
          <span>{t.inputTitle}</span>
        </div>
        
        <div className="download-input-row">
          <input
            id="hongguo-input-field"
            type="text"
            className="download-url-input"
            placeholder={t.inputPlaceholder}
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
          />
          <button
            id="hongguo-resolve-btn"
            className="download-action-btn"
            onClick={() => handleResolve()}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw size={19} className="spin" />
                <span>{t.btnResolving}</span>
              </>
            ) : (
              <>
                <Film size={19} />
                <span>{t.btnResolve}</span>
              </>
            )}
          </button>
        </div>

        {/* Gợi ý phim mẫu trải nghiệm nhanh 1-click */}
        {presets.length > 0 && !seriesData && (
          <div className="preset-samples-wrapper">
            <div className="preset-samples-header">
              <Sparkles size={16} className="text-amber-400" />
              <span>Phim ngắn mẫu thịnh hành (Bấm để thử nghiệm ngay):</span>
            </div>
            <div className="preset-samples-grid">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="preset-card-item group"
                  onClick={() => handleResolve(p.shareUrl || p.id)}
                >
                  <div className="min-w-0">
                    <div className="preset-item-title-row">
                      <span>《{p.title}》</span>
                      <span className="preset-item-ep-badge">
                        {p.total} tập
                      </span>
                    </div>
                    <div className="preset-item-tag">{p.tag}</div>
                  </div>
                  <div className="preset-item-action">
                    <span>Phân tích</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}
      </div>

      {/* Danh sách tập, ảnh bìa & Điều khiển chọn */}
      {seriesData && (
        <div className="hongguo-card episode-section">
          {/* Thông tin phim */}
          <div className="series-header">
            <div className="series-info">
              {seriesData.cover ? (
                <img
                  src={seriesData.cover}
                  alt={seriesData.series_title}
                  className="series-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="series-cover-placeholder">
                  <Film size={28} />
                </div>
              )}
              <div className="series-meta">
                <h3 className="series-title">《{seriesData.series_title}》</h3>
                <div className="series-tags">
                  <span className="badge">
                    {t.totalEpisodes} {seriesData.total} {t.episodesUnit}
                  </span>
                  <span className="badge badge-secondary">series_id: {seriesData.series_id}</span>
                  <span className="badge badge-success">{t.nativeDecryptBadge}</span>
                </div>
              </div>
            </div>

            <div className="batch-action-bar">
              {seriesData.episodes.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline flex items-center gap-1.5"
                  onClick={() => handleOpenPreview(seriesData.episodes[0])}
                  title={t.previewEp1}
                >
                  <Play size={15} />
                  <span>{t.previewEp1}</span>
                </button>
              )}
              <button
                id="hongguo-batch-download-btn"
                className="btn btn-primary"
                onClick={handleBatchDownload}
                disabled={submitting || selectedVids.size === 0}
              >
                <Download size={16} />
                <span>
                  {t.downloadSelected} ({selectedVids.size}/{totalSelectableCount})
                </span>
              </button>
              {onNavigate && (
                <button
                  className="btn btn-outline"
                  onClick={() => onNavigate('manager')}
                >
                  <Folder size={16} />
                  <span>{t.viewManager}</span>
                </button>
              )}
            </div>
          </div>

          {/* Thanh công cụ chọn tập: Chỉ có Chọn tất cả, Đảo chọn, Bỏ chọn tất cả */}
          <div className="controls-row">
            <div className="select-buttons">
              <button className="btn-chip" onClick={handleSelectAll}>
                {t.selectAll}
              </button>
              <button className="btn-chip" onClick={handleInvertSelect}>
                {t.invertSelect}
              </button>
              <button className="btn-chip" onClick={handleDeselectAll}>
                {t.deselectAll}
              </button>
            </div>
            <div className="text-xs text-slate-500 italic">
              Nhấp trực tiếp vào từng tập hoặc ảnh bìa để tự chọn thủ công
            </div>
          </div>

          {/* Lưới các tệp: Ảnh bìa + Các tập phim */}
          <div className="episode-grid">
            {/* Ảnh bìa đưa vào danh sách tệp chọn */}
            {seriesData.cover && (
              <div
                className={`episode-card cover-item relative group ${selectedVids.has('cover') ? 'selected border-amber-500 ring-1 ring-amber-500' : ''}`}
                onClick={() => toggleItem('cover')}
                title="Chọn/bỏ chọn tải ảnh bìa phim (lưu chung thư mục với các tập)"
              >
                <div className="checkbox-icon">
                  {selectedVids.has('cover') ? (
                    <CheckSquare size={18} className="icon-checked text-amber-600" />
                  ) : (
                    <Square size={18} className="icon-unchecked" />
                  )}
                </div>
                <div className="episode-info">
                  <span className="episode-num text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <ImageIcon size={14} />
                    <span>{t.coverLabel}</span>
                  </span>
                  <span className="episode-title text-xs text-slate-500 truncate">Hình ảnh bìa phim</span>
                </div>
              </div>
            )}

            {/* Các tập phim */}
            {seriesData.episodes.map((ep) => {
              const isChecked = selectedVids.has(ep.vid);
              return (
                <div
                  key={ep.vid}
                  className={`episode-card relative group ${isChecked ? 'selected' : ''}`}
                  onClick={() => toggleItem(ep.vid)}
                >
                  <div className="checkbox-icon">
                    {isChecked ? (
                      <CheckSquare size={18} className="icon-checked" />
                    ) : (
                      <Square size={18} className="icon-unchecked" />
                    )}
                  </div>
                  <div className="episode-info">
                    <span className="episode-num">
                      {t.episodeIndexPrefix} {String(ep.vid_index).padStart(2, '0')}
                    </span>
                    {ep.title && <span className="episode-title">{ep.title}</span>}
                  </div>

                  {/* Nút xem thử tập */}
                  <button
                    type="button"
                    title={t.previewTooltip}
                    className="absolute right-2 top-2 p-1 rounded bg-black/40 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPreview(ep);
                    }}
                  >
                    <Play size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hộp thoại xem video */}
      {previewVideo && (
        <VideoPlayerModal
          vid={previewVideo.vid}
          title={previewVideo.title}
          seriesTitle={previewVideo.seriesTitle}
          streamUrl={previewVideo.streamUrl}
          onClose={() => setPreviewVideo(null)}
        />
      )}
    </div>
  );
}
