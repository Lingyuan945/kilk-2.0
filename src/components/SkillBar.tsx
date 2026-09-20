import type { ISkill } from '@/data/site';

interface SkillBarProps {
  skill: ISkill;
  className?: string;
}

export default function SkillBar({ skill, className }: SkillBarProps) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{skill.name}</span>
        <span className="font-mono text-xs text-primary">{skill.level}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={skill.level}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={skill.name}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_hsl(217_91%_60%_/_0.65)] transition-[width] duration-700"
          style={{ width: `${skill.level}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{skill.note}</p>
    </div>
  );
}
