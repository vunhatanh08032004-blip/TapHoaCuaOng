import fs from 'fs';
import path from 'path';
import axios from 'axios';
import {
  fetchPlayUrlSingle,
  deriveKey,
  decryptMp4File,
  UA,
  VIDEO_REFERER,
  Episode,
} from './hongguo.ts';
import {
  Task,
  getSettings,
  getTasks,
  saveTasks,
  saveSettings,
  Settings,
} from './store.ts';

export const APP_VERSION = '1.0.0';
export const APP_TITLE = 'Tạp Hóa Của Ong';
export const APP_NAME = 'Trình tải phim ngắn Hồng Quả';
export const OFFICIAL_WEBSITE = '';

interface SseClient {
  res: any;
  userId?: string;
}

let downloadTasks: Task[] = [];
let downloadQueue: Task[] = [];
let activeDownloads = 0;
let sseClients: SseClient[] = [];

// Track cancellation tokens and active streams per task ID
const activeSources = new Map<string, any>();
const activeWriters = new Map<string, fs.WriteStream>();

// Track live progress speed calculation
const speedTracker = new Map<string, { lastBytes: number; lastTime: number }>();

export function addSseClient(res: any, userId?: string) {
  sseClients.push({ res, userId });
  res.on('close', () => {
    sseClients = sseClients.filter((c) => c.res !== res);
  });
}

export function broadcastEvent(event: string, data: any, targetUserId?: string) {
  let recipient = targetUserId;
  if (!recipient && data && typeof data === 'object') {
    if (data.userId) {
      recipient = data.userId;
    } else if (data.id) {
      const task = downloadTasks.find((t) => t.id === data.id);
      if (task?.userId) {
        recipient = task.userId;
      }
    }
  }

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    // Chỉ gửi sự kiện cho client sở hữu tác vụ này để cách ly hoàn toàn
    if (recipient && client.userId && client.userId !== recipient) {
      continue;
    }
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  }
}

export function sanitizeFolderName(name: string): string {
  return String(name || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 80) || '';
}

export function renderName(
  format: string,
  seriesTitle: string,
  vidIndex: number,
  epTitle: string
): string {
  const fmt = String(format || 'TênPhim_TậpN').trim();
  const cleanTitle = sanitizeFolderName(seriesTitle) || 'phim_hong_qua';
  const paddedIndex = String(vidIndex).padStart(3, '0');
  const cleanEpTitle = String(epTitle || '').trim();

  let name = fmt
    .replace(/\{?series_title\}?/gi, cleanTitle)
    .replace(/\{?vid_index\}?/gi, paddedIndex)
    .replace(/\{?ep_title\}?/gi, cleanEpTitle)
    .replace(/TênPhim/g, cleanTitle)
    .replace(/TậpN|Tập/g, paddedIndex)
    .replace(/TiêuĐề/g, cleanEpTitle)
    .replace(/剧名/g, cleanTitle)
    .replace(/集数/g, paddedIndex)
    .replace(/标题/g, cleanEpTitle);

  name = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim();
  return (name || `${cleanTitle}_${paddedIndex}`) + '.mp4';
}

export function formatCoverFilename(seriesTitle: string, format: string): string {
  const fmt = String(format || 'TênPhim_TậpN').trim();
  const cleanTitle = sanitizeFolderName(seriesTitle) || 'phim_hong_qua';

  let name = fmt
    .replace(/\{?series_title\}?/gi, cleanTitle)
    .replace(/\{?vid_index\}?/gi, 'Ảnh_bìa')
    .replace(/\{?ep_title\}?/gi, '')
    .replace(/TênPhim/g, cleanTitle)
    .replace(/TậpN|Tập/g, 'Ảnh_bìa')
    .replace(/TiêuĐề/g, '')
    .replace(/剧名/g, cleanTitle)
    .replace(/集数/g, 'Ảnh_bìa')
    .replace(/标题/g, '');

  name = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim();

  // Đảm bảo tên file luôn chứa nhận diện 'Ảnh_bìa'
  if (!name.toLowerCase().includes('bìa') && !name.toLowerCase().includes('bia') && !name.toLowerCase().includes('cover')) {
    name = `${name}_Ảnh_bìa`;
  }

  name = name.replace(/_+/g, '_').replace(/^_+|_+$/g, '').trim();
  return (name || `${cleanTitle}_Ảnh_bìa`) + '.jpg';
}

