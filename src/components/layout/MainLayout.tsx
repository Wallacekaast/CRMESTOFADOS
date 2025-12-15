import { Sidebar } from './Sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Search, Sun, Moon, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [apiOffline, setApiOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkApiHealth = async () => {
      try {
        await apiFetch('/api/health');
        if (!cancelled) setApiOffline(false);
      } catch {
        if (!cancelled) setApiOffline(true);
      }
    };
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <header className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur border-b border-border lg:ml-64">
        <div className="mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Alternar tema"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {user?.role && (
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="uppercase">
                {user.role}
              </Badge>
            )}
            <Avatar>
              <AvatarFallback>
                {(user?.email || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        {apiOffline && (
          <div className="px-4 py-2 border-t border-destructive/30 bg-destructive/10 text-destructive">
            <div className="mx-auto flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>API indisponível. Verifique o servidor.</span>
            </div>
          </div>
        )}
      </header>

      <main className="min-h-screen lg:ml-64 p-4 pt-16 lg:pt-20">
        {children}
      </main>
    </div>
  );
}
