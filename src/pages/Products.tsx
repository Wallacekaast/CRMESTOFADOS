import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  DollarSign,
  AlertTriangle
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  image_url: string | null;
  price: number;
  cost: number;
  stock_quantity: number;
  min_stock: number;
  active: boolean;
  created_at: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    price: '',
    cost: '',
    stock_quantity: '',
    min_stock: '',
    active: true,
    image_url: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/products');
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ title: 'Erro ao carregar produtos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      sku: '',
      category: '',
      price: '',
      cost: '',
      stock_quantity: '',
      min_stock: '',
      active: true,
      image_url: ''
    });
    setImageFile(null);
    setImagePreview('');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.price) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    let uploadedUrl: string | null = null;
    try {
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${ext}`;
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result || '');
            const b64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        const uploadRes = await apiFetch('/api/upload/products', {
          method: 'POST',
          body: JSON.stringify({ fileName, base64 }),
        }) as { url: string };
        uploadedUrl = uploadRes.url;
      }
    } catch (err) {
      console.error('Erro ao enviar imagem:', err);
    }

    const productData = {
      name: form.name,
      description: form.description || null,
      sku: form.sku || null,
      category: form.category || null,
      image_url: uploadedUrl || form.image_url || null,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      min_stock: parseInt(form.min_stock) || 0,
      active: form.active
    };

    try {
      if (editingId) {
        await apiFetch(`/api/products/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(productData),
        });
        toast({ title: 'Produto atualizado!' });
      } else {
        await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify(productData),
        });
        toast({ title: 'Produto cadastrado!' });
      }
      
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({ title: 'Erro ao salvar produto', variant: 'destructive' });
    }
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      category: product.category || '',
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock_quantity: product.stock_quantity.toString(),
      min_stock: product.min_stock.toString(),
      active: product.active,
      image_url: product.image_url || ''
    });
    setEditingId(product.id);
    setImageFile(null);
    setImagePreview(product.image_url || '');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este produto?')) return;

    try {
      await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      toast({ title: 'Produto excluído!' });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ title: 'Erro ao excluir produto', variant: 'destructive' });
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock && p.active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produtos</h1>
        <p className="text-muted-foreground">Cadastro de produtos para venda (estofados)</p>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                {lowStockProducts.length} produto(s) com estoque baixo
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {imagePreview && (
                <div className="flex items-center gap-3">
                  <img src={imagePreview} alt="Prévia" className="h-16 w-16 rounded object-cover border" />
                  <span className="text-sm text-muted-foreground">Prévia da imagem</span>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Sofá 3 Lugares Retrátil"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição do produto"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">SKU</label>
                  <Input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="SF-3L-001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Sofás"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Imagem do Produto</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImageFile(file);
                    setImagePreview(file ? URL.createObjectURL(file) : '');
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Preço de Venda *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Custo</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Estoque</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Estoque Mínimo</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.min_stock}
                    onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                />
                <label className="text-sm">Produto ativo</label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produtos Cadastrados
                <Badge variant="secondary">{products.length}</Badge>
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum produto cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className={`p-4 rounded-lg border ${!product.active ? 'opacity-50' : ''} ${
                      product.stock_quantity <= product.min_stock && product.active 
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' 
                        : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {product.image_url && (
                            <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded object-cover border" />
                          )}
                          <span className="font-medium">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {product.category && (
                            <Badge variant="outline" className="text-xs">{product.category}</Badge>
                          )}
                          {!product.active && (
                            <Badge variant="secondary" className="text-xs">Inativo</Badge>
                          )}
                          {product.stock_quantity <= product.min_stock && product.active && (
                            <Badge variant="destructive" className="text-xs">Estoque baixo</Badge>
                          )}
                        </div>
                        {product.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                        )}
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-primary font-bold">
                            <DollarSign className="h-4 w-4" />
                            {product.price.toFixed(2)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Estoque: {product.stock_quantity}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
