import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
// Serve uploaded files from data/uploads under /files
const uploadRoot = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot);
app.use('/files', express.static(uploadRoot));

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT,
  daily_rate REAL NOT NULL DEFAULT 0,
  pix_key TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS time_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  clock_in TEXT,
  lunch_out TEXT,
  lunch_in TEXT,
  clock_out TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(employee_id, record_date),
  FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  unit TEXT NOT NULL DEFAULT 'un',
  current_stock REAL NOT NULL DEFAULT 0,
  minimum_stock REAL NOT NULL DEFAULT 0,
  category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('entrada','saida')),
  quantity REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS production_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Em Produção',
  delivery_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS boletos (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  barcode TEXT,
  file_url TEXT,
  supplier TEXT,
  is_paid INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT,
  image_url TEXT,
  price REAL NOT NULL DEFAULT 0,
  cost REAL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id TEXT PRIMARY KEY,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  opening_balance REAL NOT NULL DEFAULT 0,
  closing_balance REAL,
  total_sales REAL DEFAULT 0,
  total_cash REAL DEFAULT 0,
  total_card REAL DEFAULT 0,
  total_pix REAL DEFAULT 0,
  total_other REAL DEFAULT 0,
  notes TEXT,
  opened_by TEXT,
  closed_by TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  customer_id TEXT,
  discount REAL,
  payment_method TEXT,
  payment_status TEXT,
  sale_number TEXT,
  session_id TEXT,
  sold_by TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  total_price REAL NOT NULL,
  unit_price REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Migrate: add whatsapp column to customers if missing
try {
  const cols = db.prepare("PRAGMA table_info(customers)").all();
  if (!cols.some((c) => c.name === 'whatsapp')) {
    db.exec("ALTER TABLE customers ADD COLUMN whatsapp TEXT");
  }
} catch {}

// Migrate: add image_url column to products if missing
try {
  const pcols = db.prepare("PRAGMA table_info(products)").all();
  if (!pcols.some((c) => c.name === 'image_url')) {
    db.exec("ALTER TABLE products ADD COLUMN image_url TEXT");
  }
} catch {}

const updateEmployeeStmt = db.prepare(`UPDATE employees SET pix_key = @pix_key, updated_at = datetime('now') WHERE id = @id`);
const insertEmployeeStmt = db.prepare(`INSERT INTO employees (id, name, position, daily_rate, pix_key, active) VALUES (@id, @name, @position, @daily_rate, @pix_key, 1)`);
const selectEmployeesStmt = db.prepare(`SELECT * FROM employees WHERE (@active IS NULL OR active = @active) ORDER BY name`);

const insertRecordStmt = db.prepare(`INSERT INTO time_records (id, employee_id, record_date, clock_in, lunch_out, lunch_in, clock_out, notes) VALUES (@id, @employee_id, @record_date, @clock_in, @lunch_out, @lunch_in, @clock_out, @notes)`);
const updateRecordStmt = db.prepare(`UPDATE time_records SET employee_id=@employee_id, record_date=@record_date, clock_in=@clock_in, lunch_out=@lunch_out, lunch_in=@lunch_in, clock_out=@clock_out, notes=@notes, updated_at=datetime('now') WHERE id=@id`);
const deleteRecordStmt = db.prepare(`DELETE FROM time_records WHERE id=@id`);
const selectRecordsStmt = db.prepare(`SELECT * FROM time_records ORDER BY record_date DESC LIMIT @limit`);
const selectInventoryStmt = db.prepare(`SELECT * FROM inventory_items ORDER BY name`);
const insertInventoryStmt = db.prepare(`INSERT INTO inventory_items (id, name, sku, unit, current_stock, minimum_stock, category) VALUES (@id, @name, @sku, @unit, @current_stock, @minimum_stock, @category)`);
const updateInventoryStmt = db.prepare(`UPDATE inventory_items SET name=@name, sku=@sku, unit=@unit, minimum_stock=@minimum_stock, category=@category, updated_at=datetime('now') WHERE id=@id`);
const deleteInventoryStmt = db.prepare(`DELETE FROM inventory_items WHERE id=@id`);
const insertMovementStmt = db.prepare(`INSERT INTO stock_movements (id, item_id, movement_type, quantity, notes) VALUES (@id, @item_id, @movement_type, @quantity, @notes)`);
const selectMovementsStmt = db.prepare(`
  SELECT sm.id, sm.item_id, sm.movement_type, sm.quantity, sm.notes, sm.created_at,
         ii.name AS item_name
  FROM stock_movements sm
  JOIN inventory_items ii ON ii.id = sm.item_id
  ORDER BY sm.created_at DESC
  LIMIT @limit
`);
const selectProductionOrdersStmt = db.prepare(`SELECT * FROM production_orders ORDER BY created_at DESC`);
const insertProductionOrderStmt = db.prepare(`INSERT INTO production_orders (id, order_number, client_name, product_name, quantity, status, delivery_date, notes) VALUES (@id, @order_number, @client_name, @product_name, @quantity, @status, @delivery_date, @notes)`);
const updateProductionOrderStmt = db.prepare(`UPDATE production_orders SET order_number=@order_number, client_name=@client_name, product_name=@product_name, quantity=@quantity, status=@status, delivery_date=@delivery_date, notes=@notes, updated_at=datetime('now') WHERE id=@id`);
const deleteProductionOrderStmt = db.prepare(`DELETE FROM production_orders WHERE id=@id`);
const selectBoletosStmt = db.prepare(`SELECT * FROM boletos ORDER BY due_date ASC`);
const insertBoletoStmt = db.prepare(`INSERT INTO boletos (id, description, amount, due_date, barcode, file_url, supplier, is_paid, paid_at, notes) VALUES (@id, @description, @amount, @due_date, @barcode, @file_url, @supplier, @is_paid, @paid_at, @notes)`);
const updateBoletoStmt = db.prepare(`UPDATE boletos SET description=@description, amount=@amount, due_date=@due_date, barcode=@barcode, file_url=@file_url, supplier=@supplier, is_paid=@is_paid, paid_at=@paid_at, notes=@notes, updated_at=datetime('now') WHERE id=@id`);
const deleteBoletoStmt = db.prepare(`DELETE FROM boletos WHERE id=@id`);
const selectProductsStmt = db.prepare(`SELECT * FROM products ORDER BY name`);
const insertProductStmt = db.prepare(`INSERT INTO products (id, name, description, sku, category, image_url, price, cost, stock_quantity, min_stock, active) VALUES (@id, @name, @description, @sku, @category, @image_url, @price, @cost, @stock_quantity, @min_stock, @active)`);
const updateProductStmt = db.prepare(`UPDATE products SET name=@name, description=@description, sku=@sku, category=@category, image_url=@image_url, price=@price, cost=@cost, stock_quantity=@stock_quantity, min_stock=@min_stock, active=@active, updated_at=datetime('now') WHERE id=@id`);
const deleteProductStmt = db.prepare(`DELETE FROM products WHERE id=@id`);
const updateProductStockStmt = db.prepare(`UPDATE products SET stock_quantity=@stock_quantity, updated_at=datetime('now') WHERE id=@id`);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/employees', (req, res) => {
  const active = req.query.active === 'true' ? 1 : req.query.active === 'false' ? 0 : null;
  const rows = selectEmployeesStmt.all({ active });
  res.json(rows);
});

