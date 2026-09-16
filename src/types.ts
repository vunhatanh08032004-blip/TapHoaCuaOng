export interface Episode {
  vid: string;
  vid_index: number;
  title: string;
  series_id: string;
  series_title: string;
  cover: string;
}

export interface SeriesData {
  series_id: string;
  series_title: string;
  cover: string;
  total: number;
  episodes: Episode[];
}

export interface Task {
  id: string;
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

export interface AppInfo {
  version: string;
  brand: string;
  appName: string;
  official_website: string;
}

export interface PresetSeries {
  id: string;
  title: string;
  total: number;
  tag: string;
  shareUrl: string;
}

export interface UserProfile {
  id: string;
  username: string;
  role: 'admin' | 'user';
  name: string;
  avatar: string;
  createdAt: number;
  expiresAt: number | null;
  maxSeries: number | null;
  maxSeriesLimit?: number | null;
  maxEpisodesPerSeries: number | null;
  maxEpisodesPerSeriesLimit?: number | null;
  downloadedSeriesCount: number;
  downloadedEpisodesCount: Record<string, number>;
  hoursRemaining: number | null;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
}
