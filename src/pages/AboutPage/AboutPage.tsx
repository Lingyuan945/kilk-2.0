import { Code2, Server, Shield, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const FEATURES = [
  {
    icon: Code2,
    title: '现代化前端',
    desc: '基于 React 19 + TypeScript + Vite 构建，组件化架构，响应式设计，流畅的交互体验。',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    glow: 'shadow-[0_0_20px_hsl(217_91%_60%/0.2)]',
  },
  {
    icon: Server,
    title: '稳定可靠',
    desc: 'Node.js + Express 后端服务，PostgreSQL 数据库，JWT 身份认证，RESTful API 设计，前后端分离架构。',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    glow: 'shadow-[0_0_20px_hsl(262_83%_60%/0.2)]',
  },
  {
    icon: Shield,
    title: '安全防护',
    desc: 'bcrypt 密码哈希、CSRF 防护、XSS 过滤、SQL 注入防护、会话安全加固，全方位保障数据安全。',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    glow: 'shadow-[0_0_20px_hsl(160_84%_50%/0.2)]',
  },
  {
    icon: Heart,
    title: '持续迭代',
    desc: '功能持续优化更新，论坛、服务支持、用户系统等模块不断完善，欢迎反馈建议。',
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    glow: 'shadow-[0_0_20px_hsl(330_81%_60%/0.2)]',
  },
];

const TECH_STACK_ITEMS = [
  { icon: '⚛️', name: 'React 19', category: '前端' },
  { icon: '📘', name: 'TypeScript', category: '前端' },
  { icon: '⚡', name: 'Vite', category: '前端' },
  { icon: '🎨', name: 'Tailwind CSS', category: '前端' },
  { icon: '🧩', name: 'shadcn/ui', category: '前端' },
  { icon: '🛣️', name: 'React Router', category: '前端' },
  { icon: '🟢', name: 'Node.js', category: '后端' },
  { icon: '🚂', name: 'Express', category: '后端' },
  { icon: '🐘', name: 'PostgreSQL', category: '数据库' },
  { icon: '🔐', name: 'JWT', category: '后端' },
  { icon: '🛡️', name: 'bcrypt', category: '后端' },
  { icon: '🐧', name: 'Linux', category: '运维' },
  { icon: '🌐', name: 'Apache', category: '运维' },
  { icon: '🔒', name: 'SSL 证书', category: '运维' },
  { icon: '📦', name: 'Git', category: '运维' },
  { icon: '🔄', name: 'acme.sh', category: '运维' },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      {/* 标题区 */}
      <div className="animate-fade-in-up mb-10 text-center">
        <h1 className="text-glow mb-4 text-2xl font-bold text-white md:text-4xl">
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_hsl(217_91%_60%/0.35)]">
            关于 kilk
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
          kilk 是一个团队内部交流与资源共享平台，致力于为团队提供高效的沟通协作环境和便捷的资源管理服务。
        </p>
        <div className="animate-scale-in stagger-delay-2 mt-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-cyan-300 shadow-[0_0_20px_hsl(217_91%_60%/0.25)] md:px-4 md:py-1.5 md:text-sm">
          当前版本 2.0 · React 重构版
        </div>
      </div>

      {/* 特性 */}
      <section className="mb-12">
        <h2 className="mb-5 animate-fade-in-up flex items-center gap-2 text-xl font-bold text-slate-100">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
          平台特性
        </h2>
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className={`animate-fade-in-up stagger-delay-${i + 1}`}>
              <Card className={`glass-card glass-card-hover h-full ${f.glow} hover-lift`}>
                <CardContent className="flex flex-col gap-2 p-3 md:flex-row md:gap-4 md:p-6">
                  <div className={`icon-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${f.color} md:h-11 md:w-11`}>
                    <f.icon className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="mb-0.5 text-[13px] font-semibold text-slate-100 md:mb-1 md:text-base">{f.title}</h3>
                    <p className="text-[11px] leading-snug text-slate-400 md:text-sm md:leading-relaxed">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* 技术栈 */}
      <section className="mb-12">
        <h2 className="mb-5 animate-fade-in-up flex items-center gap-2 text-xl font-bold text-slate-100">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
          技术栈
        </h2>
        <div className="marquee relative overflow-hidden">
          <div className="marquee-track flex gap-3 md:gap-4">
            {[...TECH_STACK_ITEMS, ...TECH_STACK_ITEMS].map((tech, i) => (
              <div key={i} className="flex shrink-0 items-center gap-2.5 rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-2.5 md:gap-3 md:px-5 md:py-3">
                <span className="text-xl md:text-2xl">{tech.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-slate-100 md:text-sm">{tech.name}</p>
                  <p className="text-[10px] text-slate-400 md:text-xs">{tech.category}</p>
                </div>
              </div>
            ))}
          </div>
          {/* 渐变遮罩 */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-950 to-transparent md:w-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent to-slate-950 md:w-20" />
        </div>
      </section>

      {/* 开发者 */}
      <section className="animate-fade-in-up stagger-delay-3">
        <Card className="glass-card border-0 bg-gradient-to-br from-blue-600/15 via-slate-900/60 to-purple-600/15 transition-shadow hover:shadow-[0_0_40px_hsl(217_91%_60%/0.15)]">
          <CardContent className="p-5 text-center md:p-8">
            <h2 className="mb-2 text-base font-bold text-slate-100 md:text-lg">开发者</h2>
            <p className="text-xs text-slate-300 md:text-sm">
              由 <span className="font-semibold text-blue-400">Ling</span> 独立开发与维护
            </p>
            <p className="mt-2 text-[11px] text-slate-500 md:text-xs">
              如有问题或建议，欢迎在论坛发帖反馈
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
