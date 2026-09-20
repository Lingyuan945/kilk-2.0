import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserRound, Loader2, Code2, Palette, Server, ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';

interface DeveloperListItem {
  id: number;
  username: string;
  name: string;
  role: string;
  tagline: string;
  avatar_initial: string;
  sort: number;
  avatar: string | null;
  user_id: number | null;
}

type RoleCategory = 'fullstack' | 'frontend' | 'backend';

const ROLE_CONFIG: { key: RoleCategory; label: string; icon: typeof Code2; match: string[] }[] = [
  { key: 'fullstack', label: '全栈开发工程师', icon: Code2, match: ['全栈', 'fullstack', 'full-stack', 'full stack'] },
  { key: 'frontend', label: '前端工程师', icon: Palette, match: ['前端', 'frontend', 'front-end', 'front end'] },
  { key: 'backend', label: '后端工程师', icon: Server, match: ['后端', 'backend', 'back-end', 'back end'] },
];

// 多选头衔（role 以「 · 」分隔）：返回所有匹配的分类，一个开发者可同时出现在多段
function categorizeRoles(role: string): RoleCategory[] {
  const r = (role || '').toLowerCase();
  const keys: RoleCategory[] = [];
  for (const config of ROLE_CONFIG) {
    if (config.match.some((m) => r.includes(m.toLowerCase()))) keys.push(config.key);
  }
  return keys.length > 0 ? keys : ['fullstack'];
}

export default function DevelopersListPage() {
  const [developers, setDevelopers] = useState<DeveloperListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ data: DeveloperListItem[] }>('/developers')
      .then((res) => setDevelopers(res.data || []))
      .catch(() => setDevelopers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // 按角色分组
  const grouped: Record<RoleCategory, DeveloperListItem[]> = {
    fullstack: [],
    frontend: [],
    backend: [],
  };
  for (const dev of developers) {
    for (const key of categorizeRoles(dev.role)) grouped[key].push(dev);
  }
  for (const key of Object.keys(grouped) as RoleCategory[]) {
    grouped[key].sort((a, b) => a.sort - b.sort || a.id - b.id);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-20">
      {/* 页头 */}
      <div className="animate-fade-in-up mb-16 text-center">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-blue-400 md:text-xs">
            Developer Team
          </span>
        </div>
        <h1 className="text-glow mt-3 text-2xl font-bold text-white md:text-4xl">开发团队</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          与 kilk 一起成长的开发者们，按擅长方向分类展示，点击名片查看完整主页。
        </p>
      </div>

      {/* 分段 + 横向卡片网格 */}
      <div className="space-y-20">
        {ROLE_CONFIG.map((config) => {
          const list = grouped[config.key];
          const Icon = config.icon;
          return (
            <section key={config.key} className="animate-fade-in-up">
              {/* 分类标题 */}
              <div className="mb-8 flex items-center justify-center gap-3">
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-slate-700" />
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_14px_hsl(217_91%_60%/0.18)]">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-base font-semibold text-slate-100 md:text-lg">{config.label}</h2>
                <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-xs text-slate-400">{list.length} 人</span>
                <span className="h-px w-12 bg-gradient-to-l from-transparent to-slate-700" />
              </div>

              {/* 开发者横向卡片 */}
              {list.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-4">
                  {list.map((dev, idx) => {
                    const roles = (dev.role || '').split(' · ').filter(Boolean);
                    return (
                      <Link
                        key={dev.id}
                        to={`/developer/${dev.username}`}
                        className={`animate-fade-in-up stagger-delay-${Math.min(idx + 1, 8)} group relative flex w-full flex-col items-center rounded-2xl p-8 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900/30 hover:shadow-[0_0_35px_hsl(217_91%_60%/0.12)]`}
                      >
                        {/* 顶部光带 */}
                        <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100" />

                        {/* 头像 + 光环 */}
                        <div className="relative mb-4">
                          <span className="pointer-events-none absolute -inset-2 rounded-full bg-gradient-to-br from-blue-500/30 via-cyan-500/15 to-purple-500/20 opacity-70 blur-lg transition-opacity duration-300 group-hover:opacity-100" />
                          <span className="relative block h-20 w-20 overflow-hidden rounded-full border-2 border-blue-500/40 shadow-[0_0_22px_hsl(217_91%_60%/0.3)] transition-all duration-300 group-hover:border-blue-400/70 group-hover:shadow-[0_0_32px_hsl(217_91%_60%/0.5)]">
                            {dev.avatar ? (
                              <img src={dev.avatar} alt={dev.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/30 to-cyan-500/30 text-2xl font-bold text-blue-300">
                                {dev.avatar_initial || dev.name[0]}
                              </span>
                            )}
                          </span>
                          {/* 在线状态点 */}
                          <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-green-500" />
                        </div>

                        {/* 名称 */}
                        <h3 className="truncate text-base font-semibold text-slate-100 transition-colors group-hover:text-blue-400">
                          {dev.name}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-slate-500">@{dev.username}</p>

                        {/* 头衔徽章 */}
                        {roles.length > 0 && (
                          <div className="mt-2.5 flex max-w-full flex-wrap items-center justify-center gap-1.5">
                            {roles.slice(0, 2).map((r) => (
                              <Badge key={r} className="border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-300">
                                {r}
                              </Badge>
                            ))}
                            {roles.length > 2 && (
                              <Badge className="border-slate-700 bg-slate-800/70 text-[10px] text-slate-400">+{roles.length - 2}</Badge>
                            )}
                          </div>
                        )}

                        {/* 简介 */}
                        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                          {dev.tagline || '暂无简介'}
                        </p>

                        {/* 查看主页 */}
                        <span className="mt-3.5 inline-flex items-center gap-1 text-xs text-slate-600 transition-colors duration-300 group-hover:text-cyan-400">
                          查看主页
                          <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 py-12 text-center">
                  <UserRound className="mx-auto mb-2 h-7 w-7 text-slate-700" />
                  <p className="text-xs text-slate-600">暂无开发者</p>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* 全局空状态 */}
      {developers.length === 0 && (
        <div className="py-16 text-center">
          <UserRound className="mx-auto mb-4 h-14 w-14 text-slate-700" />
          <p className="text-sm text-slate-500">暂无开发者信息</p>
        </div>
      )}
    </div>
  );
}
