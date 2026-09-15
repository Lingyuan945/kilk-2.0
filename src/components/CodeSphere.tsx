import { useEffect, useRef } from 'react';

interface CodeSphereProps {
  words?: string[];
  size?: number;
  speed?: number;
}

const DEFAULT_WORDS = [
  'React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL',
  'PHP', 'MySQL', 'Python', 'Docker', 'Git',
  'Tailwind', 'Vite', 'REST API', 'GraphQL', 'WebSocket',
  'Linux', 'Nginx', 'AWS', 'CI/CD', 'Agile',
  'Full-Stack', 'Frontend', 'Backend', 'DevOps', 'UI/UX',
  'kilk 2.0', 'kilk 1.0', 'Open Source', 'Clean Code',
];

export default function CodeSphere({ words = DEFAULT_WORDS, size = 320, speed = 0.3 }: CodeSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const rotationRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const sphere = sphereRef.current;
    if (!sphere) return;

    const radius = size / 2 - 20;
    const wordList = words.length > 0 ? words : DEFAULT_WORDS;

    // 生成文字元素，分布在球体表面
    wordList.forEach((word, index) => {
      const el = document.createElement('span');
      el.textContent = word;
      el.className = 'code-sphere-word';

      // 使用斐波那契球面分布算法，让文字均匀分布
      const phi = Math.acos(-1 + (2 * index) / wordList.length);
      const theta = Math.sqrt(wordList.length * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      el.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
      el.style.opacity = '0.6';

      // 根据 z 位置设置不同的颜色和大小
      const zRatio = (z + radius) / (2 * radius);
      if (zRatio > 0.7) {
        el.style.color = 'hsl(217, 91%, 70%)';
        el.style.fontWeight = '600';
      } else if (zRatio > 0.4) {
        el.style.color = 'hsl(190, 80%, 60%)';
      } else {
        el.style.color = 'hsl(217, 50%, 50%)';
      }

      sphere.appendChild(el);
    });

    // 动画循环
    const animate = () => {
      const { x, y } = rotationRef.current;
      const { active, x: mouseX, y: mouseY } = mouseRef.current;

      if (active) {
        // 鼠标交互时，根据鼠标位置改变旋转方向
        rotationRef.current.x += (mouseY - 0.5) * speed * 2;
        rotationRef.current.y += (mouseX - 0.5) * speed * 2;
      } else {
        // 自动旋转
        rotationRef.current.x += speed * 0.3;
        rotationRef.current.y += speed;
      }

      if (sphere) {
        sphere.style.transform = `rotateX(${rotationRef.current.x}deg) rotateY(${rotationRef.current.y}deg)`;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      // 清理文字元素
      while (sphere.firstChild) {
        sphere.removeChild(sphere.firstChild);
      }
    };
  }, [words, size, speed]);

  // 鼠标交互
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      active: true,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center overflow-hidden"
      style={{ height: size, perspective: '800px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 中心光晕 */}
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />

      {/* 球体 */}
      <div
        ref={sphereRef}
        className="relative"
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
        }}
      />

      {/* 中心文字 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-600">Tech Stack</p>
          <p className="mt-1 bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-lg font-bold text-transparent">
            Full-Stack
          </p>
        </div>
      </div>

      {/* 提示文字 */}
      <div className="absolute bottom-3 left-0 right-0 text-center">
        <p className="hidden font-mono text-[10px] text-slate-600 sm:block">移动鼠标交互</p>
        <p className="font-mono text-[10px] text-slate-600 sm:hidden">触摸拖拽交互</p>
      </div>

      <style>{`
        .code-sphere-word {
          position: absolute;
          left: 50%;
          top: 50%;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          transition: opacity 0.3s;
          text-shadow: 0 0 8px currentColor;
        }
      `}</style>
    </div>
  );
}
