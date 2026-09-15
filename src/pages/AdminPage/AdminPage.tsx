import { useState, useEffect, useRef } from 'react';
import { Users, MessageSquare, MessageCircle, Trash2, Shield, Eye, Clock, AlertTriangle, Home, Save, Loader2, Pencil, IdCard, FileText, ImagePlus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiDelete, apiPut, apiPost, apiUpload } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LingTab from '@/pages/AdminPage/LingTab';
import ServiceTab from '@/pages/AdminPage/ServiceTab';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ROLE_NAMES, ROLE_COLORS, formatTime } from '@/hooks/useSiteData';
import { cn } from '@/lib/utils';

interface AdminUser {
  id: string;
  username: string;
  name: string;
  avatar: string;
  role: string;
  create_time: string;
}

interface AdminPost {
  id: string;
  title: string;
  content: string;
  username: string;
  author_name: string;
  channel_name: string;
  view_count: string;
  create_time: string;
}

interface AdminReply {
  id: string;
  content: string;
  username: string;
  author_name: string;
  post_title: string;
  post_id: string;
  reply_time: string;
}

// ===== 后台功能模块配置 =====
// 新增后台功能时，只需在此数组追加一项（图标 + 名称），桌面端顶部导航、
// 手机端底部导航会自动扩展；超过 MOBILE_MAX 个时，多余的自动折叠进"更多"面板。
const ADMIN_TABS = [
  { value: 'home', label: '首页', fullLabel: '首页管理', icon: Home },
  { value: 'forum', label: '论坛', fullLabel: '论坛管理', icon: MessageSquare },
  { value: 'services', label: '服务', fullLabel: '服务支持', icon: FileText },
  { value: 'ling', label: '关于Ling', fullLabel: '关于Ling', icon: IdCard, superOnly: true },
  { value: 'users', label: '用户', fullLabel: '用户管理', icon: Users },
] as const;


