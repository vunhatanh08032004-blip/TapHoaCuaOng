import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import axios from 'axios';
import {
  resolveSeriesId,
  fetchEpisodeList,
  fetchPlayUrlSingle,
  deriveKey,
  decryptMp4File,
  UA,
  VIDEO_REFERER,
} from './server/hongguo.ts';
import {
  APP_VERSION,
  APP_TITLE,
  APP_NAME,
  OFFICIAL_WEBSITE,
  initTasks,
  getSortedTasks,
  queueBatchDownload,
  stopTask,
  retryTask,
  retryTasks,
  deleteTask,
  deleteTasks,
  clearCompletedTasks,
  addSseClient,
  getTaskById,
  formatCoverFilename,
} from './server/downloader.ts';
import { getSettings, saveSettings } from './server/store.ts';
import {
  loginUser,
  getUserFromToken,
  invalidateToken,
  checkDownloadPermission,
  recordUserDownload,
  sanitizeUser,
  listAllUsersForAdmin,
  createUserForAdmin,
  deleteUserForAdmin,
  resetUserQuotasForAdmin,
  updateUserForAdmin,
  generateRandomUsername,
} from './server/auth.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to extract user from request
function getAuthUser(req: express.Request) {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  return token ? getUserFromToken(token) : null;
}

// ===== AUTH API ROUTES =====

// Đăng nhập
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập tài khoản và mật khẩu!' });
  }

  const result = loginUser(username, password);
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.json(result);
});

// Lấy thông tin tài khoản hiện tại & hạn mức
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
  }
  res.json({ success: true, user: sanitizeUser(user) });
});

// Đăng xuất
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  if (token) {
    invalidateToken(token);
  }
  res.json({ success: true });
});

// ===== ADMIN API ROUTES =====

// Lấy danh sách tất cả tài khoản
app.get('/api/admin/users', (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên mới có quyền truy cập!' });
  }
  const users = listAllUsersForAdmin();
  res.json({ success: true, users });
});