export function initTasks(): void {
  const saved = getTasks();
  downloadTasks = saved.map((task) => {
    const inProgress = task.status === 'downloading' || task.status === 'pending';
    return {
      ...task,
      status: inProgress ? 'failed' : task.status,
      error: inProgress ? '服务重启导致任务中断' : task.error,
    };
  });
}

export function getSortedTasks(userId?: string): Task[] {
  const STATUS_ORDER: Record<string, number> = {
    downloading: 0,
    pending: 1,
    failed: 2,
    stopped: 3,
    completed: 4,
  };

  const tasks = userId
    ? downloadTasks.filter((t) => (t.userId || 'admin_1') === userId)
    : downloadTasks;

  return tasks.slice().sort((a, b) => {
    const wa = STATUS_ORDER[a.status] ?? 99;
    const wb = STATUS_ORDER[b.status] ?? 99;
    if (wa !== wb) return wa - wb;
    if (wa <= 1) {
      return (
        (a.hongguoInfo?.vid_index || 0) - (b.hongguoInfo?.vid_index || 0) ||
        (a.startTime || 0) - (b.startTime || 0)
      );
    }
    return (b.endTime || b.startTime || 0) - (a.endTime || a.startTime || 0);
  });
}

export function queueBatchDownload(
  seriesId: string,
  seriesTitle: string,
  episodes: Episode[],
  coverUrl?: string,
  userId: string = 'admin_1'
) {
  const settings = getSettings();
  const isWin = process.platform === 'win32';
  let root = settings.root;

  if (!root || (!isWin && /^[a-zA-Z]:/i.test(root))) {
    root = isWin ? 'D:\\' : path.join(process.cwd(), 'downloads');
  }

  const seriesFolder = sanitizeFolderName(seriesTitle) || 'phim_hong_qua';
  // Tách thư mục lưu theo người dùng để tránh ghi đè lẫn nhau
  const userSubDir = userId === 'admin_1' ? '' : sanitizeFolderName(userId);
  let downloadDir = isWin
    ? (userSubDir
        ? path.win32.join(root, 'Hồng Quả', userSubDir, seriesFolder)
        : path.win32.join(root, 'Hồng Quả', seriesFolder))
    : (userSubDir
        ? path.join(root, 'Hồng Quả', userSubDir, seriesFolder)
        : path.join(root, 'Hồng Quả', seriesFolder));

  try {
    fs.mkdirSync(downloadDir, { recursive: true });
  } catch (err: any) {
    console.warn(`[Downloader] Không thể tạo thư mục ${downloadDir}, chuyển sang thư mục dự phòng:`, err.message);
    root = path.join(process.cwd(), 'downloads');
    downloadDir = userSubDir
      ? path.join(root, 'Hồng Quả', userSubDir, seriesFolder)
      : path.join(root, 'Hồng Quả', seriesFolder);
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const addedTasks: Task[] = [];

  // Tải ảnh bìa của bộ phim (nếu người dùng có chọn lưu cùng các tập)
  let validCover: string | null = null;
  if (coverUrl && typeof coverUrl === 'string') {
    let clean = coverUrl.trim();
    if (clean.startsWith('//')) clean = 'https:' + clean;
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      validCover = clean;
    }
  }

  if (validCover) {
    const existingCover = downloadTasks.find(
      (t) =>
        t.type === 'cover' &&
        (t.userId || 'admin_1') === userId &&
        t.hongguoInfo?.series_id === String(seriesId)
    );

    if (existingCover) {
      if (existingCover.status === 'failed' || existingCover.status === 'stopped') {
        existingCover.status = 'pending';
        existingCover.progress = 0;
        existingCover.error = undefined;
        existingCover.startTime = Date.now();
        if (existingCover.videoInfo) {
          existingCover.videoInfo.cover = validCover;
        }
        downloadQueue.unshift(existingCover);
        addedTasks.push(existingCover);
        broadcastEvent('download-task-updated', existingCover, userId);
      }
    } else {
      const coverFilename = formatCoverFilename(seriesTitle, settings.name_format);
      const coverSavePath = path.join(downloadDir, coverFilename);
      const coverTask: Task = {
        id: `cover_${seriesId}_${userId}_${Date.now()}`,
        userId,
        type: 'cover',
        title: `《${seriesTitle}》- Ảnh bìa`,
        filename: coverFilename,
        savePath: coverSavePath,
        customDir: downloadDir,
        status: 'pending',
        progress: 0,
        receivedBytes: 0,
        totalBytes: 0,
        startTime: Date.now(),
        hongguoInfo: {
          vid: 'cover',
          vid_index: 0,
          title: 'Ảnh bìa',
          series_id: String(seriesId),
          series_title: seriesTitle,
        },
        videoInfo: {
          cover: validCover,
          series_title: seriesTitle,
        },
      };

      downloadTasks.unshift(coverTask);
      downloadQueue.unshift(coverTask);
      addedTasks.push(coverTask);
      broadcastEvent('download-task-added', coverTask, userId);
    }
  }

  for (const ep of episodes) {
    const existing = downloadTasks.find(
      (t) =>
        (t.userId || 'admin_1') === userId &&
        t.hongguoInfo &&
        t.hongguoInfo.series_id === String(seriesId) &&
        t.hongguoInfo.vid === String(ep.vid) &&
        (t.status === 'downloading' || t.status === 'pending' || t.status === 'completed')
    );

    if (existing) continue;

    const filename = renderName(
      settings.name_format || '剧名 集数',
      seriesTitle,
      ep.vid_index,
      ep.title
    );
    const savePath = path.join(downloadDir, filename);

    const task: Task = {
      id: `${seriesId}_${ep.vid}_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      type: 'hongguo',
      title: `《${seriesTitle}》Tập ${ep.vid_index} ${ep.title ? '- ' + ep.title : ''}`,
      filename,
      savePath,
      customDir: downloadDir,
      status: 'pending',
      progress: 0,
      receivedBytes: 0,
      totalBytes: 0,
      startTime: Date.now(),
      hongguoInfo: {
        vid: String(ep.vid),
        vid_index: ep.vid_index,
        title: ep.title,
        series_id: String(seriesId),
        series_title: seriesTitle,
      },
      videoInfo: {
        cover: ep.cover,
        series_title: seriesTitle,
      },
    };

    downloadTasks.push(task);
    downloadQueue.push(task);
    addedTasks.push(task);
    broadcastEvent('download-task-added', task, userId);
  }

  saveTasks(downloadTasks);
  processDownloadQueue();

  return { success: true, count: addedTasks.length };
}

export async function processDownloadQueue() {
  const settings = getSettings();
  const maxConcurrent = settings.max_concurrent || 3;

  if (activeDownloads >= maxConcurrent || downloadQueue.length === 0) return;

  const task = downloadQueue.shift();
  if (!task) return;

  activeDownloads++;
  const workerPromise = task.type === 'cover' ? executeCoverDownload(task) : executeHongguoDownload(task);
  workerPromise
    .catch((err) => console.error('[Download Worker Error]:', err))
    .finally(() => {
      activeDownloads--;
      processDownloadQueue();
    });
}

async function executeCoverDownload(task: Task) {
  const { id, savePath, videoInfo, filename } = task;
  const coverUrl = videoInfo?.cover;
  if (!coverUrl) {
    task.status = 'failed';
    task.error = 'Không có liên kết ảnh bìa';
    saveTasks(downloadTasks);
    return;
  }

  try {
    task.status = 'downloading';
    task.progress = 30;
    broadcastEvent('download-progress', {
      id,
      progress: 30,
      receivedBytes: 0,
      totalBytes: 0,
      speed: 0,
    });

    const response = await axios({
      method: 'GET',
      url: coverUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': UA,
        'Referer': 'https://novelquickapp.com/',
      },
      timeout: 30000,
    });

    fs.mkdirSync(path.dirname(savePath!), { recursive: true });
    fs.writeFileSync(savePath!, Buffer.from(response.data));

    const totalBytes = response.data.byteLength || response.data.length || 1024;
    task.status = 'completed';
    task.progress = 100;
    task.receivedBytes = totalBytes;
    task.totalBytes = totalBytes;
    task.speed = 0;
    task.endTime = Date.now();
    saveTasks(downloadTasks);
    broadcastEvent('download-completed', { id, path: savePath, filename });
  } catch (error: any) {
    console.error('[Cover] Tải ảnh bìa thất bại:', error.message);
    task.status = 'failed';
    task.error = 'Lỗi tải ảnh bìa: ' + error.message;
    saveTasks(downloadTasks);
    broadcastEvent('download-failed', { id, error: task.error });
  }
}

async function executeHongguoDownload(task: Task) {
  const { id, hongguoInfo, filename } = task;
  const { vid, series_title, vid_index } = hongguoInfo || {};

  try {
    console.log(`[Hongguo] 开始下载《${series_title}》第${vid_index}集: ${vid}`);
    task.status = 'downloading';
    task.progress = 0;
    task.speed = 0;
    broadcastEvent('download-progress', {
      id,
      progress: 0,
      receivedBytes: 0,
      totalBytes: 0,
      speed: 0,
    });

    // 1. 获取播放直链与 spade_a 加密信息
    const playInfo = await fetchPlayUrlSingle(String(vid));
    if (!playInfo || !playInfo.url) {
      throw new Error('未获取到有效播放地址');
    }

    // 2. 准备路径
    const finalPath = task.savePath!;
    const downloadDir = path.dirname(finalPath);
    fs.mkdirSync(downloadDir, { recursive: true });

    // 如果目标文件已存在且完整，直接标记成功
    if (fs.existsSync(finalPath) && fs.statSync(finalPath).size > 1024 * 100) {
      console.log('[Hongguo] 目标文件已存在，直接完成:', finalPath);
      task.status = 'completed';
      task.progress = 100;
      task.receivedBytes = fs.statSync(finalPath).size;
      task.totalBytes = task.receivedBytes;
      task.endTime = Date.now();
      saveTasks(downloadTasks);
      broadcastEvent('download-completed', { id, path: finalPath, filename });
      return;
    }

    const tmpPath = finalPath + '.enc.tmp';

    // 3. HTTP 流式下载
    const cancelTokenSource = axios.CancelToken.source();
    activeSources.set(id, cancelTokenSource);

    let headers: Record<string, string> = { 'User-Agent': UA };
    let response: any;
    try {
      response = await axios({
        method: 'GET',
        url: playInfo.url,
        responseType: 'stream',
        headers,
        timeout: 60000,
        cancelToken: cancelTokenSource.token,
      });
    } catch (err: any) {
      if (err.response && err.response.status === 403) {
        headers['Referer'] = VIDEO_REFERER;
        response = await axios({
          method: 'GET',
          url: playInfo.url,
          responseType: 'stream',
          headers,
          timeout: 60000,
          cancelToken: cancelTokenSource.token,
        });
      } else {
        throw err;
      }
    }

    const totalLength = parseInt(response.headers['content-length'], 10) || 0;
    task.totalBytes = totalLength;

    const writer = fs.createWriteStream(tmpPath);
    activeWriters.set(id, writer);

    let received = 0;
    let lastTime = Date.now();
    let lastBytes = 0;

    response.data.on('data', (chunk: Buffer) => {
      received += chunk.length;
      task.receivedBytes = received;
      const progress = totalLength ? Math.floor((received / totalLength) * 100) : 0;
      task.progress = progress;

      // Speed calculation
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      if (elapsed >= 0.5) {
        const bytesDiff = received - lastBytes;
        task.speed = Math.round(bytesDiff / elapsed);
        lastTime = now;
        lastBytes = received;

        broadcastEvent('download-progress', {
          id,
          progress,
          receivedBytes: received,
          totalBytes: totalLength,
          speed: task.speed,
        });
      }
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    activeSources.delete(id);
    activeWriters.delete(id);

    if (task.cancelled) {
      if (fs.existsSync(tmpPath)) {
        try {
          fs.unlinkSync(tmpPath);
        } catch {}
      }
      task.status = 'stopped';
      task.endTime = Date.now();
      saveTasks(downloadTasks);
      broadcastEvent('download-stopped', { id });
      return;
    }

    // 4. 原生 CENC-AES-CTR 解密
    if (playInfo.spadeA) {
      console.log('[Hongguo] 正在派生 AES Key 并原生流式解密 MP4...');
      const key = deriveKey(playInfo.spadeA);
      if (!key) {
        throw new Error('Key 派生失败');
      }
      decryptMp4File(tmpPath, finalPath, key);
      try {
        fs.unlinkSync(tmpPath);
      } catch {}
    } else {
      fs.renameSync(tmpPath, finalPath);
    }

    task.status = 'completed';
    task.progress = 100;
    task.speed = 0;
    task.endTime = Date.now();
    saveTasks(downloadTasks);

    console.log('[Hongguo] 下载与解密成功完成:', finalPath);
    broadcastEvent('download-completed', { id, path: finalPath, filename });
  } catch (error: any) {
    console.error('[Hongguo] 下载失败:', error.message);
    activeSources.delete(id);
    activeWriters.delete(id);

    task.status = 'failed';
    task.error = error.message;
    task.speed = 0;
    saveTasks(downloadTasks);
    broadcastEvent('download-failed', { id, error: error.message });
  }
}

export function stopTask(taskId: string, userId?: string): boolean {
  const task = downloadTasks.find(
    (t) => t.id === taskId && (!userId || (t.userId || 'admin_1') === userId)
  );
  if (!task) return false;

  task.cancelled = true;
  const source = activeSources.get(taskId);
  if (source) {
    try {
      source.cancel('用户停止下载');
    } catch {}
    activeSources.delete(taskId);
  }

  const writer = activeWriters.get(taskId);
  if (writer) {
    try {
      writer.end();
    } catch {}
    activeWriters.delete(taskId);
  }

  task.status = 'stopped';
  task.endTime = Date.now();
  saveTasks(downloadTasks);
  broadcastEvent('download-stopped', { id: taskId, path: task.savePath }, task.userId);
  return true;
}

export function retryTask(taskId: string, userId?: string): boolean {
  const task = downloadTasks.find(
    (t) => t.id === taskId && (!userId || (t.userId || 'admin_1') === userId)
  );
  if (!task) return false;

  if (task.savePath && fs.existsSync(task.savePath)) {
    try {
      fs.unlinkSync(task.savePath);
    } catch {}
  }
  const tmpPath = task.savePath + '.enc.tmp';
  if (fs.existsSync(tmpPath)) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {}
  }

  task.status = 'pending';
  task.progress = 0;
  task.receivedBytes = 0;
  task.totalBytes = 0;
  task.speed = 0;
  task.cancelled = false;
  delete task.error;

  if (!downloadQueue.some((t) => t.id === taskId)) {
    downloadQueue.push(task);
  }

  saveTasks(downloadTasks);
  processDownloadQueue();
  return true;
}

export function deleteTask(taskId: string, userId?: string): boolean {
  const index = downloadTasks.findIndex(
    (t) => t.id === taskId && (!userId || (t.userId || 'admin_1') === userId)
  );
  if (index === -1) return false;

  const task = downloadTasks[index];
  if (task.status === 'downloading') {
    stopTask(taskId, userId);
  }

  downloadTasks.splice(index, 1);
  const qIndex = downloadQueue.findIndex((t) => t.id === taskId);
  if (qIndex !== -1) downloadQueue.splice(qIndex, 1);

  saveTasks(downloadTasks);
  return true;
}

export function deleteTasks(taskIds: string[], userId?: string): number {
  let count = 0;
  for (const id of taskIds) {
    if (deleteTask(id, userId)) count++;
  }
  return count;
}

export function retryTasks(taskIds: string[], userId?: string): number {
  let count = 0;
  for (const id of taskIds) {
    const task = downloadTasks.find(
      (t) => t.id === id && (!userId || (t.userId || 'admin_1') === userId)
    );
    if (task && (task.status === 'failed' || task.status === 'stopped')) {
      if (retryTask(id, userId)) count++;
    }
  }
  return count;
}

export function clearCompletedTasks(userId?: string): number {
  const toDelete = downloadTasks.filter(
    (t) =>
      (!userId || (t.userId || 'admin_1') === userId) &&
      (t.status === 'completed' || t.status === 'failed' || t.status === 'stopped')
  );
  for (const task of toDelete) {
    deleteTask(task.id, userId);
  }
  return toDelete.length;
}

export function getTaskById(taskId: string, userId?: string): Task | undefined {
  return downloadTasks.find(
    (t) => t.id === taskId && (!userId || (t.userId || 'admin_1') === userId)
  );
}
