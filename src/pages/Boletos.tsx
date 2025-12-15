import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  FileText, 
  Upload,
  Download,
  Search,
  Filter,
  Pencil
} from 'lucide-react';
import { format, parseISO, addDays, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Boleto {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_at: string | null;
  supplier: string | null;
  barcode: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
}

export default function Boletos() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<{
    id: string | null;
    description: string;
    amount: string;
    due_date: string;
    supplier: string;
    status: 'pending' | 'paid';
    file_url: string | null;
  }>({ id: null, description: '', amount: '', due_date: '', supplier: '', status: 'pending', file_url: null });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editingUploading, setEditingUploading] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    due_date: '',
    supplier: '',
    barcode: '',
    notes: '',
    file: null as File | null,
  });

  useEffect(() => {
    fetchBoletos();
  }, []);

  const fetchBoletos = async () => {
    try {
      const data = await apiFetch('/api/boletos');
      setBoletos(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar boletos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || !formData.amount || !formData.due_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    let fileUrl: string | null = null;

    try {
      if (formData.file) {
        setUploadingFile(true);
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result || '');
            const b64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(formData.file!);
        });
        const uploadRes = await apiFetch('/api/upload/boletos', {
          method: 'POST',
          body: JSON.stringify({ fileName, base64 }),
        }) as { url: string };
        fileUrl = uploadRes.url;
        setUploadingFile(false);
      }

      await apiFetch('/api/boletos', {
        method: 'POST',
        body: JSON.stringify({
          description: formData.description,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          supplier: formData.supplier || null,
          barcode: formData.barcode || null,
          notes: formData.notes || null,
          file_url: fileUrl,
        }),
      });

      toast.success('Boleto adicionado com sucesso!');
      setFormData({
        description: '',
        amount: '',
        due_date: '',
        supplier: '',
        barcode: '',
        notes: '',
        file: null,
      });
      setIsDialogOpen(false);
      fetchBoletos();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar boleto');
      setUploadingFile(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const b = boletos.find((x) => x.id === id);
      if (!b) return;
      await apiFetch(`/api/boletos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          description: b.description,
          amount: b.amount,
          due_date: b.due_date,
          supplier: b.supplier,
          barcode: b.barcode,
          notes: b.notes,
          file_url: b.file_url,
          is_paid: true,
          paid_at: new Date().toISOString(),
        }),
      });
      toast.success('Boleto marcado como pago!');
      fetchBoletos();
    } catch (err) {
      toast.error('Erro ao marcar como pago');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/boletos/${id}`, { method: 'DELETE' });
      toast.success('Boleto excluído!');
      fetchBoletos();
    } catch (err) {
      toast.error('Erro ao excluir boleto');
    }
  };

  const openEdit = (b: Boleto) => {
    setEditData({
      id: b.id,
      description: b.description || '',
      amount: String(b.amount ?? ''),
      due_date: b.due_date ? String(b.due_date).slice(0, 10) : '',
      supplier: b.supplier || '',
      status: b.is_paid ? 'paid' : 'pending',
      file_url: b.file_url || null,
    });
    setEditFile(null);
    setIsEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.id) return;
    try {
      let newFileUrl: string | null = editData.file_url || null;
      if (editFile) {
        setEditingUploading(true);
        const ext = editFile.name.split('.').pop();
        const fileName = `${Date.now()}.${ext}`;
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result || '');
            const b64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(editFile);
        });
        const uploadRes = await apiFetch('/api/upload/boletos', {
          method: 'POST',
          body: JSON.stringify({ fileName, base64 }),
        }) as { url: string };
        newFileUrl = uploadRes.url;
        setEditingUploading(false);
      }
      await apiFetch(`/api/boletos/${editData.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          description: editData.description,
          amount: editData.amount ? parseFloat(editData.amount) : null,
          due_date: editData.due_date,
          supplier: editData.supplier || null,
          is_paid: editData.status === 'paid',
          paid_at: editData.status === 'paid' ? new Date().toISOString() : null,
          file_url: newFileUrl,
        }),
      });
      toast.success('Boleto atualizado!');
      setIsEditOpen(false);
      setEditFile(null);
      fetchBoletos();
    } catch (err) {
      toast.error('Erro ao atualizar boleto');
      setEditingUploading(false);
    }
  };

  const getBoletoStatus = (boleto: Boleto) => {
    if (boleto.is_paid) return 'paid';
    const dueDate = parseISO(boleto.due_date);
    const today = new Date();
    if (isBefore(dueDate, today)) return 'overdue';
    const alertDate = addDays(today, 3);
    if (isBefore(dueDate, alertDate)) return 'alert';
    return 'pending';
  };

  const filteredBoletos = boletos.filter((boleto) => {
    const matchesSearch =
      boleto.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boleto.supplier?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const status = getBoletoStatus(boleto);

    if (filterStatus === 'all') return true;
    if (filterStatus === 'paid') return status === 'paid';
    if (filterStatus === 'pending') return status === 'pending' || status === 'alert';
    if (filterStatus === 'overdue') return status === 'overdue';

    return true;
  });

  const alertCount = boletos.filter((b) => {
    const status = getBoletoStatus(b);
    return status === 'alert' || status === 'overdue';
  }).length;

  const totalPending = boletos
    .filter((b) => !b.is_paid)
    .reduce((acc, b) => acc + Number(b.amount), 0);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Boletos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie seus boletos e contas a pagar
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Novo Boleto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Boleto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Ex: Conta de luz"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Vencimento *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) =>
                        setFormData({ ...formData, due_date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier: e.target.value })
                    }
                    placeholder="Nome do fornecedor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    placeholder="Cole o código de barras aqui"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Arquivo PDF</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          file: e.target.files?.[0] || null,
                        })
                      }
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => document.getElementById('file')?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      {formData.file ? formData.file.name : 'Selecionar arquivo'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={uploadingFile}>
                  {uploadingFile ? 'Enviando arquivo...' : 'Adicionar Boleto'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alert Banner */}
        {alertCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                Atenção! {alertCount} boleto{alertCount > 1 ? 's' : ''} vencendo em breve ou
                vencido{alertCount > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Total pendente: R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total de Boletos</p>
            <p className="text-2xl font-bold">{boletos.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-500">
              {boletos.filter((b) => !b.is_paid).length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pagos</p>
            <p className="text-2xl font-bold text-green-500">
              {boletos.filter((b) => b.is_paid).length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Pendente</p>
            <p className="text-xl font-bold">
              R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as 'all' | 'pending' | 'paid' | 'overdue')}
          >
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
              <SelectItem value="overdue">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Fornecedor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredBoletos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum boleto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredBoletos.map((boleto) => {
                  const status = getBoletoStatus(boleto);
                  return (
                    <TableRow key={boleto.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{boleto.description}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {boleto.supplier || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {boleto.supplier || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {Number(boleto.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(boleto.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {status === 'paid' && (
                          <Badge variant="default" className="bg-green-500">
                            Pago
                          </Badge>
                        )}
                        {status === 'pending' && (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                        {status === 'alert' && (
                          <Badge variant="default" className="bg-yellow-500">
                            Vencendo
                          </Badge>
                        )}
                        {status === 'overdue' && (
                          <Badge variant="destructive">Vencido</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {boleto.file_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(boleto.file_url!, '_blank')}
                              title="Ver arquivo"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(boleto)}
                            title="Editar boleto"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!boleto.is_paid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkAsPaid(boleto.id)}
                              title="Marcar como pago"
                              className="text-green-500 hover:text-green-600"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir boleto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(boleto.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Boleto</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_description">Descrição *</Label>
                <Input
                  id="edit_description"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_amount">Valor *</Label>
                  <Input
                    id="edit_amount"
                    type="number"
                    step="0.01"
                    value={editData.amount}
                    onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_due">Vencimento *</Label>
                  <Input
                    id="edit_due"
                    type="date"
                    value={editData.due_date}
                    onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_supplier">Fornecedor</Label>
                <Input
                  id="edit_supplier"
                  value={editData.supplier}
                  onChange={(e) => setEditData({ ...editData, supplier: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_file">Arquivo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit_file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => document.getElementById('edit_file')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {editFile ? editFile.name : (editData.file_url ? 'Substituir arquivo' : 'Selecionar arquivo')}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editData.status}
                  onValueChange={(v) => setEditData({ ...editData, status: v as 'pending' | 'paid' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={editingUploading}> {editingUploading ? 'Enviando arquivo...' : 'Salvar alterações'} </Button>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