app.post('/api/employees', (req, res) => {
  const { name, position = null, daily_rate = 0, pix_key = null } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Nome é obrigatório' });
  const id = randomUUID();
  insertEmployeeStmt.run({ id, name, position, daily_rate: Number(daily_rate) || 0, pix_key });
  res.json({ id });
});

app.patch('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const { pix_key = null } = req.body || {};
  const info = updateEmployeeStmt.run({ id, pix_key });
  if (info.changes === 0) return res.status(404).json({ error: 'Funcionario nao encontrado' });
  res.json({ ok: true });
});

app.get('/api/time-records', (req, res) => {
  const limit = Number(req.query.limit) || 100;
  const records = selectRecordsStmt.all({ limit });
  const empIds = [...new Set(records.map(r => r.employee_id))];
  const employees = empIds.length ? db.prepare(`SELECT id, name, daily_rate, pix_key FROM employees WHERE id IN (${empIds.map(() => '?').join(',')})`).all(empIds) : [];
  const empMap = new Map(employees.map(e => [e.id, e]));
  const merged = records.map(r => ({ ...r, employees: empMap.get(r.employee_id) || null }));
  res.json(merged);
});

app.post('/api/time-records', (req, res) => {
  const { employee_id, record_date, clock_in = null, lunch_out = null, lunch_in = null, clock_out = null, notes = null } = req.body || {};
  if (!employee_id || !record_date) return res.status(400).json({ error: 'employee_id e record_date são obrigatórios' });
  try {
    const id = randomUUID();
    insertRecordStmt.run({ id, employee_id, record_date, clock_in, lunch_out, lunch_in, clock_out, notes });
    res.json({ id });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Registro já existe para este funcionário nesta data' });
    res.status(500).json({ error: 'Erro ao inserir registro' });
  }
});

