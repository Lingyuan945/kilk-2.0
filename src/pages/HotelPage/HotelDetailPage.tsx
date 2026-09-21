import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Search, Plus, Building2, ImagePlus, Loader2, Wrench, CheckCircle2, Clock3,
  Timer, Trash2, RotateCcw, ChevronLeft, BarChart3, AlertTriangle, Pencil,
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';

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

type HotelInfo = {
  id: number;
  name: string;
  code: string;
  theme_color: string;
  buildings: string[];
  categories: string[];
  device_types: string[];
  enabled: number;
  sort: number;
};

const STATUS: Record<Incident['status'], { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
  processing: { label: '处理中', cls: 'border-blue-400/30 bg-blue-400/10 text-blue-300' },
  done: { label: '已完成', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' },
};

function formatTime(s?: string | null) {
  if (!s) return '-';
  const d = new Date(s);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDuration(min?: number | null) {
  if (!min || min <= 0) return '-';
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}


// 楼栋自动识别：支持后台每行 "编号=名称" 配置（如 1=椰林酒店）
// 匹配规则：前缀精确匹配 > 名称含 "n号楼" > 默认第一栋（去编号前缀）
function autoBuilding(room: string, buildings?: string[]): string {
  if (!buildings || !buildings.length) return '';
  const parsed = buildings.map((line) => {
    const parts = String(line).split('=').map((s) => s.trim());
    let prefix = '';
    let name = line;
    if (parts.length === 2) {
      // 格式：编号=名称
      prefix = parts[0];
      name = parts[1];
    } else {
      // 旧格式：如 "1椰林酒店"，首位数字自动作前缀，名称去掉编号前缀
      const m = line.match(/^(\d)/);
      prefix = m ? m[1] : '';
      name = line.replace(/^\d+\s*/, '').trim();
    }
    return { name, prefix };
  });
  const first = parsed[0]?.name || '';
  const m = room.trim().match(/^(\d)/);
  if (!m) return first;
  const n = m[1];
  const hitPrefix = parsed.find((p) => p.prefix === n);
  if (hitPrefix) return hitPrefix.name;
  const hitName = parsed.find((p) => p.name.includes(`${n}号楼`));
  if (hitName) return hitName.name;
  return first;
}

export default function HotelDetailPage() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const { user, isAdmin } = useAuth();
  const [hotel, setHotel] = useState<HotelInfo | null>(null);
  const [hotelLoading, setHotelLoading] = useState(true);
  const [hotelErr, setHotelErr] = useState('');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, processing: 0, done: 0, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | Incident['status']>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // 表单（选项随酒店配置动态变化）
  const [form, setForm] = useState({
    room_no: '',
    building: '',
    status: 'pending' as Incident['status'],
    category: '',
    device_type: '',
    description: '',
    attachment: '',
  });

  // 表单校验错误
  const [errors, setErrors] = useState<{ room_no?: string; category?: string; device_type?: string }>({});

  // 编辑状态
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  // 功能模块切换
  const [module, setModule] = useState<'select' | 'incident' | 'dashboard'>('select');

  // 加载酒店配置
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<{ data: HotelInfo }>(`/hotels/${hotelId}`);
        if (cancelled) return;
        setHotel(data.data);
        setForm((f) => ({
          ...f,
          building: autoBuilding('', data.data.buildings),
          category: data.data.categories[0] || '',
          device_type: data.data.device_types[0] || '',
        }));
      } catch (e) {
        if (!cancelled) setHotelErr((e as Error).message);
      } finally {
        if (!cancelled) setHotelLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set('keyword', keyword.trim());
      if (statusFilter) params.set('status', statusFilter);
      const q = params.toString();
      const data = await apiGet<{ data: Incident[]; stats: Stats }>(
        `/hotel/${hotelId}/incidents${q ? `?${q}` : ''}`
      );
      setIncidents(data.data);
      setStats(data.stats);
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [hotelId, keyword, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleSubmit = async (keepForm: boolean) => {
    // 表单校验
    const newErrors: typeof errors = {};
    if (!form.room_no.trim()) newErrors.room_no = '请填写房间号码';
    if (!form.category) newErrors.category = '请选择故障类别';
    if (!form.device_type) newErrors.device_type = '请选择设备类型';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      flash('请完善必填字段', 'err');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        // 编辑模式：调用 PUT 更新
        await apiPut(`/hotel/${hotelId}/incidents/${editingId}`, {
          room_no: form.room_no,
          building: form.building,
          status: form.status,
          category: form.category,
          device_type: form.device_type,
          description: form.description,
          attachment: form.attachment,
        });
        flash('更新成功');
      } else {
        // 新建模式：调用 POST 创建
        const data = await apiPost<{ data: Incident }>(`/hotel/${hotelId}/incidents`, form);
        flash(`登记成功：${data.data.incident_no}`);
      }
      resetForm(keepForm);
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    } finally {
      setSubmitting(false);
    }
  };

  // 重置表单
  const resetForm = (keepForm: boolean) => {
    setForm((f) => ({
      room_no: '',
      building: keepForm ? f.building : autoBuilding('', hotel?.buildings),
      status: 'pending',
      category: keepForm ? f.category : hotel?.categories[0] || '',
      device_type: keepForm ? f.device_type : hotel?.device_types[0] || '',
      description: '',
      attachment: '',
    }));
    setErrors({});
    setEditingId(null);
    setEditingIncident(null);
  };

  // 进入编辑模式
  const handleEdit = (item: Incident) => {
    setEditingId(item.id);
    setEditingIncident(item);
    setForm({
      room_no: item.room_no,
      building: item.building,
      status: item.status,
      category: item.category,
      device_type: item.device_type,
      description: item.description,
      attachment: item.attachment,
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      await apiPut(`/hotel/${hotelId}/incidents/${item.id}`, { status });
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    }
  };

  const handleDelete = async (item: Incident) => {
    if (!window.confirm(`确认删除 ${item.incident_no}（${item.room_no}）的故障记录？`)) return;
    try {
      await apiDelete(`/hotel/${hotelId}/incidents/${item.id}`);
      flash('已删除');
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    }
  };

  // 加载中 / 加载失败
  if (hotelLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
      </div>
    );
  }
  if (hotelErr || !hotel) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-700" />
        <p className="text-sm text-slate-400">{hotelErr || '酒店不存在或已停用'}</p>
        <Link
          to="/hotel"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-blue-500/90 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-400"
        >
          <ChevronLeft className="h-4 w-4" /> 返回运维中心
        </Link>
      </div>
    );
  }

  const theme = hotel.theme_color || '#38bdf8';
  const buildings = hotel.buildings?.length ? hotel.buildings : ['其他'];
  const categories = hotel.categories?.length ? hotel.categories : ['其他'];
  const deviceTypes = hotel.device_types?.length ? hotel.device_types : ['其他'];
  const currentOpen = (Number(stats.pending) || 0) + (Number(stats.processing) || 0);

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
      {/* 页头：返回键左对齐，标题区居中 */}
      <div className="mb-8">
        {module === 'select' ? (
          <Link
            to="/hotel"
            className="mb-8 inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-blue-400"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> 返回运维中心
          </Link>
        ) : (
          <button
            onClick={() => setModule('select')}
            className="mb-8 inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-cyan-400"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> 选择功能
          </button>
        )}
        <div className="text-center">
          <div
            className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-widest"
            style={{ borderColor: `${theme}44`, color: theme, backgroundColor: `${theme}10` }}
          >
            <Building2 className="h-3.5 w-3.5" />
            HOTEL OPERATIONS
          </div>
          <h1
            className="text-3xl font-bold tracking-tight md:text-4xl"
            style={{
              backgroundImage: `linear-gradient(90deg, ${theme}, ${theme}cc, ${theme})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {hotel.name}
          </h1>
          <p className="mt-2 text-sm text-slate-400">客房故障登记 · 跟踪处理 · 实时统计</p>
        </div>
      </div>

      {/* 统计卡片 */}
      {module !== 'select' && (
      <>
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
      </>
      )}

      {msg && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur animate-fade-in-up',
            msg.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/15 text-rose-300',
          )}
        >
          {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* 功能模块选择页 */}
      {module === 'select' && (
      <div className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => setModule('incident')}
          className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-left transition-all duration-300 hover:border-cyan-400/40 hover:bg-slate-900/80"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
            <Wrench className="h-6 w-6" />
          </div>
          <div className="text-lg font-semibold text-slate-100">故障登记</div>
          <div className="mt-1 text-sm text-slate-400">客房故障报障、处理与全程跟踪</div>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan-400">
            进入 <ChevronLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        <button
          onClick={() => setModule('dashboard')}
          className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-left transition-all duration-300 hover:border-cyan-400/40 hover:bg-slate-900/80"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="text-lg font-semibold text-slate-100">运维看板</div>
          <div className="mt-1 text-sm text-slate-400">故障趋势、类别分布与处理效率统计</div>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan-400">
            进入 <ChevronLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>
      </div>
      )}

      {module === 'incident' && (
      <>
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
                className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 py-2.5 pl-9 pr-3 text-base text-slate-200 placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 md:py-2 md:text-sm"
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
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-16 rounded bg-slate-700/50" />
                    <div className="h-5 w-20 rounded bg-slate-700/30" />
                  </div>
                  <div className="mt-2 h-3 w-48 rounded bg-slate-700/30" />
                  <div className="mt-1 h-3 w-32 rounded bg-slate-700/20" />
                </div>
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="暂无故障记录"
              description="提交第一条故障报障记录，开始跟踪处理流程"
            />
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
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Clock3 className="h-3 w-3" /> 创建 {formatTime(item.created_at)}
                          </span>
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
                            <img src={item.attachment} alt="故障附件" loading="lazy" className="h-14 w-20 object-cover" />
                          </a>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" /> 等待 {formatDuration(item.wait_duration)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Timer className="h-3 w-3" /> 总耗时 {formatDuration(item.total_duration)}
                          </span>
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
                        <button
                          onClick={() => handleEdit(item)}
                          title="编辑记录"
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                            editingId === item.id
                              ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                              : 'border-slate-600/40 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                          )}
                        >
                          <Pencil className="h-3 w-3" /> 编辑
                        </button>
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
              <h2 className="text-base font-semibold text-slate-100">
                {editingId ? '编辑记录' : '故障登记'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {editingId ? `编辑 #${editingIncident?.incident_no}` : '新记录'}
              </span>
            </div>

            <div className="space-y-3.5">
              <Field label="故障编号" auto>
                <input
                  disabled
                  value="提交后自动生成"
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs text-slate-500"
                />
              </Field>

              <Field label="房间号码" required error={errors.room_no}>
                <input
                  value={form.room_no}
                  onChange={(e) => {
                    const room = e.target.value;
                    setForm((f) => {
                      const b = autoBuilding(room, hotel?.buildings);
                      return { ...f, room_no: room, building: b };
                    });
                    if (errors.room_no && room.trim()) setErrors((er) => ({ ...er, room_no: undefined }));
                  }}
                  placeholder="如 51888（按后台楼栋前缀自动识别）"
                  className={cn(
                    'w-full rounded-lg border bg-slate-950/50 px-3 py-2.5 text-base outline-none transition-colors md:py-2 md:text-sm',
                    errors.room_no
                      ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-700/70 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20',
                    'text-slate-200 placeholder:text-slate-600'
                  )}
                />
              </Field>

              <Field label="酒店楼栋" auto>
                <div className="rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-sm text-slate-300">
                  {form.building || '输入房间号后自动识别'}
                </div>
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

              <Field label="故障类别" required error={errors.category}>
                <select
                  value={form.category}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, category: e.target.value }));
                    if (errors.category && e.target.value) setErrors((er) => ({ ...er, category: undefined }));
                  }}
                  className={cn(
                    'w-full rounded-lg border bg-slate-950/50 px-3 py-2.5 text-base outline-none transition-colors md:py-2 md:text-sm',
                    errors.category
                      ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-700/70 focus:border-blue-500/60',
                    'text-slate-200'
                  )}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="设备类型" required error={errors.device_type}>
                <select
                  value={form.device_type}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, device_type: e.target.value }));
                    if (errors.device_type && e.target.value) setErrors((er) => ({ ...er, device_type: undefined }));
                  }}
                  className={cn(
                    'w-full rounded-lg border bg-slate-950/50 px-3 py-2.5 text-base outline-none transition-colors md:py-2 md:text-sm',
                    errors.device_type
                      ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-700/70 focus:border-blue-500/60',
                    'text-slate-200'
                  )}
                >
                  {deviceTypes.map((d) => (
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
                  className="w-full resize-none rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-2.5 text-base text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 md:py-2 md:text-sm"
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
                    {editingIncident ? editingIncident.created_by_name || '游客' : user?.name || user?.username || '游客'}
                  </div>
                </Field>
                <Field label="创建时间" auto>
                  <div className="rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs text-slate-500">
                    {editingIncident ? formatTime(editingIncident.created_at) : '自动生成'}
                  </div>
                </Field>
              </div>

              <div className="flex gap-2 pt-1">
                {editingId ? (
                  <>
                    <button
                      onClick={() => resetForm(false)}
                      disabled={submitting}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800/70 py-2.5 text-sm font-medium text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-700/70 disabled:opacity-50"
                    >
                      取消编辑
                    </button>
                    <button
                      onClick={() => handleSubmit(false)}
                      disabled={submitting}
                      className="flex-1 rounded-xl bg-cyan-500/90 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_hsl(189_94%_43%/0.3)] transition-all hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {submitting ? '保存中…' : '保存修改'}
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
              <p className="text-center text-[11px] text-slate-600">
                {editingId ? '编辑模式：修改后点击保存修改' : '编号、等待时长、总耗时、创建信息提交后自动生成'}
              </p>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {module === 'dashboard' && (
        <Dashboard incidents={incidents} loading={loading} />
      )}
    </div>
  );
}

function Dashboard({ incidents, loading }: { incidents: Incident[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  const total = incidents.length;
  const done = incidents.filter((i) => i.status === 'done').length;
  const open = total - done;
  const doneRate = total ? Math.round((done / total) * 100) : 0;

  // 近 7 天每日新增
  const days: { label: string; count: number }[] = [];
  for (let d = 6; d >= 0; d--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    const key = `${dt.getMonth() + 1}/${dt.getDate()}`;
    const count = incidents.filter((i) => {
      const cd = new Date(i.created_at);
      return cd.getMonth() === dt.getMonth() && cd.getDate() === dt.getDate();
    }).length;
    days.push({ label: key, count });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  // 类别分布
  const catMap = new Map<string, number>();
  incidents.forEach((i) => catMap.set(i.category, (catMap.get(i.category) || 0) + 1));
  const cats = [...catMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = Math.max(1, ...cats.map((c) => c[1]));

  // 楼栋分布
  const bMap = new Map<string, number>();
  incidents.forEach((i) => bMap.set(i.building || '其他', (bMap.get(i.building || '其他') || 0) + 1));
  const buildings = [...bMap.entries()].sort((a, b) => b[1] - a[1]);

  // 平均处理时长（分钟）
  const doneItems = incidents.filter((i) => i.status === 'done' && i.total_duration);
  const avgMin = doneItems.length
    ? Math.round(doneItems.reduce((s, i) => s + Number(i.total_duration), 0) / doneItems.length)
    : 0;

  const cards = [
    { label: '故障总数', value: total, cls: 'text-slate-100' },
    { label: '未完成', value: open, cls: 'text-amber-300' },
    { label: '完成率', value: `${doneRate}%`, cls: 'text-emerald-300' },
    { label: '平均处理时长', value: avgMin ? (avgMin < 60 ? `${avgMin} 分` : `${(avgMin / 60).toFixed(1)} 小时`) : '-', cls: 'text-cyan-300' },
  ];

  return (
    <div className="space-y-6">
      {/* 顶部小统计 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className={cn('mt-1 text-2xl font-bold tabular-nums', card.cls)}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 近 7 天趋势 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 text-sm font-semibold text-slate-100">近 7 天新增故障</div>
          <div className="flex h-32 items-end gap-2">
            {days.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] text-slate-400">{d.count || ''}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-cyan-500/40 to-cyan-400/80"
                  style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? '6px' : '2px' }}
                />
                <span className="text-[10px] text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 类别分布 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 text-sm font-semibold text-slate-100">故障类别分布</div>
          {cats.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">暂无数据</div>
          ) : (
            <div className="space-y-3">
              {cats.map(([name, count]) => (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-300">{name}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      style={{ width: `${(count / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 楼栋分布 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:col-span-2">
          <div className="mb-4 text-sm font-semibold text-slate-100">楼栋分布</div>
          {buildings.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">暂无数据</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {buildings.map(([name, count]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-300"
                >
                  {name}
                  <span className="font-semibold text-cyan-300">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function Field({
  label,
  required,
  auto,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  auto?: boolean;
  error?: string;
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
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
