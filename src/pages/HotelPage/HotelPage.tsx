import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2, Wrench, Clock3, CheckCircle2, ArrowRight, Hotel as HotelIcon } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';

type HotelStat = {
  id: number;
  name: string;
  code: string;
  theme_color: string;
  buildings: string[];
  categories: string[];
  device_types: string[];
  enabled: number;
  sort: number;
  pending: number;
  processing: number;
  done: number;
  total: number;
};

export default function HotelPage() {
  const [hotels, setHotels] = useState<HotelStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ data: HotelStat[] }>('/hotels');
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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      {/* 页头 */}
      <div className="mb-10 text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold tracking-widest text-cyan-300">
          <HotelIcon className="h-3.5 w-3.5" />
          HOTEL OPERATIONS
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
            酒店运维中心
          </span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">选择酒店 · 客房故障登记 · 跟踪处理 · 实时统计</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
        </div>
      ) : hotels.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-700/70 py-20 text-slate-500">
          <Building2 className="h-9 w-9 opacity-40" />
          <p className="text-sm">暂无酒店，请在后台「酒店管理」中添加</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {hotels.map((h, i) => {
            const open = (Number(h.pending) || 0) + (Number(h.processing) || 0);
            return (
              <Link
                key={h.id}
                to={`/hotel/${h.id}`}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700',
                  'animate-fade-in-up',
                )}
                style={{
                  animationDelay: `${i * 60}ms`,
                  boxShadow: `0 0 0px 0px transparent`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 8px 40px -8px ${h.theme_color}55, 0 0 0 1px ${h.theme_color}44`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* 顶部主题色光条 */}
                <div
                  className="absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity group-hover:opacity-100"
                  style={{ background: `linear-gradient(90deg, transparent, ${h.theme_color}, transparent)` }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105"
                      style={{
                        borderColor: `${h.theme_color}55`,
                        backgroundColor: `${h.theme_color}18`,
                        color: h.theme_color,
                      }}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-slate-100">{h.name}</h2>
                      <p className="text-xs text-slate-500">
                        {h.buildings.length} 个楼栋 · {h.categories.length} 类故障 · {h.device_types.length} 类设备
                      </p>
                    </div>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-300 group-hover:gap-2"
                    style={{ borderColor: `${h.theme_color}44`, color: h.theme_color, backgroundColor: `${h.theme_color}10` }}
                  >
                    进入运维 <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>

                {/* 统计 */}
                <div className="mt-5 grid grid-cols-4 gap-2">
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-2 py-2.5 text-center">
                    <div className="text-lg font-bold tabular-nums text-rose-300">{open}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">当前故障</div>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-2 py-2.5 text-center">
                    <div className="text-lg font-bold tabular-nums text-amber-300">{h.pending}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">待处理</div>
                  </div>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-2 py-2.5 text-center">
                    <div className="text-lg font-bold tabular-nums text-blue-300">{h.processing}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">处理中</div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-2 py-2.5 text-center">
                    <div className="text-lg font-bold tabular-nums text-emerald-300">{h.done}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">已完成</div>
                  </div>
                </div>

                {/* 底部辅助 */}
                <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> 故障登记
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" /> 实时跟踪
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> 自动统计
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
