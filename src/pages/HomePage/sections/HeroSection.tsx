import { ArrowRight, MapPin, TerminalSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Typewriter from '@/components/Typewriter';
import { SITE_INFO } from '@/data/site';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* 网格背景 */}
      <div className="tech-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-5 py-20 md:px-8">
        <div className="grid w-full items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          {/* 左：主标题与 CTA */}
          <div>
            <p className="mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.28em] text-primary">
              <span className="h-px w-8 bg-primary/60" />
              Hello, I&apos;m
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
              {SITE_INFO.name}
              <span className="text-glow mt-2 block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-2xl font-semibold text-transparent md:text-4xl">
                {SITE_INFO.role}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {SITE_INFO.tagline} —— {SITE_INFO.bio}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="group gap-2">
                <Link to="/projects">
                  查看项目
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/contact">联系我</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {SITE_INFO.location}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                开放合作中
              </span>
            </div>
          </div>

          {/* 右：终端窗口 */}
          <div className="animate-float glow-border relative rounded-xl bg-card/80 backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[hsl(0_72%_55%_/_0.9)]" />
              <span className="h-3 w-3 rounded-full bg-[hsl(38_92%_50%_/_0.9)]" />
              <span className="h-3 w-3 rounded-full bg-[hsl(152_76%_42%_/_0.9)]" />
              <span className="ml-3 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <TerminalSquare className="h-3.5 w-3.5 text-primary" />
                developer.ts
              </span>
            </div>
            <div className="px-5 py-6">
              <Typewriter lines={SITE_INFO.hero} />
              <p className="mt-5 border-t border-border/50 pt-4 font-mono text-[11px] text-muted-foreground">
                {'// 当前位置：'}{SITE_INFO.location} · 持续接收新机会
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部渐变淡出 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
