import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';
import SkillBar from '@/components/SkillBar';
import { SKILLS, SITE_INFO } from '@/data/site';

export default function SkillsSection() {
  return (
    <section className="relative border-y border-border/50 bg-card/30">
      <div className="mx-auto grid max-w-6xl gap-14 px-5 py-24 md:px-8 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Capabilities" title="技术栈与能力" />
          <div className="grid gap-7">
            {SKILLS.map((skill, index) => (
              <Reveal key={skill.name} delay={index * 0.05}>
                <SkillBar skill={skill} />
              </Reveal>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <Reveal>
            <div className="glow-border rounded-2xl bg-card/70 p-8 backdrop-blur-sm">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/40">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                不止于写代码
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                我关注从需求到交付的完整链路：产品设计、工程实现、性能优化与团队协作。
                相信清晰的技术选型和克制的设计，能让产品走得更远。
              </p>
              <p className="mt-4 font-mono text-xs text-muted-foreground">
                {'// '}{SITE_INFO.tagline}
              </p>
              <Link
                to="/about"
                className="group mt-7 inline-flex items-center gap-2 font-mono text-sm text-primary transition-colors hover:text-accent"
              >
                <span className="border-b border-primary/40 pb-0.5">了解更多关于我</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
