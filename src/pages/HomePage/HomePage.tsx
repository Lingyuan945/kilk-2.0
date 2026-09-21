import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Download, ArrowRight, TerminalSquare } from 'lucide-react';
import { useHomeContent, formatTime } from '@/hooks/useSiteData';
import { apiGet } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Notice = { id: number; title: string; content: string; is_pinned: number; created_at: string };

export default function HomePage() {
  const { data: home, loading: homeLoading } = useHomeContent();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);

  useEffect(() => {
    apiGet<{ data: Notice[] }>('/notice')
      .then((res) => setNotices(res.data))
      .catch(() => {})
      .finally(() => setNoticesLoading(false));
  }, []);

  const latestNotices = notices.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      {/* Banner：主视觉 */}
      {homeLoading ? (
        <Skeleton className="h-56 w-full rounded-2xl" />
      ) : home ? (
        <div className="relative mb-10 animate-fade-in-up">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
              <TerminalSquare className="h-3.5 w-3.5" />
              SYSTEM ONLINE · v2.0
            </p>
            <h1 className="text-glow mb-4 text-2xl font-bold text-white md:text-4xl">
              {home.banner_title}
            </h1>
            <p className="max-w-xl whitespace-pre-line text-sm leading-relaxed text-slate-300 md:text-base">
              {home.banner_desc}
            </p>
          </div>
        </div>
      ) : null}

      {/* 核心业务 */}
      {home && (
        <section className="mb-12">
          <h2 className="mb-5 animate-fade-in-up flex items-center gap-2 text-xl font-bold text-slate-100">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
            发展规划
          </h2>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-4">
            {[
              { title: home.card1_title, text: home.card1_text },
              { title: home.card2_title, text: home.card2_text },
              { title: home.card3_title, text: home.card3_text },
            ].map((card, i) => (
              <div key={i} className={`animate-fade-in-up stagger-delay-${i + 1}`}>
                <Card className="glass-card glass-card-hover h-full hover-lift">
                  <CardContent className="p-2.5 md:p-6">
                    <h3 className="mb-0.5 truncate text-[13px] font-semibold text-blue-400 md:mb-2 md:text-base">
                      {card.title}
                    </h3>
                    <p className="line-clamp-2 text-[11px] leading-snug text-slate-400 md:line-clamp-none md:text-sm md:leading-relaxed">
                      {card.text}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 常用入口 */}
      <section className="mb-12">
        <h2 className="mb-5 animate-fade-in-up flex items-center gap-2 text-xl font-bold text-slate-100">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
          常用入口
        </h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-4">
          <div className="animate-fade-in-up stagger-delay-1">
            <Link to="/notice" className="group block h-full">
              <Card className="glass-card glass-card-hover h-full hover-lift">
                <CardContent className="flex items-center gap-2.5 p-3 md:flex-col md:items-center md:p-8 md:text-center">
                  <div className="icon-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_24px_hsl(217_91%_60%/0.25)] md:h-14 md:w-14">
                    <Megaphone className="h-4 w-4 md:h-7 md:w-7" />
                  </div>
                  <div className="min-w-0 flex-1 md:flex-none">
                    <h3 className="truncate text-[13px] font-semibold text-slate-100 md:mb-2 md:text-lg">平台公告中心</h3>
                    <p className="hidden text-sm leading-relaxed text-slate-400 md:mb-5 md:block">
                      平台公告与最新动态、服务通知与维护安排，第一时间了解重要信息
                    </p>
                  </div>
                  <span className="shrink-0 text-blue-400 md:inline-flex md:items-center md:gap-1 md:text-sm md:font-medium md:transition-transform md:duration-300 md:group-hover:translate-x-1">
                    查看公告 <ArrowRight className="hidden h-4 w-4 md:inline" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="animate-fade-in-up stagger-delay-2">
            <Link to="/service" className="group block h-full">
              <Card className="glass-card glass-card-hover h-full hover-lift">
                <CardContent className="flex items-center gap-2.5 p-3 md:flex-col md:items-center md:p-8 md:text-center">
                  <div className="icon-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-[0_0_24px_hsl(262_83%_60%/0.25)] md:h-14 md:w-14">
                    <Download className="h-4 w-4 md:h-7 md:w-7" />
                  </div>
                  <div className="min-w-0 flex-1 md:flex-none">
                    <h3 className="truncate text-[13px] font-semibold text-slate-100 md:mb-2 md:text-lg">服务支持中心</h3>
                    <p className="hidden text-sm leading-relaxed text-slate-400 md:mb-5 md:block">
                      团队共享资源与作品下载中心，随时下载需要的文档、软件与工具包
                    </p>
                  </div>
                  <span className="shrink-0 text-purple-400 md:inline-flex md:items-center md:gap-1 md:text-sm md:font-medium md:transition-transform md:duration-300 md:group-hover:translate-x-1">
                    进入服务 <ArrowRight className="hidden h-4 w-4 md:inline" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* 最新公告 */}
      <section>
        <div className="mb-5 flex animate-fade-in-up items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-100">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
            最新公告
          </h2>
          <Link to="/notice" className="text-sm text-blue-400 transition-colors hover:text-cyan-400 hover:underline">
            查看全部
          </Link>
        </div>
        {noticesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg bg-slate-800/60" />
            ))}
          </div>
        ) : latestNotices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 py-6 text-center text-sm text-slate-500">
            暂无公告
          </div>
        ) : (
          <div className="space-y-3">
            {latestNotices.map((notice, idx) => (
              <div key={notice.id} className={`animate-fade-in-up stagger-delay-${Math.min(idx + 1, 10)}`}>
                <Link to="/notice" className="glass-card glass-card-hover block rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-slate-100 md:text-base">
                        {notice.is_pinned === 1 && (
                          <Badge className="mr-2 border-amber-400/40 bg-amber-400/10 text-[10px] font-medium text-amber-300">置顶</Badge>
                        )}
                        {notice.title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{notice.content}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                        <span>公告</span>
                        <span>{formatTime(notice.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
