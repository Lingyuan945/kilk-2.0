import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User as UserIcon, Calendar, Edit3, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUserProfile, formatTime, ROLE_NAMES, ROLE_COLORS } from '@/hooks/useSiteData';
import { useAuth } from '@/contexts/AuthContext';
import { formatBytes } from '@/lib/format';
import { apiPut, apiUpload } from '@/lib/api';
import DeveloperCardEntry from '@/components/DeveloperCardEntry';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { data: user, loading: userLoading, refetch } = useUserProfile(id || '');

  const isSelf = currentUser && user && String(currentUser.id) === String(user.id);
  const isAdmin = user && ['admin', 'super'].includes(user.role);

  // 编辑资料弹窗状态
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [signature, setSignature] = useState('');
  const [department, setDepartment] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // 修改密码状态
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 打开编辑弹窗时初始化表单
  const openEdit = () => {
    if (user) {
      setSignature(user.signature || '');
      setDepartment(user.department || '');
      setJobNumber(user.job_number || '');
      setAvatarPreview(null);
      setAvatarFile(null);
      setProfileMsg(null);
      setPwdMsg(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('profile');
    }
    setEditOpen(true);
  };

  // 头像选择
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'err', text: '头像不能超过 2MB' });
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // 保存资料
  const handleSaveProfile = async () => {
    setSaving(true);
    setProfileMsg(null);
    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await apiUpload('/users/avatar', formData);
      }
      await apiPut('/users/profile', {
        signature,
        department: isAdmin ? department : undefined,
        job_number: isAdmin ? jobNumber : undefined,
      });
      setProfileMsg({ type: 'ok', text: '资料已保存' });
      refetch();
      setTimeout(() => setEditOpen(false), 800);
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwdMsg({ type: 'err', text: '请填写完整信息' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'err', text: '新密码长度至少 6 位' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'err', text: '两次输入的新密码不一致' });
      return;
    }
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      await apiPut('/users/password', { old_password: oldPassword, new_password: newPassword, confirm_password: confirmPassword });
      setPwdMsg({ type: 'ok', text: '密码已修改，下次登录请使用新密码' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdMsg({ type: 'err', text: err.message || '修改失败' });
    } finally {
      setPwdSaving(false);
    }
  };

  if (userLoading) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">
        <Skeleton className="mb-6 h-8 w-32 bg-slate-800/60" />
        <Skeleton className="mb-6 h-40 w-full rounded-xl bg-slate-800/60" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">
        <Card className="glass-card border-0">
          <CardContent className="py-16 text-center">
            <UserIcon className="mx-auto mb-3 h-12 w-12 text-slate-700" />
            <p className="text-sm text-slate-400">用户不存在</p>
            <Link to="/" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
              返回首页
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">
      {/* 返回 */}
      <div className="animate-fade-in-up mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-slate-400 transition-all hover:translate-x-[-2px] hover:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" /> 返回首页
        </Link>
        {isSelf && (
          <div className="flex flex-col items-stretch gap-2">
            <Button onClick={openEdit} className="gap-2 bg-blue-600 hover:bg-blue-500">
              <Edit3 className="h-4 w-4" /> 编辑资料
            </Button>
            <DeveloperCardEntry username={user.username} />
          </div>
        )}
      </div>

      {/* 用户信息卡片 */}
      <div className="animate-fade-in-up stagger-delay-1 mb-8">
        <Card className="glass-card border-0 overflow-hidden">
          <div className="relative h-24 overflow-hidden bg-gradient-to-r from-blue-600/50 via-indigo-600/40 to-purple-600/50">
            <div className="absolute inset-0 opacity-40">
              <div className="tech-grid absolute inset-0" />
            </div>
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-400/20 blur-2xl" />
          </div>
          <CardContent className="relative px-6 pb-6">
            <div className="-mt-12 mb-4">
              <div className="inline-block">
                <Avatar className="h-20 w-20 border-4 border-slate-900 shadow-[0_0_24px_hsl(217_91%_60%/0.4)]">
                  <AvatarImage src={user.avatar || undefined} alt={user.username} />
                  <AvatarFallback className="bg-blue-500/20 text-2xl text-blue-300">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-100">{user.name || user.username}</h1>
                  {user.role && (
                    <Badge className={ROLE_COLORS[user.role] || 'bg-slate-800 text-slate-300'}>
                      {ROLE_NAMES[user.role] || user.role}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">@{user.username}</p>
                {user.signature ? (
                  <p className="mt-2 text-sm text-slate-400">{user.signature}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">这个人很懒，还没有签名～</p>
                )}
              </div>

              <div className="flex gap-6">
                <div className="text-center">
                  <p className="flex items-center justify-center text-xl font-bold text-slate-100">
                    <Calendar className="mr-1 inline h-4 w-4 text-blue-400" />
                  </p>
                  <p className="text-xs text-slate-500">{formatTime(user.create_time)}</p>
                </div>
              </div>
            </div>

            {(user.department || user.job_number) && (
              <>
                <Separator className="my-4 bg-slate-800" />
                <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                  {user.department && <span>部门：{user.department}</span>}
                  {user.job_number && <span>工号：{user.job_number}</span>}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 编辑资料弹窗 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-slate-700 bg-slate-900/95 text-slate-100 backdrop-blur-xl sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">编辑资料</DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/60">
              <TabsTrigger value="profile">基本资料</TabsTrigger>
              <TabsTrigger value="password">账号安全</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 pt-4">
              {profileMsg && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${profileMsg.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {profileMsg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {profileMsg.text}
                </div>
              )}

              <div className="space-y-2">
                <Label>头像</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-slate-700">
                    <AvatarImage src={avatarPreview || user.avatar || undefined} alt="头像预览" />
                    <AvatarFallback className="bg-blue-500/20 text-xl text-blue-300">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="sm" className="border-slate-700 text-slate-200" onClick={() => fileInputRef.current?.click()}>
                      选择图片
                    </Button>
                    {avatarFile ? (
                      <p className="text-xs text-cyan-400">已选择：{avatarFile.name}（{formatBytes(avatarFile.size)}）</p>
                    ) : (
                      <p className="text-xs text-slate-500">支持 jpg/png/gif/webp，最大 2MB</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">个性签名</Label>
                <Textarea
                  id="signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="写点什么介绍自己"
                  maxLength={500}
                  className="min-h-[80px] border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="department">部门</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="所属部门"
                      maxLength={100}
                      className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobNumber">工号</Label>
                    <Input
                      id="jobNumber"
                      value={jobNumber}
                      onChange={(e) => setJobNumber(e.target.value)}
                      placeholder="员工工号"
                      maxLength={50}
                      className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>
                </>
              )}

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                保存资料
              </Button>
            </TabsContent>

            <TabsContent value="password" className="space-y-4 pt-4">
              {pwdMsg && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${pwdMsg.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {pwdMsg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {pwdMsg.text}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="oldPassword">原密码</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入当前登录密码"
                  className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 6 位"
                  className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <Button onClick={handleChangePassword} disabled={pwdSaving} className="w-full bg-blue-600 hover:bg-blue-500">
                {pwdSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                修改密码
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
