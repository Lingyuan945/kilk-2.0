import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Plus, Building2, ImagePlus, Loader2, Wrench, CheckCircle2, Clock3, Timer, Trash2, RotateCcw } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type Incident = {
  id: number;
  incident_no: string;
  room_no: string;
  building: string;
  status: 'pending' | 'processing' | 'done';
  category: string;
  device_type: string;
  description: string;
  attachment: string;
  wait_duration: number;
  total_duration: number;
  created_by_name: string;
  created_at: string;
  repaired_at: string | null;
};

type Stats = { pending: number; processing: number; done: number; total: number };

const STATUS: Record<Incident['status'], { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
  processing: { label: '处理中', cls: 'border-blue-400/30 bg-blue-400/10 text-blue-300' },
  done: { label: '已完成', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' },
};

const BUILDINGS = ['1号楼', '2号楼', '3号楼', '别墅区', '其他'];
const CATEGORIES = ['网络故障', '设备故障', '水电故障', '家具破损', '其他'];
const DEVICE_TYPES = ['机顶盒', '电视', '空调', '热水器', '淋浴', '马桶', '门锁', '灯具', '网络', '其他'];

function formatTime(s?: string | null) {
  if (!s) return '-';
  const d = new Date(s);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400 && now.getDate() === d.getDate()) return `${Math.floor(diff / 3600)} 小时前`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(min?: number | null) {
  if (!min || min <= 0) return '-';
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}

export default function HotelPage() {
  const { user, isAdmin } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, processing: 0, done: 0, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | Incident['status']>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // 表单
  const [form, setForm] = useState({
    room_no: '',
    building: BUILDINGS[0],
    status: 'pending' as Incident['status'],
    category: CATEGORIES[0],
    device_type: DEVICE_TYPES[0],
    description: '',
    attachment: '',
  });

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set('keyword', keyword.trim());
      if (statusFilter) params.set('status', statusFilter);
      const q = params.toString();
      const data = await apiGet<{ data: Incident[]; stats: Stats }>(`/hotel/incidents${q ? `?${q}` : ''}`);
      setIncidents(data.data);
      setStats(data.stats);
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleSubmit = async (keepForm: boolean) => {
    if (!form.room_no.trim()) {
      flash('请填写房间号码', 'err');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiPost<{ data: Incident }>('/hotel/incidents', form);
      flash(`登记成功：${data.data.incident_no}`);
      setForm({
        room_no: '',
        building: keepForm ? form.building : BUILDINGS[0],
        status: 'pending',
        category: keepForm ? form.category : CATEGORIES[0],
        device_type: keepForm ? form.device_type : DEVICE_TYPES[0],
        description: '',
        attachment: '',
      });
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await apiUpload<{ url: string }>('/hotel/upload', fd);
      setForm((f) => ({ ...f, attachment: res.url }));
    } catch (e) {
      flash((e as Error).message, 'err');
    } finally {
      setUploading(false);
    }
  };

  const changeStatus = async (item: Incident, status: Incident['status']) => {
    if (!user) {
      flash('请先登录后再操作', 'err');
      return;
    }
    try {
      await apiPut(`/hotel/incidents/${item.id}`, { status });
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    }
  };

  const handleDelete = async (item: Incident) => {
    if (!window.confirm(`确认删除 ${item.incident_no}（${item.room_no}）的故障记录？`)) return;
    try {
      await apiDelete(`/hotel/incidents/${item.id}`);
      flash('已删除');
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    }
  };

  const currentOpen = stats.pending + stats.processing;

  const statsCards = [
    { label: '当前故障', value: currentOpen, icon: Wrench, cls: 'from-rose-500/20 to-orange-500/10 text-rose-300 border-rose-400/25' },
    { label: '待处理', value: stats.pending, icon: Clock3, cls: 'from-amber-500/20 to-yellow-500/10 text-amber-300 border-amber-400/25' },
    { label: '处理中', value: stats.processing, icon: Loader2, cls: 'from-blue-500/20 to-cyan-500/10 text-blue-300 border-blue-400/25' },
    { label: '已完成', value: stats.done, icon: CheckCircle2, cls: 'from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-400/25' },
  ];

  const filters: Array<{ value: '' | Incident['status']; label: string }> = [
    { value: '', label: '全部' },
    { value: 'pending', label: '待处理' },
    { value: 'processing', label: '处理中' },
    { value: 'done', label: '已完成' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      {/* 页头 */}
      <div className="mb-8 text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold tracking-widest text-cyan-300">
          <Building2 className="h-3.5 w-3.5" />
          HOTEL OPERATIONS
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
            红树林酒店运维
          </span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">客房故障登记 · 跟踪处理 · 实时统计</p>
      </div>

      {/* 统计卡片 */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                'flex flex-col gap-1 rounded-2xl border bg-gradient-to-br p-4 transition-all duration-300 hover:-translate-y-0.5',
                card.cls,
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{card.label}</span>
                <Icon className="h-4 w-4 opacity-70" />
              </div>
              <span className="text-3xl font-bold tabular-nums">{card.value}</span>
            </div>
          );
        })}
      </div>

      {msg && (
        <div
          className={cn(
            'mb-4 rounded-xl border px-4 py-3 text-sm backdrop-blur',
            msg.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300',
          )}
        >
          {msg.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：列表 */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索房间号 / 编号 / 描述 / 楼栋…"
                className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-500/90 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_hsl(217_91%_60%/0.35)] transition-all hover:bg-blue-400"
            >
              <Plus className="h-4 w-4" /> 添加记录
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.value || 'all'}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  statusFilter === f.value
                    ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                    : 'border-slate-700/70 text-slate-400 hover:border-slate-500 hover:text-slate-200',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-700/70 py-16 text-slate-500">
              <Wrench className="h-8 w-8 opacity-40" />
              <p className="text-sm">暂无故障记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((item) => {
                const st = STATUS[item.status];
                return (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/80"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-slate-100">{item.room_no}</span>
                          {item.building && (
                            <span className="rounded-md border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 text-[11px] text-slate-400">
                              {item.building}
                            </span>
                          )}
                          <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', st.cls)}>
                            {st.label}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{item.incident_no}</span>
                          <span>
                            {item.category} · {item.device_type}
                          </span>
                          <span>报障人：{item.created_by_name || '游客'}</span>
                        </div>
                        {item.description && (
                          <p className="mt-1.5 line-clamp-2 text-sm text-slate-300">{item.description}</p>
                        )}
                        {item.attachment && (
                          <a
                            href={item.attachment}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block overflow-hidden rounded-lg border border-slate-700"
                          >
                            <img src={item.attachment} alt="故障附件" className="h-14 w-20 object-cover" />
                          </a>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" /> 等待 {formatDuration(item.wait_duration)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Timer className="h-3 w-3" /> 总耗时 {formatDuration(item.total_duration)}
                          </span>
                          <span>{formatTime(item.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {item.status !== 'done' && (
                          <button
                            onClick={() =>
                              changeStatus(item, item.status === 'pending' ? 'processing' : 'done')
                            }
                            title={item.status === 'pending' ? '开始处理' : '标记完成'}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300 transition-all hover:bg-blue-500/25"
                          >
                            {item.status === 'pending' ? (
                              <>
                                <Wrench className="h-3 w-3" /> 开始处理
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> 完成
                              </>
                            )}
                          </button>
                        )}
                        {item.status === 'done' && (
                          <button
                            onClick={() => changeStatus(item, 'pending')}
                            title="重新打开"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-600/40 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 transition-all hover:bg-slate-700/60"
                          >
                            <RotateCcw className="h-3 w-3" /> 重开
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(item)}
                            title="删除记录"
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/5 px-2.5 py-1 text-xs text-rose-300/80 transition-all hover:bg-rose-500/20"
                          >
                            <Trash2 className="h-3 w-3" /> 删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 右侧：登记表单 */}
        <div ref={formRef} className="scroll-mt-24">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">故障登记</h2>
              <span className="text-[11px] text-slate-500">新记录</span>
            </div>

            <div className="space-y-3.5">
              <Field label="故障编号" auto>
                <input
                  disabled
                  value="提交后自动生成"
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs text-slate-500"
                />
              </Field>

              <Field label="房间号码" required>
                <input
                  value={form.room_no}
                  onChange={(e) => setForm((f) => ({ ...f, room_no: e.target.value }))}
                  placeholder="请输入内容"
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                />
              </Field>

              <Field label="酒店楼栋">
                <select
                  value={form.building}
                  onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500/60"
                >
                  {BUILDINGS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="处理状态" required>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Incident['status'] }))}
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500/60"
                >
                  <option value="pending">待处理</option>
                  <option value="processing">处理中</option>
                  <option value="done">已完成</option>
                </select>
              </Field>

              <Field label="故障类别" required>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500/60"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="设备类型" required>
                <select
                  value={form.device_type}
                  onChange={(e) => setForm((f) => ({ ...f, device_type: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500/60"
                >
                  {DEVICE_TYPES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="故障描述">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="请输入内容"
                  className="w-full resize-none rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                />
              </Field>

              <Field label="故障附件">
                {form.attachment ? (
                  <div className="relative overflow-hidden rounded-lg border border-slate-700">
                    <img src={form.attachment} alt="附件" className="h-24 w-full object-cover" />
                    <button
                      onClick={() => setForm((f) => ({ ...f, attachment: '' }))}
                      className="absolute right-1.5 top-1.5 rounded-md bg-slate-950/80 px-2 py-0.5 text-xs text-rose-300 hover:bg-slate-950"
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-700 py-5 text-slate-500 transition-colors hover:border-blue-500/50 hover:text-blue-300">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                    <span className="text-xs">{uploading ? '上传中…' : '点击上传图片（jpg/png）'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="维修等待时长" auto>
                  <div className="rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs text-slate-500">
                    自动计算
                  </div>
                </Field>
                <Field label="维修总耗时" auto>
                  <div className="rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs text-slate-500">
                    自动计算
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="创建人" auto>
                  <div className="rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs text-slate-500">
                    {user?.name || user?.username || '游客'}
                  </div>
                </Field>
                <Field label="创建时间" auto>
                  <div className="rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs text-slate-500">
                    自动生成
                  </div>
                </Field>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-blue-500/90 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_hsl(217_91%_60%/0.3)] transition-all hover:bg-blue-400 disabled:opacity-50"
                >
                  {submitting ? '提交中…' : '提交'}
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/70 py-2.5 text-sm font-medium text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-700/70 disabled:opacity-50"
                >
                  提交并继续添加
                </button>
              </div>
              <p className="text-center text-[11px] text-slate-600">编号、等待时长、总耗时、创建信息提交后自动生成</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  auto,
  children,
}: {
  label: string;
  required?: boolean;
  auto?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        {required && <span className="text-rose-400">*</span>}
        {auto && <span className="text-[10px] text-slate-600">自动</span>}
      </div>
      {children}
    </div>
  );
}
