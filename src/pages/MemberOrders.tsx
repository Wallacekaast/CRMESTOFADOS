import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Eye, Factory, LogOut, ShoppingCart, ListOrdered } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface CatalogOrder {
  id: string;
  order_number?: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_cnpj: string | null;
  color: string | null;
  user_email: string | null;
  progress_status: 'em_producao' | 'montagem' | 'pronto_entrega';
  notes: string | null;
  total: number;
  items_json: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export default function MemberOrders() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CatalogOrder[]>([]);
  const [filtered, setFiltered] = useState<CatalogOrder[]>([]);
  const [selected, setSelected] = useState<CatalogOrder | null>(null);
  const [open, setOpen] = useState(false);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [memberChecked, setMemberChecked] = useState<boolean>(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'accepted'|'rejected'>('all');
  const [progressFilter, setProgressFilter] = useState<'all'|'em_producao'|'montagem'|'pronto_entrega'>('all');

  useEffect(() => {
    (async () => {
      if (!user?.email) return;
      try {
        const m = await apiFetch(`/api/members/exists?email=${encodeURIComponent(user.email)}`);
        setIsMember(Boolean(m?.exists));
      } catch {
        setIsMember(null);
      }
      setMemberChecked(true);
      try {
        const data = await apiFetch(`/api/catalog/orders?limit=200&email=${encodeURIComponent(user.email)}`);
        setOrders(Array.isArray(data) ? data : []);
      } catch {
        setOrders([]);
      }
    })();
  }, [user?.email]);

  useEffect(() => {
    if (memberChecked && user?.email && isMember === false) {
      navigate('/catalogo');
    }
  }, [memberChecked, user?.email, isMember, navigate]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    const list = orders.filter((o) => {
      const statusOk = statusFilter === 'all' ? true : o.status === statusFilter;
      const progressOk = progressFilter === 'all' ? true : o.progress_status === progressFilter;
      if (!statusOk || !progressOk) return false;
      if (!q) return true;
      const text = [
        o.customer_name || '',
        o.customer_phone || '',
        o.customer_cnpj || '',
        o.color || '',
        o.notes || '',
      ].join(' ').toLowerCase();
      return text.includes(q);
    });
    setFiltered(list);
  }, [orders, query, statusFilter, progressFilter]);

  const statusLabel = (s: string) =>
    s === 'em_producao' ? 'Em Produção' : s === 'montagem' ? 'Montagem' : s === 'pronto_entrega' ? 'Pronto para Entrega' : s;

  const totals = useMemo(() => {
    const sum = filtered.reduce((acc, o) => acc + Number(o.total || 0), 0);
    return { count: filtered.length, sum };
  }, [filtered]);

  interface OrderItem {
    name: string;
    price: number;
    quantity: number;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Meus Pedidos</h1>
          <p className="text-muted-foreground">Veja o status do pedido e da produção</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/catalogo')} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Catálogo
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/minha-conta')} className="gap-2">
            <ListOrdered className="h-4 w-4" />
            Minha Conta
          </Button>
        </div>
      </div>

        {!isMember && (
          <div className="content-card">
            <p className="text-sm">Seu acesso à área de membros não está habilitado. Entre em contato com a loja para ativação.</p>
            <div className="mt-3">
              <Button onClick={() => navigate('/catalogo')} variant="outline">Voltar ao Catálogo</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex gap-3">
            <Input placeholder="Buscar por nome, WhatsApp, CNPJ, cor ou observações" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">Todos os pedidos</option>
              <option value="pending">Pendente</option>
              <option value="accepted">Aceito</option>
              <option value="rejected">Rejeitado</option>
            </select>
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={progressFilter} onChange={(e) => setProgressFilter(e.target.value as any)}>
              <option value="all">Toda produção</option>
              <option value="em_producao">Em Produção</option>
              <option value="montagem">Montagem</option>
              <option value="pronto_entrega">Pronto para Entrega</option>
            </select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(!isMember) ? (
              <p className="text-sm text-muted-foreground">Acesso restrito.</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Encontrados: {totals.count}</span>
                  <span className="font-medium">Total geral: R$ {totals.sum.toFixed(2)}</span>
                </div>
                {filtered.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {o.order_number && <Badge variant="outline" className="mr-2">{o.order_number}</Badge>}
                        {o.customer_name || 'Cliente'} • R$ {Number(o.total || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {format(new Date(o.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span>Status pedido:</span>
                        <Badge variant="secondary">{o.status}</Badge>
                        <span>Status produção:</span>
                        <Badge variant="secondary">{statusLabel(o.progress_status)}</Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => { setSelected(o); setOpen(true); }}>
                      <Eye className="h-4 w-4" />
                      Ver detalhes
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Nº Pedido:</span>
                  <span className="font-medium truncate">{selected.order_number || '—'}</span>
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium truncate">{selected.customer_name || '—'}</span>
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <span className="truncate">{selected.customer_phone || '—'}</span>
                  <span className="text-muted-foreground">CNPJ:</span>
                  <span className="truncate">{selected.customer_cnpj || '—'}</span>
                  <span className="text-muted-foreground">Cor:</span>
                  <span className="truncate">{selected.color || '—'}</span>
                  <span className="text-muted-foreground">Criado:</span>
                  <span>{format(new Date(selected.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                  <span className="text-muted-foreground">Status pedido:</span>
                  <span>{selected.status}</span>
                  <span className="text-muted-foreground">Status produção:</span>
                  <span>{statusLabel(selected.progress_status)}</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(() => {
                    try {
                      const arr = JSON.parse(selected.items_json);
                      return (Array.isArray(arr) ? arr : []).map((it: OrderItem, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="truncate">{it.name} x{it.quantity}</span>
                          <span>R$ {(Number(it.price || 0) * Number(it.quantity || 0)).toFixed(2)}</span>
                        </div>
                      ));
                    } catch {
                      return null;
                    }
                  })()}
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ {Number(selected.total || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}
