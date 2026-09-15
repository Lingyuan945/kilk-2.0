import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { IProject } from '@/data/site';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: IProject;
  className?: string;
}

export default function ProjectCard({ project, className }: ProjectCardProps) {
  return (
    <Card
      className={cn(
        'group glow-border glow-border-hover relative h-full overflow-hidden border-border/60 bg-card/70 backdrop-blur-sm',
        className,
      )}
    >
      {/* 顶部渐变光条 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {project.title}
          </h3>
          <span className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            {project.year}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
        <p className="mt-4 inline-flex rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
          {project.highlight}
        </p>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-1.5">
        {project.tech.map((t) => (
          <Badge
            key={t}
            variant="outline"
            className="border-border/70 bg-secondary/50 font-mono text-[11px] text-muted-foreground"
          >
            {t}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  );
}