export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  // 用户管理
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // 帖子管理
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // 首页内容管理
  const [homeContent, setHomeContent] = useState<any>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeSaving, setHomeSaving] = useState(false);
  const [homeMsg, setHomeMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // 频道管理
  const [channels, setChannels] = useState<any[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [channelForm, setChannelForm] = useState({ name: '', description: '', moderator_id: '', sort: '' });
  const [channelSaving, setChannelSaving] = useState(false);

  // 帖子编辑
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [postForm, setPostForm] = useState({ title: '', content: '', channel_id: '', images: [] as string[] });
  const [postImageUploading, setPostImageUploading] = useState(false);
  const postImageInputRef = useRef<HTMLInputElement>(null);
  const [postSaving, setPostSaving] = useState(false);

  // 帖子评论管理
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [managingPost, setManagingPost] = useState<any>(null);
  const [postReplies, setPostReplies] = useState<any[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  // 用户编辑/新增
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    username: '', name: '', signature: '', department: '', job_number: '', remark: '',
    password: '', role: 'user',
  });
  const [userSaving, setUserSaving] = useState(false);
  const [userModalTab, setUserModalTab] = useState<'profile' | 'security'>('profile');

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // 加载用户列表
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await apiGet<{ data: AdminUser[] }>('/admin/users');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  };

  // 加载帖子列表
  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      const res = await apiGet<{ data: AdminPost[] }>('/admin/posts');
      setPosts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setPostsLoading(false);
    }
  };

  // 加载首页内容
  const loadHomeContent = async () => {
    setHomeLoading(true);
    try {
      const res = await apiGet<{ data: any }>('/home');
      setHomeContent(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setHomeLoading(false);
    }
  };

  // 保存首页内容
  const saveHomeContent = async () => {
    setHomeSaving(true);
    setHomeMsg(null);
    try {
      await apiPut('/home', homeContent);
      setHomeMsg({ type: 'ok', text: '首页内容已更新' });
      setTimeout(() => setHomeMsg(null), 3000);
    } catch (e: any) {
      setHomeMsg({ type: 'err', text: e.message || '保存失败' });
    } finally {
      setHomeSaving(false);
    }
  };

  // 更新首页内容字段
  const updateHomeField = (field: string, value: string) => {
    setHomeContent((prev: any) => ({ ...prev, [field]: value }));
  };

  // 加载频道列表
  const loadChannels = async () => {
    setChannelsLoading(true);
    try {
      const res = await apiGet<{ data: any[] }>('/admin/channels');
      setChannels(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setChannelsLoading(false);
    }
  };

  // 打开新增频道弹窗
  const openAddChannel = () => {
    setEditingChannel(null);
    setChannelForm({ name: '', description: '', moderator_id: '', sort: '' });
    setChannelModalOpen(true);
  };

  // 打开编辑频道弹窗
  const openEditChannel = (channel: any) => {
    setEditingChannel(channel);
    setChannelForm({
      name: channel.name || '',
      description: channel.description || '',
      moderator_id: channel.moderator_id ? String(channel.moderator_id) : '',
      sort: channel.sort ? String(channel.sort) : '',
    });
    setChannelModalOpen(true);
  };

  // 保存频道
  const saveChannel = async () => {
    if (!channelForm.name.trim()) {
      alert('频道名称不能为空');
      return;
    }
    setChannelSaving(true);
    try {
      if (editingChannel) {
        await apiPut(`/admin/channels/${editingChannel.id}`, channelForm);
      } else {
        await apiPost('/admin/channels', channelForm);
      }
      setChannelModalOpen(false);
      loadChannels();
    } catch (e: any) {
      alert(e.message || '保存失败');
    } finally {
      setChannelSaving(false);
    }
  };

  // 打开编辑帖子弹窗
  const openEditPost = async (post: any) => {
    setEditingPost(post);
    setPostForm({
      title: post.title || '',
      content: post.content || '',
      channel_id: post.channel_id ? String(post.channel_id) : '',
      images: [],
    });
    setPostModalOpen(true);
    // 异步加载帖子现有图片
    try {
      const res = await apiGet<{ data: { images?: { image_path: string }[] } }>(`/forum/posts/${post.id}`);
      const imgs = (res.data.images || []).map((i) => i.image_path);
      setPostForm((prev) => ({ ...prev, images: imgs }));
    } catch (e) {
      console.error(e);
    }
  };

  // 上传帖子图片（后台编辑）
  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPostImageUploading(true);
    try {
      for (const file of files) {
        if (postForm.images.length >= 9) {
          alert('最多 9 张图片');
          break;
        }
        const form = new FormData();
        form.append('image', file);
        const res = await apiUpload<{ url: string }>('/forum/upload', form);
        setPostForm((prev) => ({ ...prev, images: [...prev.images, res.url] }));
      }
    } catch (err: any) {
      alert(err.message || '图片上传失败');
    } finally {
      setPostImageUploading(false);
      if (postImageInputRef.current) postImageInputRef.current.value = '';
    }
  };

  // 保存帖子
  const savePost = async () => {
    if (!postForm.title.trim()) {
      alert('标题不能为空');
      return;
    }
    if (!postForm.content.trim()) {
      alert('内容不能为空');
      return;
    }
    setPostSaving(true);
    try {
      await apiPut(`/admin/posts/${editingPost.id}`, postForm);
      setPostModalOpen(false);
      loadPosts();
    } catch (e: any) {
      alert(e.message || '保存失败');
    } finally {
      setPostSaving(false);
    }
  };

  // 打开帖子评论管理
  const openManageReplies = async (post: any) => {
    setManagingPost(post);
    setReplyModalOpen(true);
    setRepliesLoading(true);
    try {
      const res = await apiGet<{ data: any[] }>(`/admin/posts/${post.id}/replies`);
      setPostReplies(res.data);
    } catch (e) {
      console.error(e);
      setPostReplies([]);
    } finally {
      setRepliesLoading(false);
    }
  };

  // 删除评论
  const deleteReply = async (replyId: string) => {
    try {
      await apiDelete(`/admin/replies/${replyId}`);
      setPostReplies(postReplies.filter(r => r.id !== replyId));
    } catch (e) {
      console.error(e);
      alert('删除失败');
    }
  };

  // 打开新增用户弹窗
  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({
      username: '', name: '', signature: '', department: '', job_number: '', remark: '',
      password: '', role: 'user',
    });
    setUserModalTab('profile');
    setUserModalOpen(true);
  };

  // 打开编辑用户弹窗
  const openEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({
      username: u.username || '',
      name: u.name || '',
      signature: u.signature || '',
      department: u.department || '',
      job_number: u.job_number || '',
      remark: u.remark || '',
      password: '',
      role: u.role || 'user',
    });
    setUserModalTab('profile');
    setUserModalOpen(true);
  };

  // 保存用户（新增或编辑资料）
  const saveUser = async () => {
    if (!userForm.username.trim()) {
      alert('登录账号不能为空');
      return;
    }
    setUserSaving(true);
    try {
      if (editingUser) {
        // 编辑资料
        await apiPut(`/admin/users/${editingUser.id}/profile`, {
          username: userForm.username,
          name: userForm.name,
          signature: userForm.signature,
          department: userForm.department,
          job_number: userForm.job_number,
          remark: userForm.remark,
        });
        // 如果角色也改了，同时更新角色
        if (userForm.role !== editingUser.role && Number(editingUser.id) !== user?.id) {
          await apiPut(`/admin/users/${editingUser.id}`, { role: userForm.role });
        }
      } else {
        // 新增用户
        if (!userForm.password || userForm.password.length < 6) {
          alert('密码至少6位');
          setUserSaving(false);
          return;
        }
        await apiPost('/admin/users', userForm);
      }
      setUserModalOpen(false);
      loadUsers();
    } catch (e: any) {
      alert(e.message || '保存失败');
    } finally {
      setUserSaving(false);
    }
  };

  // 重置用户密码
  const resetUserPassword = async () => {
    if (!userForm.password || userForm.password.length < 6) {
      alert('新密码至少6位');
      return;
    }
    setUserSaving(true);
    try {
      await apiPut(`/admin/users/${editingUser.id}/password`, { password: userForm.password });
      alert('密码已重置');
      setUserForm({ ...userForm, password: '' });
    } catch (e: any) {
      alert(e.message || '重置失败');
    } finally {
      setUserSaving(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadPosts();
      loadHomeContent();
      loadChannels();
    }
  }, [isAdmin]);

  // 更新用户角色
  const handleRoleChange = async (userId: string, role: string) => {
    // 前端拦截：不能修改自己的角色
    if (userId === user?.id) {
      alert('不能修改自己的账号等级');
      return;
    }
    try {
      await apiPut(`/admin/users/${userId}`, { role });
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
    } catch (e) {
      console.error(e);
      alert('更新失败');
    }
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/admin/${deleteTarget.type}/${deleteTarget.id}`);
      if (deleteTarget.type === 'users') {
        setUsers(users.filter(u => u.id !== deleteTarget.id));
      } else if (deleteTarget.type === 'posts') {
        setPosts(posts.filter(p => p.id !== deleteTarget.id));
      } else if (deleteTarget.type === 'channels') {
        loadChannels();
      }
    } catch (e) {
      console.error(e);
      alert('删除失败');
    } finally {
      setDeleteTarget(null);
    }
  };

  // 根据角色过滤可见的功能模块（superOnly 仅超管可见）
  const adminTabs = ADMIN_TABS.filter((t) => !('superOnly' in t) || !t.superOnly || user?.role === 'super');

  // 非管理员访问
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">
        <Card className="glass-card border-0">
          <CardContent className="py-16 text-center">
            <Shield className="mx-auto mb-3 h-12 w-12 text-slate-700" />
            <h2 className="mb-2 text-lg font-bold text-slate-100">无权限访问</h2>
            <p className="text-sm text-slate-400">只有管理员才能访问管理后台</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      {/* 标题 */}
      <div className="animate-fade-in-up mb-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.9)]" />
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">管理后台</span>
          </h1>
        </div>
        <p className="mt-1.5 pl-4 text-sm text-slate-400">用户、帖子、评论管理</p>
      </div>

      {/* 统计卡片 */}
      <div className="animate-fade-in-up stagger-delay-1 mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
        <Card className="glass-card relative overflow-hidden border-0">
          <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-blue-500/15 blur-2xl" />
          <CardContent className="relative flex items-center gap-3 p-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-500/25 to-cyan-500/10 text-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.15)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-2xl font-bold text-transparent">{users.length}</p>
              <p className="text-xs text-slate-500">用户</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden border-0">
          <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-purple-500/15 blur-2xl" />
          <CardContent className="relative flex items-center gap-3 p-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-500/25 to-fuchsia-500/10 text-purple-400 shadow-[0_0_16px_rgba(168,85,247,0.15)]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-2xl font-bold text-transparent">{posts.length}</p>
              <p className="text-xs text-slate-500">帖子</p>
            </div>
          </CardContent>
        </Card>
      </div>{/* 标签页 */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* 顶部导航（配置驱动，横向可滚动；桌面端图标+文字，手机端仅图标；卡片式玻璃风格与其他页统一；滚动常驻） */}
          <TabsList className="sticky top-16 z-30 mb-4 flex w-full flex-nowrap justify-start gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-md">
            {adminTabs.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="shrink-0 gap-2 rounded-lg border border-transparent px-3 py-2 text-slate-400 transition-all duration-200 data-[state=active]:border-blue-500/40 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-300 data-[state=active]:shadow-[0_0_14px_rgba(59,130,246,0.15)]"
              >
                <t.icon className="h-4 w-4 transition-colors" /> <span className="hidden md:inline">{t.fullLabel}</span>
              </TabsTrigger>
            ))}
          </TabsList>

{/* 用户管理 */}
          <TabsContent value="users">
            {usersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg bg-slate-800/60" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button onClick={openAddUser} size="sm" className="bg-blue-600 hover:bg-blue-500">
                    + 新增用户
                  </Button>
                </div>
                {users.map((u, idx) => (
                  <div key={u.id} className={`animate-fade-in-up stagger-delay-${Math.min(idx + 1, 10)}`}>
                    <Card className="glass-card border-0">
                      <CardContent className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-10 w-10 shrink-0 border border-blue-500/30">
                            <AvatarImage src={u.avatar || undefined} alt={u.username} />
                            <AvatarFallback className="bg-blue-500/20 text-blue-300">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-slate-100">{u.name || u.username}</span>
                              <Badge className={cn('text-[10px]', ROLE_COLORS[u.role] || 'bg-slate-800 text-slate-300')}>
                                {ROLE_NAMES[u.role] || u.role}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">@{u.username} · 注册于 {formatTime(u.create_time)}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-400 hover:bg-blue-500/10 hover:text-blue-400"
                            onClick={() => openEditUser(u)}
                            title="编辑用户"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Select
                            value={u.role}
                            onValueChange={(value) => handleRoleChange(u.id, value)}
                            disabled={u.id === user?.id}
                            modal={false}
                          >
                            <SelectTrigger className="w-28 border-slate-700 bg-slate-800/60 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
                              <SelectValue placeholder={u.id === user?.id ? '当前账号' : undefined} />
                            </SelectTrigger>
                            <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                              <SelectItem value="user" className="focus:bg-blue-500/10">普通用户</SelectItem>
                              <SelectItem value="senior" className="focus:bg-blue-500/10">高级用户</SelectItem>
                              <SelectItem value="admin" className="focus:bg-blue-500/10">管理员</SelectItem>
                            </SelectContent>
                          </Select>
                          {u.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                              onClick={() => setDeleteTarget({ type: 'users', id: u.id, name: u.name || u.username })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 帖子管理 */}
          <TabsContent value="forum">
            {/* 帖子管理 */}
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
                帖子管理
              </h3>
            {postsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg bg-slate-800/60" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((p, idx) => (
                  <div key={p.id} className={`animate-fade-in-up stagger-delay-${Math.min(idx + 1, 10)}`}>
                    <Card className="glass-card border-0">
                      <CardContent className="flex items-start justify-between gap-3 p-3.5">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-medium text-slate-100">{p.title}</h3>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{p.content}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span>作者：{p.author_name || p.username}</span>
                            {p.channel_name && <Badge variant="secondary" className="border-slate-700 bg-slate-800/70 text-[10px] text-slate-400">{p.channel_name}</Badge>}
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {p.view_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formatTime(p.create_time)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-400"
                            onClick={() => openManageReplies(p)}
                            title="管理评论"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-400 hover:bg-blue-500/10 hover:text-blue-400"
                            onClick={() => openEditPost(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                            onClick={() => setDeleteTarget({ type: 'posts', id: p.id, name: p.title })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
            </div>

            {/* 频道管理 */}
            <div className="border-t border-slate-800 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <span className="h-4 w-1 rounded-full bg-gradient-to-b from-purple-400 to-pink-400" />
                  频道管理
                </h3>
                <Button onClick={openAddChannel} size="sm" className="bg-blue-600 hover:bg-blue-500">
                  + 新增频道
                </Button>
              </div>
              <p className="mb-3 text-xs text-slate-500">管理论坛频道，删除频道后该频道下的帖子将变为未分类</p>
            {channelsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg bg-slate-800/60" />
                ))}
              </div>
            ) : channels.length === 0 ? (
              <Card className="glass-card border-0">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                  <p className="text-sm text-slate-500">暂无频道</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {channels.map((c, idx) => (
                  <div key={c.id} className={`animate-fade-in-up stagger-delay-${Math.min(idx + 1, 10)}`}>
                    <Card className="glass-card border-0">
                      <CardContent className="flex items-center justify-between gap-3 p-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-100">{c.name}</span>
                            <Badge className="bg-slate-800 text-slate-400 text-[10px]">排序 {c.sort}</Badge>
                            {c.moderator_name && (
                              <Badge className="bg-purple-500/10 text-purple-400 text-[10px]">版主：{c.moderator_realname || c.moderator_name}</Badge>
                            )}
                          </div>
                          {c.description && <p className="mt-1 text-xs text-slate-500 line-clamp-1">{c.description}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button variant="ghost" size="icon" className="text-blue-400 hover:bg-blue-500/10 hover:text-blue-400" onClick={() => openEditChannel(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10 hover:text-red-400" onClick={() => setDeleteTarget({ type: 'channels', id: c.id, name: c.name })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
            </div>
          </TabsContent>

          {/* 首页管理 */}
          <TabsContent value="home">
            {homeLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg bg-slate-800/60" />
                ))}
              </div>
            ) : !homeContent ? (
              <Card className="glass-card border-0">
                <CardContent className="py-12 text-center">
                  <Home className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                  <p className="text-sm text-slate-500">暂无首页内容</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {homeMsg && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${homeMsg.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {homeMsg.type === 'ok' ? <Shield className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {homeMsg.text}
                  </div>
                )}

                {/* Banner 区域 */}
                <Card className="glass-card border-0">
                  <CardContent className="space-y-3.5 p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
                      Banner 区域
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="banner_title" className="text-xs text-slate-400">大标题</Label>
                      <Input
                        id="banner_title"
                        value={homeContent.banner_title || ''}
                        onChange={(e) => updateHomeField('banner_title', e.target.value)}
                        className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner_desc" className="text-xs text-slate-400">介绍文案</Label>
                      <Textarea
                        id="banner_desc"
                        value={homeContent.banner_desc || ''}
                        onChange={(e) => updateHomeField('banner_desc', e.target.value)}
                        className="min-h-[60px] border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 发展规划卡片 */}
                {[
                  { key: 'card1', label: '发展规划一' },
                  { key: 'card2', label: '发展规划二' },
                  { key: 'card3', label: '发展规划三' },
                ].map((card) => (
                  <Card key={card.key} className="glass-card border-0">
                    <CardContent className="space-y-3.5 p-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                        <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
                        {card.label}
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor={`${card.key}_title`} className="text-xs text-slate-400">标题</Label>
                        <Input
                          id={`${card.key}_title`}
                          value={homeContent[`${card.key}_title`] || ''}
                          onChange={(e) => updateHomeField(`${card.key}_title`, e.target.value)}
                          className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${card.key}_text`} className="text-xs text-slate-400">详情</Label>
                        <Textarea
                          id={`${card.key}_text`}
                          value={homeContent[`${card.key}_text`] || ''}
                          onChange={(e) => updateHomeField(`${card.key}_text`, e.target.value)}
                          className="min-h-[60px] border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* 保存按钮 */}
                <Button onClick={saveHomeContent} disabled={homeSaving} className="w-full bg-blue-600 hover:bg-blue-500">
                  {homeSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  保存首页内容
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 服务支持管理 */}
          <TabsContent value="services">
            <ServiceTab />
          </TabsContent>

          {/* 关于 Ling 管理（仅超级管理员可见） */}
          {user?.role === 'super' && (
            <TabsContent value="ling">
              <LingTab />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border border-slate-700/60 bg-slate-900/95 text-slate-100 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" /> 确认删除
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              确定要删除「{deleteTarget?.name}」吗？此操作不可撤销。
              {deleteTarget?.type === 'users' && ' 用户的所有帖子和评论也会被删除。'}
              {deleteTarget?.type === 'posts' && ' 帖子的所有评论和图片也会被删除。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-200">取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 频道编辑弹窗 */}
      <Dialog open={channelModalOpen} onOpenChange={setChannelModalOpen}>
        <DialogContent className="border border-slate-700/60 bg-slate-900/95 text-slate-100 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">{editingChannel ? '编辑频道' : '新增频道'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingChannel ? '修改频道信息' : '创建新的论坛频道'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="channel_name" className="text-xs text-slate-400">频道名称 *</Label>
              <Input
                id="channel_name"
                value={channelForm.name}
                onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                placeholder="例如：技术交流"
                className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel_desc" className="text-xs text-slate-400">频道描述</Label>
              <Textarea
                id="channel_desc"
                value={channelForm.description}
                onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })}
                placeholder="频道的简短描述"
                className="min-h-[60px] border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="channel_mod" className="text-xs text-slate-400">版主用户ID</Label>
                <Input
                  id="channel_mod"
                  value={channelForm.moderator_id}
                  onChange={(e) => setChannelForm({ ...channelForm, moderator_id: e.target.value })}
                  placeholder="留空为无版主"
                  className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel_sort" className="text-xs text-slate-400">排序（数字越小越靠前）</Label>
                <Input
                  id="channel_sort"
                  value={channelForm.sort}
                  onChange={(e) => setChannelForm({ ...channelForm, sort: e.target.value })}
                  placeholder="例如：1"
                  className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelModalOpen(false)} className="border-slate-700 text-slate-200">取消</Button>
            <Button onClick={saveChannel} disabled={channelSaving} className="bg-blue-600 hover:bg-blue-500">
              {channelSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingChannel ? '保存修改' : '创建频道'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 帖子编辑弹窗 */}
      <Dialog open={postModalOpen} onOpenChange={setPostModalOpen}>
        <DialogContent className="border border-slate-700/60 bg-slate-900/95 text-slate-100 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">编辑帖子</DialogTitle>
            <DialogDescription className="text-slate-400">
              修改帖子的标题、内容和所属频道
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="post_title" className="text-xs text-slate-400">标题 *</Label>
              <Input
                id="post_title"
                value={postForm.title}
                onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post_content" className="text-xs text-slate-400">内容 *</Label>
              <Textarea
                id="post_content"
                value={postForm.content}
                onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                className="min-h-[120px] border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">所属频道</Label>
              <Select
                value={postForm.channel_id}
                onValueChange={(value) => setPostForm({ ...postForm, channel_id: value })}
                modal={false}
              >
                <SelectTrigger className="border-slate-700 bg-slate-800/50 text-slate-100">
                  <SelectValue placeholder="选择频道" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                  <SelectItem value="">未分类</SelectItem>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* 帖子图片管理 */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">帖子图片（{postForm.images.length}/9）</Label>
            <div className="flex flex-wrap gap-2.5">
              {postForm.images.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-700">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPostForm((prev) => ({ ...prev, images: prev.images.filter((u) => u !== url) }))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-slate-950/80 p-0.5 text-slate-200 transition-colors hover:bg-red-500/80"
                    title="移除图片"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => postImageInputRef.current?.click()}
                disabled={postImageUploading || postForm.images.length >= 9}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-600 text-slate-500 transition-colors hover:border-blue-500/60 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {postImageUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                <span className="text-[10px]">{postImageUploading ? '上传中' : '添加图片'}</span>
              </button>
            </div>
            <input
              ref={postImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={handlePostImageUpload}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostModalOpen(false)} className="border-slate-700 text-slate-200">取消</Button>
            <Button onClick={savePost} disabled={postSaving} className="bg-blue-600 hover:bg-blue-500">
              {postSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 帖子评论管理弹窗 */}
      <Dialog open={replyModalOpen} onOpenChange={setReplyModalOpen}>
        <DialogContent className="border border-slate-700/60 bg-slate-900/95 text-slate-100 backdrop-blur-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">管理评论</DialogTitle>
            <DialogDescription className="text-slate-400">
              {managingPost?.title ? `帖子：${managingPost.title}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {repliesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg bg-slate-800/60" />
                ))}
              </div>
            ) : postReplies.length === 0 ? (
              <div className="py-12 text-center">
                <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                <p className="text-sm text-slate-500">暂无评论</p>
              </div>
            ) : (
              <div className="space-y-3">
                {postReplies.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-800/30 p-3">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <Avatar className="h-8 w-8 shrink-0 border border-blue-500/30">
                        <AvatarImage src={r.avatar || undefined} alt={r.username} />
                        <AvatarFallback className="bg-blue-500/20 text-xs text-blue-300">{r.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-200">{r.author_name || r.username}</span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="h-3 w-3" /> {formatTime(r.reply_time)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-300 break-words">{r.content}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                      onClick={() => deleteReply(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyModalOpen(false)} className="border-slate-700 text-slate-200">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 用户编辑/新增弹窗 */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="border border-slate-700/60 bg-slate-900/95 text-slate-100 backdrop-blur-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">{editingUser ? '编辑用户' : '新增用户'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingUser ? `用户：${editingUser.name || editingUser.username}` : '创建新的用户账号'}
            </DialogDescription>
          </DialogHeader>

          {/* Tab 切换 */}
          <div className="flex gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setUserModalTab('profile')}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${userModalTab === 'profile' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              基本资料
            </button>
            <button
              onClick={() => setUserModalTab('security')}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${userModalTab === 'security' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              账号安全
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto py-4">
            {userModalTab === 'profile' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user_username" className="text-xs text-slate-400">登录账号 *</Label>
                    <Input
                      id="user_username"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_name" className="text-xs text-slate-400">用户名称</Label>
                    <Input
                      id="user_name"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_signature" className="text-xs text-slate-400">个性签名</Label>
                  <Input
                    id="user_signature"
                    value={userForm.signature}
                    onChange={(e) => setUserForm({ ...userForm, signature: e.target.value })}
                    className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user_dept" className="text-xs text-slate-400">部门</Label>
                    <Input
                      id="user_dept"
                      value={userForm.department}
                      onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                      className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_job" className="text-xs text-slate-400">工号</Label>
                    <Input
                      id="user_job"
                      value={userForm.job_number}
                      onChange={(e) => setUserForm({ ...userForm, job_number: e.target.value })}
                      className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_remark" className="text-xs text-slate-400">备注</Label>
                  <Textarea
                    id="user_remark"
                    value={userForm.remark}
                    onChange={(e) => setUserForm({ ...userForm, remark: e.target.value })}
                    className="min-h-[60px] border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                {editingUser && Number(editingUser.id) !== user?.id && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">角色</Label>
                    <Select
                      value={userForm.role}
                      onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                      modal={false}
                    >
                      <SelectTrigger className="border-slate-700 bg-slate-800/50 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                        <SelectItem value="user">普通用户</SelectItem>
                        <SelectItem value="senior">高级用户</SelectItem>
                        <SelectItem value="admin">管理员</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {!editingUser ? (
                  <div className="space-y-2">
                    <Label htmlFor="user_password_new" className="text-xs text-slate-400">初始密码 *</Label>
                    <Input
                      id="user_password_new"
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="至少6位"
                      className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_password_reset" className="text-xs text-slate-400">新密码</Label>
                      <Input
                        id="user_password_reset"
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder="至少6位"
                        className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                      />
                    </div>
                    <Button onClick={resetUserPassword} disabled={userSaving} className="w-full bg-blue-600 hover:bg-blue-500">
                      {userSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      重置密码
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserModalOpen(false)} className="border-slate-700 text-slate-200">取消</Button>
            <Button onClick={saveUser} disabled={userSaving} className="bg-blue-600 hover:bg-blue-500">
              {userSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingUser ? '保存修改' : '创建用户'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
