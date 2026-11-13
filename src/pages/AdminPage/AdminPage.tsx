import { useState, useEffect } from 'react';
import { Users, Trash2, Shield, AlertTriangle, Home, Save, Loader2, Pencil, IdCard, FileText, Megaphone, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiDelete, apiPut, apiPost } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DevelopersTab from '@/pages/AdminPage/DevelopersTab';
import ServiceTab from '@/pages/AdminPage/ServiceTab';
import NoticeTab from '@/pages/AdminPage/NoticeTab';
import HotelTab from '@/pages/AdminPage/HotelTab';
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

// ===== 后台功能模块配置 =====
// 新增后台功能时，只需在此数组追加一项（图标 + 名称），桌面端顶部导航、
// 手机端底部导航会自动扩展；超过 MOBILE_MAX 个时，多余的自动折叠进"更多"面板。
const ADMIN_TABS = [
  { value: 'home', label: '首页', fullLabel: '首页管理', icon: Home },
  { value: 'notice', label: '公告', fullLabel: '公告管理', icon: Megaphone },
  { value: 'hotel', label: '酒店', fullLabel: '酒店管理', icon: Building2 },
  { value: 'services', label: '服务', fullLabel: '服务支持', icon: FileText },
  { value: 'ling', label: '开发者', fullLabel: '开发者管理', icon: IdCard, superOnly: true },
  { value: 'users', label: '用户', fullLabel: '用户管理', icon: Users },
] as const;


export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  // 支持 URL 参数 ?tab=xxx 自动切换
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, []);

  // 用户管理
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // 服务文件管理
  const [services, setServices] = useState<any[]>([]);

  // 首页内容管理
  const [homeContent, setHomeContent] = useState<any>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeSaving, setHomeSaving] = useState(false);
  const [homeMsg, setHomeMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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

  // 加载服务文件列表
  const loadServices = async () => {
    try {
      const res = await apiGet<{ ok: boolean; data: any[] }>('/admin/services');
      if (res.ok) setServices(res.data || []);
    } catch (e) {
      console.error('加载服务文件失败:', e);
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
        if (userForm.role !== editingUser.role && String(editingUser.id) !== String(user?.id)) {
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
      loadHomeContent();
      loadServices();
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
        <p className="mt-1.5 pl-4 text-sm text-slate-400">用户、服务管理</p>
      </div>

      {/* 统计卡片 */}
      <div className="animate-fade-in-up stagger-delay-1 mb-5 grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-4">
        <Card className="glass-card relative overflow-hidden border-0">
          <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-blue-500/15 blur-2xl" />
          <CardContent className="relative flex items-center gap-2 p-2.5 md:gap-3 md:p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-500/25 to-cyan-500/10 text-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.15)] md:h-11 md:w-11">
              <Users className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div>
              <p className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-lg font-bold text-transparent md:text-2xl">{users.length}</p>
              <p className="text-[10px] text-slate-500 md:text-xs">用户</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden border-0">
          <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-emerald-500/15 blur-2xl" />
          <CardContent className="relative flex items-center gap-3 p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/25 to-teal-500/10 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.15)] md:h-11 md:w-11">
              <FileText className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div>
              <p className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-lg font-bold text-transparent md:text-2xl">{services.length}</p>
              <p className="text-[10px] text-slate-500 md:text-xs">服务</p>
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

          {/* 公告管理 */}
          <TabsContent value="notice">
            <NoticeTab />
          </TabsContent>

          {/* 酒店管理 */}
          <TabsContent value="hotel">
            <HotelTab />
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
              <DevelopersTab />
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

          <div className="max-h-[50vh] overflow-y-auto overscroll-behavior-contain py-4">
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
                {editingUser && String(editingUser.id) !== String(user?.id) && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">角色</Label>
                    <Select
                      value={userForm.role}
                      onValueChange={(value) => setUserForm({ ...userForm, role: value })}
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
