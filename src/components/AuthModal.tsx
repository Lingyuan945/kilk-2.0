import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export default function AuthModal({ open, onClose, defaultTab = 'login' }: AuthModalProps) {
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 登录表单
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 注册表单
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');

  if (!open) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(loginUsername, loginPassword);
      onClose();
      // 重置表单
      setLoginUsername('');
      setLoginPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(regUsername, regPassword, regPassword2, regName);
      onClose();
      // 重置表单
      setRegUsername('');
      setRegName('');
      setRegPassword('');
      setRegPassword2('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="animate-overlay-in absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="animate-modal-in glow-border relative w-full max-w-md rounded-2xl border-slate-700/60 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* 顶部渐变光条 */}
        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-xl font-bold text-slate-100">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">欢迎来到 kilk</span>
        </h2>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-6 grid w-full grid-cols-2 bg-slate-800/70">
            <TabsTrigger value="login" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">登录</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">注册</TabsTrigger>
          </TabsList>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 animate-fade-in rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* 登录表单 */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username" className="text-slate-300">账号</Label>
                <Input
                  id="login-username"
                  type="text"
                  placeholder="请输入登录账号"
                  className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/30"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-slate-300">密码</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="请输入密码"
                  className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/30"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full transition-transform hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                {loading ? '登录中...' : '登 录'}
              </Button>
            </form>
          </TabsContent>

          {/* 注册表单 */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-username" className="text-slate-300">登录账号（至少3位）</Label>
                <Input
                  id="reg-username"
                  type="text"
                  placeholder="请输入账号"
                  className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/30"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                  minLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-name" className="text-slate-300">用户名称（选填）</Label>
                <Input
                  id="reg-name"
                  type="text"
                  placeholder="请输入名称"
                  className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/30"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-slate-300">密码（至少6位）</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="请输入密码"
                  className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/30"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password2" className="text-slate-300">确认密码</Label>
                <Input
                  id="reg-password2"
                  type="password"
                  placeholder="请再次输入密码"
                  className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/30"
                  value={regPassword2}
                  onChange={(e) => setRegPassword2(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full transition-transform hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                {loading ? '注册中...' : '注 册'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
