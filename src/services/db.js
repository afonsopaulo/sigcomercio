import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

const requireClient = () => {
  if (!supabase) throw new Error('Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local.');
  return supabase;
};

const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const productFromDb = (p) => p && ({ ...p, purchasePrice: Number(p.purchase_price), sellingPrice: Number(p.selling_price), minStock: p.min_stock });
const productToDb = ({ purchasePrice, sellingPrice, minStock, ...p }) => ({ ...p, purchase_price: Number(purchasePrice) || 0, selling_price: Number(sellingPrice) || 0, min_stock: Number(minStock) || 0, stock: Number(p.stock) || 0 });
const clientFromDb = (c) => c && ({ ...c, purchaseCount: c.purchase_count, totalSpent: Number(c.total_spent), debt: Number(c.debt) });
const clientToDb = ({ purchaseCount, totalSpent, ...c }) => ({ ...c, purchase_count: Number(purchaseCount) || 0, total_spent: Number(totalSpent) || 0, debt: Number(c.debt) || 0 });
const saleFromDb = (s) => ({ ...s, clientId: s.client_id, clientName: s.client_name, paymentMethod: s.payment_method, items: (s.sale_items || []).map(i => ({ productId: i.product_id, name: i.name, quantity: i.quantity, unitPrice: Number(i.unit_price), totalPrice: Number(i.total_price) })) });
const movementFromDb = (m) => ({ ...m, productId: m.product_id, productName: m.product_name });

export const dbService = {
  async getProducts() {
    const rows = unwrap(await requireClient().from('products').select('*').order('name'));
    return rows.map(productFromDb);
  },
  async addProduct(product) {
    const row = unwrap(await requireClient().from('products').insert(productToDb(product)).select().single());
    const created = productFromDb(row);
    if (created.stock > 0) await this.addStockMovement({ productId: created.id, productName: created.name, quantity: created.stock, type: 'input', motive: 'Cadastro Inicial de Produto' });
    return created;
  },
  async updateProduct(id, product, registerMovement = true) {
    const existing = (await this.getProducts()).find(p => p.id === id);
    const row = unwrap(await requireClient().from('products').update(productToDb(product)).eq('id', id).select().single());
    const updated = productFromDb(row);
    const diff = updated.stock - (existing?.stock ?? updated.stock);
    if (diff && registerMovement) await this.addStockMovement({ productId: id, productName: updated.name, quantity: Math.abs(diff), type: diff > 0 ? 'input' : 'output', motive: 'Ajuste manual no cadastro' });
    return updated;
  },
  async deleteProduct(id) { unwrap(await requireClient().from('products').delete().eq('id', id)); },
  async clearAllProducts() { unwrap(await requireClient().from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')); },
  async clearAllData() {
    const db = requireClient();
    unwrap(await db.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
    unwrap(await db.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
    unwrap(await db.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
    unwrap(await db.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
    await this.clearAllProducts();
  },
  async getClients() { return unwrap(await requireClient().from('clients').select('*').order('name')).map(clientFromDb); },
  async addClient(client) { return clientFromDb(unwrap(await requireClient().from('clients').insert(clientToDb(client)).select().single())); },
  async updateClient(id, client) { return clientFromDb(unwrap(await requireClient().from('clients').update(clientToDb(client)).eq('id', id).select().single())); },
  async deleteClient(id) { unwrap(await requireClient().from('clients').delete().eq('id', id)); },
  async payClientDebt(id, amount, operatorName) { return clientFromDb(unwrap(await requireClient().rpc('pay_client_debt', { p_client_id: id, p_amount: amount, p_operator: operatorName || 'Sistema' }))); },
  async getSales() {
    const rows = unwrap(await requireClient().from('sales').select('*, sale_items(*)').order('date', { ascending: false }));
    return rows.map(saleFromDb);
  },
  async addSale(sale, operatorName) {
    const saved = unwrap(await requireClient().rpc('register_sale', { p_sale: sale, p_operator: operatorName || 'Operador' }));
    return { ...sale, id: saved.id, date: saved.date, seller: saved.seller };
  },
  async getStockMovements() { return unwrap(await requireClient().from('stock_movements').select('*').order('date', { ascending: false })).map(movementFromDb); },
  async addStockMovement(movement) {
    const payload = { product_id: movement.productId, product_name: movement.productName, quantity: Number(movement.quantity), type: movement.type, motive: movement.motive, user: movement.user || 'Sistema' };
    return movementFromDb(unwrap(await requireClient().from('stock_movements').insert(payload).select().single()));
  },
  async getUsers() { return unwrap(await requireClient().rpc('list_app_users')); },
  async addUser(user) { return unwrap(await requireClient().rpc('create_app_user', { p_username: user.username, p_password: user.password, p_name: user.name, p_role: user.role })); },
  async updateUser(id, user) { return unwrap(await requireClient().rpc('update_app_user', { p_id: id, p_username: user.username, p_name: user.name, p_role: user.role, p_password: user.password || null })); },
  async deleteUser(id) { return unwrap(await requireClient().rpc('delete_app_user', { p_id: id })); }
};
