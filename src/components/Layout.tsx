import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import TechBackground from '@/components/TechBackground';

export default function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);

  // 路由变化时：先重置滚动位置（避免新页面继承上一页的滚动偏移导致"滑过头"），
  // 再确保动画元素最终可见（兼容某些环境下 CSS 动画时间不推进的问题）
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      if (!mainRef.current) return;
      const animatedEls = mainRef.current.querySelectorAll(
        '.animate-fade-in-up, .animate-fade-in, .animate-scale-in, .animate-slide-in-left, .animate-slide-in-right, .animate-modal-in, .animate-overlay-in'
      );
      animatedEls.forEach((el) => {
        const animations = (el as HTMLElement).getAnimations();
        animations.forEach((anim) => {
          if (anim.currentTime === 0) anim.finish();
        });
      });
      // 动画播放完成后移除动画类，避免 fill 保留的 transform 影响内部 fixed 元素定位
      animatedEls.forEach((el) => el.classList.remove(
        'animate-fade-in-up', 'animate-fade-in', 'animate-scale-in',
        'animate-slide-in-left', 'animate-slide-in-right', 'animate-modal-in', 'animate-overlay-in'
      ));
    }, 1200);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* 科技感背景层：粒子 + 发光网格（常驻，不随路由重挂载） */}
      <TechBackground />
      <div className="grid-overlay pointer-events-none fixed inset-0 z-0" aria-hidden />

      <SiteHeader />
      <main className="relative z-10 flex-1 pb-16 md:pb-8" ref={mainRef}>
        {/* 页面内容直接渲染：不使用 framer-motion 路由过渡动画。
            部分环境（如内置浏览器）下动画时间不推进，会导致内容停在 opacity 0（页面空白）
            且 popLayout 退出层永不卸载（残留层堆叠）。稳定性优先，过渡动画移除。 */}
        <div className="min-h-[60vh]">
          <Outlet />
        </div>
      </main>

      {/* 页脚作为 flex 子项：内容不足一屏时贴底，不悬空 */}
      <SiteFooter />
    </div>
  );
}
