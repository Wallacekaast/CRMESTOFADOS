import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  Building2,
  Calendar,
  CreditCard,
  Smartphone,
  Search,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Sale {
  id: string;
  sale_number: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  customers: {
    company_name: string;
    cnpj: string | null;
  } | null;
}

interface SaleItem {
  id: string;
  sale_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CashSession {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  total_sales: number;
  total_cash: number;
  total_card: number;
  total_pix: number;
  total_other: number;
  status: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function SalesReport() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<Record<string, SaleItem[]>>({});
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('month');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [dateFilter, startDate, endDate]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'week':
        return { 
          start: format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd'), 
          end: format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd') 
        };
      case 'month':
        return { 
          start: format(startOfMonth(now), 'yyyy-MM-dd'), 
          end: format(endOfMonth(now), 'yyyy-MM-dd') 
        };
      case 'custom':
        return { start: startDate, end: endDate };
      default:
        return { start: format(subDays(now, 30), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      if (dateFilter === 'custom' && (!start || !end)) {
        setLoading(false);
        return;
      }

      const [salesData, customers] = await Promise.all([
        apiFetch(`/api/sales?start=${start}T00:00:00&end=${end}T23:59:59`) as Promise<Array<{ id: string; customer_id: string | null; subtotal: number; total: number; discount: number; payment_method: string; payment_status: string; notes: string | null; created_at: string; sale_number: string }>>,
        apiFetch('/api/customers') as Promise<Array<{ id: string; company_name: string; cnpj: string | null }>>,
      ]);
      const custMap = new Map(customers.map((c) => [c.id, c]));
      const salesWithCustomer = salesData.map((s) => ({
        ...s,
        customers: s.customer_id ? custMap.get(s.customer_id) || null : null,
      }));
      setSales(salesWithCustomer);

      const sessionsData = await apiFetch(`/api/cash-register-sessions?start=${start}T00:00:00&end=${end}T23:59:59`) as Array<CashSession>;
      setSessions(sessionsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSaleItems = async (saleId: string) => {
    if (saleItems[saleId]) return;

    try {
      const data = await apiFetch(`/api/sale-items?sale_id=${saleId}`) as Array<SaleItem>;
      setSaleItems(prev => ({ ...prev, [saleId]: data || [] }));
    } catch (error) {
      console.error('Error fetching sale items:', error);
    }
  };

  const toggleSaleExpand = (saleId: string) => {
    if (expandedSale === saleId) {
      setExpandedSale(null);
    } else {
      setExpandedSale(saleId);
      fetchSaleItems(saleId);
    }
  };

  // Calculate statistics
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
  const avgTicket = sales.length > 0 ? totalSales / sales.length : 0;

  const paymentMethodStats = sales.reduce((acc, sale) => {
    const method = sale.payment_method;
    acc[method] = (acc[method] || 0) + sale.total;
    return acc;
  }, {} as Record<string, number>);

  const paymentChartData = Object.entries(paymentMethodStats).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  // Sales by day for chart
  const salesByDay = sales.reduce((acc, sale) => {
    const day = format(new Date(sale.created_at), 'dd/MM');
    acc[day] = (acc[day] || 0) + sale.total;
    return acc;
  }, {} as Record<string, number>);

  const dailyChartData = Object.entries(salesByDay)
    .map(([day, total]) => ({ day, total }))
    .reverse();

  // Customer sales ranking
  const customerSales = sales.reduce((acc, sale) => {
    const customerName = sale.customers?.company_name || 'Sem cliente';
    acc[customerName] = (acc[customerName] || 0) + sale.total;
    return acc;
  }, {} as Record<string, number>);

  const topCustomers = Object.entries(customerSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const filteredSales = sales.filter(sale => {
    if (!searchCustomer) return true;
    const customerName = sale.customers?.company_name || '';
    return customerName.toLowerCase().includes(searchCustomer.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatório de Vendas</h1>
          <p className="text-muted-foreground">Análise completa das vendas e faturamento</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === 'custom' && (
            <>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vendas</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {totalSales.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quantidade</p>
                <p className="text-2xl font-bold">{sales.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">R$ {avgTicket.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Descontos</p>
                <p className="text-2xl font-bold text-orange-600">
                  R$ {totalDiscount.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Vendas por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Vendas']}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma venda no período
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Por Forma de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma venda no período
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Top 5 Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map(([name, total], index) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{name}</span>
                  </div>
                  <span className="font-bold text-green-600">R$ {total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma venda no período
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Vendas Realizadas
              <Badge variant="secondary">{filteredSales.length}</Badge>
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma venda encontrada
            </p>
          ) : (
            <div className="space-y-2">
              {filteredSales.map(sale => (
                <div key={sale.id} className="border rounded-lg">
                  <button
                    onClick={() => toggleSaleExpand(sale.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Badge variant="outline">{sale.sale_number}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                      {sale.customers && (
                        <span className="text-sm font-medium">
                          {sale.customers.company_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-green-600">R$ {sale.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{sale.payment_method}</p>
                      </div>
                      {expandedSale === sale.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  
                  {expandedSale === sale.id && saleItems[sale.id] && (
                    <div className="border-t p-4 bg-accent/30">
                      <div className="space-y-2">
                        {saleItems[sale.id].map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.product_name}</span>
                            <span>R$ {item.total_price.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>R$ {sale.subtotal.toFixed(2)}</span>
                          </div>
                          {sale.discount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Desconto:</span>
                              <span>- R$ {sale.discount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span>R$ {sale.total.toFixed(2)}</span>
                          </div>
                        </div>
                        {sale.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Obs: {sale.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Sessões de Caixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma sessão no período
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Abertura</th>
                    <th className="text-left py-2">Fechamento</th>
                    <th className="text-right py-2">Saldo Inicial</th>
                    <th className="text-right py-2">Vendas</th>
                    <th className="text-right py-2">Dinheiro</th>
                    <th className="text-right py-2">Cartão</th>
                    <th className="text-right py-2">PIX</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => (
                    <tr key={session.id} className="border-b">
                      <td className="py-2">
                        {format(new Date(session.opened_at), "dd/MM HH:mm", { locale: ptBR })}
                      </td>
                      <td className="py-2">
                        {session.closed_at 
                          ? format(new Date(session.closed_at), "dd/MM HH:mm", { locale: ptBR })
                          : '-'
                        }
                      </td>
                      <td className="text-right py-2">R$ {session.opening_balance.toFixed(2)}</td>
                      <td className="text-right py-2 text-green-600 font-medium">
                        R$ {session.total_sales.toFixed(2)}
                      </td>
                      <td className="text-right py-2">R$ {session.total_cash.toFixed(2)}</td>
                      <td className="text-right py-2">R$ {session.total_card.toFixed(2)}</td>
                      <td className="text-right py-2">R$ {session.total_pix.toFixed(2)}</td>
                      <td className="text-center py-2">
                        <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                          {session.status === 'open' ? 'Aberto' : 'Fechado'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
