import { useState, useEffect, useMemo } from 'react';
import { Plus, Clock, Search, Pencil, Trash2, ArrowRightCircle, ArrowLeftCircle, FileText, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Employee {
  id: string;
  name: string;
  position: string | null;
  daily_rate: number;
  active: boolean;
  pix_key?: string | null;
}

interface TimeRecord {
  id: string;
  employee_id: string;
  record_date: string;
  clock_in: string | null;
  lunch_out: string | null;
  lunch_in: string | null;
  clock_out: string | null;
  notes: string | null;
  employees?: { name: string; daily_rate: number; pix_key?: string | null };
}

interface WeeklySummary {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  totalAmount: number;
  pixKey: string | null;
}

export default function TimeTracking() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [employeeName, setEmployeeName] = useState('');
  const [employeeDailyRate, setEmployeeDailyRate] = useState('');
  const [employeePosition, setEmployeePosition] = useState('');
  const [employeePixKey, setEmployeePixKey] = useState('');
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedEmployeePixKey, setSelectedEmployeePixKey] = useState('');
  const [recordDate, setRecordDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [clockIn, setClockIn] = useState('');
  const [lunchOut, setLunchOut] = useState('');
  const [lunchIn, setLunchIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [weeklySearchQuery, setWeeklySearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedEmployee) {
      setSelectedEmployeePixKey('');
      return;
    }
    const emp = employees.find(e => e.id === selectedEmployee);
    setSelectedEmployeePixKey(emp?.pix_key || '');
  }, [selectedEmployee, employees]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const employeesData = await apiFetch('/api/employees?active=true');
      setEmployees(employeesData || []);

      const recordsData = await apiFetch('/api/time-records?limit=100');
      setRecords(recordsData || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast.error(`Erro ao carregar registros: ${message}`);
      setEmployees([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeName.trim()) {
      toast.error('Nome do funcionário é obrigatório');
      return;
    }

    try {
      await apiFetch('/api/employees', {
        method: 'POST',
        body: JSON.stringify({
          name: employeeName,
          daily_rate: Number(employeeDailyRate) || 0,
          position: employeePosition || null,
          pix_key: employeePixKey || null,
        }),
      });
      toast.success('Funcionário cadastrado com sucesso!');
      fetchData();
    } catch (e) {
      toast.error('Erro ao cadastrar funcionário');
    }
    
    setEmployeeName('');
    setEmployeeDailyRate('');
    setEmployeePosition('');
    setEmployeePixKey('');
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      toast.error('Selecione um funcionário');
      return;
    }

    const recordData = {
      employee_id: selectedEmployee,
      record_date: recordDate,
      clock_in: clockIn || null,
      lunch_out: lunchOut || null,
      lunch_in: lunchIn || null,
      clock_out: clockOut || null,
    };

    try {
      await apiFetch(`/api/employees/${selectedEmployee}`, {
        method: 'PATCH',
        body: JSON.stringify({ pix_key: selectedEmployeePixKey || null }),
      });
    } catch (e) {
      toast.error('Erro ao atualizar chave Pix');
    }

    if (editingRecordId) {
      try {
        await apiFetch(`/api/time-records/${editingRecordId}`, {
          method: 'PATCH',
          body: JSON.stringify(recordData),
        });
        toast.success('Registro atualizado!');
        setEditingRecordId(null);
        fetchData();
      } catch (e) {
        toast.error('Erro ao atualizar registro');
      }
    } else {
      try {
        await apiFetch('/api/time-records', {
          method: 'POST',
          body: JSON.stringify(recordData),
        });
        toast.success('Ponto registrado com sucesso!');
        fetchData();
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('já existe') || msg.includes('Registro já existe')) {
          toast.error('Já existe registro para este funcionário nesta data');
        } else {
          toast.error('Erro ao registrar ponto');
        }
      }
    }

    resetRecordForm();
  };

  const resetRecordForm = () => {
    setSelectedEmployee('');
    setSelectedEmployeePixKey('');
    setRecordDate(format(new Date(), 'yyyy-MM-dd'));
    setClockIn('');
    setLunchOut('');
    setLunchIn('');
    setClockOut('');
  };

  const handleEditRecord = (record: TimeRecord) => {
    setEditingRecordId(record.id);
    setSelectedEmployee(record.employee_id);
    const emp = employees.find(e => e.id === record.employee_id);
    setSelectedEmployeePixKey(emp?.pix_key || '');
    setRecordDate(record.record_date);
    setClockIn(record.clock_in || '');
    setLunchOut(record.lunch_out || '');
    setLunchIn(record.lunch_in || '');
    setClockOut(record.clock_out || '');
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await apiFetch(`/api/time-records/${id}`, { method: 'DELETE' });
      toast.success('Registro removido!');
      fetchData();
    } catch (e) {
      toast.error('Erro ao remover registro');
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const employeeName = record.employees?.name || '';
      const matchesSearch = searchQuery === '' || 
        employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.record_date.includes(searchQuery);
      
      const matchesEmployee = selectedEmployeeFilter === 'all' || record.employee_id === selectedEmployeeFilter;
      
      return matchesSearch && matchesEmployee;
    });
  }, [records, searchQuery, selectedEmployeeFilter]);

  // Calculate weekly summary
  const weeklySummary = useMemo((): WeeklySummary[] => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const weekRecords = records.filter(r => {
      const recordDate = parseISO(r.record_date);
      return recordDate >= weekStart && recordDate <= weekEnd;
    });

    const summaryMap = new Map<string, WeeklySummary>();

    weekRecords.forEach(record => {
      if (record.clock_in && record.employees) {
        if (!summaryMap.has(record.employee_id)) {
          summaryMap.set(record.employee_id, {
            employeeId: record.employee_id,
            employeeName: record.employees.name,
            totalDays: 0,
            totalAmount: 0,
            pixKey: record.employees.pix_key,
          });
        }
        
        const summary = summaryMap.get(record.employee_id)!;
        summary.totalDays += 1;
        summary.totalAmount += record.employees.daily_rate;
      }
    });

    return Array.from(summaryMap.values());
  }, [records]);

  const selectedEmployeeDetails = useMemo(() => {
    if (selectedEmployeeFilter === 'all') return null;
    return employees.find(e => e.id === selectedEmployeeFilter);
  }, [selectedEmployeeFilter, employees]);

  const employeeWeeklySummary = useMemo(() => {
    if (selectedEmployeeFilter === 'all') return null;
    return weeklySummary.find(s => s.employeeId === selectedEmployeeFilter);
  }, [selectedEmployeeFilter, weeklySummary]);

  const filteredWeeklySummary = useMemo(() => {
    if (!weeklySearchQuery.trim()) return weeklySummary;
    const q = weeklySearchQuery.toLowerCase();
    return weeklySummary.filter(s =>
      s.employeeName.toLowerCase().includes(q) || (s.pixKey || '').toLowerCase().includes(q),
    );
  }, [weeklySearchQuery, weeklySummary]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Registro de Ponto</h1>
      <p className="page-subtitle">Controle de entrada e saída dos funcionários.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Add Employee Form */}
        <div className="content-card animate-fade-in">
          <h2 className="section-title mb-4">
            <Plus className="h-5 w-5 text-primary" />
            Cadastrar Funcionário
          </h2>

          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div>
              <label className="form-label">Nome *</label>
              <Input
                placeholder="Nome do funcionário"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Diária (R$)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={employeeDailyRate}
                  onChange={(e) => setEmployeeDailyRate(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="form-label">Cargo</label>
                <Input
                  placeholder="Opcional"
                  value={employeePosition}
                  onChange={(e) => setEmployeePosition(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="form-label">Chave Pix</label>
              <Input
                placeholder="E-mail, CPF/CNPJ, celular ou aleatória"
                value={employeePixKey}
                onChange={(e) => setEmployeePixKey(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Cadastrar Funcionário
            </Button>
          </form>
        </div>

        {/* Add Time Record Form */}
        <div className="content-card animate-fade-in">
          <h2 className="section-title mb-4">
            <Clock className="h-5 w-5 text-primary" />
            {editingRecordId ? 'Editar Ponto' : 'Registrar Ponto'}
          </h2>

          <form onSubmit={handleAddRecord} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Funcionário *</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="form-label">Data *</label>
                <Input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="form-label">Entrada</label>
                <Input
                  type="time"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Saída Almoço</label>
                <Input
                  type="time"
                  value={lunchOut}
                  onChange={(e) => setLunchOut(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Volta Almoço</label>
                <Input
                  type="time"
                  value={lunchIn}
                  onChange={(e) => setLunchIn(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Saída</label>
                <Input
                  type="time"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="form-label">Chave Pix</label>
              <Input
                placeholder="Editar chave Pix do funcionário"
                value={selectedEmployeePixKey}
                onChange={(e) => setSelectedEmployeePixKey(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingRecordId ? 'Atualizar Ponto' : 'Registrar Ponto'}
              </Button>
              {editingRecordId && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingRecordId(null);
                  resetRecordForm();
                }}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Search Bar */}
      <div className="content-card mb-6 animate-fade-in">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por funcionário ou data"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Filtrar por funcionário" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos os funcionários</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Employee Details Card */}
        {selectedEmployeeDetails && (
          <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{selectedEmployeeDetails.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedEmployeeDetails.position || 'Sem cargo definido'} • Diária: R$ {selectedEmployeeDetails.daily_rate.toFixed(2)}
                </p>
              </div>
              {employeeWeeklySummary && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Esta semana:</p>
                  <p className="font-bold text-lg text-primary">
                    {employeeWeeklySummary.totalDays} dias • R$ {employeeWeeklySummary.totalAmount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Records Table */}
      <div className="content-card mb-6 animate-fade-in">
        <h2 className="section-title mb-4">
          <FileText className="h-5 w-5 text-primary" />
          Registros de Ponto
        </h2>

        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Funcionário</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Entrada</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Almoço</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Saída</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{record.employees?.name}</td>
                    <td className="px-4 py-3 text-sm">
                      {format(parseISO(record.record_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      {record.clock_in ? (
                        <span className="status-badge status-entry">
                          <ArrowRightCircle className="h-3 w-3" />
                          {record.clock_in.slice(0, 5)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.lunch_out && record.lunch_in 
                        ? `${record.lunch_out.slice(0, 5)} - ${record.lunch_in.slice(0, 5)}`
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3">
                      {record.clock_out ? (
                        <span className="status-badge status-exit">
                          <ArrowLeftCircle className="h-3 w-3" />
                          {record.clock_out.slice(0, 5)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditRecord(record)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRecord(record.id)}
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

      {/* Weekly Summary */}
      <div className="content-card animate-fade-in">
        <h2 className="section-title mb-2">
          <FileText className="h-5 w-5 text-primary" />
          Resumo Semanal de Diárias
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {format(weekStart, 'dd/MM/yyyy', { locale: ptBR })} - {format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}
        </p>
        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar funcionário ou Pix"
            value={weeklySearchQuery}
            onChange={(e) => setWeeklySearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredWeeklySummary.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum registro nesta semana</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Funcionário</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Pix</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Dias Trabalhados</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                {filteredWeeklySummary.map((summary) => (
                  <tr key={summary.employeeId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{summary.employeeName}</td>
                    <td className="px-4 py-3 text-sm break-all text-muted-foreground">{summary.pixKey || '-'}</td>
                    <td className="px-4 py-3 text-sm">{summary.totalDays} dias</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-primary">
                      R$ {summary.totalAmount.toFixed(2)}
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
