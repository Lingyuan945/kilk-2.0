import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h1 className="text-glow mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-6xl font-bold text-transparent">
        404
      </h1>
      <p className="mb-8 text-lg text-slate-400">页面不存在</p>
      <Link
        to="/"
        className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition-all hover:scale-105 hover:border-cyan-400/60 hover:text-cyan-300"
      >
        返回首页
      </Link>
    </div>
  );
}
