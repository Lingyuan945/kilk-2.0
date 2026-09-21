import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Loader2, Pin, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet } from '@/lib/api';
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

function formatTime(s?: string | null) {
  if (!s) return '-';
  const d = new Date(s);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NoticePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ data: Notice[] }>('/notice');
      setNotices(data.data);
    } catch {
      /* 列表失败静默 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      {/* 页头 */}
      <div className="mb-8 text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold tracking-widest text-cyan-300">
          <Megaphone className="h-3.5 w-3.5" />
          NOTICE
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
            公告
          </span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">平台公告与最新动态</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        </div>
      ) : notices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-700/70 py-16 text-slate-500">
          <Megaphone className="h-8 w-8 opacity-40" />
          <p className="text-sm">暂无公告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => {
            const pinned = notice.is_pinned === 1;
            const open = openId === notice.id;
            return (
              <div
                key={notice.id}
                className={cn(
                  'rounded-2xl border bg-slate-900/50 transition-all duration-300',
                  pinned
                    ? 'border-amber-400/30 bg-gradient-to-br from-amber-500/[0.06] to-transparent'
                    : 'border-slate-800 hover:border-slate-700',
                )}
              >
                <button
                  onClick={() => setOpenId(open ? null : notice.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left"
                >
                  {pinned && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                      <Pin className="h-3 w-3" /> 置顶
                    </span>
                  )}
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-100 md:text-base">
                    {notice.title}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">{formatTime(notice.created_at)}</span>
                  <span className="shrink-0 text-slate-500">
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </button>
                {open && (
                  <div className="border-t border-slate-800/80 px-5 py-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{notice.content}</p>
                    <p className="mt-3 text-xs text-slate-500">发布：{notice.author_name || '管理员'} · {formatTime(notice.created_at)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
