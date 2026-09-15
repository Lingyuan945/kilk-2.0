import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Mail, Globe, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import CodeSphere from '@/components/CodeSphere';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';
import SkillBar from '@/components/SkillBar';
import SocialIcon from '@/components/SocialIcon';
import { apiGet } from '@/lib/api';
import type { LingProfile } from '@/types';

// 技术支持 → 官网链接映射
const TECH_LINKS: Record<string, string> = {
  React: 'https://react.dev/',
  Vite: 'https://vite.dev/',
  TypeScript: 'https://www.typescriptlang.org/',
  'Tailwind CSS': 'https://tailwindcss.com/',
  'shadcn/ui': 'https://ui.shadcn.com/',
  'React Router': 'https://reactrouter.com/',
  ECharts: 'https://echarts.apache.org/',
  'Node.js': 'https://nodejs.org/',
  Express: 'https://expressjs.com/',
  PostgreSQL: 'https://www.postgresql.org/',
  pg: 'https://node-postgres.com/',
  bcrypt: 'https://www.npmjs.com/package/bcrypt',
  JWT: 'https://jwt.io/',
  Docker: 'https://www.docker.com/',
  Git: 'https://git-scm.com/',
  Nginx: 'https://nginx.org/',
  'REST API': 'https://restfulapi.net/',
  SQL: 'https://www.postgresql.org/docs/current/sql.html',
};

