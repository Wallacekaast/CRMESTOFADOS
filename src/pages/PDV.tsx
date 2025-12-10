import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  DollarSign, 
  CreditCard, 
  Smartphone,
  Building2,
  Search,
  Package,
  Receipt,
  Lock,
  Unlock,
  X,
  Check,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SaleReceipt from '@/components/pdv/SaleReceipt';

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  image_url: string | null;
  price: number;
  stock_quantity: number;
  active: boolean;
}

interface Customer {
  id: string;
  company_name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

interface CashSession {
  id: string;
  opened_at: string;
  opening_balance: number;
  total_sales: number;
  total_cash: number;
  total_card: number;
  total_pix: number;
  total_other: number;
  status: string;
}

export default function PDV() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [discount, setDiscount] = useState(0);
  const [saleNotes, setSaleNotes] = useState('');
  
  // Dialog states
  const [openCashDialog, setOpenCashDialog] = useState(false);
  const [closeCashDialog, setCloseCashDialog] = useState(false);
  const [customerDialog, setCustomerDialog] = useState(false);
  const [newCustomerDialog, setNewCustomerDialog] = useState(false);
  const [confirmSaleDialog, setConfirmSaleDialog] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState(false);
  
  // Receipt data
  const [lastSaleData, setLastSaleData] = useState<{
    saleNumber: string;
    date: Date;
    customer: Customer | null;
    items: { product_name: string; quantity: number; unit_price: number; total_price: number; }[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    notes: string;
  } | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Form states
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    company_name: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    state: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsData, customersData, sessionData] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/customers'),
        apiFetch('/api/cash-register-sessions/open'),
      ]);
      const list = Array.isArray(productsData) ? productsData : [];
      setProducts(list.filter((p: { active: boolean }) => p.active));
      setCustomers(customersData || []);
      setCurrentSession(sessionData || null);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openCashRegister = async () => {
    if (!openingBalance) {
      toast({ title: 'Informe o valor de abertura', variant: 'destructive' });
      return;
    }

    try {
      const data = await apiFetch('/api/cash-register-sessions', {
        method: 'POST',
        body: JSON.stringify({ opening_balance: parseFloat(openingBalance) }),
      });
      setCurrentSession(data);
      setOpenCashDialog(false);
      setOpeningBalance('');
      toast({ title: 'Caixa aberto com sucesso!' });
    } catch (error) {
      console.error('Error opening cash register:', error);
      toast({ title: 'Erro ao abrir caixa', variant: 'destructive' });
    }
  };

  const closeCashRegister = async () => {
    if (!currentSession) return;

    try {
      const closingBalance = currentSession.opening_balance + 
        currentSession.total_cash - 
        (currentSession.total_card + currentSession.total_pix + currentSession.total_other);

      await apiFetch(`/api/cash-register-sessions/${currentSession.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          closed_at: new Date().toISOString(),
          closing_balance: closingBalance,
          status: 'closed',
          notes: closingNotes,
        }),
      });
      
      setCurrentSession(null);
      setCloseCashDialog(false);
      setClosingNotes('');
      toast({ title: 'Caixa fechado com sucesso!' });
    } catch (error) {
      console.error('Error closing cash register:', error);
      toast({ title: 'Erro ao fechar caixa', variant: 'destructive' });
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast({ title: 'Quantidade máxima atingida', variant: 'destructive' });
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (product.stock_quantity < 1) {
        toast({ title: 'Produto sem estoque', variant: 'destructive' });
        return;
      }
      setCart([...cart, { product, quantity: 1, notes: '' }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity < 1) return item;
        if (newQuantity > item.product.stock_quantity) {
          toast({ title: 'Quantidade máxima atingida', variant: 'destructive' });
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const total = subtotal - discount;

  const createCustomer = async () => {
    if (!newCustomer.company_name) {
      toast({ title: 'Nome da empresa é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      const data = await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer),
      });
      setCustomers([...customers, data]);
      setSelectedCustomer(data);
      setNewCustomerDialog(false);
      setNewCustomer({
        company_name: '',
        cnpj: '',
        email: '',
        phone: '',
        whatsapp: '',
        address: '',
        city: '',
        state: '',
        notes: ''
      });
      toast({ title: 'Cliente cadastrado com sucesso!' });
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({ title: 'Erro ao cadastrar cliente', variant: 'destructive' });
    }
  };

  const finalizeSale = async () => {
    if (cart.length === 0) {
      toast({ title: 'Carrinho vazio', variant: 'destructive' });
      return;
    }

    if (!currentSession) {
      toast({ title: 'Abra o caixa primeiro', variant: 'destructive' });
      return;
    }

    try {
      const saleNumber = `V${Date.now()}`;

      const itemsPayload = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        notes: item.notes,
      }));

      const sale = await apiFetch('/api/sales/complete', {
        method: 'POST',
        body: JSON.stringify({
          sale_number: saleNumber,
          customer_id: selectedCustomer?.id || null,
          session_id: currentSession.id,
          subtotal,
          discount,
          total,
          payment_method: paymentMethod,
          payment_status: 'pago',
          notes: saleNotes,
          items: itemsPayload,
        }),
      });

      // Store receipt data before clearing cart
      setLastSaleData({
        saleNumber,
        date: new Date(),
        customer: selectedCustomer,
        items: cart.map(item => ({
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity
        })),
        subtotal,
        discount,
        total,
        paymentMethod,
        notes: saleNotes
      });

      // Clear cart and reset
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setSaleNotes('');
      setPaymentMethod('dinheiro');
      setConfirmSaleDialog(false);
      
      // Open receipt dialog
      setReceiptDialog(true);
      
      fetchData();
      
      toast({ title: `Venda ${saleNumber} finalizada com sucesso!` });
    } catch (error) {
      console.error('Error finalizing sale:', error);
      toast({ title: 'Erro ao finalizar venda', variant: 'destructive' });
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Popup bloqueado. Habilite popups para imprimir.', variant: 'destructive' });
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprovante de Venda</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: monospace; padding: 10px; }
          .receipt { width: 300px; margin: 0 auto; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-sm { font-size: 12px; }
          .text-xs { font-size: 10px; }
          .text-lg { font-size: 16px; }
          .border-dashed { border-bottom: 1px dashed #999; padding-bottom: 10px; margin-bottom: 10px; }
          .border-t { border-top: 1px solid #ccc; padding-top: 8px; margin-top: 8px; }
          .flex { display: flex; justify-content: space-between; }
          .mb-2 { margin-bottom: 8px; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          .mt-4 { margin-top: 16px; }
          .pt-2 { padding-top: 8px; }
          .text-green { color: green; }
          .text-gray { color: #666; }
          @media print {
            body { padding: 0; }
            @page { margin: 10mm; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        ${receiptRef.current.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSendWhatsAppReceipt = () => {
    if (!lastSaleData) return;
    const phoneSource = selectedCustomer?.whatsapp || selectedCustomer?.phone || '';
    let phone = phoneSource.replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      const input = window.prompt('Número do WhatsApp da empresa (DDD + número, apenas dígitos):', phoneSource);
      if (!input) return;
      phone = input.replace(/\D/g, '');
    }
    if (phone.length < 10) {
      toast({ title: 'Número de WhatsApp inválido', variant: 'destructive' });
      return;
    }
    const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const lines: string[] = [];
    lines.push('*Comprovante de Venda*');
    lines.push(`Nº: ${lastSaleData.saleNumber}`);
    lines.push(`Data: ${format(lastSaleData.date, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`);
    if (lastSaleData.customer) {
      lines.push(`Cliente: ${lastSaleData.customer.company_name}`);
    }
    lines.push('Itens:');
    for (const it of lastSaleData.items) {
      lines.push(`- ${it.quantity}x ${it.product_name} • ${currency(it.total_price)}`);
    }
    lines.push(`Subtotal: ${currency(lastSaleData.subtotal)}`);
    if (lastSaleData.discount > 0) lines.push(`Desconto: ${currency(lastSaleData.discount)}`);
    lines.push(`Total: ${currency(lastSaleData.total)}`);
    lines.push(`Pagamento: ${lastSaleData.paymentMethod}`);
    if (lastSaleData.notes) lines.push(`Obs.: ${lastSaleData.notes}`);
    const text = encodeURIComponent(lines.join('\n'));
    const url = `https://wa.me/55${phone}?text=${text}`;
    const win = window.open(url, '_blank');
    if (!win) {
      window.location.href = url;
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchProduct.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(searchProduct.toLowerCase()))
  );

  const filteredCustomers = customers.filter(c =>
    c.company_name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    (c.cnpj && c.cnpj.includes(searchCustomer))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">PDV - Ponto de Venda</h1>
          <p className="text-muted-foreground">Sistema de vendas para estofados</p>
        </div>
        
        <div className="flex gap-2">
          {!currentSession ? (
            <Dialog open={openCashDialog} onOpenChange={setOpenCashDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Unlock className="h-4 w-4" />
                  Abrir Caixa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Abrir Caixa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">Valor de Abertura (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <Button onClick={openCashRegister} className="w-full">
                    Confirmar Abertura
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={closeCashDialog} onOpenChange={setCloseCashDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Lock className="h-4 w-4" />
                  Fechar Caixa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Fechar Caixa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Abertura:</span>
                    <span className="font-medium">
                      {format(new Date(currentSession.opened_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    <span className="text-muted-foreground">Saldo Inicial:</span>
                    <span className="font-medium">R$ {currentSession.opening_balance.toFixed(2)}</span>
                    <span className="text-muted-foreground">Total Vendas:</span>
                    <span className="font-medium text-green-600">R$ {currentSession.total_sales.toFixed(2)}</span>
                    <span className="text-muted-foreground">Dinheiro:</span>
                    <span className="font-medium">R$ {currentSession.total_cash.toFixed(2)}</span>
                    <span className="text-muted-foreground">Cartão:</span>
                    <span className="font-medium">R$ {currentSession.total_card.toFixed(2)}</span>
                    <span className="text-muted-foreground">PIX:</span>
                    <span className="font-medium">R$ {currentSession.total_pix.toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Observações</label>
                    <Textarea
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="Observações do fechamento..."
                    />
                  </div>
                  <Button onClick={closeCashRegister} variant="destructive" className="w-full">
                    Confirmar Fechamento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Session Status */}
      {currentSession && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">Caixa Aberto</Badge>
                <span className="text-sm text-muted-foreground">
                  Desde {format(new Date(currentSession.opened_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>Vendas: <strong className="text-green-600">R$ {currentSession.total_sales.toFixed(2)}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentSession && (
        <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <CardContent className="py-6 text-center">
            <Lock className="h-12 w-12 mx-auto text-yellow-600 mb-2" />
            <p className="font-medium">Caixa Fechado</p>
            <p className="text-sm text-muted-foreground">Abra o caixa para iniciar as vendas</p>
          </CardContent>
        </Card>
      )}

      {currentSession && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Products */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Dialog open={customerDialog} onOpenChange={setCustomerDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        {selectedCustomer ? (
                          <span className="truncate">{selectedCustomer.company_name}</span>
                        ) : (
                          <span className="text-muted-foreground">Selecionar cliente...</span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Selecionar Cliente</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nome ou CNPJ..."
                            value={searchCustomer}
                            onChange={(e) => setSearchCustomer(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {filteredCustomers.map(customer => (
                            <button
                              key={customer.id}
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setCustomerDialog(false);
                                setSearchCustomer('');
                              }}
                              className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                            >
                              <p className="font-medium">{customer.company_name}</p>
                              {customer.cnpj && (
                                <p className="text-sm text-muted-foreground">{customer.cnpj}</p>
                              )}
                              {customer.city && customer.state && (
                                <p className="text-sm text-muted-foreground">{customer.city} - {customer.state}</p>
                              )}
                            </button>
                          ))}
                          {filteredCustomers.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">
                              Nenhum cliente encontrado
                            </p>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {selectedCustomer && (
                    <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Dialog open={newCustomerDialog} onOpenChange={setNewCustomerDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Novo Cliente</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                        <div>
                          <label className="text-sm font-medium">Nome da Empresa *</label>
                          <Input
                            value={newCustomer.company_name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                            placeholder="Nome da empresa"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">CNPJ</label>
                          <Input
                            value={newCustomer.cnpj}
                            onChange={(e) => setNewCustomer({ ...newCustomer, cnpj: e.target.value })}
                            placeholder="00.000.000/0000-00"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm font-medium">Email</label>
                            <Input
                              type="email"
                              value={newCustomer.email}
                              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                              placeholder="email@empresa.com"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Telefone</label>
                            <Input
                              value={newCustomer.phone}
                              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">WhatsApp</label>
                          <Input
                            value={newCustomer.whatsapp}
                            onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp: e.target.value })}
                            placeholder="DDD + número (somente dígitos)"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Endereço</label>
                          <Input
                            value={newCustomer.address}
                            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                            placeholder="Rua, número, bairro"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm font-medium">Cidade</label>
                            <Input
                              value={newCustomer.city}
                              onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                              placeholder="Cidade"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Estado</label>
                            <Input
                              value={newCustomer.state}
                              onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                              placeholder="UF"
                              maxLength={2}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Observações</label>
                          <Textarea
                            value={newCustomer.notes}
                            onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                            placeholder="Observações sobre o cliente"
                          />
                        </div>
                        <Button onClick={createCustomer} className="w-full">
                          Cadastrar Cliente
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produtos
                  </CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
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
                    <p className="text-sm">Cadastre produtos na página de Produtos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        disabled={product.stock_quantity < 1}
                        className="p-3 rounded-lg border text-left hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {product.image_url && (
                          <img src={product.image_url} alt={product.name} className="h-20 w-full object-cover rounded mb-2" />
                        )}
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.category && (
                          <p className="text-xs text-muted-foreground truncate">{product.category}</p>
                        )}
                        <p className="text-primary font-bold mt-1">
                          R$ {product.price.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Estoque: {product.stock_quantity}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrinho
                  {cart.length > 0 && (
                    <Badge variant="secondary">{cart.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Carrinho vazio
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.product.image_url && (
                              <img src={item.product.image_url} alt={item.product.name} className="h-10 w-10 rounded object-cover border" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{item.product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                R$ {item.product.price.toFixed(2)} x {item.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>R$ {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Desconto:</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={subtotal}
                          value={discount}
                          onChange={(e) => setDiscount(Math.min(parseFloat(e.target.value) || 0, subtotal))}
                          className="w-24 h-8 text-sm"
                        />
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-primary">R$ {total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="text-sm font-medium">Forma de Pagamento</label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dinheiro">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Dinheiro
                            </div>
                          </SelectItem>
                          <SelectItem value="cartao">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Cartão
                            </div>
                          </SelectItem>
                          <SelectItem value="pix">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              PIX
                            </div>
                          </SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-sm font-medium">Observações</label>
                      <Textarea
                        value={saleNotes}
                        onChange={(e) => setSaleNotes(e.target.value)}
                        placeholder="Observações da venda..."
                        rows={2}
                      />
                    </div>

                    {/* Finalize Button */}
                    <Dialog open={confirmSaleDialog} onOpenChange={setConfirmSaleDialog}>
                      <DialogTrigger asChild>
                        <Button className="w-full gap-2" size="lg">
                          <Receipt className="h-5 w-5" />
                          Finalizar Venda
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmar Venda</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          {selectedCustomer && (
                            <div className="p-3 rounded-lg bg-accent">
                              <p className="text-sm text-muted-foreground">Cliente:</p>
                              <p className="font-medium">{selectedCustomer.company_name}</p>
                            </div>
                          )}
                          <div className="space-y-2">
                            {cart.map(item => (
                              <div key={item.product.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  {item.product.image_url && (
                                    <img src={item.product.image_url} alt={item.product.name} className="h-8 w-8 rounded object-cover border" />
                                  )}
                                  <span className="truncate">{item.quantity}x {item.product.name}</span>
                                </div>
                                <span>R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t pt-2 space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Subtotal:</span>
                              <span>R$ {subtotal.toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Desconto:</span>
                                <span>- R$ {discount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-lg">
                              <span>Total:</span>
                              <span>R$ {total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Pagamento:</span>
                              <span className="capitalize">{paymentMethod}</span>
                            </div>
                          </div>
                          <Button onClick={finalizeSale} className="w-full gap-2">
                            <Check className="h-4 w-4" />
                            Confirmar Venda
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Comprovante de Venda
            </DialogTitle>
          </DialogHeader>
          
          {lastSaleData && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <SaleReceipt ref={receiptRef} data={lastSaleData} />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="secondary"
                  onClick={handleSendWhatsAppReceipt}
                  className="flex-1 gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button 
                  onClick={handlePrintReceipt} 
                  className="flex-1 gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setReceiptDialog(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
