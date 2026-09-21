import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Loader2, Pin, Pencil, Trash2, Plus } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Notice = {
  id: number;
  title: string;
  content: string;
  is_pinned: number;
  author_name: string;
  created_at: string;
  updated_at: string;
};

function fmt(s?: string | null) {
  if (!s) return '-';
  const d = new Date(s);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NoticeTab() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [form, setForm] = useState({ title: '', content: '', is_pinned: false });
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ data: Notice[] }>('/notice');
      setNotices(data.data);
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return flash('公告标题必填', 'err');
    if (!form.content.trim()) return flash('公告内容必填', 'err');
    setSaving(true);
    try {
      if (editingId) {
        await apiPut(`/notice/${editingId}`, form);
        flash('公告已更新');
      } else {
        await apiPost('/notice', form);
        flash('公告已发布');
      }
      setForm({ title: '', content: '', is_pinned: false });
      setEditingId(null);
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (n: Notice) => {
    setEditingId(n.id);
    setForm({ title: n.title, content: n.content, is_pinned: n.is_pinned === 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ title: '', content: '', is_pinned: false });
  };

  const handleDelete = async (n: Notice) => {
    if (!window.confirm(`确认删除公告「${n.title}」？`)) return;
    try {
      await apiDelete(`/notice/${n.id}`);
      flash('公告已删除');
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* 左侧：发布/编辑表单 */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-100">
            {editingId ? <Pencil className="h-4 w-4 text-blue-400" /> : <Plus className="h-4 w-4 text-blue-400" />}
            {editingId ? '编辑公告' : '发布公告'}
          </h3>

          {msg && (
            <div
              className={cn(
                'mb-4 rounded-lg border px-3 py-2 text-xs',
                msg.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300',
              )}
            >
              {msg.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-400">公告标题 *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="请输入公告标题"
                className="mt-1.5 border-slate-700 bg-slate-950/60 text-slate-200"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">公告内容 *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={6}
                placeholder="请输入公告内容"
                className="mt-1.5 resize-none border-slate-700 bg-slate-950/60 text-slate-200"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm((f) => ({ ...f, is_pinned: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-amber-400"
              />
              <Pin className="h-3.5 w-3.5 text-amber-300" />
              置顶公告
            </label>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? '保存修改' : '发布公告'}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={cancelEdit} className="border-slate-700 text-slate-300">
                  取消
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：公告列表 */}
      <div className="lg:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Megaphone className="h-4 w-4 text-blue-400" />
            公告列表
          </h3>
          <span className="text-xs text-slate-500">{loading ? '…' : `${notices.length} 条`}</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-800 py-10 text-slate-500">
            <Megaphone className="h-6 w-6 opacity-40" />
            <p className="text-sm">暂无公告，发布第一条吧</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notices.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'rounded-xl border p-4 transition-colors',
                  n.is_pinned === 1 ? 'border-amber-400/25 bg-amber-500/[0.04]' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.is_pinned === 1 && (
                        <Badge className="border-amber-400/40 bg-amber-400/10 text-[10px] text-amber-300">置顶</Badge>
                      )}
                      <span className="truncate text-sm font-medium text-slate-100">{n.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{n.content}</p>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {n.author_name || '管理员'} · {fmt(n.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:bg-blue-500/10" onClick={() => startEdit(n)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(n)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
