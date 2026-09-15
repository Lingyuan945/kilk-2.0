import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeInUp, staggerContainer, listItem } from '@/lib/animations';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

// 淡入上移组件
export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

// 交错列表容器（子元素依次入场）
export function StaggerList({ children, className, staggerDelay = 0.08 }: StaggerListProps) {
  return (
    <motion.div
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

// 交错列表项（配合 StaggerList 使用）
export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 16 },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface HoverCardProps {
  children: ReactNode;
  className?: string;
  liftAmount?: number;
}

// 悬浮卡片（hover 时上浮 + 阴影增强）
export function HoverCard({ children, className, liftAmount = -4 }: HoverCardProps) {
  return (
    <motion.div
      whileHover={{
        y: liftAmount,
        transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
