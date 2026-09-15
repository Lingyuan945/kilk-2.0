export default function SiteFooter() {
  return (
    <footer className="sticky bottom-0 z-40 border-t border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
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
