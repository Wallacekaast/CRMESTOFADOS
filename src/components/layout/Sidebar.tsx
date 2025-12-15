import { NavLink } from 'react-router-dom';
import { 
  Factory, 
  Package, 
  Clock,
  LogOut,
  Menu,
  X,
  Receipt,
  LayoutDashboard,
  ShoppingCart,
  Sofa,
  BarChart3,
  Users,
  User as UserIcon,
  ListOrdered
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { addDays, isAfter, isBefore, parseISO } from 'date-fns';

const mainNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pdv', icon: ShoppingCart, label: 'PDV' },
  { to: '/produtos', icon: Sofa, label: 'Produtos' },
  { to: '/vendas', icon: BarChart3, label: 'Vendas' },
  { to: '/producao', icon: Factory, label: 'Produção' },
  { to: '/estoque', icon: Package, label: 'Estoque' },
  { to: '/boletos', icon: Receipt, label: 'Boletos' },
  { to: '/ponto', icon: Clock, label: 'Ponto' },
  { to: '/membros-admin', icon: Users, label: 'Membros' },
];

const clientNavItems = [
  { to: '/minha-conta', icon: UserIcon, label: 'Minha Conta' },
  { to: '/meus-pedidos', icon: ListOrdered, label: 'Meus Pedidos' },
  { to: '/catalogo', icon: ShoppingCart, label: 'Catálogo' },
];

export function Sidebar() {
  const { signOut, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [boletosAlert, setBoletosAlert] = useState(0);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const isAdmin = (user as { role?: string } | null)?.role === 'admin';

  useEffect(() => {
    const checkBoletosAlert = async () => {
      try {
        const data = await apiFetch('/api/boletos') as Array<{ due_date: string; is_paid: boolean }>;
        const today = new Date();
        const alertDate = addDays(today, 3);
        const pending = (data || []).filter((b) => !b.is_paid);
        const alertCount = pending.filter((boleto) => {
          const dueDate = parseISO(boleto.due_date);
          return (isBefore(dueDate, alertDate) && isAfter(dueDate, today)) || isBefore(dueDate, today);
        }).length;
        setBoletosAlert(alertCount);
      } catch {
        setBoletosAlert(0);
      }
    };

    checkBoletosAlert();
    const interval = setInterval(checkBoletosAlert, 60000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    (async () => {
      try {
        if (user?.email) {
          const res = await apiFetch(`/api/members/exists?email=${encodeURIComponent(user.email)}`);
          setIsMember(Boolean(res?.exists));
        } else {
          setIsMember(null);
        }
      } catch {
        setIsMember(null);
      }
    })();
  }, [user?.email]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
  };

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile menu button - always visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-[60] p-2 rounded-lg bg-card border border-border shadow-lg lg:hidden"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card transition-transform duration-300',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto px-3 py-4">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3 px-2 pt-12 lg:pt-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <Factory className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Leão</h1>
              <p className="text-xs text-muted-foreground">Estofados</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {(isAdmin || !isMember) && mainNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {item.to === '/boletos' && boletosAlert > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground font-bold">
                    {boletosAlert}
                  </span>
                )}
              </NavLink>
            ))}
            <div className="mt-4 mb-1 px-3 text-xs font-semibold text-muted-foreground">Cliente</div>
            {clientNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-border pt-4 mt-4">
            {user && (
              <div className="px-2 mb-3">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">Conectado</p>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