// Tạo tài khoản mới (tùy chỉnh hoặc tự động sinh ngẫu nhiên 6 ký tự)
app.post('/api/admin/users/create', (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên mới có quyền truy cập!' });
  }
  const { username, password, role, name, hours, maxSeries, maxEpisodesPerSeries } = req.body;
  const result = createUserForAdmin({
    username,
    password,
    role,
    name,
    hours: hours ? Number(hours) : undefined,
    maxSeries: maxSeries !== undefined ? Number(maxSeries) : undefined,
    maxEpisodesPerSeries: maxEpisodesPerSeries !== undefined ? Number(maxEpisodesPerSeries) : undefined,
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Xóa tài khoản
app.delete('/api/admin/users/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên mới có quyền truy cập!' });
  }
  const result = deleteUserForAdmin(req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Cập nhật thông tin chi tiết tài khoản
app.post('/api/admin/users/:id/update', (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên mới có quyền truy cập!' });
  }
  const { password, role, resetDownloads, addHours, hours, maxSeries, maxEpisodesPerSeries } = req.body;
  const result = updateUserForAdmin(req.params.id, {
    password,
    role,
    resetDownloads: !!resetDownloads,
    addHours: addHours !== undefined ? Number(addHours) : undefined,
    hours: hours !== undefined ? Number(hours) : undefined,
    maxSeries: maxSeries !== undefined ? Number(maxSeries) : undefined,
    maxEpisodesPerSeries:
      maxEpisodesPerSeries === null || maxEpisodesPerSeries === undefined
        ? maxEpisodesPerSeries
        : Number(maxEpisodesPerSeries),
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Gia hạn / Reset quota cho tài khoản
app.post('/api/admin/users/:id/reset', (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên mới có quyền truy cập!' });
  }
  const { resetDownloads, addHours, setMaxSeries } = req.body;
  const result = resetUserQuotasForAdmin(req.params.id, {
    resetDownloads: !!resetDownloads,
    addHours: addHours ? Number(addHours) : undefined,
    setMaxSeries: setMaxSeries ? Number(setMaxSeries) : undefined,
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// 初始化已保存的任务
initTasks();

// ===== API 路由 =====

// 应用信息与官方更新链接
app.get('/api/app-info', (req, res) => {
  res.json({
    version: APP_VERSION,
    brand: APP_TITLE,
    appName: APP_NAME,
    official_website: OFFICIAL_WEBSITE,
  });
});

// 预置可供一键体验的短剧示例
app.get('/api/hongguo/presets', (req, res) => {
  res.json([
    {
      id: '7664958856774044697',
      title: '家父渊天尊第二季',
      total: 168,
      tag: '🔥 热门玄幻热播 (168 Tập)',
      shareUrl: '7664958856774044697',
    },
    {
      id: '7650820508048444441',
      title: '年上他又争又抢',
      total: 22,
      tag: '⭐ 都市甜宠言情 (22 Tập)',
      shareUrl: '7650820508048444441',
    },
  ]);
});

// 解析短剧链接或 ID
app.post('/api/hongguo/resolve', async (req, res) => {
  const { input } = req.body;
  if (!input || !String(input).trim()) {
    return res.status(400).json({ success: false, error: '请输入红果短剧分享链接或 ID' });
  }

  try {
    const seriesId = await resolveSeriesId(input);
    const data = await fetchEpisodeList(seriesId);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] 解析短剧失败:', error.message);
    res.status(500).json({ success: false, error: error.message || '解析失败，请检查链接或网络' });
  }
});

// 获取单集播放直链与密钥状态
app.post('/api/hongguo/play-info', async (req, res) => {
  const { vid } = req.body;
  if (!vid) {
    return res.status(400).json({ success: false, error: '缺少 vid' });
  }

  try {
    const playInfo = await fetchPlayUrlSingle(String(vid));
    res.json({ success: true, data: playInfo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 在线解密预览播放流 (带 HTTP Range 206 支持)
app.get('/api/hongguo/stream/:vid', async (req, res) => {
  const { vid } = req.params;
  if (!vid) return res.status(400).send('Missing vid');

  try {
    const cacheDir = path.join(process.cwd(), 'data', 'preview_cache');
    fs.mkdirSync(cacheDir, { recursive: true });
    const cachedFile = path.join(cacheDir, `${vid}.mp4`);

    // 检查缓存或已下载的完整文件
    let targetPath = cachedFile;
    if (!fs.existsSync(cachedFile) || fs.statSync(cachedFile).size < 10240) {
      // 从接口获取并解密生成
      const playInfo = await fetchPlayUrlSingle(vid);
      if (!playInfo || !playInfo.url) {
        return res.status(404).send('未找到有效播放地址');
      }

      const tmpPath = cachedFile + '.enc.tmp';
      let headers: Record<string, string> = { 'User-Agent': UA };
      let response: any;
      try {
        response = await axios({
          method: 'GET',
          url: playInfo.url,
          responseType: 'stream',
          headers,
          timeout: 45000,
        });
      } catch (err: any) {
        if (err.response?.status === 403) {
          headers['Referer'] = VIDEO_REFERER;
          response = await axios({
            method: 'GET',
            url: playInfo.url,
            responseType: 'stream',
            headers,
            timeout: 45000,
          });
        } else {
          throw err;
        }
      }

      const writer = fs.createWriteStream(tmpPath);
      response.data.pipe(writer);
      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });

      if (playInfo.spadeA) {
        const key = deriveKey(playInfo.spadeA);
        if (!key) throw new Error('Key 派生失败');
        decryptMp4File(tmpPath, cachedFile, key);
        try {
          fs.unlinkSync(tmpPath);
        } catch {}
      } else {
        fs.renameSync(tmpPath, cachedFile);
      }
    }

    // 支持 HTTP Range 范围请求以流畅拖拽进度条
    const stat = fs.statSync(targetPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(targetPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      };
      res.writeHead(200, head);
      fs.createReadStream(targetPath).pipe(res);
    }
  } catch (err: any) {
    console.error('[Stream] 播放流错误:', err.message);
    res.status(500).send('播放失败: ' + err.message);
  }
});

// 批量添加下载任务
app.post('/api/hongguo/download-batch', (req, res) => {
  const { seriesId, seriesTitle, episodes, coverUrl } = req.body;
  const eps = Array.isArray(episodes) ? episodes : [];
  if (!seriesId || (eps.length === 0 && !coverUrl)) {
    return res.status(400).json({ success: false, error: 'Vui lòng chọn ít nhất một tập phim hoặc ảnh bìa' });
  }

  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập tài khoản để thực hiện tải phim!' });
  }

  // Check download limits for this user
  const perm = checkDownloadPermission(user, seriesId, eps.length);
  if (!perm.allowed) {
    return res.status(403).json({ success: false, error: perm.error });
  }

  const result = queueBatchDownload(seriesId, seriesTitle, eps, coverUrl, user.id);
  if (result.success) {
    recordUserDownload(user, seriesId, eps.length);
  }

  res.json({
    ...result,
    user: sanitizeUser(user),
  });
});

// Tải ảnh bìa trực tiếp về máy tính người dùng (giữ nguyên quy tắc đặt tên file theo cài đặt)
app.get('/api/hongguo/download-cover-image', async (req, res) => {
  try {
    const { url, seriesTitle, filename } = req.query as {
      url?: string;
      seriesTitle?: string;
      filename?: string;
    };

    if (!url) {
      return res.status(400).send('Thiếu URL ảnh bìa');
    }

    const settings = getSettings();
    const finalFilename =
      filename ||
      formatCoverFilename(seriesTitle || 'Hongguo', settings.name_format);

    const response = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': UA,
        'Referer': 'https://novelquickapp.com/',
      },
      timeout: 30000,
    });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(finalFilename)}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`
    );
    res.send(Buffer.from(response.data));
  } catch (err: any) {
    console.error('[Download Cover Endpoint Error]', err.message);
    res.status(500).send('Không thể tải ảnh bìa: ' + err.message);
  }
});

// Lấy danh sách nhiệm vụ tải riêng biệt cho từng tài khoản
app.get('/api/tasks', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
  }
  res.json(getSortedTasks(user.id));
});

// SSE 实时下载进度事件订阅 - Cách ly luồng sự kiện theo từng tài khoản
app.get('/api/tasks/events', (req, res) => {
  const token = (req.query.token as string) || '';
  const user = token ? getUserFromToken(token) : getAuthUser(req);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write('event: connected\ndata: {}\n\n');
  addSseClient(res, user?.id);
});

// 停止单任务
app.post('/api/tasks/:id/stop', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
  const ok = stopTask(req.params.id, user.id);
  res.json({ success: ok });
});

// 重试单任务
app.post('/api/tasks/:id/retry', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
  const ok = retryTask(req.params.id, user.id);
  res.json({ success: ok });
});

// 批量重试任务
app.post('/api/tasks/retry-batch', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
  const { ids } = req.body;
  const count = retryTasks(Array.isArray(ids) ? ids : [], user.id);
  res.json({ success: true, count });
});

// 删除单任务
app.delete('/api/tasks/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
  const ok = deleteTask(req.params.id, user.id);
  res.json({ success: ok });
});

// 批量删除任务
app.post('/api/tasks/delete-batch', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
  const { ids } = req.body;
  const count = deleteTasks(Array.isArray(ids) ? ids : [], user.id);
  res.json({ success: true, count });
});

// Xóa tất cả các tác vụ đã hoàn thành của người dùng này
app.post('/api/tasks/clear-completed', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
  const count = clearCompletedTasks(user.id);
  res.json({ success: true, count });
});

function resolveActualFilePath(savePath?: string, filename?: string): string | null {
  if (!savePath) return null;
  if (fs.existsSync(savePath)) return savePath;

  // If saved with Windows drive letter on a non-Windows OS (e.g. D:\Hồng Quả\...)
  const stripped = savePath.replace(/^[a-zA-Z]:[\\/]+/, '').replace(/^\\+/, '');
  const candidate1 = path.join(process.cwd(), 'downloads', stripped);
  if (fs.existsSync(candidate1)) return candidate1;

  if (filename) {
    const candidate2 = path.join(process.cwd(), 'downloads', 'Hồng Quả', filename);
    if (fs.existsSync(candidate2)) return candidate2;
  }
  return null;
}

// 浏览器直接下载已完成解密的 MP4 文件到本地
app.get('/api/tasks/:id/download-file', (req, res) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    return res.status(404).send('Không tìm thấy tác vụ tải');
  }

  const actualPath = resolveActualFilePath(task.savePath, task.filename);
  if (!actualPath) {
    return res.status(404).send('Tệp chưa hoàn tất tải xuống hoặc không tồn tại trên đĩa');
  }

  const filename = task.filename || path.basename(actualPath);
  res.download(actualPath, filename);
});

// Mở thư mục lưu phim trên máy tính / ổ đĩa
app.post('/api/open-save-dir', (req, res) => {
  try {
    const settings = getSettings();
    const isWin = process.platform === 'win32';
    let root = settings.root;

    if (!root || (!isWin && /^[a-zA-Z]:/i.test(root))) {
      root = isWin ? 'D:\\' : path.join(process.cwd(), 'downloads');
    }

    let targetDir = path.join(root, 'Hồng Quả');

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    } catch {
      targetDir = path.join(process.cwd(), 'downloads', 'Hồng Quả');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }

    try {
      if (isWin) {
        const winPath = targetDir.replace(/\//g, '\\');
        exec(`explorer.exe "${winPath}"`, { timeout: 3000 }, () => {});
      } else if (process.platform === 'darwin') {
        exec(`open "${targetDir}"`, { timeout: 3000 }, () => {});
      } else if (process.env.DISPLAY) {
        exec(`xdg-open "${targetDir}"`, { timeout: 3000 }, () => {});
      }
    } catch (e: any) {
      console.warn('[Open Save Dir Error]', e.message);
    }

    res.json({ success: true, path: targetDir });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 设置
app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

app.post('/api/settings', (req, res) => {
  saveSettings(req.body);
  res.json({ success: true, settings: getSettings() });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ===== Vite 中间件与静态托管 =====
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const candidatePaths = [
      path.join(process.cwd(), 'dist'),
      path.join(__dirname, 'dist'),
      __dirname,
    ];
    const distPath = candidatePaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || candidatePaths[0];

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hongguo Downloader server running on http://0.0.0.0:${PORT}`);
  });
}

start();
