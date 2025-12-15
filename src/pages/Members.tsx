import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Member {
  id: string;
  email: string;
  company_name: string | null;
  cnpj: string | null;
  phone: string | null;
  active: number;
  created_at: string;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [userRoles, setUserRoles] = useState<Record<string, 'member' | 'admin' | 'unknown'>>({});

  const fetchMembers = async () => {
    try {
      const data = await apiFetch('/api/members');
      const rows = Array.isArray(data) ? (data as Member[]) : [];
      setMembers(rows);
      const nextRoles: Record<string, 'member' | 'admin' | 'unknown'> = {};
      await Promise.all(
        rows.map(async (m) => {
          try {
            const u = await apiFetch(`/api/users/by-email?email=${encodeURIComponent(m.email)}`);
            const r = (u?.role === 'admin' || u?.role === 'member') ? (u.role as 'admin' | 'member') : 'unknown';
            nextRoles[m.email] = r;
          } catch {
            nextRoles[m.email] = 'unknown';
          }
        })
      );
      setUserRoles(nextRoles);
    } catch {
      setMembers([]);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const createMember = async () => {
    if (!email.trim()) {
      toast.error('Informe o email');
      return;
    }
    if (!password.trim() || password.length < 6) {
      toast.error('Informe uma senha (mínimo 6 caracteres)');
      return;
    }
    try {
      try {
        await apiFetch('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            role,
          }),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        const m = String(msg).toLowerCase();
        // ignora erro se usuário já existir
        if (!(m.includes('usuário já existe') || m.includes('usuario ja existe') || m.includes('user already exists'))) {
          throw e;
        }
      }
      await apiFetch('/api/members', {
        method: 'POST',
        body: JSON.stringify({
          email,
          company_name: company || null,
          cnpj: cnpj || null,
          phone: phone || null,
          active: 1,
        }),
      });
      toast.success('Membro criado');
      setEmail('');
      setCompany('');
      setCnpj('');
      setPhone('');
      setPassword('');
      setRole('member');
      fetchMembers();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar membro';
      toast.error(msg);
    }
  };

  const toggleActive = async (m: Member) => {
    try {
      await apiFetch(`/api/members/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...m, active: m.active ? 0 : 1 }),
      });
      fetchMembers();
    } catch {
      toast.error('Erro ao atualizar membro');
    }
  };

  const removeMember = async (id: string) => {
    try {
      await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
      fetchMembers();
      toast.success('Membro removido');
    } catch {
      toast.error('Erro ao remover membro');
    }
  };

  const setUserRole = async (email: string, next: 'member' | 'admin') => {
    try {
      await apiFetch('/api/auth/admin/set-role', {
        method: 'POST',
        body: JSON.stringify({ email, role: next }),
      });
      setUserRoles((prev) => ({ ...prev, [email]: next }));
      toast.success('Tipo de usuário atualizado');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao definir tipo de usuário';
      toast.error(msg);
    }
  };

  const resetUserPassword = async (email: string) => {
    const newPw = window.prompt('Nova senha (mínimo 6 caracteres):') || '';
    if (!newPw || newPw.length < 6) {
      toast.error('Informe uma senha válida (mínimo 6 caracteres)');
      return;
    }
    try {
      await apiFetch('/api/auth/admin/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, new_password: newPw }),
      });
      toast.success('Senha resetada');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao resetar senha';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Membros</h1>
      </div>
      <p className="text-muted-foreground">Crie contas para empresas e gerencie acesso ao catálogo.</p>

      <Card>
        <CardHeader>
          <CardTitle>Criar Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
            <Input placeholder="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
            <Input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input placeholder="Senha (mín. 6 caracteres)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo de usuário</label>
              <Select value={role} onValueChange={(v) => setRole(v as 'member' | 'admin')}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="member">Cliente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={createMember}>Criar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Membros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum membro cadastrado</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{m.email}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.company_name || '—'} {m.cnpj ? `• CNPJ: ${m.cnpj}` : ''} {m.phone ? `• ${m.phone}` : ''}
                    </p>
                    <p className="text-xs">Status: {m.active ? 'Ativo' : 'Inativo'}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Tipo:</span>
                      <Select value={userRoles[m.email] || 'unknown'} onValueChange={(v) => setUserRole(m.email, v as 'member' | 'admin')}>
                        <SelectTrigger className="h-8 w-[160px]">
                          <SelectValue placeholder={userRoles[m.email] || 'unknown'} />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="member">Cliente</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="unknown" disabled>—</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(m)}>
                      {m.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => resetUserPassword(m.email)}>
                      Resetar Senha
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeMember(m.id)}>
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
