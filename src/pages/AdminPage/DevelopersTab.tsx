import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Save, AlertTriangle, UserRound, ArrowUpDown, Search, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

const ROLE_OPTIONS = ['全栈开发工程师', '前端工程师', '后端工程师'];

// 头衔多选：role 以「 · 」分隔存储（可同时选 1~3 种）
const roleList = (s: string): string[] => (s || '').split(' · ').filter(Boolean);

interface Developer {
  id: number;
  username: string;
  name: string;
  role: string;
  tagline: string;
  bio: string;
  email: string;
  avatar_initial: string;
  sort: number;
  user_id?: number | null;
  avatar?: string | null;
  hero?: unknown;
  skills?: unknown;
  projects?: unknown;
  timeline?: unknown;
  socials?: unknown;
  contacts?: unknown;
}

interface SelectableUser {
  id: number;
  username: string;
  name: string;
  avatar?: string | null;
  role: string;
  user_no: string;
}

// 基础信息表单（名片内容由开发者本人管理，后台不编辑）
const EMPTY_FORM = {
  user_id: null as number | null,
  username: '',
  name: '',
  role: '',
  sort: 0,
};

type Msg = { type: 'ok' | 'err'; text: string } | null;

export default function DevelopersTab() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg>(null);

  // 编辑模态框
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // 用户搜索（添加开发者时从用户中选择）
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SelectableUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Developer | null>(null);

  const loadDevelopers = async () => {
    try {
      const res = await apiGet<{ data: Developer[] }>('/admin/developers');
      setDevelopers(res.data || []);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || '加载失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevelopers();
  }, []);

  // 搜索用户（防抖；仅添加模式下使用）
  useEffect(() => {
    if (editingId || !userSearchOpen) return;
    if (!searchText.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiGet<{ data: SelectableUser[] }>(`/admin/users?search=${encodeURIComponent(searchText.trim())}`);
        setSearchResults(res.data || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, userSearchOpen, editingId]);

  const selectUser = (u: SelectableUser) => {
    setForm((f) => ({
      ...f,
      user_id: u.id,
      username: u.username,
      name: u.name || u.username,
    }));
    setUserSearchOpen(false);
    setSearchText('');
    setSearchResults([]);
  };

  const toggleRole = (r: string) => {
    // 函数式更新：快速连点多个头衔时不会互相覆盖（React 批处理）
    setForm((f) => {
      const current = roleList(f.role);
      const next = current.includes(r) ? current.filter((x) => x !== r) : [...current, r];
      return { ...f, role: next.join(' · ') };
    });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setUserSearchOpen(true);
    setEditOpen(true);
  };

  const openEdit = (dev: Developer) => {
    setEditingId(dev.id);
    setForm({
      user_id: dev.user_id ?? null,
      username: dev.username,
      name: dev.name,
      role: dev.role || '',
      sort: dev.sort || 0,
    });
    setUserSearchOpen(false);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      setMsg({ type: 'err', text: '请选择用户或填写用户名（URL标识）' });
      return;
    }
    if (!form.name.trim()) {
      setMsg({ type: 'err', text: '姓名不能为空' });
      return;
    }
    if (!form.role) {
      setMsg({ type: 'err', text: '请选择头衔（全栈/前端/后端）' });
      return;
    }
    // 名片内容（tagline/bio/email/avatar_initial 等）由开发者本人管理，后台保存不提交
    const payload: Record<string, unknown> = {
      username: form.username.trim(),
      name: form.name.trim(),
      role: form.role.trim(),
      sort: Number(form.sort) || 0,
    };
    // 添加模式下传 user_id 以关联用户
    if (!editingId && form.user_id) {
      payload.user_id = form.user_id;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiPut(`/admin/developers/${editingId}`, payload);
        setMsg({ type: 'ok', text: '开发者已更新' });
      } else {
        await apiPost('/admin/developers', payload);
        setMsg({ type: 'ok', text: '开发者已添加' });
      }
      setEditOpen(false);
      loadDevelopers();
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/admin/developers/${deleteTarget.id}`);
      setMsg({ type: 'ok', text: '开发者已删除' });
      setDeleteTarget(null);
      loadDevelopers();
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || '删除失败' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          msg.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {msg.type === 'ok' ? <Save className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <UserRound className="h-4 w-4" />
          共 {developers.length} 位开发者
        </div>
        <Button onClick={openAdd} className="gap-2 bg-blue-600 hover:bg-blue-500">
          <Plus className="h-4 w-4" /> 添加开发者
        </Button>
      </div>

      {/* 开发者列表 */}
      <div className="space-y-2">
        {developers.map((dev) => (
          <Card key={dev.id} className="glass-card border-0">
            <CardContent className="flex items-center gap-4 p-4">
              {/* 头像（同步用户账号头像） */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 text-lg font-bold text-blue-300 ring-2 ring-blue-500/20">
                {dev.avatar ? (
                  <img src={dev.avatar} alt={dev.name} className="h-full w-full object-cover" />
                ) : (
                  dev.avatar_initial || dev.name[0]
                )}
              </div>

              {/* 信息 */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-slate-100">{dev.name}</span>
                  <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300">
                    {dev.role || '开发者'}
                  </Badge>
                  <span className="text-xs text-slate-500">@{dev.username}</span>
                  {dev.user_id && (
                    <span className="text-[10px] text-slate-600">已关联用户 #{dev.user_id}</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">{dev.tagline || '暂无简介'}</p>
              </div>

              {/* 排序 */}
              <div className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
                <ArrowUpDown className="h-3 w-3" />
                排序: {dev.sort}
              </div>

              {/* 操作 */}
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:bg-blue-500/10 hover:text-blue-400"
                  onClick={() => openEdit(dev)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => setDeleteTarget(dev)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {developers.length === 0 && (
        <div className="py-12 text-center">
          <UserRound className="mx-auto mb-3 h-12 w-12 text-slate-700" />
          <p className="text-sm text-slate-500">暂无开发者，点击上方按钮添加</p>
        </div>
      )}

      {/* 编辑/添加模态框 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[88vh] max-w-3xl overflow-hidden border-slate-700 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑开发者' : '添加开发者'}</DialogTitle>
          </DialogHeader>
          <div className="grid min-h-0 gap-4 overflow-y-auto py-2 pr-1">
            {/* 添加模式：从用户中选择（带搜索） */}
            {!editingId && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">选择用户 *</Label>
                {form.username ? (
                  <div className="flex items-center justify-between rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-blue-300">{form.name}</span>
                      <span className="text-xs text-slate-400">@{form.username}</span>
                      <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400">
                        已选择
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-slate-400 hover:text-blue-400"
                      onClick={() => setForm({ ...form, user_id: null, username: '', name: '' })}
                    >
                      <X className="h-3.5 w-3.5" /> 重选
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      value={searchText}
                      onChange={(e) => { setSearchText(e.target.value); setUserSearchOpen(true); }}
                      onFocus={() => setUserSearchOpen(true)}
                      placeholder="搜索用户名 / 姓名 / 工号…"
                      className="border-slate-700 bg-slate-800/50 pl-9 text-slate-100"
                    />
                    {userSearchOpen && (
                      <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                        {searching ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> 搜索中…
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => selectUser(u)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-800"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-500/20 text-xs font-bold text-blue-300">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.username} className="h-full w-full object-cover" />
                                ) : (u.name || u.username || 'D')[0]}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-200">{u.name || '-'}</span>
                                  <span className="text-xs text-slate-500">@{u.username}</span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  工号 {u.user_no} · {u.role}
                                </div>
                              </div>
                              <Check className="h-4 w-4 shrink-0 text-slate-600" />
                            </button>
                          ))
                        ) : searchText.trim() ? (
                          <div className="py-4 text-center text-xs text-slate-500">未找到匹配用户</div>
                        ) : (
                          <div className="py-4 text-center text-xs text-slate-500">输入关键词搜索用户</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 编辑模式：显示用户名/姓名 */}
            {editingId && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">用户名（URL标识）*</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="border-slate-700 bg-slate-800/50 text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">姓名 *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="border-slate-700 bg-slate-800/50 text-slate-100"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">头衔（可多选）*</Label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((r) => {
                    const active = roleList(form.role).includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(r)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          active
                            ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                            : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">排序</Label>
                <Input
                  type="number"
                  value={String(form.sort)}
                  onChange={(e) => setForm({ ...form, sort: Number(e.target.value) || 0 })}
                  className="border-slate-700 bg-slate-800/50 text-slate-100"
                />
              </div>
            </div>

            {/* 标语/简介/邮箱/头像首字母等名片内容由开发者本人管理（/developer/me），后台不提供编辑 */}
          </div>
          <DialogFooter className="-mx-6 -mb-6 shrink-0 rounded-b-lg border-t border-slate-800 bg-slate-900 px-6 pb-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-slate-700">
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-slate-700 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除开发者？</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              即将删除开发者「{deleteTarget?.name}」(@{deleteTarget?.username})，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-transparent text-slate-300">取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
