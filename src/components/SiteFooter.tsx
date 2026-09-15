export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <p className="text-sm font-semibold text-slate-100">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">kilk</span>
              <span className="ml-2 text-xs font-normal text-slate-500">2.0</span>
            </p>
            <p className="text-xs text-slate-400">© 2026 kilk · 由 Ling 开发</p>
          </div>

          <div className="flex flex-col items-center gap-1 md:items-end">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 transition-colors hover:text-cyan-400"
            >
              琼ICP备2026013449号
            </a>
            <p className="text-[11px] text-slate-600">Powered by React + Vite</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
