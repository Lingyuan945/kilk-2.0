import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Pencil, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Hotel = {
  id: number;
  name: string;
  code: string;
  theme_color: string;
  buildings: string[];
  categories: string[];
  device_types: string[];
  enabled: number;
  sort: number;
  description: string;
  logo_url: string;
  created_at: string;
  pending: number;
  processing: number;
  done: number;
  total: number;
};

const THEME_COLORS = ['#38bdf8', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#14b8a6'];

function fmt(s?: string | null) {
  if (!s) return '-';
  const d = new Date(s);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 数组 <-> 每行一个的文本
const toLines = (arr: string[]) => (Array.isArray(arr) ? arr.join('\n') : '');
const fromLines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);
// 楼栋配置解析：支持 "编号=名称" 或 "1椰林酒店"(数字开头自动编号)
const parseBuildings = (arr: string[]): Array<{ id: string; name: string }> =>
  (Array.isArray(arr) ? arr : [])
    .map((line) => {
      const s = String(line || '').trim();
      if (!s) return { id: '', name: '' };
      const eq = s.split('=');
      if (eq.length === 2) return { id: eq[0].trim(), name: eq[1].trim() };
      const m = s.match(/^(\d+)\s*(.+)$/);
      if (m) return { id: m[1], name: m[2].trim() };
      return { id: '', name: s };
    });

export default function HotelTab() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    theme_color: THEME_COLORS[0],
    buildings: [] as Array<{ id: string; name: string }>,
    categories: [] as Array<{ name: string }>,
    device_types: [] as Array<{ name: string }>,
    enabled: true,
    sort: 0,
    description: '',
    logo_url: '',
  });

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ data: Hotel[] }>('/hotels/all');
      setHotels(data.data);
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

  const resetForm = () => {
    setForm({
      name: '',
      code: '',
      theme_color: THEME_COLORS[0],
      buildings: [],
      categories: [],
      device_types: [],
      enabled: true,
      sort: 0,
      description: '',
      logo_url: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (h: Hotel) => {
    setEditingId(h.id);
    setForm({
      name: h.name,
      code: h.code,
      theme_color: h.theme_color,
      buildings: parseBuildings(h.buildings),
      categories: (Array.isArray(h.categories) ? h.categories : []).map((x) => ({ name: String(x) })),
      device_types: (Array.isArray(h.device_types) ? h.device_types : []).map((x) => ({ name: String(x) })),
      enabled: h.enabled === 1,
      sort: h.sort,
      description: h.description || '',
      logo_url: h.logo_url || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return flash('酒店名称必填', 'err');
    if (!form.buildings.some((r) => r.name.trim())) return flash('请至少填写一个楼栋名称', 'err');
    if (!form.categories.some((r) => r.name.trim())) return flash('请至少填写一个故障类别', 'err');
    if (!form.device_types.some((r) => r.name.trim())) return flash('请至少填写一个设备类型', 'err');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        theme_color: form.theme_color,
        buildings: form.buildings.filter((r) => r.name.trim()).map((r) => `${r.id.trim()}=${r.name.trim()}`),
        categories: form.categories.filter((r) => r.name.trim()).map((r) => r.name.trim()),
        device_types: form.device_types.filter((r) => r.name.trim()).map((r) => r.name.trim()),
        enabled: form.enabled,
        sort: Number(form.sort) || 0,
        description: form.description,
        logo_url: form.logo_url,
      };
      if (editingId) {
        await apiPut(`/hotels/${editingId}`, payload);
        flash('酒店已更新');
      } else {
        await apiPost('/hotels', payload);
        flash('酒店已新增');
      }
      resetForm();
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (h: Hotel) => {
    try {
      await apiPut(`/hotels/${h.id}`, { enabled: h.enabled === 1 ? 0 : 1 });
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    }
  };

  const handleDelete = async (h: Hotel) => {
    if (!window.confirm(`确认删除「${h.name}」？其全部故障记录（${h.total} 条）与附件将一并删除，此操作不可恢复。`)) return;
    try {
      await apiDelete(`/hotels/${h.id}`);
      flash('酒店已删除');
      if (editingId === h.id) resetForm();
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    }
  };

  return (
    <div className="space-y-5">
      {msg && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
            msg.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400',
          )}
        >
          {msg.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">酒店列表</h2>
          <p className="mt-0.5 text-xs text-slate-500">新增酒店后自动出现在前台运维中心，选项配置独立维护</p>
        </div>
        <Button onClick={() => (showForm && !editingId ? resetForm() : (setEditingId(null), setShowForm(true)))}>
          {showForm && !editingId ? '取消' : (
            <>
              <Plus className="mr-1 h-4 w-4" /> 新增酒店
            </>
          )}
        </Button>
      </div>

      {/* 新增/编辑表单 */}
      {showForm && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">
            {editingId ? `编辑酒店 #${editingId}` : '新增酒店'}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">酒店名称 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="如：红树林酒店"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">标识 code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="如：hongshulin（可选）"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">酒店简介（前台卡片展示，选填）</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="如：位于景区核心，提供客房、餐饮与会议服务"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">封面图 URL（选填）</Label>
              <Input
                value={form.logo_url}
                onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                placeholder="https://…/cover.jpg"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">主题色</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {THEME_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, theme_color: c }))}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-all',
                      form.theme_color === c ? 'scale-110 border-white' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">启用 / 排序</Label>
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                    form.enabled
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-600/60 text-slate-500',
                  )}
                >
                  {form.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {form.enabled ? '启用中' : '已停用'}
                </button>
                <Input
                  type="number"
                  value={form.sort}
                  onChange={(e) => setForm((f) => ({ ...f, sort: Number(e.target.value) }))}
                  className="w-24"
                  placeholder="排序"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">楼栋配置 *（编号即房间号前缀）</Label>
              <div className="space-y-2">
                {form.buildings.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={row.id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          buildings: f.buildings.map((r, i) => (i === idx ? { ...r, id: e.target.value } : r)),
                        }))
                      }
                      placeholder="编号"
                      className="w-20 shrink-0"
                    />
                    <Input
                      value={row.name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          buildings: f.buildings.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                        }))
                      }
                      placeholder="楼栋名称"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, buildings: f.buildings.filter((_, i) => i !== idx) }))
                      }
                      className="shrink-0 rounded-lg border border-rose-500/25 bg-rose-500/5 px-2 py-1.5 text-xs text-rose-300/80 transition-all hover:bg-rose-500/20"
                    >
                      删除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, buildings: [...f.buildings, { id: '', name: '' }] }))
                  }
                  className="w-full rounded-lg border border-dashed border-slate-700 py-2 text-xs text-slate-400 transition-all hover:border-cyan-500/50 hover:text-cyan-300"
                >
                  + 添加楼栋
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">故障类别 *</Label>
              <div className="space-y-2">
                {form.categories.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={row.name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          categories: f.categories.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                        }))
                      }
                      placeholder="故障类别名称"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, categories: f.categories.filter((_, i) => i !== idx) }))
                      }
                      className="shrink-0 rounded-lg border border-rose-500/25 bg-rose-500/5 px-2 py-1.5 text-xs text-rose-300/80 transition-all hover:bg-rose-500/20"
                    >
                      删除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, categories: [...f.categories, { name: '' }] }))
                  }
                  className="w-full rounded-lg border border-dashed border-slate-700 py-2 text-xs text-slate-400 transition-all hover:border-cyan-500/50 hover:text-cyan-300"
                >
                  + 添加故障类别
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">设备类型 *</Label>
              <div className="space-y-2">
                {form.device_types.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={row.name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          device_types: f.device_types.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                        }))
                      }
                      placeholder="设备类型名称"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, device_types: f.device_types.filter((_, i) => i !== idx) }))
                      }
                      className="shrink-0 rounded-lg border border-rose-500/25 bg-rose-500/5 px-2 py-1.5 text-xs text-rose-300/80 transition-all hover:bg-rose-500/20"
                    >
                      删除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, device_types: [...f.device_types, { name: '' }] }))
                  }
                  className="w-full rounded-lg border border-dashed border-slate-700 py-2 text-xs text-slate-400 transition-all hover:border-cyan-500/50 hover:text-cyan-300"
                >
                  + 添加设备类型
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>取消</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {editingId ? '保存修改' : '新增酒店'}
            </Button>
          </div>
        </div>
      )}

      {/* 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        </div>
      ) : hotels.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-700/70 py-16 text-slate-500">
          <Building2 className="h-8 w-8 opacity-40" />
          <p className="text-sm">暂无酒店，点击右上角「新增酒店」</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hotels.map((h) => (
            <div
              key={h.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                style={{ borderColor: `${h.theme_color}55`, backgroundColor: `${h.theme_color}18`, color: h.theme_color }}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">{h.name}</span>
                  {h.enabled === 1 ? (
                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">启用</Badge>
                  ) : (
                    <Badge className="border-slate-600/50 bg-slate-700/30 text-slate-400">停用</Badge>
                  )}
                  <span className="text-[11px] text-slate-600">排序 {h.sort}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                  <span>{h.buildings?.length ?? 0} 楼栋</span>
                  <span>{h.categories?.length ?? 0} 类别</span>
                  <span>{h.device_types?.length ?? 0} 设备</span>
                  <span className="text-slate-600">
                    故障 {h.total}（待 {h.pending} / 处理中 {h.processing} / 完成 {h.done}）· 创建于 {fmt(h.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleEnabled(h)}>
                  {h.enabled === 1 ? '停用' : '启用'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => startEdit(h)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-300 hover:bg-rose-500/10"
                  onClick={() => handleDelete(h)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> 删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
