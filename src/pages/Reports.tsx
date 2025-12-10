import { useMemo } from 'react';
import { BarChart3, Package, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ProductionRecord, InventoryItem, InventoryMovement, TimeRecord } from '@/types';
import { format, subDays, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(239, 84%, 67%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

export default function Reports() {
  const [productionRecords] = useLocalStorage<ProductionRecord[]>('production-records', []);
  const [inventoryItems] = useLocalStorage<InventoryItem[]>('inventory-items', []);
  const [inventoryMovements] = useLocalStorage<InventoryMovement[]>('inventory-movements', []);
  const [timeRecords] = useLocalStorage<TimeRecord[]>('time-records', []);

  // Production stats
  const productionStats = useMemo(() => {
    const total = productionRecords.reduce((acc, r) => acc + r.quantity, 0);
    const inProduction = productionRecords.filter(r => r.status === 'em_producao').reduce((acc, r) => acc + r.quantity, 0);
    const finished = productionRecords.filter(r => r.status === 'finalizado').reduce((acc, r) => acc + r.quantity, 0);
    
    // Last 7 days production
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayRecords = productionRecords.filter(r => r.date === dateStr);
      return {
        date: format(date, 'dd/MM', { locale: ptBR }),
        quantidade: dayRecords.reduce((acc, r) => acc + r.quantity, 0),
      };
    });

    return { total, inProduction, finished, last7Days };
  }, [productionRecords]);

  // Inventory stats
  const inventoryStats = useMemo(() => {
    const totalItems = inventoryItems.length;
    const lowStock = inventoryItems.filter(i => i.currentStock <= i.minStock && i.minStock > 0).length;
    const totalValue = inventoryMovements
      .filter(m => m.type === 'entrada')
      .reduce((acc, m) => acc + (m.quantity * m.unitCost), 0);

    const movementsByType = [
      { name: 'Entradas', value: inventoryMovements.filter(m => m.type === 'entrada').length },
      { name: 'Saídas', value: inventoryMovements.filter(m => m.type === 'saida').length },
    ];

    return { totalItems, lowStock, totalValue, movementsByType };
  }, [inventoryItems, inventoryMovements]);

  // Time tracking stats
  const timeStats = useMemo(() => {
    const uniqueEmployees = new Set(timeRecords.map(r => r.employeeId)).size;
    const totalEntries = timeRecords.filter(r => r.type === 'entrada').length;
    
    // This week
    const today = new Date();
    const weekStart = subDays(today, today.getDay());
    const weekRecords = timeRecords.filter(r => {
      const recordDate = parseISO(r.date);
      return isWithinInterval(recordDate, { start: weekStart, end: today });
    });
    
    const weeklyTotal = weekRecords
      .filter(r => r.type === 'entrada')
      .reduce((acc, r) => acc + r.dailyRate, 0);

    return { uniqueEmployees, totalEntries, weeklyTotal };
  }, [timeRecords]);

  return (
    <div className="page-container">
      <h1 className="page-title">Relatórios</h1>
      <p className="page-subtitle">Visualize os dados consolidados da sua operação.</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stats-card animate-fade-in">
          <div className="stats-icon bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="stats-value">{productionStats.total}</p>
            <p className="stats-label">Total Produzido</p>
          </div>
        </div>

        <div className="stats-card animate-fade-in">
          <div className="stats-icon bg-success/10">
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="stats-value">{productionStats.finished}</p>
            <p className="stats-label">Finalizados</p>
          </div>
        </div>

        <div className="stats-card animate-fade-in">
          <div className="stats-icon bg-warning/10">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="stats-value">{productionStats.inProduction}</p>
            <p className="stats-label">Em Produção</p>
          </div>
        </div>

        <div className="stats-card animate-fade-in">
          <div className="stats-icon bg-destructive/10">
            <TrendingDown className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="stats-value">{inventoryStats.lowStock}</p>
            <p className="stats-label">Estoque Baixo</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Production Chart */}
        <div className="content-card animate-fade-in">
          <h2 className="section-title mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            Produção - Últimos 7 dias
          </h2>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productionStats.last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Chart */}
        <div className="content-card animate-fade-in">
          <h2 className="section-title mb-4">
            <Package className="h-5 w-5 text-primary" />
            Movimentações de Estoque
          </h2>
          
          <div className="h-64 flex items-center justify-center">
            {inventoryStats.movementsByType.some(m => m.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryStats.movementsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {inventoryStats.movementsByType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma movimentação registrada</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="content-card animate-fade-in">
          <h3 className="section-title mb-4">
            <Package className="h-5 w-5 text-primary" />
            Resumo do Estoque
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Itens cadastrados</span>
              <span className="font-medium">{inventoryStats.totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Itens com estoque baixo</span>
              <span className="font-medium text-warning">{inventoryStats.lowStock}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor total (entradas)</span>
              <span className="font-medium text-success">R$ {inventoryStats.totalValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="content-card animate-fade-in">
          <h3 className="section-title mb-4">
            <Clock className="h-5 w-5 text-primary" />
            Resumo de Ponto
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Funcionários ativos</span>
              <span className="font-medium">{timeStats.uniqueEmployees}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de entradas</span>
              <span className="font-medium">{timeStats.totalEntries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diárias (semana)</span>
              <span className="font-medium text-primary">R$ {timeStats.weeklyTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="content-card animate-fade-in">
          <h3 className="section-title mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            Resumo Financeiro
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo estoque</span>
              <span className="font-medium">R$ {inventoryStats.totalValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mão de obra (semana)</span>
              <span className="font-medium">R$ {timeStats.weeklyTotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="font-bold text-primary">
                R$ {(inventoryStats.totalValue + timeStats.weeklyTotal).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
