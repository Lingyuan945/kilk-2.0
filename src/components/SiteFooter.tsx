import { useEffect, useState } from 'react';

export default function SiteFooter() {
  const [nearBottom, setNearBottom] = useState(false);

  // 手机端：页脚常驻底部小条，滚动到接近页面底部时展开铺出完整内容
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const bottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 80;
      setNearBottom(bottom);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md md:static md:inset-auto">
      <div className="mx-auto max-w-6xl px-5 py-2 md:px-8 md:py-4">
        {/* 常驻基础行 */}
        <div className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <p className="text-xs font-semibold text-slate-100 md:text-sm">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">kilk</span>
              <span className="ml-1.5 text-[10px] font-normal text-slate-500 md:text-xs">2.0</span>
            </p>
            <p className="text-[11px] text-slate-400 md:text-xs">© 2026 kilk · 由 Ling 开发</p>
          </div>

          {/* 桌面端直接在常驻行显示完整信息；手机端预留展开区 */}
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noreferrer"
            className="hidden text-[11px] text-slate-400 transition-colors hover:text-cyan-400 md:inline md:text-xs"
          >
            琼ICP备2026013449号
          </a>
        </div>

        {/* 手机端展开区：滚到页面底部时铺出（桌面端隐藏，保持普通页脚） */}
        <div
          className={`grid transition-all duration-300 md:hidden ${
            nearBottom ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-800/60 pt-1.5">
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-400 transition-colors hover:text-cyan-400"
              >
                琼ICP备2026013449号
              </a>
              <span className="text-[10px] text-slate-600">Powered by React + Vite</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