app.patch('/api/time-records/:id', (req, res) => {
  const { id } = req.params;
  const { employee_id, record_date, clock_in = null, lunch_out = null, lunch_in = null, clock_out = null, notes = null } = req.body || {};
  const info = updateRecordStmt.run({ id, employee_id, record_date, clock_in, lunch_out, lunch_in, clock_out, notes });
  if (info.changes === 0) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ ok: true });
});

app.delete('/api/time-records/:id', (req, res) => {
  const { id } = req.params;
  const info = deleteRecordStmt.run({ id });
  if (info.changes === 0) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ ok: true });
});

app.get('/api/inventory-items', (_req, res) => {
  res.json(selectInventoryStmt.all());
});

app.post('/api/inventory-items', (req, res) => {
  const i = req.body || {};
  if (!i.name) return res.status(400).json({ error: 'name é obrigatório' });
  const id = randomUUID();
  insertInventoryStmt.run({
    id,
    name: i.name,
    sku: i.sku || null,
    unit: i.unit || 'un',
    current_stock: Number(i.current_stock) || 0,
    minimum_stock: Number(i.minimum_stock) || 0,
    category: i.category || null,
  });
  const row = db.prepare('SELECT * FROM inventory_items WHERE id=?').get(id);
  res.json(row);
});

app.patch('/api/inventory-items/:id', (req, res) => {
  const { id } = req.params;
  const i = req.body || {};
  const info = updateInventoryStmt.run({
    id,
    name: i.name,
    sku: i.sku || null,
    unit: i.unit || 'un',
    minimum_stock: Number(i.minimum_stock) || 0,
    category: i.category || null,
  });
  if (info.changes === 0) return res.status(404).json({ error: 'Item não encontrado' });
  const row = db.prepare('SELECT * FROM inventory_items WHERE id=?').get(id);
  res.json(row);
});

app.delete('/api/inventory-items/:id', (req, res) => {
  const { id } = req.params;
  const info = deleteInventoryStmt.run({ id });
  if (info.changes === 0) return res.status(404).json({ error: 'Item não encontrado' });
  res.json({ ok: true });
});

app.get('/api/stock-movements', (req, res) => {
  const limit = Number(req.query.limit) || 20;
  res.json(selectMovementsStmt.all({ limit }));
});

