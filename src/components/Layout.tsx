import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import TechBackground from '@/components/TechBackground';

// 空闲时预加载全部页面 chunk：首次访问任意页面后，其余页面切换即时渲染，消除白屏
const PREFETCH_CHUNKS = [
  () => import('@/pages/AboutPage/AboutPage'),
  () => import('@/pages/HomePage/HomePage'),
  () => import('@/pages/NoticePage/NoticePage'),
  () => import('@/pages/ServicePage/ServicePage'),
  () => import('@/pages/UserProfilePage/UserProfilePage'),
  () => import('@/pages/AdminPage/AdminPage'),
  () => import('@/pages/LingPage/LingPage'),
  () => import('@/pages/DevelopersListPage/DevelopersListPage'),
  () => import('@/pages/DeveloperCardManagePage/DeveloperCardManagePage'),
  () => import('@/pages/HotelPage/HotelPage'),
  () => import('@/pages/HotelPage/HotelDetailPage'),
  () => import('@/pages/NotFoundPage/NotFoundPage'),
];

/** 内容区加载占位：导航栏与页脚常驻，仅内容区短暂显示，避免整页白块 */
function ContentFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-10 py-8 backdrop-blur">
        <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
        <p className="text-xs text-slate-500">页面加载中…</p>
      </div>
    </div>
  );
}

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

  // 空闲预加载：路由首次挂载后，浏览器空闲时拉取其余页面 chunk
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      PREFETCH_CHUNKS.forEach((load) => load().catch(() => {}));
    };
    const id = typeof requestIdleCallback === 'function'
      ? requestIdleCallback(run, { timeout: 2000 })
      : setTimeout(run, 800);
    return () => {
      cancelled = true;
      if (typeof requestIdleCallback === 'function') cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

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
          <Suspense fallback={<ContentFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* 页脚作为 flex 子项：内容不足一屏时贴底，不悬空 */}
      <SiteFooter />
    </div>
  );
}
