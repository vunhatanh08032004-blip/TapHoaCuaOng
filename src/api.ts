import { AppInfo, SeriesData, Task, Settings, PresetSeries, UserProfile, LoginResponse } from './types.ts';

type Listener = (data: any) => void;

async function safeJson(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return { success: false, error: 'Phản hồi từ máy chủ không đúng định dạng JSON' };
    }
  }
  if (res.status === 401) {
    return { success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn' };
  }
  if (res.status === 403) {
    return { success: false, error: 'Chỉ Quản trị viên mới có quyền truy cập!' };
  }
  return { success: false, error: `Máy chủ phản hồi trạng thái: ${res.status}` };
}

class ApiClient {
  private listeners: { [event: string]: Set<Listener> } = {};
  private eventSource: EventSource | null = null;
  private sseConnected = false;
  private tokenKey = 'ong_auth_token';

  constructor() {
    this.initSse();
  }

  getToken(): string {
    try {
      return localStorage.getItem(this.tokenKey) || '';
    } catch {
      return '';
    }
  }

  setToken(token: string): void {
    try {
      if (token) {
        localStorage.setItem(this.tokenKey, token);
      } else {
        localStorage.removeItem(this.tokenKey);
      }
    } catch {}
    this.initSse();
  }

  clearToken(): void {
    try {
      localStorage.removeItem(this.tokenKey);
    } catch {}
    this.initSse();
  }

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data: LoginResponse = await safeJson(res);
    if (data.success && data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch {}
    this.clearToken();
  }

  async getMe(): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const token = this.getToken();
    if (!token) return { success: false, error: 'Chưa đăng nhập' };

