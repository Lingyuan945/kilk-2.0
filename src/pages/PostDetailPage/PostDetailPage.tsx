import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, User, MessageCircle, Clock, Send } from 'lucide-react';
import { usePostDetail, useCreateReply, formatTime, ROLE_NAMES, ROLE_COLORS } from '@/hooks/useSiteData';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, loading, error, reload } = usePostDetail(id || '');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createReply, loading: replyLoading } = useCreateReply();

  const [replyContent, setReplyContent] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  // 登录弹窗
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setReplyError(null);

    if (!user) {
      setAuthModalTab('login');
      setAuthModalOpen(true);
      return;
    }
    if (!replyContent.trim()) {
      setReplyError('请输入评论内容');
      return;
    }

    try {
      await createReply(id!, replyContent.trim());
      setReplyContent('');
      reload();
    } catch (err: any) {
      setReplyError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        <Skeleton className="mb-4 h-8 w-32 bg-slate-800/60" />
        <Skeleton className="mb-6 h-10 w-full bg-slate-800/60" />
        <Skeleton className="h-64 w-full rounded-lg bg-slate-800/60" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-16 text-center md:px-8">
        <h1 className="mb-2 text-xl font-bold text-slate-100">帖子不存在</h1>
        <p className="mb-6 text-sm text-slate-400">{error || '该帖子可能已被删除或不存在'}</p>
        <Link
          to="/forum"
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_hsl(217_91%_60%/0.4)] hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> 返回论坛
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">
      {/* 返回 */}
      <div className="animate-fade-in-up mb-6">
        <Link
          to="/forum"
          className="inline-flex items-center gap-1 text-sm text-slate-400 transition-all hover:translate-x-[-2px] hover:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" /> 返回论坛
        </Link>
      </div>

      {/* 帖子主体 */}
      <div className="animate-fade-in-up stagger-delay-1">
        <Card className="glass-card border-0">
          <CardContent className="p-4 md:p-8">
            {/* 标题 */}
            <h1 className="text-xl font-bold text-slate-100 md:text-2xl">{post.title}</h1>

            {/* 元信息 */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 border border-blue-500/30">
                  <AvatarImage src={post.avatar || undefined} alt={post.username} />
                  <AvatarFallback className="bg-blue-500/20 text-blue-300">{post.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-slate-200">
                  {post.author_name || post.username || '匿名'}
                </span>
                {post.role && (
                  <Badge className={cn('text-[10px]', ROLE_COLORS[post.role] || 'bg-slate-800 text-slate-300')}>
                    {ROLE_NAMES[post.role] || post.role}
                  </Badge>
                )}
              </div>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {formatTime(post.create_time)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {post.view_count} 浏览
              </span>
              {post.channel_name && <Badge variant="secondary" className="border-slate-700 bg-slate-800/70 text-slate-400">{post.channel_name}</Badge>}
            </div>

            <Separator className="my-4 bg-slate-800 md:my-6" />

            {/* 正文 */}
            <div className="whitespace-pre-line text-[15px] leading-6 text-slate-300 md:leading-7">
              {post.content}
            </div>

            {/* 帖子图片 */}
            {post.images && post.images.length > 0 && (
              <div className="mt-4 space-y-3 md:mt-6 md:space-y-4">
                {post.images.map((img: any, idx: number) => (
                  <div
                    key={img.id}
                    className={`animate-fade-in-up stagger-delay-${Math.min(idx + 1, 10)} overflow-hidden rounded-lg border border-slate-800`}
                  >
                    <img
                      src={img.image_path}
                      alt="帖子图片"
                      className="w-full cursor-pointer object-cover transition-transform duration-300 hover:scale-[1.02]"
                      onClick={(e) => window.open((e.target as HTMLImageElement).src, '_blank')}
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 评论区 */}
      <div className="animate-fade-in-up stagger-delay-2 mt-6 md:mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-100 md:mb-4">
          <MessageCircle className="h-5 w-5 text-blue-400" />
          评论 ({post.replies?.length || 0})
        </h2>

        {/* 评论输入框 */}
        <Card className="glass-card mb-4 border-0 transition-shadow hover:shadow-lg md:mb-6">
          <CardContent className="p-3.5 md:p-5">
            {replyError && (
              <div className="mb-3 animate-fade-in rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {replyError}
              </div>
            )}
            <form onSubmit={handleSubmitReply}>
              <Textarea
                placeholder={user ? '写下你的评论...' : '请先登录后再评论'}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={3}
                disabled={!user || replyLoading}
                className="mb-3 border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-500/60 focus:ring-blue-500/30"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {user ? `以 ${user.name || user.username} 的身份评论` : '登录后可评论'}
                </span>
                <Button type="submit" size="sm" disabled={!user || replyLoading} className="gap-1 shadow-[0_0_16px_hsl(217_91%_60%/0.35)] transition-transform hover:scale-105 active:scale-95">
                  <Send className="h-3.5 w-3.5" />
                  {replyLoading ? '发送中...' : '发送'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 评论列表 */}
        {!post.replies || post.replies.length === 0 ? (
          <Card className="glass-card border-0">
            <CardContent className="py-12 text-center">
              <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-700" />
              <p className="text-sm text-slate-500">暂无评论，快来抢沙发吧</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5 md:space-y-3">
            {post.replies.map((reply: any, idx: number) => (
              <div key={reply.id} className={`animate-fade-in-up stagger-delay-${Math.min(idx + 1, 10)}`}>
                <Card className="glass-card glass-card-hover border-0 hover-lift">
                  <CardContent className="p-3.5 md:p-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0 border border-blue-500/30">
                        <AvatarImage src={reply.avatar || undefined} alt={reply.username} />
                        <AvatarFallback className="bg-blue-500/20 text-blue-300">{reply.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-200">
                            {reply.author_name || reply.username || '匿名'}
                          </span>
                          {reply.role && (
                            <Badge className={cn('text-[10px]', ROLE_COLORS[reply.role] || 'bg-slate-800 text-slate-300')}>
                              {ROLE_NAMES[reply.role] || reply.role}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">{formatTime(reply.reply_time)}</span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-line text-sm text-slate-300">{reply.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 登录/注册弹窗 */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  );
}
