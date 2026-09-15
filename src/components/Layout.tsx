import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import TechBackground from '@/components/TechBackground';

export default function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 路由变化时重放页面进入动画（不卸载 DOM，避免卡顿）
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.classList.remove('animate-page-enter');
    void el.offsetWidth; // 强制重排，确保动画重放
    el.classList.add('animate-page-enter');
  }, [location.pathname]);

  // 路由变化时，确保动画元素最终可见（兼容某些环境下 CSS 动画时间不推进的问题）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mainRef.current) return;
      const animatedEls = mainRef.current.querySelectorAll(
        '.animate-fade-in-up, .animate-fade-in, .animate-page-enter, .animate-scale-in, .animate-slide-in-left, .animate-slide-in-right, .animate-modal-in, .animate-overlay-in'
      );
      animatedEls.forEach((el) => {
        const animations = (el as HTMLElement).getAnimations();
        animations.forEach((anim) => {
          // 如果动画当前时间仍为 0，说明被暂停了，手动结束
          if (anim.currentTime === 0) {
            anim.finish();
          }
        });
      });
      // 动画播放完成后移除动画类，避免 fill 保留的 transform 影响内部 fixed 元素定位
      // （任何残留的 transform 都会成为 fixed 后代的包含块，导致底部导航/弹窗错位）
      animatedEls.forEach((el) => el.classList.remove(
        'animate-fade-in-up', 'animate-fade-in', 'animate-page-enter', 'animate-scale-in',
        'animate-slide-in-left', 'animate-slide-in-right', 'animate-modal-in', 'animate-overlay-in'
      ));
    }, 1200); // 等待动画正常完成（动画时长最长 0.5s + 延迟 0.5s）

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      <div className="relative flex min-h-screen flex-col overflow-x-hidden">
        {/* 科技感背景层：粒子 + 发光网格 */}
        <TechBackground />
        <div className="grid-overlay pointer-events-none fixed inset-0 z-0" aria-hidden />

        <SiteHeader />
        <main className="relative z-10 flex-1 pb-16 md:pb-8" ref={mainRef}>
          <div ref={contentRef} className="animate-page-enter min-h-[60vh]">
            <Outlet />
          </div>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
