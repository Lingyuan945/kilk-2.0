import Reveal from '@/components/Reveal';
import ProjectCard from '@/components/ProjectCard';
import { PROJECTS } from '@/data/site';

export default function ProjectsPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="tech-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 pb-8 pt-20 md:px-8 md:pt-28">
          <Reveal>
            <p className="mb-3 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.28em] text-primary">
              <span className="h-px w-8 bg-primary/60" />
              Projects
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              项目作品
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              从数据可视化到自动化工具，以下是我独立或主导完成的一些代表性项目。
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {PROJECTS.map((project, index) => (
            <Reveal key={project.id} delay={(index % 2) * 0.08}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
