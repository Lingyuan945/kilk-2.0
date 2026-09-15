import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';
import { TIMELINE } from '@/data/site';

export default function TimelineSection() {
  return (
    <section className="relative border-t border-border/50 bg-card/30">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <SectionHeading eyebrow="Journey" title="经历与教育" />
        <div className="relative ml-2 border-l border-border/70 pl-8 md:ml-4 md:pl-10">
          {TIMELINE.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <div className="group relative pb-12 last:pb-0">
                {/* 时间线节点 */}
                <span className="absolute -left-[41px] top-1 flex h-3 w-3 items-center justify-center md:-left-[49px]">
                  <span className="absolute h-3 w-3 rounded-full bg-primary/30 transition-all duration-300 group-hover:scale-150 group-hover:bg-primary/50" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(217_91%_60%_/_0.9)]" />
                </span>

                <div className="glow-border-hover rounded-xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-colors hover:border-primary/40">
                  <p className="font-mono text-xs uppercase tracking-widest text-primary">
                    {item.period}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-accent">{item.org}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