export default function LingPage() {
  const [profile, setProfile] = useState<LingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<{ data: LingProfile }>('/ling')
      .then((res) => setProfile(res.data))
      .catch((e: Error) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8">
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl bg-slate-800/60" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-32 w-full rounded-2xl bg-slate-800/60" />
            <Skeleton className="h-32 w-full rounded-2xl bg-slate-800/60" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-20 md:px-8">
        <Card className="glass-card border-0">
          <CardContent className="py-16 text-center">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-lg font-bold text-slate-100">内容加载失败</h2>
            <p className="text-sm text-slate-400">{error || '暂无内容'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      {/* ===== Hero：终端风格 ===== */}
      <section className="animate-fade-in-up mb-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="mb-3 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.28em] text-blue-400">
              <span className="h-px w-8 bg-blue-500/60" />
              About Ling
            </p>
            {/* 头像 + 姓名 */}
            <div className="flex items-center gap-5">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="h-20 w-20 shrink-0 rounded-full border-2 border-blue-500/50 object-cover shadow-[0_0_25px_hsl(217_91%_60%/0.35)]"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-3xl font-bold text-white shadow-[0_0_25px_hsl(217_91%_60%/0.35)]">
                  {profile.avatar_initial}
                </div>
              )}
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-100 md:text-5xl">
                {profile.name}
                <span className="mt-2 block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-xl font-semibold text-transparent md:text-3xl">
                  {profile.role}
                </span>
              </h1>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">
              {profile.tagline} —— {profile.bio}
            </p>
          </div>

          {/* 3D 代码球 */}
          <CodeSphere size={320} speed={0.3} />
        </div>
      </section>

      {/* ===== 技术栈 ===== */}
      <section className="mb-14">
        <SectionHeading eyebrow="Capabilities" title="技术栈" />
        <div className="grid gap-x-14 gap-y-7 md:grid-cols-2">
          {profile.skills.map((skill, index) => (
            <Reveal key={skill.name} delay={(index % 2) * 0.06}>
              <SkillBar skill={skill} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== 技术支持 ===== */}
      <section className="mb-14">
        <SectionHeading
          eyebrow="Tech Stack"
          title="技术支持"
          description="前端 · 后端 · 数据库，点击技术直达官网。"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {profile.projects.map((group, index) => (
            <Reveal key={group.id} delay={(index % 3) * 0.08}>
              <Card className="glow-border glow-border-hover group relative h-full overflow-hidden border-border/60 bg-card/70 backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                      {group.title}
                    </h3>
                    {group.year ? (
                      <span className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                        {group.year}
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                      </span>
                    ) : (
                      <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">{group.description}</p>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-1.5">
                  {group.tech.map((t) => {
                    const href = TECH_LINKS[t];
                    return href ? (
                      <a key={t} href={href} target="_blank" rel="noopener noreferrer">
                        <Badge
                          variant="outline"
                          className="cursor-pointer border-border/70 bg-secondary/50 font-mono text-[11px] text-muted-foreground transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
                        >
                          {t}
                        </Badge>
                      </a>
                    ) : (
                      <Badge
                        key={t}
                        variant="outline"
                        className="border-border/70 bg-secondary/50 font-mono text-[11px] text-muted-foreground"
                      >
                        {t}
                      </Badge>
                    );
                  })}
                </CardFooter>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== 经历时间线 ===== */}
      {profile.timeline.length > 0 && (
        <section className="mb-14">
          <SectionHeading eyebrow="Journey" title="经历与教育" />
          <div className="relative ml-2 border-l border-slate-700/70 pl-8 md:ml-4 md:pl-10">
            {profile.timeline.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.06}>
                <div className="group relative pb-10 last:pb-0">
                  <span className="absolute -left-[41px] top-1 flex h-3 w-3 items-center justify-center md:-left-[49px]">
                    <span className="absolute h-3 w-3 rounded-full bg-blue-500/30 transition-all duration-300 group-hover:scale-150" />
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_hsl(217_91%_60%_/_0.9)]" />
                  </span>
                  <div className="glow-border-hover rounded-xl border border-slate-700/60 bg-slate-900/60 p-6 backdrop-blur-sm transition-colors hover:border-blue-500/40">
                    <p className="font-mono text-xs uppercase tracking-widest text-blue-400">{item.period}</p>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-100">{item.title}</h3>
                    <p className="mt-1 text-sm font-medium text-cyan-400">{item.org}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ===== 联系 ===== */}
      {/* ===== 联系 ===== */}
      <section>
        <SectionHeading eyebrow="Contact" title="联系我" description="合作机会、技术交流，欢迎随时联系。" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {profile.contacts.map((contact, index) => {
            // 根据 label 匹配图标
            const labelLower = contact.label.toLowerCase();
            const isGithub = labelLower.includes('github');
            const Icon = isGithub
              ? null
              : labelLower.includes('mail') || labelLower.includes('邮箱') || labelLower.includes('email')
                ? Mail
                : labelLower.includes('site') || labelLower.includes('网站') || labelLower.includes('web')
                  ? Globe
                  : labelLower.includes('city') || labelLower.includes('城市') || labelLower.includes('位置') || labelLower.includes('location')
                    ? MapPin
                    : labelLower.includes('phone') || labelLower.includes('电话')
                      ? Phone
                      : MessageCircle;

            const CardContent = (
              <div className="group relative h-full overflow-hidden rounded-xl border border-slate-700/60 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-5 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/50 hover:shadow-[0_0_25px_hsl(217_91%_60%/0.15)]">
                {/* 悬停发光效果 */}
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl transition-all duration-500 group-hover:bg-blue-500/20 group-hover:blur-3xl" />
                <div className="relative">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 transition-all duration-300 group-hover:bg-blue-500/20 group-hover:text-blue-300 group-hover:shadow-[0_0_15px_hsl(217_91%_60%/0.3)]">
                      {isGithub ? (
                        <SocialIcon name="github" className="h-5 w-5" />
                      ) : (
                        Icon && <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-slate-400 transition-colors group-hover:text-blue-300">{contact.label}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-200 transition-colors group-hover:text-white">{contact.value}</p>
                </div>
                {contact.href && (
                  <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-slate-600 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-400 group-hover:opacity-100" />
                )}
              </div>
            );

            return (
              <Reveal key={contact.label} delay={index * 0.06}>
                {contact.href ? (
                  <a
                    href={contact.href}
                    target={contact.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    className="block h-full"
                  >
                    {CardContent}
                  </a>
                ) : (
                  CardContent
                )}
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <Reveal className="mt-14 text-center">
        <Button asChild size="lg" className="gap-2 bg-blue-600 hover:bg-blue-500">
          <a href={`mailto:${profile.email}`}>
            <Mail className="h-4 w-4" />
            联系 {profile.name}
          </a>
        </Button>
      </Reveal>
    </div>
  );
}
