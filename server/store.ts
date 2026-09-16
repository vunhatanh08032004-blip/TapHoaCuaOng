import fs from 'fs';
import path from 'path';

export interface Task {
  id: string;
  userId?: string;
  type: string;
  title: string;
  filename: string;
  customDir?: string;
  savePath?: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'stopped';
  progress: number;
  receivedBytes: number;
  totalBytes: number;
  speed?: number;
  error?: string;
  startTime?: number;
  endTime?: number;
  hongguoInfo?: {
    vid: string;
    vid_index: number;
    title: string;
    series_id: string;
    series_title: string;
  };
  videoInfo?: {
    cover?: string;
    series_title?: string;
  };
  cancelled?: boolean;
}

export interface Settings {
  root: string;
  name_format: string;
  max_concurrent: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

let cache: { settings: Partial<Settings>; tasks: Task[] } | null = null;

function loadCache() {
  if (cache) return cache;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e: any) {
    console.error('[Store] 读取数据文件失败:', e.message);
  }
  if (!cache || typeof cache !== 'object') cache = { settings: {}, tasks: [] };
  if (!Array.isArray(cache.tasks)) cache.tasks = [];
  if (!cache.settings || typeof cache.settings !== 'object') cache.settings = {};
  return cache;
}

function flush() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(cache || { settings: {}, tasks: [] }, null, 2), 'utf8');
  } catch (e: any) {
    console.error('[Store] 写入数据文件失败:', e.message);
  }
}

export function getSettings(): Settings {
  const loaded = loadCache().settings;
  const defaultRoot = 'D:\\';
  return {
    root: loaded.root || defaultRoot,
    name_format: loaded.name_format || 'TênPhim_TậpN',
    max_concurrent: Math.min(10, Math.max(1, Number(loaded.max_concurrent) || 3)),
  };
}

export function saveSettings(settings: Partial<Settings>): void {
  const current = getSettings();
  const merged = { ...current, ...settings };
  loadCache().settings = merged;
  flush();
}

export function getTasks(): Task[] {
  return loadCache().tasks;
}

export function saveTasks(tasks: Task[]): void {
  loadCache().tasks = tasks || [];
  flush();
}
