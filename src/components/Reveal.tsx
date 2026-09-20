import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * 渐入上移动画：使用 CSS 动画（animation 由浏览器合成器驱动，不依赖 JS rAF）。
 * 原实现基于 framer-motion whileInView，在部分环境（内置浏览器）动画时间不推进时
 * 内容会永久停在 opacity 0（不可见），故改为 CSS 动画。
 */
export default function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <div
      className={`animate-fade-in-up ${className ?? ''}`.trim()}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
