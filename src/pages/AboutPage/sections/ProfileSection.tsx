import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Reveal from '@/components/Reveal';
import { CONTACT_INFO, SITE_INFO } from '@/data/site';

export default function ProfileSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-10 pt-20 md:px-8 md:pt-28">
      <div className="grid items-center gap-12 lg:grid-cols-[auto_1fr]">
        {/* 头像占位 */}
        <Reveal className="mx-auto lg:mx-0">
          <div className="glow-border relative flex h-44 w-44 items-center justify-center rounded-3xl bg-card/80 backdrop-blur-sm md:h-52 md:w-52">
            <span className="text-glow text-6xl font-bold text-primary md:text-7xl">
              {SITE_INFO.avatarInitial}
            </span>
            <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/50">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mb-3 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.28em] text-primary">
            <span className="h-px w-8 bg-primary/60" />
            About Me
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {SITE_INFO.name}
          </h1>
          <p className="mt-2 font-mono text-sm text-accent">{SITE_INFO.role}</p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {SITE_INFO.bio}
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            我热衷于把复杂问题拆解成优雅的工程方案，享受从一行代码到完整产品落地的过程。
            工作之外，我喜欢研究新技术、写写文章，并参与开源社区。
          </p>

          <dl className="mt-8 grid max-w-xl gap-3 font-mono text-sm sm:grid-cols-2">
            {CONTACT_INFO.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-muted-foreground">
                <dt className="text-primary">{'>'}</dt>
                <dd className="truncate">{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-9 flex flex-wrap gap-4">
            <Button asChild className="gap-2">
              <a href={`mailto:${SITE_INFO.email}`}>
                <Mail className="h-4 w-4" />
                发送邮件
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/projects">浏览项目</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
