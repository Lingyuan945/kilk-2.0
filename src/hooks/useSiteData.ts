import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiUpload } from '@/lib/api';
import type {
  User,
  Channel,
  ForumPost,
  ForumPostImage,
  ForumReply,
  HomeContent,
  ServiceFile,
} from '@/types';

// ========== 首页内容 ==========
export function useHomeContent() {
  const [data, setData] = useState<HomeContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ data: HomeContent }>('/home')
      .then((res) => { setData(res.data); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

// ========== 频道列表 ==========
export function useChannels() {
  const [data, setData] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ data: Channel[] }>('/forum/channels')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ========== 帖子列表 ==========
export interface PostListResult {
  data: (ForumPost & {
    username?: string;
    author_name?: string;
    avatar?: string;
    role?: string;
    channel_name?: string;
    reply_count?: number;
  })[];
  loading: boolean;
  pagination: { page: number; page_size: number; total: number };
  reload: () => void;
}

export function useForumPosts(channelId?: string, page = 1, pageSize = 20): PostListResult {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page, page_size: pageSize, total: 0 });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (channelId) params.set('channel_id', channelId);

    apiGet<any>(`/forum/posts?${params.toString()}`)
      .then((res) => {
        setData(res.data);
        setPagination(res.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channelId, page, pageSize, reloadKey]);

  return { data, loading, pagination, reload };
}

// ========== 帖子详情 ==========
export interface PostDetail extends ForumPost {
  username?: string;
  author_name?: string;
  avatar?: string;
  role?: string;
  signature?: string;
  channel_name?: string;
  images?: ForumPostImage[];
  replies?: (ForumReply & {
    username?: string;
    author_name?: string;
    avatar?: string;
    role?: string;
  })[];
}

export function usePostDetail(postId: string) {
  const [data, setData] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    apiGet<{ data: PostDetail }>(`/forum/posts/${postId}`)
      .then((res) => { setData(res.data); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [postId, reloadKey]);

  return { data, loading, error, reload };
}

// ========== 发帖 ==========
export function useCreatePost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(async (title: string, content: string, channelId: string, images: string[] = []) => {    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ post_id: number }>('/forum/posts', {
        title,
        content,
        channel_id: channelId,
        images,
      });
      return res.post_id;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 上传帖子图片，返回可用的 /upload/ 路径
  const uploadPostImage = useCallback(async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('image', file);
    const res = await apiUpload<{ url: string }>('/forum/upload', form);
    return res.url;
  }, []);

  return { createPost, uploadPostImage, loading, error };
}

// ========== 评论 ==========
export function useCreateReply() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReply = useCallback(async (postId: string, content: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/forum/posts/${postId}/replies`, { content });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createReply, loading, error };
}

// ========== 用户信息 ==========
export function useUserProfile(userId: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    apiGet<{ data: any }>(`/users/${userId}`)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return { data, loading };
}

// 用户帖子列表
export function useUserPosts(userId: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    apiGet<{ data: any[] }>(`/users/${userId}/posts`)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return { data, loading };
}

// ========== 服务文件列表 ==========
export function useServiceFiles() {
  const [data, setData] = useState<(ServiceFile & { versions?: any[]; total_downloads?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ data: any[] }>('/service/files')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ========== 工具函数 ==========
export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return timeStr;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff <= 0) return '刚刚';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const mins = Math.floor(diff / (1000 * 60));
      return mins <= 1 ? '刚刚' : `${mins}分钟前`;
    }
    return `${hours}小时前`;
  }
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return timeStr.split('T')[0];
}

export const ROLE_NAMES: Record<string, string> = {
  user: '普通用户',
  senior: '高级用户',
  admin: '管理员',
  super: '超级管理员',
};

export const ROLE_COLORS: Record<string, string> = {
  user: 'bg-slate-800 text-slate-300 border border-slate-700/60',
  senior: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  admin: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  super: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
};
