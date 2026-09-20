import { useEffect, useRef } from 'react';

interface IParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
}

/**
 * 全屏蓝色光点粒子背景。
 * - 固定在视口底层，不拦截交互
 * - 尊重 prefers-reduced-motion：动画关闭时只画静态帧
 */
export default function TechBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let particles: IParticle[] = [];
    let rafId = 0;
    let running = true;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      initParticles();
    };

    const initParticles = () => {
      const count = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 26000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -0.06 - Math.random() * 0.18,
        r: 0.6 + Math.random() * 1.6,
        alpha: 0.12 + Math.random() * 0.5,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(199, 95%, 62%, ${p.alpha})`;
        ctx.fill();
      }
    };

    const step = () => {
      if (!running) return;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -6) {
          p.y = window.innerHeight + 6;
          p.x = Math.random() * window.innerWidth;
        }
        if (p.x < -6) p.x = window.innerWidth + 6;
        if (p.x > window.innerWidth + 6) p.x = -6;
      }
      draw();
      rafId = window.requestAnimationFrame(step);
    };

    resize();
    window.addEventListener('resize', resize);

    if (reduced) {
      draw();
    } else {
      rafId = window.requestAnimationFrame(step);
    }

    return () => {
      running = false;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-70"
    />
  );
}
