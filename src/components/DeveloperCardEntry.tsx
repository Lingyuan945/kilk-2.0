import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IdCard, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';

/**
 * 开发者名片入口：被添加为开发者的用户，在个人主页显示入口，
 * 点击进入 /developer/me 管理自己的开发者名片。
 */
export default function DeveloperCardEntry({ username }: { username: string }) {
  const [isDeveloper, setIsDeveloper] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiGet<{ data: unknown }>('/developers/me');
        if (mounted) setIsDeveloper(res.ok && !!res.data);
      } catch {
        if (mounted) setIsDeveloper(false);
      }
    })();
    return () => { mounted = false; };
  }, [username]);

  if (isDeveloper === null) return null;

  if (!isDeveloper) {
    return null;
  }

  return (
    <div>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="group w-full gap-2 border-blue-500/40 bg-blue-500/10 text-blue-300 transition-all hover:border-blue-500/70 hover:bg-blue-500/20 hover:text-blue-200"
      >
        <Link to="/developer/me">
          <IdCard className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
          开发者名片
          <ArrowRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Button>
    </div>
  );
}
