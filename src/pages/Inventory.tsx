import { useState, useEffect } from 'react';
import { Plus, Package, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  category: string | null;
}

interface StockMovement {
  id: string;
  item_id: string;
  movement_type: 'entrada' | 'saida';
  quantity: number;
  notes: string | null;
  created_at: string;
  item_name: string;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Item form state
  const [itemName, setItemName] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemUnit, setItemUnit] = useState('un');
  const [itemMinStock, setItemMinStock] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Movement form state
  const [selectedItem, setSelectedItem] = useState('');
  const [movementType, setMovementType] = useState<'entrada' | 'saida'>('entrada');
  const [movementQty, setMovementQty] = useState('');
  const [movementObs, setMovementObs] = useState('');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      const [itemsData, movementsData] = await Promise.all([
        apiFetch('/api/inventory-items'),
        apiFetch('/api/stock-movements?limit=20'),
      ]);
      setItems(itemsData || []);
      setMovements(movementsData || []);
    } catch (err) {
      toast.error('Erro ao carregar dados do estoque');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemName.trim()) {
      toast.error('Nome do item é obrigatório');
      return;
    }

    const itemData = {
      name: itemName,
      sku: itemSku || null,
      unit: itemUnit,
      minimum_stock: Number(itemMinStock) || 0,
      category: itemCategory || null,
    };

    try {
      if (editingItemId) {
        await apiFetch(`/api/inventory-items/${editingItemId}`, {
          method: 'PATCH',
          body: JSON.stringify(itemData),
        });
        toast.success('Item atualizado com sucesso!');
        setEditingItemId(null);
        fetchData();
      } else {
        await apiFetch('/api/inventory-items', {
          method: 'POST',
          body: JSON.stringify({ ...itemData, current_stock: 0 }),
        });
        toast.success('Item cadastrado com sucesso!');
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar item';
      toast.error(msg);
    }

    setItemName('');
    setItemSku('');
    setItemUnit('un');
    setItemMinStock('');
    setItemCategory('');
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemSku(item.sku || '');
    setItemUnit(item.unit);
    setItemMinStock(String(item.minimum_stock));
    setItemCategory(item.category || '');
    setItemDialogOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await apiFetch(`/api/inventory-items/${id}`, { method: 'DELETE' });
      toast.success('Item removido!');
      fetchData();
    } catch {
      toast.error('Erro ao remover item');
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem || !movementQty) {
      toast.error('Selecione um item e informe a quantidade');
      return;
    }

    const item = items.find(i => i.id === selectedItem);
    if (!item) return;

    const qty = Number(movementQty);
    
    if (movementType === 'saida' && qty > item.current_stock) {
      toast.error('Quantidade indisponível em estoque');
      return;
    }

    try {
      await apiFetch('/api/stock-movements', {
        method: 'POST',
        body: JSON.stringify({
          item_id: selectedItem,
          movement_type: movementType,
          quantity: qty,
          notes: movementObs || null,
        }),
      });
      toast.success(`${movementType === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar movimento';
      toast.error(msg);
    }

    setSelectedItem('');
    setMovementQty('');
    setMovementObs('');
  };

  const lowStockItems = items.filter(i => i.current_stock <= i.minimum_stock && i.minimum_stock > 0);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Estoque</h1>
      <p className="page-subtitle">Cadastre itens, registre entradas/saídas e acompanhe saldos.</p>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/10 p-4 animate-fade-in">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Alerta de Estoque Baixo</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {lowStockItems.map(i => i.name).join(', ')} - estoque abaixo do mínimo
          </p>
        </div>
      )}

      <div className="mb-6">
        {/* Ações: apenas botões (compacto) */}
        <div className="mb-2">
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingItemId(null);
                setItemName('');
                setItemSku('');
                setItemUnit('un');
                setItemMinStock('');
                setItemCategory('');
                setItemDialogOpen(true);
              }}
            >
              Registrar novo produto
            </Button>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setMovementDialogOpen(true)}>
              Movimentar estoque
            </Button>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Itens de Estoque */}
        <div className="content-card animate-fade-in">
          <h2 className="section-title mb-4">
            <Package className="h-5 w-5 text-primary" />
            Itens de Estoque
          </h2>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum item cadastrado</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.current_stock <= item.minimum_stock && item.minimum_stock > 0
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.sku && `SKU: ${item.sku} • `}
                      Estoque: <span className="font-medium">{item.current_stock} {item.unit}</span>
                      {item.minimum_stock > 0 && ` • Mín: ${item.minimum_stock}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditItem(item)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Recent Movements */}
        <div className="content-card animate-fade-in">
          <h2 className="section-title mb-4">
            <ArrowUpCircle className="h-5 w-5 text-primary" />
            Movimentos Recentes
          </h2>

          {movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Nenhum movimento</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
              {movements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`status-badge ${movement.movement_type === 'entrada' ? 'status-entry' : 'status-exit'}`}>
                      {movement.movement_type === 'entrada' ? (
                        <ArrowDownCircle className="h-3 w-3" />
                      ) : (
                        <ArrowUpCircle className="h-3 w-3" />
                      )}
                      {movement.movement_type === 'entrada' ? 'Entrada' : 'Saída'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{movement.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${movement.movement_type === 'entrada' ? 'text-success' : 'text-destructive'}`}>
                      {movement.movement_type === 'entrada' ? '+' : '-'}{movement.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog: Novo/Editar Item */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItemId ? 'Editar Item' : 'Novo Item de Estoque'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <label className="form-label">Nome *</label>
              <Input
                placeholder="Ex.: Espuma D33"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">SKU</label>
                <Input
                  placeholder="Opcional"
                  value={itemSku}
                  onChange={(e) => setItemSku(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Unidade</label>
                <Input
                  placeholder="un"
                  value={itemUnit}
                  onChange={(e) => setItemUnit(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Estoque mínimo</label>
                <Input
                  type="number"
                  placeholder="Opcional"
                  value={itemMinStock}
                  onChange={(e) => setItemMinStock(e.target.value)}
                  min="0"
                />
              </div>
              <div>
                <label className="form-label">Categoria</label>
                <Input
                  placeholder="Opcional"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingItemId ? 'Atualizar Item' : 'Cadastrar Item'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingItemId(null);
                  setItemDialogOpen(false);
                }}
              >
                Fechar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Movimentar Estoque */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Movimentar Estoque</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMovement} className="space-y-4">
            <div>
              <label className="form-label">Item *</label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.current_stock} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Tipo *</label>
                <Select value={movementType} onValueChange={(v) => setMovementType(v as 'entrada' | 'saida')}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="form-label">Quantidade *</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={movementQty}
                  onChange={(e) => setMovementQty(e.target.value)}
                  min="1"
                />
              </div>
            </div>
            <div>
              <label className="form-label">Observação</label>
              <Textarea
                placeholder="Opcional"
                value={movementObs}
                onChange={(e) => setMovementObs(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Registrar Movimento
              </Button>
              <Button type="button" variant="outline" onClick={() => setMovementDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lista completa abaixo */}
      <div className="content-card animate-fade-in mt-6">
        <h2 className="section-title mb-4">
          <Package className="h-5 w-5 text-primary" />
          Lista Completa do Estoque
        </h2>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum item cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">SKU</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Categoria</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Unidade</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Estoque</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Mínimo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm">{item.sku || '-'}</td>
                    <td className="px-4 py-3 text-sm">{item.category || '-'}</td>
                    <td className="px-4 py-3 text-sm">{item.unit}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.current_stock}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.minimum_stock}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditItem(item)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-8 w-8 text-destructive"
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
    </div>
  );
}
