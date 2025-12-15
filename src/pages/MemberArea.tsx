import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Factory, ShoppingCart, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CatalogOrder {
  id: string;
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

interface MemberRow {
  id: string;
  email: string;
  company_name: string | null;
  cnpj: string | null;
  phone: string | null;
  active: number;
}

export default function MemberArea() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CatalogOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogOrder | null>(null);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [member, setMember] = useState<MemberRow | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    (async () => {
      if (!user?.email) return;
      try {
        const m = await apiFetch(`/api/members/exists?email=${encodeURIComponent(user.email)}`);
        setIsMember(Boolean(m?.exists));
      } catch {
        setIsMember(false);
      }
      try {
        const allMembers = await apiFetch(`/api/members`) as MemberRow[];
        const me = (Array.isArray(allMembers) ? allMembers : []).find((mm: MemberRow) => (String(mm.email || '').toLowerCase()) === String(user.email).toLowerCase()) || null;
        setMember(me);
      } catch {
        setMember(null);
      }
      try {
        const data = await apiFetch(`/api/catalog/orders?limit=200&email=${encodeURIComponent(user.email)}`);
        setOrders(Array.isArray(data) ? data : []);
      } catch {
        setOrders([]);
      }
    })();
  }, [user?.email]);

  

  const statusLabel = (s: string) =>
    s === 'em_producao' ? 'Em Produção' : s === 'montagem' ? 'Montagem' : s === 'pronto_entrega' ? 'Pronto para Entrega' : s;
  
  interface OrderItem {
    name: string;
    price: number;
    quantity: number;
  }

  useEffect(() => {
    setCompanyName(member?.company_name || '');
    setCnpj(member?.cnpj || '');
    setPhone(member?.phone || '');
  }, [member]);

  function formatCNPJ(value: string) {
    const v = String(value).replace(/\D/g, '').slice(0, 14);
    const p1 = v.slice(0, 2);
    const p2 = v.slice(2, 5);
    const p3 = v.slice(5, 8);
    const p4 = v.slice(8, 12);
    const p5 = v.slice(12, 14);
    return [p1, p2 && `.${p2}`, p3 && `.${p3}`, p4 && `/${p4}`, p5 && `-${p5}`].filter(Boolean).join('');
  }

  async function saveAccountInfo() {
    if (!user?.email || !member?.id) return;
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/members/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: user.email,
          company_name: companyName || null,
          cnpj: cnpj || null,
          phone: phone || null,
          active: member.active,
        }),
      });
      setMember(updated || null);
      toast.success('Informações atualizadas');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }
  
  async function createMember() {
    if (!user?.email) return;
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setSaving(true);
    try {
      try {
        await apiFetch(`/api/auth/signup`, {
          method: 'POST',
          body: JSON.stringify({ email: user.email, password }),
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        const m = String(msg).toLowerCase();
        if (!(m.includes('usuário já existe') || m.includes('usuario ja existe') || m.includes('user already exists'))) {
          throw e;
        }
      }
      const created = await apiFetch(`/api/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          company_name: companyName || null,
          cnpj: cnpj || null,
          phone: phone || null,
          active: 0,
        }),
      });
      setMember(created || null);
      setIsMember(false);
      toast.success('Cadastro criado. Aguarde aprovação do administrador.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar cadastro';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (!user?.email) return;
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('Senha alterada com sucesso');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao alterar senha';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
              <Factory className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Leão Estofados — Área do Cliente</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/catalogo')} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Catálogo
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/meus-pedidos')} className="gap-2">
              <Eye className="h-4 w-4" />
              Meus Pedidos
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/auth'); }} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Minha Conta</h1>
          <p className="text-muted-foreground">Acompanhe seus pedidos e seus status</p>
        </div>
        {!member && (
          <Card>
            <CardHeader>
              <CardTitle>Ativar Cadastro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input value={user?.email || ''} readOnly />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Empresa</label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">CNPJ</label>
                <Input value={cnpj} onChange={(e) => setCnpj(formatCNPJ(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Telefone/WhatsApp</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Senha</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Confirmar senha</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Após criar, um administrador precisa aprovar seu acesso.</div>
              <Button onClick={createMember} disabled={saving || !user?.email}>
                {saving ? 'Enviando...' : 'Criar cadastro'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input value={user?.email || ''} readOnly />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Empresa</label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!member?.id} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">CNPJ</label>
                <Input value={cnpj} onChange={(e) => setCnpj(formatCNPJ(e.target.value))} disabled={!member?.id} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Telefone/WhatsApp</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!member?.id} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {member
                  ? (member.active ? 'Acesso a membros: ativo' : 'Acesso a membros: inativo (aguardando aprovação)')
                  : 'Cadastro não encontrado'}
              </div>
              <Button onClick={saveAccountInfo} disabled={!member?.id || saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>
        {!isMember && (
          <div className="content-card">
            <p className="text-sm">Seu acesso à área de membros não está habilitado. Entre em contato com a loja para ativação.</p>
            <div className="mt-3">
              <Button onClick={() => navigate('/catalogo')} variant="outline">Voltar ao Catálogo</Button>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Senha atual</label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Nova senha</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Confirmar nova senha</label>
                <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={changePassword} disabled={saving || !user?.email}>
                {saving ? 'Enviando...' : 'Alterar senha'}
              </Button>
            </div>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meus Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(!isMember) ? (
            <p className="text-sm text-muted-foreground">Acesso restrito.</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
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
    </div>
  );
}
