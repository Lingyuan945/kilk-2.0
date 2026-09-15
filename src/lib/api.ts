// API 基础配置
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

// 获取存储的 token
export function getToken(): string | null {
  return localStorage.getItem('kilk_token');
}

// 存储 token
export function setToken(token: string) {
  localStorage.setItem('kilk_token', token);
}

// 清除 token
export function clearToken() {
  localStorage.removeItem('kilk_token');
}

// 封装 fetch 请求
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({ ok: false, msg: '响应解析失败' }));

  if (!res.ok || !data.ok) {
    throw new Error(data.msg || `请求失败 (${res.status})`);
  }

  return data as T;
}

// GET 请求
export function apiGet<T = any>(endpoint: string) {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

// POST 请求
export function apiPost<T = any>(endpoint: string, body?: any) {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

// PUT 请求
export function apiPut<T = any>(endpoint: string, body?: any) {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

// DELETE 请求
export function apiDelete<T = any>(endpoint: string) {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

// 文件上传请求（multipart/form-data，不设置 Content-Type 让浏览器自动加 boundary）
export async function apiUpload<T = any>(
  endpoint: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: formData,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({ ok: false, msg: '响应解析失败' }));
  if (!res.ok || !data.ok) throw new Error(data.msg || `请求失败 (${res.status})`);
  return data as T;
}
