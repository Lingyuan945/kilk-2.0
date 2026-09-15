import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, MessageCircle, User, Plus, X } from 'lucide-react';
import { useForumPosts, useChannels, useCreatePost, formatTime, ROLE_COLORS } from '@/hooks/useSiteData';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const inputDark = 'border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/30';

export default function ForumPage() {
  const [activeChannel, setActiveChannel] = useState<string>('all');
  const { data: posts, loading, reload } = useForumPosts(activeChannel === 'all' ? undefined : activeChannel);
  const { data: channels } = useChannels();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createPost, loading: postLoading } = useCreatePost();

  // 发帖弹窗
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postChannel, setPostChannel] = useState<string>('');
  const [postError, setPostError] = useState<string | null>(null);

  // 登录弹窗
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const sortedChannels = [...channels].sort((a, b) => Number(a.sort) - Number(b.sort));

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);

    if (!postTitle.trim()) {
      setPostError('请输入帖子标题');
      return;
    }
    if (!postContent.trim()) {
      setPostError('请输入帖子内容');
      return;
    }
    if (!postChannel) {
      setPostError('请选择频道');
      return;
    }

    try {
      const postId = await createPost(postTitle, postContent, postChannel);
      setShowPostModal(false);
      setPostTitle('');
      setPostContent('');
      setPostChannel('');
      reload();
      navigate(`/post/${postId}`);
    } catch (err: any) {
      setPostError(err.message);
    }
  };

  const handleNewPostClick = () => {
    if (!user) {
      setAuthModalTab('login');
      setAuthModalOpen(true);
      return;
    }
    setShowPostModal(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      <div className="mb-6 animate-fade-in-up flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">交流论坛</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">分享技术经验、交流工作问题、发布团队通知</p>
        </div>
        <Button onClick={handleNewPostClick} className="gap-1 shadow-[0_0_20px_hsl(217_91%_60%/0.35)] transition-transform hover:scale-105 active:scale-95">
          <Plus className="h-4 w-4" /> 发帖
        </Button>
      </div>

      {/* 频道筛选 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveChannel('all')}
          className={cn(
            'animate-fade-in-up stagger-delay-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
            activeChannel === 'all'
              ? 'bg-blue-600 text-white shadow-[0_0_16px_hsl(217_91%_60%/0.5)]'
              : 'border border-slate-700 bg-slate-800/50 text-slate-300 hover:scale-105 hover:border-blue-500/40 hover:text-blue-300',
          )}
        >
          全部
        </button>
        {sortedChannels.map((ch, i) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch.id)}
            className={cn(
              `animate-fade-in-up stagger-delay-${Math.min(i + 2, 10)} rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200`,
              activeChannel === ch.id
                ? 'bg-blue-600 text-white shadow-[0_0_16px_hsl(217_91%_60%/0.5)]'
                : 'border border-slate-700 bg-slate-800/50 text-slate-300 hover:scale-105 hover:border-blue-500/40 hover:text-blue-300',
            )}
          >
            {ch.name}
          </button>
        ))}
      </div>

      {/* 帖子列表 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg bg-slate-800/60" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="glass-card border-0">
          <CardContent className="flex flex-col items-center py-16">
            <MessageCircle className="mb-3 h-12 w-12 text-slate-700" />
            <p className="text-sm text-slate-500">该频道暂无帖子</p>
          </CardContent>
        </Card>
      ) : (
        <div key={activeChannel} className="space-y-2.5">
          {posts.map((post: any, idx: number) => (
            <div key={post.id} className={`animate-fade-in-up stagger-delay-${Math.min(idx + 1, 10)}`}>
              <Link
                to={`/post/${post.id}`}
                className="glass-card glass-card-hover block rounded-lg p-3 hover-lift md:p-5"
              >
                <div className="flex items-start gap-4">
                  {/* 作者头像 */}
                  <div className="hidden shrink-0 md:block">
                    {post.avatar ? (
                      <img
                        src={post.avatar}
                        alt={post.username}
                        className="h-10 w-10 rounded-full border border-blue-500/30 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-500">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* 帖子内容 */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-medium text-slate-100 transition-colors hover:text-blue-400">
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{post.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author_name || post.username || '匿名'}
                      </span>
                      <span>{formatTime(post.create_time)}</span>
                      {post.channel_name && (
                        <Badge variant="secondary" className="border-slate-700 bg-slate-800/70 text-[10px] text-slate-400">
                          {post.channel_name}
                        </Badge>
                      )}
                      {post.role && (
                        <Badge className={cn('text-[10px]', ROLE_COLORS[post.role] || 'bg-slate-800 text-slate-300')}>
                          {post.role}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 统计 */}
                  <div className="hidden shrink-0 flex-col items-end gap-1 text-xs text-slate-500 sm:flex">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {post.view_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" /> {post.reply_count || 0}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* 发帖弹窗 */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="animate-overlay-in absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowPostModal(false)}
          />
          <div className="animate-modal-in glow-border relative w-full max-w-lg rounded-2xl border-slate-700/60 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
            <button
              onClick={() => setShowPostModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-6 text-xl font-bold text-slate-100">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">发布新帖</span>
            </h2>

            {postError && (
              <div className="mb-4 animate-fade-in rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {postError}
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="post-title" className="text-slate-300">标题</Label>
                <Input
                  id="post-title"
                  placeholder="请输入帖子标题"
                  className={inputDark}
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="post-channel" className="text-slate-300">频道</Label>
                <Select value={postChannel} onValueChange={setPostChannel}>
                  <SelectTrigger className={inputDark}>
                    <SelectValue placeholder="请选择频道" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                    {sortedChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id} className="focus:bg-blue-500/10">
                        {ch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="post-content" className="text-slate-300">内容</Label>
                <Textarea
                  id="post-content"
                  placeholder="请输入帖子内容"
                  className={inputDark}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 border-slate-700 text-slate-200 transition-transform hover:scale-[1.02] active:scale-[0.98]" onClick={() => setShowPostModal(false)}>
                  取消
                </Button>
                <Button type="submit" className="flex-1 transition-transform hover:scale-[1.02] active:scale-[0.98]" disabled={postLoading}>
                  {postLoading ? '发布中...' : '发布'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 登录/注册弹窗 */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  );
}