    try {
      const res = await fetch('/api/auth/me', {
        headers: this.getAuthHeaders(),
      });
      if (res.status === 401) {
        this.clearToken();
        return { success: false, error: 'Phiên đăng nhập đã hết hạn' };
      }
      return safeJson(res);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public initSse() {
    if (typeof window === 'undefined') return;

    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    const token = this.getToken();
    const sseUrl = token
      ? `/api/tasks/events?token=${encodeURIComponent(token)}`
      : '/api/tasks/events';

    // Connect to Server-Sent Events
    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.addEventListener('connected', () => {
        this.sseConnected = true;
      });

      const events = [
        'download-progress',
        'download-task-added',
        'download-task-updated',
        'download-completed',
        'download-failed',
        'download-stopped',
      ];

      for (const ev of events) {
        this.eventSource.addEventListener(ev, (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            this.emit(ev, parsed);
          } catch {
            this.emit(ev, e.data);
          }
        });
      }

      this.eventSource.onerror = () => {
        this.sseConnected = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Auto reconnect after 3 seconds
        setTimeout(() => this.initSse(), 3000);
      };
    } catch {
      // Fallback
    }
  }

  private emit(event: string, data: any) {
    const set = this.listeners[event];
    if (set) {
      set.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error('[Event Error]', e);
        }
      });
    }
  }

  private addListener(event: string, cb: Listener): () => void {
    // If native electronAPI exists, register to it as well
    const electronAPI = (window as any).electronAPI;
    let nativeCleanup: (() => void) | null = null;

    if (electronAPI) {
      if (event === 'download-progress' && electronAPI.onDownloadProgress) {
        nativeCleanup = electronAPI.onDownloadProgress(cb);
      } else if (event === 'download-task-added' && electronAPI.onDownloadTaskAdded) {
        nativeCleanup = electronAPI.onDownloadTaskAdded(cb);
      } else if (event === 'download-completed' && electronAPI.onDownloadCompleted) {
        nativeCleanup = electronAPI.onDownloadCompleted(cb);
      } else if (event === 'download-failed' && electronAPI.onDownloadFailed) {
        nativeCleanup = electronAPI.onDownloadFailed(cb);
      } else if (event === 'download-stopped' && electronAPI.onDownloadStopped) {
        nativeCleanup = electronAPI.onDownloadStopped(cb);
      }
    }

    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(cb);

    return () => {
      if (this.listeners[event]) {
        this.listeners[event].delete(cb);
      }
      if (nativeCleanup) nativeCleanup();
    };
  }

  async getAppInfo(): Promise<AppInfo> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.getAppInfo) return electronAPI.getAppInfo();
    const res = await fetch('/api/app-info');
    return safeJson(res);
  }

  async openExternalUrl(url: string): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.openExternalUrl) {
      return electronAPI.openExternalUrl(url);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async hongguoResolve(input: string): Promise<{ success: boolean; data?: SeriesData; error?: string }> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.hongguoResolve) {
      return electronAPI.hongguoResolve(input);
    }
    const res = await fetch('/api/hongguo/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    return safeJson(res);
  }

  async hongguoDownloadBatch(payload: {
    seriesId: string;
    seriesTitle: string;
    episodes: any[];
    coverUrl?: string;
  }): Promise<{ success: boolean; count?: number; error?: string }> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.hongguoDownloadBatch) {
      return electronAPI.hongguoDownloadBatch(payload);
    }
    const res = await fetch('/api/hongguo/download-batch', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return safeJson(res);
  }

  async getPresets(): Promise<PresetSeries[]> {
    try {
      const res = await fetch('/api/hongguo/presets');
      return safeJson(res);
    } catch {
      return [];
    }
  }

  async getSettings(): Promise<Settings> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.getSettings) return electronAPI.getSettings();
    const res = await fetch('/api/settings');
    return safeJson(res);
  }

  async saveSettings(settings: Partial<Settings>): Promise<{ success: boolean; error?: string }> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.saveSettings) return electronAPI.saveSettings(settings);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return safeJson(res);
  }

  async selectFolder(): Promise<string | null> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.selectFolder) return electronAPI.selectFolder();
    const current = await this.getSettings();
    const custom = window.prompt('请输入下载保存目录绝对路径:', current.root);
    return custom ? custom.trim() : null;
  }

  async getDownloadTasks(): Promise<Task[]> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.getDownloadTasks) return electronAPI.getDownloadTasks();
    const res = await fetch('/api/tasks', {
      headers: this.getAuthHeaders(),
    });
    if (res.status === 401) return [];
    return safeJson(res);
  }

  async deleteTask(id: string): Promise<{ success: boolean }> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.deleteTask) return electronAPI.deleteTask(id);
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return safeJson(res);
  }

  async deleteTasks(ids: string[]): Promise<{ success: boolean; count?: number }> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.deleteTasks) return electronAPI.deleteTasks(ids);
    const res = await fetch('/api/tasks/delete-batch', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    return safeJson(res);
  }

  async clearCompletedTasks(): Promise<{ success: boolean; count?: number }> {
    const res = await fetch('/api/tasks/clear-completed', {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return safeJson(res);
  }

  async stopDownload(id: string): Promise<{ success: boolean }> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.stopDownload) return electronAPI.stopDownload(id);
    const res = await fetch(`/api/tasks/${id}/stop`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return safeJson(res);
  }

  async retryTask(id: string): Promise<{ success: boolean }> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.retryTask) return electronAPI.retryTask(id);
    const res = await fetch(`/api/tasks/${id}/retry`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return safeJson(res);
  }

  async retryTasks(ids: string[]): Promise<{ success: boolean; count?: number }> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.retryTasks) return electronAPI.retryTasks(ids);
    const res = await fetch('/api/tasks/retry-batch', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    return safeJson(res);
  }

  async openFolder(taskId: string): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.openFolder) {
      await electronAPI.openFolder(taskId);
      return;
    }
    // Web: open direct download or preview
    window.open(`/api/tasks/${taskId}/download-file`, '_blank');
  }

  async openSaveDir(): Promise<{ success: boolean; path?: string; error?: string }> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.openSaveDir) {
      return electronAPI.openSaveDir();
    }
    const res = await fetch('/api/open-save-dir', { method: 'POST' });
    return safeJson(res);
  }

  getStreamUrl(vid: string): string {
    return `/api/hongguo/stream/${vid}`;
  }

  getDownloadFileUrl(taskId: string): string {
    return `/api/tasks/${taskId}/download-file`;
  }

  getCoverDownloadUrl(coverUrl: string, seriesTitle: string, filename?: string): string {
    const params = new URLSearchParams({
      url: coverUrl,
      seriesTitle,
      filename: filename || '',
    });
    return `/api/hongguo/download-cover-image?${params.toString()}`;
  }

  // Admin APIs
  async getAdminUsers(): Promise<{ success: boolean; users?: any[]; error?: string }> {
    try {
      const res = await fetch('/api/admin/users', {
        headers: this.getAuthHeaders(),
      });
      return await safeJson(res);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async createAdminUser(payload: {
    username?: string;
    password?: string;
    role?: 'admin' | 'user';
    name?: string;
    hours?: number;
    maxSeries?: number;
    maxEpisodesPerSeries?: number;
  }): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return await safeJson(res);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async deleteAdminUser(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      return await safeJson(res);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async updateAdminUser(
    id: string,
    payload: {
      password?: string;
      role?: string;
      resetDownloads?: boolean;
      addHours?: number;
      hours?: number;
      maxSeries?: number;
      maxEpisodesPerSeries?: number | null;
    }
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const res = await fetch(`/api/admin/users/${id}/update`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return await safeJson(res);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async resetAdminUserQuotas(
    id: string,
    payload: { resetDownloads?: boolean; addHours?: number; setMaxSeries?: number }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/admin/users/${id}/reset`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return await safeJson(res);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Event subscribers
  onDownloadProgress(cb: Listener): () => void {
    return this.addListener('download-progress', cb);
  }

  onDownloadTaskAdded(cb: Listener): () => void {
    return this.addListener('download-task-added', cb);
  }

  onDownloadCompleted(cb: Listener): () => void {
    return this.addListener('download-completed', cb);
  }

  onDownloadFailed(cb: Listener): () => void {
    return this.addListener('download-failed', cb);
  }

  onDownloadStopped(cb: Listener): () => void {
    return this.addListener('download-stopped', cb);
  }
}

export const api = new ApiClient();
