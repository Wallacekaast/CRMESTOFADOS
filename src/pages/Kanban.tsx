import { useState } from 'react';
import { Plus, LayoutGrid, GripVertical, Pencil, Trash2, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { KanbanTask, KanbanStatus } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const columns: { id: KanbanStatus; title: string; color: string }[] = [
  { id: 'pendente', title: 'Pendente', color: 'bg-muted-foreground' },
  { id: 'em_andamento', title: 'Em Andamento', color: 'bg-warning' },
  { id: 'concluido', title: 'Concluído', color: 'bg-success' },
];

export default function Kanban() {
  const [tasks, setTasks] = useLocalStorage<KanbanTask[]>('kanban-tasks', []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<KanbanStatus>('pendente');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleOpenDialog = (task?: KanbanTask) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setAssignee(task.assignee);
      setDueDate(task.dueDate);
    } else {
      setEditingTask(null);
      setTitle('');
      setDescription('');
      setStatus('pendente');
      setAssignee('');
      setDueDate('');
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (editingTask) {
      setTasks(tasks.map(t => 
        t.id === editingTask.id 
          ? { ...t, title, description, status, assignee, dueDate }
          : t
      ));
      toast.success('Tarefa atualizada!');
    } else {
      const newTask: KanbanTask = {
        id: crypto.randomUUID(),
        title,
        description,
        status,
        assignee,
        dueDate,
        createdAt: new Date().toISOString(),
      };
      setTasks([...tasks, newTask]);
      toast.success('Tarefa criada!');
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    toast.success('Tarefa removida!');
  };

  const handleStatusChange = (taskId: string, newStatus: KanbanStatus) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
  };

  const getTasksByStatus = (status: KanbanStatus) => {
    return tasks.filter(t => t.status === status);
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Kanban</h1>
          <p className="page-subtitle">Gerencie suas tarefas de forma visual.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Título</label>
                <Input
                  placeholder="Título da tarefa"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Descrição</label>
                <Textarea
                  placeholder="Descrição da tarefa"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Status</label>
                  <Select value={status} onValueChange={(v) => setStatus(v as KanbanStatus)}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="form-label">Responsável</label>
                  <Input
                    placeholder="Nome"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Data limite</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingTask ? 'Atualizar' : 'Criar Tarefa'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              <h3 className="font-semibold">{column.title}</h3>
              <span className="text-sm text-muted-foreground">
                ({getTasksByStatus(column.id).length})
              </span>
            </div>

            <div className="space-y-3 min-h-[400px] p-3 rounded-xl bg-muted/30 border border-border">
              {getTasksByStatus(column.id).map((task) => (
                <div
                  key={task.id}
                  className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(task)}
                        className="h-6 w-6"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task.id)}
                        className="h-6 w-6 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <Select 
                      value={task.status} 
                      onValueChange={(v) => handleStatusChange(task.id, v as KanbanStatus)}
                    >
                      <SelectTrigger className="h-7 w-auto text-xs bg-transparent border-0 p-0 hover:bg-muted/50">
                        <GripVertical className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignee}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.dueDate), 'dd/MM', { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {getTasksByStatus(column.id).length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <LayoutGrid className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">Nenhuma tarefa</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
