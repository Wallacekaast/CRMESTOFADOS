import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  price: number;
  active: boolean;
}

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function Catalog() {
  const { user } = useAuth();
  const [isMember, setIsMember] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<string>('relevance');
  const [selected, setSelected] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCnpj, setCustomerCnpj] = useState('');
  const [color, setColor] = useState<string>('');
  const [notes, setNotes] = useState('');

  function onlyDigits(s: string) {
    return String(s || '').replace(/\D/g, '');
  }
  function formatCNPJ(input: string) {
    const d = onlyDigits(input).slice(0, 14);
    if (!d) return '';
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }
  function isValidCNPJ(cnpj: string) {
    const d = onlyDigits(cnpj);
    if (d.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(d)) return false;
    const calc = (len: number) => {
      const nums = d.slice(0, len);
      const factors = len === 12
        ? [5,4,3,2,9,8,7,6,5,4,3,2]
        : [6,5,4,3,2,9,8,7,6,5,4,3,2];
      const sum = nums.split('').reduce((acc, n, i) => acc + Number(n) * factors[i], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const d1 = calc(12);
    const d2 = calc(13);
    return Number(d[12]) === d1 && Number(d[13]) === d2;
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/products');
        setProducts(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (user?.email) {
          const res = await apiFetch(`/api/members/exists?email=${encodeURIComponent(user.email)}`);
          setIsMember(Boolean(res?.exists));
        } else {
          setIsMember(false);
        }
      } catch {
        setIsMember(false);
      }
    })();
  }, [user?.email]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('catalog_cart');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCart(parsed.filter((i) => i && typeof i === 'object'));
        }
      }
    } catch {
      void 0;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('catalog_cart', JSON.stringify(cart));
    } catch {
      void 0;
    }
  }, [cart]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.category) set.add(p.category); });
    return ['all', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    const list = products
      .filter(p => p.active)
      .filter(p => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
        );
      })
      .filter(p => (category === 'all' ? true : (p.category || '') === category));
    const arr = list.slice();
    if (sort === 'name_asc') {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'price_asc') {
      arr.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === 'price_desc') {
      arr.sort((a, b) => Number(b.price) - Number(a.price));
    }
    return arr;
  }, [products, search, category, sort]);

  const total = useMemo(() => cart.reduce((acc, i) => acc + i.price * i.quantity, 0), [cart]);

  function addToCart(p: Product, qty = 1) {
    setCart((prev) => {
      const idx = prev.findIndex(i => i.product_id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { product_id: p.id, name: p.name, price: Number(p.price) || 0, quantity: qty }];
    });
    toast.success('Adicionado ao pedido');
  }

  function updateQty(id: string, q: number) {
    setCart((prev) => prev.map(i => i.product_id === id ? { ...i, quantity: Math.max(0, q) } : i).filter(i => i.quantity > 0));
  }
  function removeItem(id: string) {
    setCart((prev) => prev.filter(i => i.product_id !== id));
  }
  function clearCart() {
    setCart([]);
    try { localStorage.removeItem('catalog_cart'); } catch { void 0; }
    toast.success('Carrinho esvaziado');
  }

  async function submitOrder() {
    if (!user || !isMember) {
      toast.error(!user ? 'Faça login para enviar pedidos' : 'Apenas membros podem enviar pedidos');
      return;
    }
    if (cart.length === 0) {
      toast.error('Adicione itens ao pedido');
      return;
    }
    if (customerCnpj && !isValidCNPJ(customerCnpj)) {
      toast.error('CNPJ inválido');
      return;
    }
    try {
      const payload = {
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        customer_cnpj: customerCnpj ? onlyDigits(customerCnpj) : null,
        color: color || null,
        user_email: user?.email || null,
        notes: notes || null,
        total,
        items: cart,
      };
      await apiFetch('/api/catalog/orders', { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Pedido enviado!');
      setOrderOpen(false);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerCnpj('');
      setColor('');
      setNotes('');
      try { localStorage.removeItem('catalog_cart'); } catch { void 0; }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar pedido';
      toast.error(msg);
    }
  }

  function sendWhatsApp() {
    if (!user || !isMember) {
      toast.error(!user ? 'Faça login para enviar pedidos' : 'Apenas membros podem enviar pedidos');
      return;
    }
    const num = String(import.meta.env.VITE_COMPANY_WHATSAPP || '').replace(/\\D/g, '') || customerPhone.replace(/\\D/g, '');
    if (!num) {
      toast.error('Informe um telefone para WhatsApp');
      return;
    }
    const lines = cart.map(i => `• ${i.name} x${i.quantity} — R$ ${(i.price * i.quantity).toFixed(2)}`);
    const text = `Pedido catálogo\\n` +
      (customerName ? `Cliente: ${customerName}\\n` : '') +
      (customerCnpj ? `CNPJ: ${customerCnpj}\\n` : '') +
      (color ? `Cor: ${color}\\n` : '') +
      `${lines.join('\\n')}\\n` +
      `Total: R$ ${total.toFixed(2)}` +
      (notes ? `\\nObs: ${notes}` : '');
    const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Catálogo</h1>
          <p className="text-muted-foreground">Monte seu pedido e envie para a loja</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, descrição ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c === 'all' ? 'Todas' : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevância</SelectItem>
              <SelectItem value="name_asc">Nome (A–Z)</SelectItem>
              <SelectItem value="price_asc">Preço (menor)</SelectItem>
              <SelectItem value="price_desc">Preço (maior)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={() => setOrderOpen(true)} disabled={!user || !isMember}>
            Pedido • R$ {total.toFixed(2)}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">Nenhum produto encontrado</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="overflow-hidden">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-muted" />
              )}
              <CardContent className="p-4">
                <div className="font-medium">{p.name}</div>
                {p.category && <div className="text-xs text-muted-foreground mt-1">{p.category}</div>}
                <div className="text-primary font-bold mt-2">R$ {Number(p.price).toFixed(2)}</div>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setSelected(p)}>Detalhes</Button>
                  <Button onClick={() => (user && isMember) ? addToCart(p, 1) : toast.error(user ? 'Acesso restrito a membros' : 'Faça login para adicionar')} disabled={!user || !isMember}>+</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.image_url && (
                <img src={selected.image_url} alt={selected.name} className="w-full h-64 object-cover rounded" />
              )}
              <div className="text-primary font-bold">R$ {Number(selected.price).toFixed(2)}</div>
              {selected.description && (
                <p className="text-sm text-muted-foreground">{selected.description}</p>
              )}
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => (user && isMember) ? addToCart(selected, 1) : toast.error(user ? 'Acesso restrito a membros' : 'Faça login para adicionar')} 
                  disabled={!user || !isMember}
                >
                  Adicionar ao pedido
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Seu Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-muted-foreground">Nenhum item</div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" className="text-destructive" onClick={clearCart}>
                    Esvaziar carrinho
                  </Button>
                </div>
                {cart.map(i => (
                  <div key={i.product_id} className="flex items-center justify-between gap-3 border-b pb-2">
                    <div className="flex-1">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">R$ {i.price.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => updateQty(i.product_id, i.quantity - 1)}>-</Button>
                      <div className="w-8 text-center">{i.quantity}</div>
                      <Button variant="outline" size="sm" onClick={() => updateQty(i.product_id, i.quantity + 1)}>+</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem(i.product_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="w-24 text-right">R$ {(i.price * i.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="font-bold">Total</div>
              <div className="font-bold text-primary">R$ {total.toFixed(2)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Seu nome" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <Input placeholder="Seu WhatsApp (com DDD)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input placeholder="CNPJ da empresa" value={customerCnpj} onChange={(e) => setCustomerCnpj(formatCNPJ(e.target.value))} />
                {customerCnpj && !isValidCNPJ(customerCnpj) && (
                  <div className="mt-1 text-xs text-destructive">CNPJ inválido</div>
                )}
              </div>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue placeholder="Cor disponível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preto">preto</SelectItem>
                  <SelectItem value="cinza">cinza</SelectItem>
                  <SelectItem value="cinza grafite">cinza grafite</SelectItem>
                  <SelectItem value="terracota">terracota</SelectItem>
                  <SelectItem value="marrom">marrom</SelectItem>
                  <SelectItem value="azul">azul</SelectItem>
                  <SelectItem value="azul escuro">azul escuro</SelectItem>
                  <SelectItem value="rose">rose</SelectItem>
                  <SelectItem value="vermelho">vermelho</SelectItem>
                  <SelectItem value="rosa">rosa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={submitOrder} disabled={customerCnpj && !isValidCNPJ(customerCnpj)}>Enviar pedido</Button>
              <Button className="flex-1" variant="outline" onClick={sendWhatsApp}>Enviar pelo WhatsApp</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
