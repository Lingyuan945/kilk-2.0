import { Download, FileArchive, Clock } from 'lucide-react';
import { useServiceFiles, formatTime } from '@/hooks/useSiteData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function formatFileSize(bytes: string): string {
  const size = Number(bytes);
  if (!size || isNaN(size)) return '未知';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ServicePage() {
  const { data: files, loading } = useServiceFiles();

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      <div className="animate-fade-in-up mb-6">
        <h1 className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">服务支持中心</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">团队共享资源与作品下载中心，随时下载需要的文档、软件与工具包</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg bg-slate-800/60" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <Card className="glass-card border-0">
          <CardContent className="flex flex-col items-center py-16">
            <FileArchive className="mb-3 h-12 w-12 text-slate-700" />
            <p className="text-sm text-slate-500">暂无可用资源</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {files.map((file: any, idx: number) => {
            const fileItems = file.versions || [];
            const totalDownloads = file.total_downloads || 0;
            return (
              <div key={file.id} className={`animate-fade-in-up stagger-delay-${Math.min(idx + 1, 10)}`}>
                <Card className="glass-card glass-card-hover border-0 hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="icon-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-[0_0_20px_hsl(262_83%_60%/0.2)]">
                            <FileArchive className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-slate-100">{file.title}</h3>
                            <p className="text-xs text-slate-500">{file.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="text-sm font-medium text-slate-200">{totalDownloads}</p>
                        <p className="text-xs text-slate-500">总下载</p>
                      </div>
                    </div>

                    {/* 文件版本列表 */}
                    {fileItems.length > 0 && (
                      <div className="mt-5 space-y-2 border-t border-slate-800 pt-4">
                        {fileItems.map((item: any, itemIdx: number) => (
                          <div
                            key={item.id}
                            className={`animate-fade-in-up stagger-delay-${Math.min(itemIdx + 1, 10)} flex items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-800/40 px-4 py-3 transition-colors hover:border-blue-500/30 hover:bg-slate-800/70`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-200">{item.file_name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span className="shrink-0">{formatFileSize(item.file_size)}</span>
                                <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                                  <Clock className="h-3 w-3" /> {formatTime(item.create_time)}
                                </span>
                                <Badge variant="secondary" className="shrink-0 border-slate-700 bg-slate-800/70 text-[10px] text-slate-400">
                                  {item.download_count} 次下载
                                </Badge>
                              </div>
                            </div>
                            <a
                              href={item.file_path}
                              download={item.file_name}
                              className="shrink-0"
                            >
                              <Button size="sm" variant="outline" className="gap-1 border-blue-500/40 text-blue-400 transition-all hover:scale-105 hover:border-cyan-400/60 hover:bg-blue-500/10 hover:text-cyan-300 active:scale-95">
                                <Download className="h-3.5 w-3.5" /> 下载
                              </Button>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
