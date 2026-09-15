import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TypewriterProps {
  lines: string[];
  className?: string;
}

/** 终端风格的逐字打字机：逐行打出，停顿后进入下一行 */
export default function Typewriter({ lines, className }: TypewriterProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (lines.length === 0) return;
    const current = lines[lineIndex];
    if (charIndex >= current.length) {
      // 整行打完，停顿后进入下一行（setTimeout 回调中的 setState 合法）
      const t = setTimeout(() => {
        setLineIndex((i) => (i + 1) % lines.length);
        setCharIndex(0);
      }, 1700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCharIndex((c) => c + 1), 36);
    return () => clearTimeout(t);
  }, [charIndex, lineIndex, lines]);

  const current = lines[lineIndex] ?? '';
  const shown = current.slice(0, charIndex);
  const done = charIndex >= current.length;

  return (
    <pre className={cn('font-mono text-sm leading-7 md:text-[15px]', className)}>
      <code>
        {shown}
        <span className="type-cursor" aria-hidden={!done} />
      </code>
    </pre>
  );
}
