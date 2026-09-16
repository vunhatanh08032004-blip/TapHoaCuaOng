import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, Film, Download } from 'lucide-react';
import { translations } from '../i18n.ts';
import BeeLogo from './BeeLogo.tsx';

interface VideoPlayerModalProps {
  vid: string;
  title: string;
  seriesTitle: string;
  streamUrl: string;
  downloadUrl?: string;
  onClose: () => void;
}

export default function VideoPlayerModal({
  vid,
  title,
  seriesTitle,
  streamUrl,
  downloadUrl,
  onClose,
}: VideoPlayerModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = translations.vi;

  // Listen to Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Timeout to prevent infinite loading if video request hangs or is aborted silently
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setError('Quá thời gian tải dữ liệu. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau!');
    }, 45000); // 45s timeout matching backend
    return () => clearTimeout(timer);
  }, [loading]);

  if (typeof document === 'undefined') return null;

  // Clean title to avoid duplicate series title
  const cleanTitle = (title || '').trim();
  const cleanSeries = (seriesTitle || '').trim();
  const hasSeriesInTitle = cleanSeries && cleanTitle.includes(cleanSeries);
  const displayTitle = hasSeriesInTitle
    ? cleanTitle
    : cleanSeries
    ? `《${cleanSeries}》 ${cleanTitle}`
    : cleanTitle;

  const modalContent = (
    <div
      id="video-player-modal-backdrop"
      className="video-player-modal-backdrop"
      onClick={onClose}
    >
      <div
        id="video-player-modal-container"
        className="video-player-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="video-player-modal-header">
          {/* Title and metadata */}
          <div className="video-player-title-col">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="video-player-icon-box">
                <Film size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="video-player-title" title={displayTitle}>
                  {displayTitle}
                </h3>
                <div className="video-player-meta-row mt-1">
                  <span className="video-player-meta-badge">
                    <ShieldCheck size={13} /> {t.modalDecryptStream}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-slate-300">VID: {vid}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons (Tải file MP4 + Đóng) */}
          <div className="video-player-actions">
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="video-player-btn-download"
                title={t.modalDownloadMp4}
              >
                <Download size={15} />
                <span>{t.modalDownloadMp4}</span>
              </a>
            )}
            <button
              id="close-video-player-btn"
              type="button"
              onClick={onClose}
              className="video-player-btn-close"
              title="Đóng trình xem video"
            >
              <X size={16} />
              <span>Đóng</span>
            </button>
          </div>
        </div>

        {/* Video Screen Area */}
        <div className="video-player-screen">
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-10 text-white gap-3">
              <div className="w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full animate-spin shadow-lg shadow-amber-500/20"></div>
              <p className="text-xs text-amber-300 font-semibold tracking-wider">
                {t.modalBuffering}
              </p>
            </div>
          )}

          {error ? (
            <div className="p-8 text-center text-rose-400 max-w-md flex flex-col items-center gap-5">
              <p className="text-base font-bold">{t.statusFailed}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
            </div>
          ) : (
            <video
              id="hongguo-video-element"
              controls
              autoPlay
              playsInline
              className="video-player-element"
              src={streamUrl}
              onLoadedData={() => setLoading(false)}
              onCanPlay={() => setLoading(false)}
              onPlaying={() => setLoading(false)}
              onAbort={() => {
                setLoading(false);
                setError('Trình duyệt đã ngắt kết nối tải video.');
              }}
              onError={() => {
                setLoading(false);
                setError(t.modalPlayFail);
              }}
            />
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="video-player-modal-footer">
          <div className="video-player-footer-status">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="tracking-wide">{t.modalWatermarkFree}</span>
          </div>

          <div className="video-player-footer-brand">
            <BeeLogo size={16} />
            <span>Tạp Hóa Của Ong</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
