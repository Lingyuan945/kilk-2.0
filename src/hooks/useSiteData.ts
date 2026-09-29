import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type {
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

// ========== 用户信息 ==========
export function useUserProfile(userId: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    apiGet<{ data: any }>(`/users/${userId}`)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { data, loading, refetch };
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
