import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Trash2,
  Film,
  Play,
  Square,
  CheckSquare,
  Image as ImageIcon,
  FolderOpen,
} from 'lucide-react';
import { api } from '../api.ts';
import { Task, UserProfile } from '../types.ts';
import { translations } from '../i18n.ts';
import VideoPlayerModal from './VideoPlayerModal.tsx';

interface DownloadManagerProps {
  onNavigate?: (page: string) => void;
  currentUser?: UserProfile | null;
}

export default function DownloadManager({ onNavigate, currentUser }: DownloadManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'downloading' | 'completed' | 'failed'>('all');
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [saveDirNotice, setSaveDirNotice] = useState<string | null>(null);

  const t = translations.vi;

  const fetchTasks = async () => {
    try {
      const data = await api.getDownloadTasks();
      setTasks(data || []);
    } catch (e) {
      console.error('Lỗi nạp danh sách tác vụ:', e);
      setTasks([]);
    }
  };

  useEffect(() => {
    setSelectedIds(new Set());
    fetchTasks();
  }, [currentUser?.id]);

  useEffect(() => {
    fetchTasks();

    // Lắng nghe sự kiện SSE thời gian thực
    const unProg = api.onDownloadProgress((data: any) => {
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id === data.id) {
            return {
              ...item,
              status: 'downloading',
              progress: data.progress,
              receivedBytes: data.receivedBytes,
              totalBytes: data.totalBytes,
              speed: data.speed,
            };
          }
          return item;
        })
      );
    });

    const unAdded = api.onDownloadTaskAdded((newTask: Task) => {
      setTasks((prev) => {
        if (prev.some((item) => item.id === newTask.id)) return prev;
        return [newTask, ...prev];
      });
    });

    const unComp = api.onDownloadCompleted((data: any) => {
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id === data.id) {
            return {
              ...item,
              status: 'completed',
              progress: 100,
              speed: 0,
              savePath: data.path || item.savePath,
            };
          }
          return item;
        })
      );
    });

    const unFail = api.onDownloadFailed((data: any) => {
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id === data.id) {
            return {
              ...item,
              status: 'failed',
              error: data.error,
              speed: 0,
            };
          }
          return item;
        })
      );
    });

    const unStop = api.onDownloadStopped((data: any) => {
      setTasks((prev) =>
        prev.map((item) => {
          if (item.id === data.id) {
            return {
              ...item,
              status: 'stopped',
              speed: 0,
            };
          }
          return item;
        })
      );
    });

    return () => {
      unProg();
      unAdded();
      unComp();
      unFail();
      unStop();
    };
  }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllFiltered = () => {
    const ids = new Set(filteredTasks.map((item) => item.id));
    setSelectedIds(ids);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleStop = async (id: string) => {
    await api.stopDownload(id);
    fetchTasks();
  };

  const handleRetry = async (id: string) => {
    await api.retryTask(id);
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    await api.deleteTask(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    fetchTasks();
  };

  const handleBatchRetry = async () => {
    if (selectedIds.size === 0) return;
    await api.retryTasks(Array.from(selectedIds));
    fetchTasks();
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    await api.deleteTasks(Array.from(selectedIds));
    setSelectedIds(new Set());
    fetchTasks();
  };

  const handleClearCompleted = async () => {
    const completedIds = tasks.filter((item) => item.status === 'completed').map((item) => item.id);
    if (completedIds.length === 0) return;
    await api.deleteTasks(completedIds);
    fetchTasks();
  };

  const handleOpenSaveDir = async () => {
    try {
      const res = await api.openSaveDir();
      if (res && res.path) {
        setSaveDirNotice(`Đã mở thư mục lưu: ${res.path}`);
        setTimeout(() => setSaveDirNotice(null), 5000);
      }
    } catch (e: any) {
      console.error('Lỗi khi mở thư mục lưu:', e);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '';
    const kb = bytesPerSec / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB/s`;
    return `${(kb / 1024).toFixed(1)} MB/s`;
  };

  const counts = {
    total: tasks.length,
    downloading: tasks.filter((item) => item.status === 'downloading' || item.status === 'pending').length,
    completed: tasks.filter((item) => item.status === 'completed').length,
    failed: tasks.filter((item) => item.status === 'failed' || item.status === 'stopped').length,
  };

  const filteredTasks = tasks.filter((item) => {
    if (filter === 'downloading') return item.status === 'downloading' || item.status === 'pending';
    if (filter === 'completed') return item.status === 'completed';
    if (filter === 'failed') return item.status === 'failed' || item.status === 'stopped';
    return true;
  });

  return (
    <div className="manager-container">
      {/* Thẻ thống kê */}
      <div className="stats-row">
        <div
          className={`stat-card ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <div className="stat-icon stat-total">
            <Film size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">{t.statAll}</span>
            <span className="stat-value">{counts.total}</span>
          </div>
        </div>

        <div
          className={`stat-card ${filter === 'downloading' ? 'active' : ''}`}
          onClick={() => setFilter('downloading')}
        >
          <div className="stat-icon stat-downloading">
            <Download size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">{t.statDownloading}</span>
            <span className="stat-value">{counts.downloading}</span>
          </div>
        </div>

        <div
          className={`stat-card ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          <div className="stat-icon stat-completed">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">{t.statCompleted}</span>
            <span className="stat-value">{counts.completed}</span>
          </div>
        </div>

        <div
          className={`stat-card ${filter === 'failed' ? 'active' : ''}`}
          onClick={() => setFilter('failed')}
        >
          <div className="stat-icon stat-failed">
            <AlertCircle size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">{t.statFailed}</span>
            <span className="stat-value">{counts.failed}</span>
          </div>
        </div>
      </div>

      {/* Thanh công cụ */}
      <div className="manager-toolbar">
        <div className="toolbar-left">
          <button
            className="btn-chip"
            onClick={
              selectedIds.size === filteredTasks.length && filteredTasks.length > 0
                ? handleDeselectAll
                : handleSelectAllFiltered
            }
          >
            {selectedIds.size === filteredTasks.length && filteredTasks.length > 0 ? (
              <>
                <CheckSquare size={14} />
                <span>{t.deselectAllCurrent}</span>
              </>
            ) : (
              <>
                <Square size={14} />
                <span>{t.selectAllCurrent}</span>
              </>
            )}
          </button>

          {selectedIds.size > 0 && (
            <>
              <button className="btn-chip btn-chip-primary" onClick={handleBatchRetry}>
                <RotateCcw size={14} />
                <span>
                  {t.retrySelected} ({selectedIds.size})
                </span>
              </button>
              <button className="btn-chip btn-chip-danger" onClick={handleBatchDelete}>
                <Trash2 size={14} />
                <span>
                  {t.deleteSelected} ({selectedIds.size})
                </span>
              </button>
            </>
          )}

          {counts.completed > 0 && (
            <button className="btn-chip" onClick={handleClearCompleted}>
              <Trash2 size={14} />
              <span>{t.clearCompleted}</span>
            </button>
          )}
        </div>

        <div className="toolbar-right flex items-center gap-2.5">
          {onNavigate && (
            <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={() => onNavigate('hongguo')}>
              <Film size={15} />
              <span>{t.goToDownload}</span>
            </button>
          )}
          <button
            className="btn btn-outline btn-sm flex items-center gap-1.5 text-amber-300 hover:text-amber-200 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 shadow-sm"
            onClick={handleOpenSaveDir}
            title="Truy cập thư mục lưu phim trên ổ đĩa"
          >
            <FolderOpen size={15} />
            <span>{t.openSaveDirBtn}</span>
          </button>
        </div>
      </div>

      {saveDirNotice && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs px-3.5 py-2.5 rounded-lg mb-3 flex items-center gap-2 shadow-xs transition-all">
          <FolderOpen size={16} className="text-blue-500 shrink-0" />
          <span className="font-medium">{saveDirNotice}</span>
        </div>
      )}

      {/* Danh sách nhiệm vụ */}
      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Download size={40} />
          </div>
          <h3>{t.emptyTitle}</h3>
          <p>{filter === 'all' ? t.emptyDescAll : t.emptyDescFiltered}</p>
          {onNavigate && (
            <button className="btn btn-primary" onClick={() => onNavigate('hongguo')}>
              {t.goToDownload}
            </button>
          )}
        </div>
      ) : (
        <div className="task-list">
          {filteredTasks.map((task) => {
            const isSelected = selectedIds.has(task.id);
            const isDownloading = task.status === 'downloading';
            const isPending = task.status === 'pending';
            const isCompleted = task.status === 'completed';
            const isFailed = task.status === 'failed';
            const isStopped = task.status === 'stopped';

            return (
              <div
                key={task.id}
                className={`task-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSelect(task.id)}
              >
                {/* Hộp kiểm */}
                <div
                  className="task-checkbox"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(task.id);
                  }}
                >
                  {isSelected ? (
                    <CheckSquare size={18} className="icon-checked" />
                  ) : (
                    <Square size={18} className="icon-unchecked" />
                  )}
                </div>

                {/* Ảnh bìa thu nhỏ */}
                <div className="task-cover">
                  {task.videoInfo?.cover ? (
                    <img
                      src={task.videoInfo.cover}
                      alt="cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Film size={24} />
                  )}
                  {isCompleted && task.type !== 'cover' && (
                    <button
                      type="button"
                      className="task-play-badge"
                      title={t.btnPlay}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTask(task);
                      }}
                    >
                      <Play size={12} />
                    </button>
                  )}
                </div>

                {/* Khu vực thông tin */}
                <div className="task-main flex-1 min-w-0">
                  <div className="task-header-row flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <h4 className="task-title truncate text-sm font-bold text-slate-100" title={task.title}>
                        {task.title}
                      </h4>
                      {task.type === 'cover' && (
                        <span className="badge badge-warning text-[10px] py-0.5 px-2 font-medium shrink-0 inline-flex">
                          Ảnh bìa
                        </span>
                      )}
                    </div>
                    <div className="task-status-tag shrink-0 inline-flex items-center">
                      {isDownloading && (
                        <span className="badge badge-info inline-flex items-center gap-1 shrink-0 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          {t.statusDownloading} {task.progress}%
                        </span>
                      )}
                      {isPending && (
                        <span className="badge badge-secondary inline-flex items-center gap-1 shrink-0 w-fit">
                          <Clock size={11} /> {t.statusPending}
                        </span>
                      )}
                      {isCompleted && (
                        <span className="badge badge-success inline-flex items-center gap-1 shrink-0 w-fit">
                          <CheckCircle2 size={11} /> {t.statusCompleted}
                        </span>
                      )}
                      {isFailed && (
                        <span
                          className="badge badge-danger inline-flex items-center gap-1 shrink-0 w-fit"
                          title={task.error}
                        >
                          <AlertCircle size={11} /> {t.statusFailed}
                        </span>
                      )}
                      {isStopped && (
                        <span className="badge badge-warning inline-flex items-center gap-1 shrink-0 w-fit">
                          {t.statusStopped}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="task-filename text-xs text-slate-500 truncate">
                    {task.filename}
                  </div>

                  {/* Thanh tiến độ */}
                  {(isDownloading || isPending) && (
                    <div className="task-progress-bar">
                      <div
                        className="task-progress-fill"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Dòng metadata */}
                  <div className="task-meta-row">
                    <span className="task-bytes">
                      {task.receivedBytes > 0 && `${formatSize(task.receivedBytes)} `}
                      {task.totalBytes > 0 && `/ ${formatSize(task.totalBytes)}`}
                    </span>
                    {task.speed !== undefined && task.speed > 0 && (
                      <span className="task-speed text-emerald-600 font-mono">
                        {formatSpeed(task.speed)}
                      </span>
                    )}
                    {task.error && (
                      <span className="task-error text-red-500 truncate" title={task.error}>
                        {task.error}
                      </span>
                    )}
                  </div>
                </div>

                {/* Các nút thao tác */}
                <div className="task-actions-group" onClick={(e) => e.stopPropagation()}>
                  {isDownloading && (
                    <button
                      className="task-action-btn task-action-btn-warning"
                      title={t.btnStop}
                      onClick={() => handleStop(task.id)}
                    >
                      <AlertCircle size={15} />
                      <span>{t.btnStop}</span>
                    </button>
                  )}

                  {(isFailed || isStopped) && (
                    <button
                      className="task-action-btn task-action-btn-secondary"
                      title={t.btnRetry}
                      onClick={() => handleRetry(task.id)}
                    >
                      <RotateCcw size={15} />
                      <span>{t.btnRetry}</span>
                    </button>
                  )}

                  {isCompleted && task.type !== 'cover' && (
                    <button
                      className="task-action-btn task-action-btn-play"
                      title={t.btnPlay}
                      onClick={() => setPreviewTask(task)}
                    >
                      <Play size={15} />
                      <span>{t.btnPlay}</span>
                    </button>
                  )}

                  <button
                    className="task-action-btn-delete"
                    title={t.btnDelete}
                    onClick={() => handleDelete(task.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Modal */}
      {previewTask && (
        <VideoPlayerModal
          vid={previewTask.hongguoInfo?.vid || previewTask.id}
          title={previewTask.title}
          seriesTitle={previewTask.hongguoInfo?.series_title || 'Hongguo'}
          streamUrl={
            previewTask.hongguoInfo?.vid
              ? api.getStreamUrl(previewTask.hongguoInfo.vid)
              : api.getDownloadFileUrl(previewTask.id)
          }
          downloadUrl={api.getDownloadFileUrl(previewTask.id)}
          onClose={() => setPreviewTask(null)}
        />
      )}
    </div>
  );
}
