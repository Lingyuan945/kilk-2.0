import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProjectCard from '@/components/ProjectCard';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';
import { PROJECTS } from '@/data/site';

export default function FeaturedProjectsSection() {
  const featured = PROJECTS.slice(0, 3);

  return (
    <section className="relative mx-auto max-w-6xl px-5 py-24 md:px-8">
      <SectionHeading
        eyebrow="Selected Work"
        title="精选项目"
        description="一些让我骄傲的作品，覆盖数据可视化、自动化与协作工具。"
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {featured.map((project, index) => (
          <Reveal key={project.id} delay={index * 0.08}>
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-10 flex justify-center">
        <Link
          to="/projects"
          className="group inline-flex items-center gap-2 font-mono text-sm text-primary transition-colors hover:text-accent"
        >
          <span className="border-b border-primary/40 pb-0.5">查看全部项目</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </section>
  );
}
