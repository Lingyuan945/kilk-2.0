import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/forum', label: '论坛' },
  { path: '/service', label: '服务支持' },
  { path: '/about', label: '关于我们' },
  { path: '/about-ling', label: '关于 Ling' },
];

function isActivePath(pathname: string, path: string): boolean {
  if (path === '/') return pathname === '/';
  if (path === '/forum') return pathname.startsWith('/forum') || pathname.startsWith('/post');
  // 精确匹配：pathname === path 或 pathname 以 path/ 开头，避免 /about 匹配 /about-ling
  return pathname === path || pathname.startsWith(path + '/');
}

export default function SiteHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  // 滑动指示器
  const navRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });
  const [scrolled, setScrolled] = useState(false);

  const updateIndicator = useCallback(() => {
    const activeItem = NAV_ITEMS.find((item) => isActivePath(pathname, item.path));
    if (!activeItem) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }
    const el = navItemRefs.current.get(activeItem.path);
    const navEl = navRef.current;
    if (el && navEl) {
      const navRect = navEl.getBoundingClientRect();
      const itemRect = el.getBoundingClientRect();
      setIndicator({
        left: itemRect.left - navRect.left,
        width: itemRect.width,
        visible: true,
      });
    }
  }, [pathname]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => updateIndicator());
    return () => cancelAnimationFrame(raf);
  }, [updateIndicator]);

  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);
    if (document.fonts) {
      document.fonts.ready.then(() => updateIndicator());
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [updateIndicator]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openLogin = () => {
    setAuthModalTab('login');
    setAuthModalOpen(true);
  };

  const openRegister = () => {
    setAuthModalTab('register');
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const desktopNav = (
    <nav ref={navRef} className="relative hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          ref={(el) => {
            if (el) navItemRefs.current.set(item.path, el);
            else navItemRefs.current.delete(item.path);
          }}
          className={cn(
            'relative px-4 py-2 text-sm font-medium transition-all duration-200',
            isActivePath(pathname, item.path)
              ? item.path === '/about-ling'
                ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_hsl(45_97%_60%/0.6)]'
                : 'text-blue-400'
              : 'text-slate-300 hover:text-blue-400 hover:drop-shadow-[0_0_8px_hsl(217_91%_60%/0.5)]',
          )}
        >
          {item.label}
        </NavLink>
      ))}
      {/* 滑动指示器 */}
      <div
        className={cn(
          'pointer-events-none absolute -bottom-0.5 h-[3px] rounded-full transition-all duration-300 ease-out',
          isActivePath(pathname, '/about-ling')
            ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 shadow-[0_0_12px_hsl(45_97%_60%/0.9)]'
            : 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_hsl(217_91%_60%/0.8)]',
          indicator.visible ? 'opacity-100' : 'opacity-0',
        )}
        style={{ left: indicator.left, width: indicator.width }}
      />
    </nav>
  );

  const mobileNav = (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="border-slate-700 bg-slate-800/60 text-slate-200 md:hidden" aria-label="打开导航菜单">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 border-slate-800 bg-slate-900/95 text-slate-100 backdrop-blur-xl">
        <SheetHeader className="border-b border-slate-800 pb-4">
          <SheetTitle className="text-left text-lg font-bold">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">kilk</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <SheetClose asChild key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-base font-medium transition-colors',
                  isActivePath(pathname, item.path)
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white',
                )}
              >
                {item.label}
              </NavLink>
            </SheetClose>
          ))}
        </nav>

        {/* 移动端用户区 */}
        <div className="mt-6 border-t border-slate-800 pt-4">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar || undefined} alt={user.username} />
                  <AvatarFallback className="bg-blue-500/20 text-blue-300">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-slate-100">{user.name || user.username}</p>
                  <p className="text-xs text-slate-400">@{user.username}</p>
                </div>
              </div>
              <SheetClose asChild>
                <Button variant="outline" className="w-full border-slate-700 text-slate-200" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> 退出登录
                </Button>
              </SheetClose>
            </div>
          ) : (
            <div className="space-y-2">
              <SheetClose asChild>
                <Button className="w-full" onClick={openLogin}>登录</Button>
              </SheetClose>
              <SheetClose asChild>
                <Button variant="outline" className="w-full border-slate-700 text-slate-200" onClick={openRegister}>注册</Button>
              </SheetClose>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  // 桌面端用户区
  const desktopUser = user ? (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-800/70">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || undefined} alt={user.username} />
            <AvatarFallback className="bg-blue-500/20 text-blue-300">{user.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-slate-200 lg:inline">
            {user.name || user.username}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 border-slate-700 bg-slate-900/95 text-slate-100 backdrop-blur-xl">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-100">{user.name || user.username}</span>
            <span className="text-xs text-slate-400">@{user.username}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-800" />
        <DropdownMenuItem className="cursor-pointer focus:bg-blue-500/10" onClick={() => navigate(`/user/${user.id}`)}>
          <UserIcon className="mr-2 h-4 w-4" /> 个人主页
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem className="cursor-pointer focus:bg-blue-500/10" onClick={() => navigate('/admin')}>
            <Settings className="mr-2 h-4 w-4" /> 管理后台
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-slate-800" />
        <DropdownMenuItem className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> 退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <div className="hidden items-center gap-2 md:flex">
      <Button variant="outline" size="sm" className="border-slate-700 text-slate-200" onClick={openLogin}>登录</Button>
      <Button size="sm" onClick={openRegister}>注册</Button>
    </div>
  );

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 border-b backdrop-blur-md transition-all duration-300',
          scrolled
            ? 'border-slate-700/80 bg-slate-950/90 shadow-[0_4px_24px_hsl(217_91%_60%/0.12)]'
            : 'border-slate-800/80 bg-slate-950/70',
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <NavLink to="/" end className="group flex items-center gap-2">
            <span className="text-xl font-bold">
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent transition-shadow group-hover:drop-shadow-[0_0_12px_hsl(217_91%_60%/0.6)]">
                kilk
              </span>
            </span>
            <span className="hidden rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 sm:inline-block">
              2.0
            </span>
          </NavLink>
          {desktopNav}
          <div className="flex items-center gap-2">
            {desktopUser}
            {mobileNav}
          </div>
        </div>
      </header>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </>
  );
}
