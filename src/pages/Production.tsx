import { useState, useEffect } from 'react';
import { Plus, Package, Pencil, Trash2, CheckCircle, Clock, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ProductionStatus = 'Em Produção' | 'Finalizado e Disponível';

interface ProductionOrder {
  id: string;
  order_number: string;
  client_name: string;
  product_name: string;
  quantity: number;
  status: ProductionStatus;
  delivery_date: string | null;
  notes: string | null;
  created_at: string;
}

export default function Production() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState<ProductionOrder | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  
  const [orderNumber, setOrderNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [status, setStatus] = useState<ProductionStatus>('Em Produção');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/production-orders');
      setOrders((data || []) as ProductionOrder[]);
    } catch (err) {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber.trim() || !clientName.trim() || !productName.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const orderData = {
      order_number: orderNumber,
      client_name: clientName,
      product_name: productName,
      quantity: Number(quantity),
      status,
      delivery_date: deliveryDate || null,
      notes: notes || null,
    };

    try {
      if (editingId) {
        await apiFetch(`/api/production-orders/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(orderData),
        });
        toast.success('Pedido atualizado com sucesso!');
        setEditingId(null);
        fetchOrders();
      } else {
        await apiFetch('/api/production-orders', {
          method: 'POST',
          body: JSON.stringify(orderData),
        });
        toast.success('Pedido criado com sucesso!');
        fetchOrders();
      }
    } catch {
      toast.error('Erro ao salvar pedido');
    }

    resetForm();
  };

  const resetForm = () => {
    setOrderNumber('');
    setClientName('');
    setProductName('');
    setQuantity('1');
    setStatus('Em Produção');
    setDeliveryDate('');
    setNotes('');
  };

  const handleEdit = (order: ProductionOrder) => {
    setEditingId(order.id);
    setOrderNumber(order.order_number);
    setClientName(order.client_name);
    setProductName(order.product_name);
    setQuantity(String(order.quantity));
    setStatus(order.status);
    setDeliveryDate(order.delivery_date || '');
    setNotes(order.notes || '');
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/production-orders/${id}`, { method: 'DELETE' });
      toast.success('Pedido removido!');
      fetchOrders();
    } catch {
      toast.error('Erro ao remover pedido');
    }
  };

  const openView = (order: ProductionOrder) => {
    setViewOrder(order);
    setViewOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: ProductionStatus) => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;
      await apiFetch(`/api/production-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...order, status: newStatus }),
      });
      toast.success('Status atualizado!');
      fetchOrders();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const totalUnits = orders.reduce((acc, r) => acc + r.quantity, 0);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Controle de Produção</h1>
      <p className="page-subtitle">Registre e acompanhe a produção diária dos seus produtos.</p>

      {/* Form */}
      <div className="content-card mb-6 animate-fade-in">
        <h2 className="section-title mb-4">
          <Plus className="h-5 w-5 text-primary" />
          {editingId ? 'Editar Pedido' : 'Novo Pedido de Produção'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Nº Pedido *</label>
              <Input
                placeholder="Ex.: PED-001"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Cliente *</label>
              <Input
                placeholder="Nome do cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Produto *</label>
              <Input
                placeholder="Nome do produto"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Quantidade</label>
              <Input
                type="number"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
              />
            </div>
            <div>
              <label className="form-label">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProductionStatus)}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Em Produção">Em Produção</SelectItem>
                  <SelectItem value="Finalizado e Disponível">Finalizado e Disponível</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">Data de Entrega</label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Observações</label>
            <Textarea
              placeholder="Observações sobre o pedido"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              {editingId ? 'Atualizar' : 'Adicionar'}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={() => {
                setEditingId(null);
                resetForm();
              }}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Orders List */}
      <div className="content-card animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">
            <Package className="h-5 w-5 text-primary" />
            Pedidos de Produção
          </h2>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="font-bold text-primary">{totalUnits} unidades</span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-16 w-16 mb-4 opacity-30" />
            <p className="font-medium">Nenhum pedido de produção ainda.</p>
            <p className="text-sm">Use o formulário acima para adicionar seu primeiro pedido.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nº Pedido</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Produto</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Qtd</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Entrega</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{order.order_number}</td>
                    <td className="px-4 py-3 text-sm">{order.client_name}</td>
                    <td className="px-4 py-3 text-sm">{order.product_name}</td>
                    <td className="px-4 py-3 text-sm">{order.quantity}</td>
                    <td className="px-4 py-3 text-sm">
                      {order.delivery_date 
                        ? format(new Date(order.delivery_date), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <Select 
                        value={order.status} 
                        onValueChange={(v) => handleStatusChange(order.id, v as ProductionStatus)}
                      >
                        <SelectTrigger className="w-[200px] h-8 bg-transparent border-0 p-0">
                          <span className={`status-badge ${order.status === 'Em Produção' ? 'status-production' : 'status-finished'}`}>
                            {order.status === 'Em Produção' ? (
                              <>
                                <Clock className="h-3 w-3" />
                                Em Produção
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Finalizado
                              </>
                            )}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="Em Produção">Em Produção</SelectItem>
                          <SelectItem value="Finalizado e Disponível">Finalizado e Disponível</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openView(order)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(order)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(order.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Dialog open={viewOpen} onOpenChange={(o) => { setViewOpen(o); if (!o) setViewOrder(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nº Pedido</p>
                  <p className="font-medium">{viewOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{viewOrder.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{viewOrder.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Produto</p>
                  <p className="font-medium">{viewOrder.product_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantidade</p>
                  <p className="font-medium">{viewOrder.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entrega</p>
                  <p className="font-medium">{viewOrder.delivery_date ? format(new Date(viewOrder.delivery_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="font-medium">{format(new Date(viewOrder.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono text-sm">{viewOrder.id}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="font-medium whitespace-pre-wrap">{viewOrder.notes || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
