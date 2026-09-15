import { useEffect, useState } from 'react';

export default function SiteFooter() {
  const [visible, setVisible] = useState(false);

  // 滚动到接近页面底部时，页脚从底部滑出平铺；离开底部时收回
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const nearBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 80;
      setVisible(nearBottom);
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
    <footer
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md transition-transform duration-300 md:static md:inset-auto md:translate-y-0 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5 md:px-8 md:py-4">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <p className="text-xs font-semibold text-slate-100 md:text-sm">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">kilk</span>
            <span className="ml-1.5 text-[10px] font-normal text-slate-500 md:text-xs">2.0</span>
          </p>
          <p className="text-[11px] text-slate-400 md:text-xs">© 2026 kilk · 由 Ling 开发</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-slate-400 transition-colors hover:text-cyan-400 md:text-xs"
          >
            琼ICP备2026013449号
          </a>
          <span className="hidden text-[10px] text-slate-600 sm:inline">Powered by React + Vite</span>
        </div>
      </div>
    </footer>
  );
}
