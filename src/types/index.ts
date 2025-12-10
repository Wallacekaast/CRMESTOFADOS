// Production Types
export type ProductionStatus = 'em_producao' | 'finalizado';

export interface ProductionRecord {
  id: string;
  date: string;
  product: string;
  quantity: number;
  status: ProductionStatus;
  createdAt: string;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  minStock: number;
  currentStock: number;
  createdAt: string;
}

export type MovementType = 'entrada' | 'saida';

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: MovementType;
  quantity: number;
  unitCost: number;
  date: string;
  time: string;
  observation: string;
  createdAt: string;
}

// Time Tracking Types
export type TimeEntryType = 'entrada' | 'saida';

export interface Employee {
  id: string;
  name: string;
  dailyRate: number;
  position: string;
  createdAt: string;
}

export interface TimeRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: TimeEntryType;
  date: string;
  time: string;
  dailyRate: number;
  createdAt: string;
}

export interface WeeklySummary {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  totalAmount: number;
  records: TimeRecord[];
}

// Notes Types
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Kanban Types
export type KanbanStatus = 'pendente' | 'em_andamento' | 'concluido';

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: KanbanStatus;
  assignee: string;
  dueDate: string;
  createdAt: string;
}
