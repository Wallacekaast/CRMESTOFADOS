import { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Users, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Loader2,
  Calendar
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { format, subDays, parseISO, addDays, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ProductionOrder {
  id: string;
  order_number: string;
  client_name: string;
  product_name: string;
  quantity: number;
  status: string;
  delivery_date: string | null;
  created_at: string;
}

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  category: string | null;
}

interface Employee {
  id: string;
  name: string;
  daily_rate: number;
  active: boolean;
}

interface TimeRecord {
  id: string;
  employee_id: string;
  record_date: string;
  clock_in: string | null;
  clock_out: string | null;
}

interface Boleto {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  supplier: string | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [boletos, setBoletos] = useState<Boleto[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [orders, inventory, employees, timeRecords, boletos] = await Promise.all([
        apiFetch('/api/production-orders'),
        apiFetch('/api/inventory-items'),
        apiFetch('/api/employees'),
        apiFetch('/api/time-records?limit=100'),
        apiFetch('/api/boletos'),
      ]);
      setOrders(orders || []);
      setInventoryItems(inventory || []);
      setEmployees(employees || []);
      setTimeRecords(timeRecords || []);
      setBoletos(boletos || []);
    } catch (e) {
      // keep UX responsive
      setOrders([]);
      setInventoryItems([]);
      setEmployees([]);
      setTimeRecords([]);
      setBoletos([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    // Production
    const totalOrders = orders.length;
    const inProduction = orders.filter(o => o.status === 'Em Produção').length;
    const finished = orders.filter(o => o.status === 'Finalizado e Disponível').length;
    const totalUnits = orders.reduce((acc, o) => acc + o.quantity, 0);

    // Inventory
    const lowStockItems = inventoryItems.filter(i => 
      Number(i.current_stock) <= Number(i.minimum_stock) && Number(i.minimum_stock) > 0
    );
    const totalItems = inventoryItems.length;

    // Employees
    const activeEmployees = employees.filter(e => e.active).length;
    const totalEmployees = employees.length;

    // Boletos
    const today = new Date();
    const pendingBoletos = boletos.filter(b => !b.is_paid);
    const overdueBoletos = pendingBoletos.filter(b => isBefore(parseISO(b.due_date), today));
    const alertBoletos = pendingBoletos.filter(b => {
      const dueDate = parseISO(b.due_date);
      return !isBefore(dueDate, today) && isBefore(dueDate, addDays(today, 3));
    });
    const totalPending = pendingBoletos.reduce((acc, b) => acc + Number(b.amount), 0);
    const totalPaid = boletos.filter(b => b.is_paid).reduce((acc, b) => acc + Number(b.amount), 0);

    // Last 7 days production
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOrders = orders.filter(o => 
        format(parseISO(o.created_at), 'yyyy-MM-dd') === dateStr
      );
      return {
        date: format(date, 'dd/MM', { locale: ptBR }),
        pedidos: dayOrders.length,
        unidades: dayOrders.reduce((acc, o) => acc + o.quantity, 0),
      };
    });

    // Production by status for pie chart
    const productionByStatus = [
      { name: 'Em Produção', value: inProduction, color: 'hsl(var(--chart-1))' },
      { name: 'Finalizados', value: finished, color: 'hsl(var(--chart-2))' },
    ].filter(item => item.value > 0);

    // Boletos by status
    const boletosByStatus = [
      { name: 'Pagos', value: boletos.filter(b => b.is_paid).length, color: 'hsl(var(--chart-2))' },
      { name: 'Pendentes', value: pendingBoletos.length - overdueBoletos.length - alertBoletos.length, color: 'hsl(var(--chart-3))' },
      { name: 'Vencendo', value: alertBoletos.length, color: 'hsl(var(--chart-4))' },
      { name: 'Vencidos', value: overdueBoletos.length, color: 'hsl(var(--destructive))' },
    ].filter(item => item.value > 0);

    return {
      production: { totalOrders, inProduction, finished, totalUnits, last7Days, productionByStatus },
      inventory: { totalItems, lowStockItems: lowStockItems.length, lowStockList: lowStockItems.slice(0, 5) },
      employees: { activeEmployees, totalEmployees },
      boletos: { 
        total: boletos.length, 
        pending: pendingBoletos.length, 
        overdue: overdueBoletos.length,
        alert: alertBoletos.length,
        totalPending, 
        totalPaid,
        boletosByStatus,
        upcomingBoletos: pendingBoletos.slice(0, 5)
      },
    };
  }, [orders, inventoryItems, employees, timeRecords, boletos]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Visão geral completa do seu sistema de gestão
        </p>
      </div>

      {/* Alert Banner */}
      {(stats.boletos.overdue > 0 || stats.boletos.alert > 0 || stats.inventory.lowStockItems > 0) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-destructive">Atenção necessária</p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {stats.boletos.overdue > 0 && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {stats.boletos.overdue} boleto{stats.boletos.overdue > 1 ? 's' : ''} vencido{stats.boletos.overdue > 1 ? 's' : ''}
                  </span>
                )}
                {stats.boletos.alert > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {stats.boletos.alert} boleto{stats.boletos.alert > 1 ? 's' : ''} vencendo
                  </span>
                )}
                {stats.inventory.lowStockItems > 0 && (
                  <span className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {stats.inventory.lowStockItems} ite{stats.inventory.lowStockItems > 1 ? 'ns' : 'm'} com estoque baixo
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pedidos</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.production.totalOrders}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <span>{stats.production.totalUnits} unidades</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Finalizados</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats.production.finished}</div>
            <div className="flex items-center gap-1 text-xs text-green-500/80 mt-1">
              <ArrowUpRight className="h-3 w-3" />
              <span>
                {stats.production.totalOrders > 0 
                  ? Math.round((stats.production.finished / stats.production.totalOrders) * 100)
                  : 0}% do total
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Produção</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{stats.production.inProduction}</div>
            <div className="flex items-center gap-1 text-xs text-yellow-500/80 mt-1">
              <span>pedidos ativos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="absolute top-0 right-0 w-20 h-20 bg-destructive/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque Baixo</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.inventory.lowStockItems}</div>
            <div className="flex items-center gap-1 text-xs text-destructive/80 mt-1">
              <ArrowDownRight className="h-3 w-3" />
              <span>itens abaixo do mínimo</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total a Pagar</CardTitle>
            <DollarSign className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.boletos.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.boletos.pending} boleto{stats.boletos.pending !== 1 ? 's' : ''} pendente{stats.boletos.pending !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              R$ {stats.boletos.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.boletos.total - stats.boletos.pending} boleto{(stats.boletos.total - stats.boletos.pending) !== 1 ? 's' : ''} pago{(stats.boletos.total - stats.boletos.pending) !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Funcionários Ativos</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.employees.activeEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.employees.totalEmployees} cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Production Chart */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Produção - Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.production.last7Days}>
                  <defs>
                    <linearGradient id="colorUnidades" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="unidades" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorUnidades)" 
                    name="Unidades"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Boletos Status Chart */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Status dos Boletos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {stats.boletos.boletosByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.boletos.boletosByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {stats.boletos.boletosByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum boleto cadastrado</p>
              )}
            </div>
            {stats.boletos.boletosByStatus.length > 0 && (
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {stats.boletos.boletosByStatus.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming Boletos */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Próximos Vencimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.boletos.upcomingBoletos.length > 0 ? (
              <div className="space-y-3">
                {stats.boletos.upcomingBoletos.map((boleto) => {
                  const dueDate = parseISO(boleto.due_date);
                  const isOverdue = isBefore(dueDate, new Date());
                  const isAlert = !isOverdue && isBefore(dueDate, addDays(new Date(), 3));
                  
                  return (
                    <div 
                      key={boleto.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{boleto.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(dueDate, 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="font-semibold text-sm">
                          R$ {Number(boleto.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {isOverdue ? (
                          <Badge variant="destructive" className="text-xs">Vencido</Badge>
                        ) : isAlert ? (
                          <Badge className="bg-yellow-500 text-xs">Vencendo</Badge>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                Nenhum boleto pendente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Items */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Itens com Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.inventory.lowStockList.length > 0 ? (
              <div className="space-y-3">
                {stats.inventory.lowStockList.map((item) => {
                  const percentage = Number(item.minimum_stock) > 0 
                    ? Math.min((Number(item.current_stock) / Number(item.minimum_stock)) * 100, 100)
                    : 0;
                  
                  return (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate flex-1">{item.name}</p>
                        <span className="text-sm text-muted-foreground ml-2">
                          {item.current_stock} / {item.minimum_stock}
                        </span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500/50 mb-2" />
                <p className="text-muted-foreground text-sm">
                  Todos os itens estão com estoque adequado
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" />
              Pedidos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.slice(0, 5).length > 0 ? (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div 
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{order.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.client_name} • {order.order_number}
                      </p>
                    </div>
                    <Badge 
                      variant={order.status === 'Em Produção' ? 'secondary' : 'default'}
                      className={order.status === 'Finalizado e Disponível' ? 'bg-green-500' : ''}
                    >
                      {order.status === 'Em Produção' ? 'Produção' : 'Finalizado'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                Nenhum pedido cadastrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
