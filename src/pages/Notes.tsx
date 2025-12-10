import { useState } from 'react';
import { Plus, FileEdit, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Note } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Notes() {
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsEditing(true);
    setTitle('');
    setContent('');
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
    setTitle(note.title);
    setContent(note.content);
  };

  const handleEdit = () => {
    if (selectedNote) {
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (selectedNote) {
      setNotes(notes.map(n => 
        n.id === selectedNote.id 
          ? { ...n, title, content, updatedAt: new Date().toISOString() }
          : n
      ));
      setSelectedNote({ ...selectedNote, title, content, updatedAt: new Date().toISOString() });
      toast.success('Anotação atualizada!');
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(),
        title,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
      toast.success('Anotação criada!');
    }

    setIsEditing(false);
  };

  const handleDelete = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setTitle('');
      setContent('');
    }
    toast.success('Anotação removida!');
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      <h1 className="page-title">Anotações</h1>
      <p className="page-subtitle">Registre ideias, lembretes e informações importantes.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes List */}
        <div className="content-card animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">
              <FileEdit className="h-5 w-5 text-primary" />
              Minhas Anotações
            </h2>
            <Button size="sm" onClick={handleNewNote} className="gap-1">
              <Plus className="h-4 w-4" />
              Nova
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar anotações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileEdit className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Nenhuma anotação</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedNote?.id === note.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{note.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {note.content || 'Sem conteúdo'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id);
                      }}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(note.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Note Editor */}
        <div className="lg:col-span-2 content-card animate-fade-in">
          {selectedNote || isEditing ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">
                  {isEditing ? (selectedNote ? 'Editar Anotação' : 'Nova Anotação') : 'Visualizar Anotação'}
                </h2>
                {!isEditing && selectedNote && (
                  <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1">
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label">Título</label>
                  <Input
                    placeholder="Título da anotação"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="form-label">Conteúdo</label>
                  <Textarea
                    placeholder="Escreva sua anotação aqui..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={15}
                    disabled={!isEditing}
                    className="resize-none"
                  />
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="flex-1">
                      Salvar
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        if (selectedNote) {
                          setTitle(selectedNote.title);
                          setContent(selectedNote.content);
                        }
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <FileEdit className="h-16 w-16 mb-4 opacity-30" />
              <p className="font-medium">Selecione uma anotação</p>
              <p className="text-sm">ou crie uma nova para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
