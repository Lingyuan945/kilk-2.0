import { cn } from '@/lib/utils';
import Reveal from '@/components/Reveal';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: SectionHeadingProps) {
  return (
    <Reveal className={cn('mb-10', align === 'center' && 'text-center')}>
      <p
        className={cn(
          'mb-3 font-mono text-xs font-medium uppercase tracking-[0.28em] text-primary',
          align === 'center' && 'flex items-center justify-center gap-3',
        )}
      >
        {align === 'center' && <span className="h-px w-8 bg-primary/50" />}
        {eyebrow}
        {align === 'center' && <span className="h-px w-8 bg-primary/50" />}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base',
            align === 'center' && 'mx-auto',
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}