app.post('/api/stock-movements', (req, res) => {
  const m = req.body || {};
  const { item_id, movement_type, quantity, notes = null } = m;
  if (!item_id || !movement_type || !quantity) return res.status(400).json({ error: 'item_id, movement_type, quantity são obrigatórios' });
  if (!['entrada','saida'].includes(movement_type)) return res.status(400).json({ error: 'movement_type inválido' });
  const qty = Number(quantity);
  const item = db.prepare('SELECT id, current_stock FROM inventory_items WHERE id=?').get(item_id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  if (movement_type === 'saida' && qty > item.current_stock) return res.status(400).json({ error: 'Quantidade indisponível em estoque' });
  const tx = db.transaction(() => {
    insertMovementStmt.run({ id: randomUUID(), item_id, movement_type, quantity: qty, notes });
    const newStock = movement_type === 'entrada' ? item.current_stock + qty : item.current_stock - qty;
    db.prepare('UPDATE inventory_items SET current_stock=@stock, updated_at=datetime(\'now\') WHERE id=@id').run({ stock: newStock, id: item_id });
  });
  try {
    tx();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao registrar movimento' });
  }
});

app.get('/api/production-orders', (_req, res) => {
  res.json(selectProductionOrdersStmt.all());
});

app.post('/api/production-orders', (req, res) => {
  const p = req.body || {};
  if (!p.order_number || !p.client_name || !p.product_name) return res.status(400).json({ error: 'order_number, client_name, product_name são obrigatórios' });
  const id = randomUUID();
  insertProductionOrderStmt.run({
    id,
    order_number: p.order_number,
    client_name: p.client_name,
    product_name: p.product_name,
    quantity: Number(p.quantity) || 1,
    status: p.status || 'Em Produção',
    delivery_date: p.delivery_date || null,
    notes: p.notes || null,
  });
  const row = db.prepare('SELECT * FROM production_orders WHERE id=?').get(id);
  res.json(row);
});

app.patch('/api/production-orders/:id', (req, res) => {
  const { id } = req.params;
  const p = req.body || {};
  const info = updateProductionOrderStmt.run({
    id,
    order_number: p.order_number,
    client_name: p.client_name,
    product_name: p.product_name,
    quantity: Number(p.quantity) || 1,
    status: p.status || 'Em Produção',
    delivery_date: p.delivery_date || null,
    notes: p.notes || null,
  });
  if (info.changes === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
  const row = db.prepare('SELECT * FROM production_orders WHERE id=?').get(id);
  res.json(row);
});

app.delete('/api/production-orders/:id', (req, res) => {
  const { id } = req.params;
  const info = deleteProductionOrderStmt.run({ id });
  if (info.changes === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json({ ok: true });
});

app.get('/api/boletos', (_req, res) => {
  res.json(selectBoletosStmt.all());
});

// Upload boleto file via base64 JSON { fileName, base64 }
app.post('/api/upload/boletos', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { fileName, base64 } = req.body || {};
    if (!fileName || !base64) return res.status(400).json({ error: 'fileName e base64 são obrigatórios' });
    const dir = path.join(uploadRoot, 'boletos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filePath, buffer);
    const url = `/files/boletos/${fileName}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar arquivo' });
  }
});

// Upload product image via base64 JSON { fileName, base64 }
app.post('/api/upload/products', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { fileName, base64 } = req.body || {};
    if (!fileName || !base64) return res.status(400).json({ error: 'fileName e base64 são obrigatórios' });
    const dir = path.join(uploadRoot, 'products');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filePath, buffer);
    const url = `/files/products/${fileName}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar imagem' });
  }
});

// Create boleto
app.post('/api/boletos', (req, res) => {
  const b = req.body || {};
  if (!b.description || !b.amount || !b.due_date) return res.status(400).json({ error: 'description, amount e due_date são obrigatórios' });
  const id = randomUUID();
  insertBoletoStmt.run({
    id,
    description: b.description,
    amount: Number(b.amount),
    due_date: String(b.due_date),
    barcode: b.barcode || null,
    file_url: b.file_url || null,
    supplier: b.supplier || null,
    is_paid: b.is_paid ? 1 : 0,
    paid_at: b.paid_at || null,
    notes: b.notes || null,
  });
  const row = db.prepare('SELECT * FROM boletos WHERE id=?').get(id);
  res.json(row);
});

// Update boleto (including mark as paid)
app.patch('/api/boletos/:id', (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const info = updateBoletoStmt.run({
    id,
    description: b.description,
    amount: b.amount != null ? Number(b.amount) : null,
    due_date: b.due_date,
    barcode: b.barcode || null,
    file_url: b.file_url || null,
    supplier: b.supplier || null,
    is_paid: b.is_paid ? 1 : 0,
    paid_at: b.paid_at || null,
    notes: b.notes || null,
  });
  if (info.changes === 0) return res.status(404).json({ error: 'Boleto não encontrado' });
  const row = db.prepare('SELECT * FROM boletos WHERE id=?').get(id);
  res.json(row);
});

// Delete boleto
app.delete('/api/boletos/:id', (req, res) => {
  const { id } = req.params;
  const info = deleteBoletoStmt.run({ id });
  if (info.changes === 0) return res.status(404).json({ error: 'Boleto não encontrado' });
  res.json({ ok: true });
});

app.get('/api/products', (_req, res) => {
  res.json(selectProductsStmt.all());
});

app.post('/api/products', (req, res) => {
  const p = req.body || {};
  if (!p.name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const id = randomUUID();
  insertProductStmt.run({
    id,
    name: p.name,
    description: p.description || null,
    sku: p.sku || null,
    category: p.category || null,
    image_url: p.image_url || null,
    price: Number(p.price) || 0,
    cost: Number(p.cost) || 0,
    stock_quantity: Number(p.stock_quantity) || 0,
    min_stock: Number(p.min_stock) || 0,
    active: p.active ? 1 : 0,
  });
  res.json({ id });
});

app.patch('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const p = req.body || {};
  const info = updateProductStmt.run({
    id,
    name: p.name,
    description: p.description || null,
    sku: p.sku || null,
    category: p.category || null,
    image_url: p.image_url || null,
    price: Number(p.price) || 0,
    cost: Number(p.cost) || 0,
    stock_quantity: Number(p.stock_quantity) || 0,
    min_stock: Number(p.min_stock) || 0,
    active: p.active ? 1 : 0,
  });
  if (info.changes === 0) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json({ ok: true });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const info = deleteProductStmt.run({ id });
  if (info.changes === 0) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json({ ok: true });
});

app.get('/api/customers', (_req, res) => {
  res.json(selectCustomersStmt.all());
});

app.get('/api/sales', (req, res) => {
  const start = String(req.query.start || `${new Date().toISOString().slice(0,10)}T00:00:00`);
  const end = String(req.query.end || `${new Date().toISOString().slice(0,10)}T23:59:59`);
  const rows = selectSalesByDateStmt.all({ start, end });
  res.json(rows);
});

app.get('/api/cash-register-sessions', (req, res) => {
  const start = String(req.query.start || `${new Date().toISOString().slice(0,10)}T00:00:00`);
  const end = String(req.query.end || `${new Date().toISOString().slice(0,10)}T23:59:59`);
  const rows = selectSessionsByDateStmt.all({ start, end });
  res.json(rows);
});

app.get('/api/cash-register-sessions/open', (_req, res) => {
  const row = selectOpenSessionStmt.get();
  res.json(row || null);
});

app.post('/api/cash-register-sessions', (req, res) => {
  const { opening_balance = 0, opened_by = null } = req.body || {};
  const id = randomUUID();
  insertSessionStmt.run({ id, opening_balance: Number(opening_balance) || 0, opened_by });
  const row = db.prepare(`SELECT * FROM cash_register_sessions WHERE id=?`).get(id);
  res.json(row);
});

app.patch('/api/cash-register-sessions/:id', (req, res) => {
  const { id } = req.params;
  const {
    closed_at = datetimeNow(),
    closing_balance = null,
    closed_by = null,
    status = 'closed',
    notes = null,
  } = req.body || {};
  const info = updateSessionStmt.run({ id, closed_at, closing_balance, closed_by, status, notes });
  if (info.changes === 0) return res.status(404).json({ error: 'Sessão não encontrada' });
  const row = db.prepare(`SELECT * FROM cash_register_sessions WHERE id=?`).get(id);
  res.json(row);
});

function datetimeNow() {
  return new Date().toISOString();
}

app.patch('/api/cash-register-sessions/:id/totals', (req, res) => {
  const { id } = req.params;
  const {
    total_sales,
    total_cash,
    total_card,
    total_pix,
    total_other,
  } = req.body || {};
  const info = updateSessionTotalsStmt.run({ id, total_sales, total_cash, total_card, total_pix, total_other });
  if (info.changes === 0) return res.status(404).json({ error: 'Sessão não encontrada' });
  const row = db.prepare(`SELECT * FROM cash_register_sessions WHERE id=?`).get(id);
  res.json(row);
});

app.post('/api/customers', (req, res) => {
  const c = req.body || {};
  if (!c.company_name) return res.status(400).json({ error: 'company_name é obrigatório' });
  const id = randomUUID();
  db.prepare(`INSERT INTO customers (id, company_name, cnpj, email, phone, whatsapp, address, city, state, notes) VALUES (@id, @company_name, @cnpj, @email, @phone, @whatsapp, @address, @city, @state, @notes)`).run({ id, ...c });
  const row = db.prepare(`SELECT * FROM customers WHERE id=?`).get(id);
  res.json(row);
});

app.post('/api/sales', (req, res) => {
  const s = req.body || {};
  if (!s.sale_number) return res.status(400).json({ error: 'sale_number é obrigatório' });
  const id = randomUUID();
  db.prepare(`INSERT INTO sales (id, created_at, customer_id, discount, payment_method, payment_status, sale_number, session_id, sold_by, subtotal, total, notes) VALUES (@id, datetime('now'), @customer_id, @discount, @payment_method, @payment_status, @sale_number, @session_id, @sold_by, @subtotal, @total, @notes)`).run({ id, ...s });
  const row = db.prepare(`SELECT * FROM sales WHERE id=?`).get(id);
  res.json(row);
});

// Complete sale with items and stock/session updates atomically
app.post('/api/sales/complete', (req, res) => {
  try {
    const payload = req.body || {};
    const {
      sale_number,
      customer_id = null,
      session_id = null,
      subtotal = 0,
      discount = 0,
      total = 0,
      payment_method = 'dinheiro',
      payment_status = 'pago',
      notes = null,
      items = [],
    } = payload;
    if (!sale_number || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Dados da venda inválidos' });
    }

    const tx = db.transaction(() => {
      const sale_id = randomUUID();
      db.prepare(`INSERT INTO sales (id, created_at, customer_id, discount, payment_method, payment_status, sale_number, session_id, sold_by, subtotal, total, notes) VALUES (@id, datetime('now'), @customer_id, @discount, @payment_method, @payment_status, @sale_number, @session_id, @sold_by, @subtotal, @total, @notes)`).run({
        id: sale_id,
        customer_id,
        discount,
        payment_method,
        payment_status,
        sale_number,
        session_id,
        sold_by: null,
        subtotal,
        total,
        notes,
      });
      const insertItem = db.prepare(`INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, total_price, unit_price, notes) VALUES (@id, @sale_id, @product_id, @product_name, @quantity, @total_price, @unit_price, @notes)`);
      for (const it of items) {
        insertItem.run({ id: randomUUID(), sale_id, ...it });
        const prod = db.prepare('SELECT id, stock_quantity FROM products WHERE id=?').get(it.product_id);
        if (prod) {
          const newStock = Math.max(0, Number(prod.stock_quantity) - Number(it.quantity || 0));
          updateProductStockStmt.run({ id: prod.id, stock_quantity: newStock });
        }
      }
      if (session_id) {
        const sess = db.prepare('SELECT id, total_sales, total_cash, total_card, total_pix, total_other FROM cash_register_sessions WHERE id=?').get(session_id);
        if (sess) {
          const totals = {
            id: session_id,
            total_sales: Number(sess.total_sales || 0) + Number(total || 0),
            total_cash: Number(sess.total_cash || 0) + (payment_method === 'dinheiro' ? Number(total || 0) : 0),
            total_card: Number(sess.total_card || 0) + (payment_method === 'cartao' ? Number(total || 0) : 0),
            total_pix: Number(sess.total_pix || 0) + (payment_method === 'pix' ? Number(total || 0) : 0),
            total_other: Number(sess.total_other || 0) + (!['dinheiro','cartao','pix'].includes(payment_method) ? Number(total || 0) : 0),
          };
          updateSessionTotalsStmt.run(totals);
        }
      }
      return sale_id;
    });

    const saleId = tx();
    const row = db.prepare(`SELECT * FROM sales WHERE id=?`).get(saleId);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao finalizar venda' });
  }
});

app.post('/api/sale-items', (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [];
  const insert = db.prepare(`INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, total_price, unit_price, notes) VALUES (@id, @sale_id, @product_id, @product_name, @quantity, @total_price, @unit_price, @notes)`);
  const tx = db.transaction((rows) => {
    for (const it of rows) insert.run({ id: randomUUID(), ...it });
  });
  tx(items);
  res.json({ ok: true });
});

app.get('/api/sale-items', (req, res) => {
  const sale_id = String(req.query.sale_id || '');
  if (!sale_id) return res.json([]);
  res.json(selectSaleItemsBySaleStmt.all({ sale_id }));
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`[API] running on http://localhost:${port}`);
});
const selectCustomersStmt = db.prepare(`SELECT id, company_name, cnpj, whatsapp FROM customers ORDER BY company_name`);
const selectSalesByDateStmt = db.prepare(`SELECT * FROM sales WHERE created_at BETWEEN @start AND @end ORDER BY created_at DESC`);
const selectSessionsByDateStmt = db.prepare(`SELECT * FROM cash_register_sessions WHERE opened_at BETWEEN @start AND @end ORDER BY opened_at DESC`);
const selectOpenSessionStmt = db.prepare(`SELECT * FROM cash_register_sessions WHERE status='open' ORDER BY opened_at DESC LIMIT 1`);
const insertSessionStmt = db.prepare(`INSERT INTO cash_register_sessions (id, opened_at, opening_balance, opened_by, status, total_sales, total_cash, total_card, total_pix, total_other) VALUES (@id, datetime('now'), @opening_balance, @opened_by, 'open', 0, 0, 0, 0, 0)`);
const updateSessionStmt = db.prepare(`UPDATE cash_register_sessions SET closed_at=@closed_at, closing_balance=@closing_balance, closed_by=@closed_by, status=@status, notes=@notes WHERE id=@id`);
const updateSessionTotalsStmt = db.prepare(`UPDATE cash_register_sessions SET total_sales=@total_sales, total_cash=@total_cash, total_card=@total_card, total_pix=@total_pix, total_other=@total_other WHERE id=@id`);
const selectSaleItemsBySaleStmt = db.prepare(`SELECT * FROM sale_items WHERE sale_id = @sale_id`);
