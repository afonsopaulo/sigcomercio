// Banco de Dados Local do SigComércio baseado em LocalStorage

// Helper de UUID simples
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Dados Mock Iniciais para o Seeding do Sistema
const INITIAL_USERS = [
  { id: '1', username: 'admin', password: 'admin123', name: 'Julio (Administrador)', role: 'admin' },
  { id: '2', username: 'vendedor', password: 'vendedor123', name: 'Ana (Funcionário)', role: 'employee' }
];

const INITIAL_PRODUCTS = [
  {
    id: 'p1',
    sku: '7891000100112',
    name: 'Refrigerante Cola 2L',
    category: 'Bebidas',
    purchasePrice: 4.50,
    sellingPrice: 8.50,
    stock: 24,
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'p2',
    sku: '7891000200225',
    name: 'Arroz Integral Tipo 1 5kg',
    category: 'Mercearia',
    purchasePrice: 18.20,
    sellingPrice: 27.90,
    stock: 15,
    minStock: 8,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'p3',
    sku: '7891000300338',
    name: 'Detergente Líquido Limão 500ml',
    category: 'Limpeza',
    purchasePrice: 1.10,
    sellingPrice: 2.50,
    stock: 8, // Estoque abaixo do mínimo (alerta!)
    minStock: 12,
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'p4',
    sku: '7891000400441',
    name: 'Biscoito Recheado Chocolate 140g',
    category: 'Biscoitos & Doces',
    purchasePrice: 1.80,
    sellingPrice: 3.80,
    stock: 45,
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'p5',
    sku: '7891000500554',
    name: 'Sabonete Hidratante 90g',
    category: 'Higiene Pessoal',
    purchasePrice: 0.95,
    sellingPrice: 2.20,
    stock: 5, // Estoque abaixo do mínimo (alerta!)
    minStock: 10,
    image: 'https://images.unsplash.com/photo-1607006342411-92f1f687411c?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'p6',
    sku: '7891000600667',
    name: 'Leite Integral UHT 1L',
    category: 'Laticínios',
    purchasePrice: 3.20,
    sellingPrice: 5.40,
    stock: 30,
    minStock: 15,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'p7',
    sku: '7891000700770',
    name: 'Café Torrado e Moído Vácuo 500g',
    category: 'Mercearia',
    purchasePrice: 11.50,
    sellingPrice: 18.90,
    stock: 18,
    minStock: 8,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  }
];

const INITIAL_CLIENTS = [
  { id: 'c1', name: 'Carlos Souza', phone: '(11) 98765-4321', address: 'Rua das Flores, 123 - Centro', debt: 120.00, purchaseCount: 8, totalSpent: 350.00 },
  { id: 'c2', name: 'Mariana Lima', phone: '(11) 97654-3210', address: 'Av. Paulista, 1500 - Bela Vista', debt: 0.00, purchaseCount: 15, totalSpent: 780.50 },
  { id: 'c3', name: 'Roberto Alves', phone: '(11) 96543-2109', address: 'Rua Bahia, 45 - Consolação', debt: 45.50, purchaseCount: 4, totalSpent: 180.00 },
  { id: 'c4', name: 'Juliana Costa', phone: '(11) 95432-1098', address: 'Rua Augusta, 880 - Cerqueira César', debt: 0.00, purchaseCount: 22, totalSpent: 1240.20 }
];

// Gerar Vendas Fictícias para os Últimos 30 Dias (para alimentar os gráficos)
const generateMockSales = () => {
  const sales = [];
  const now = new Date();
  const paymentMethods = ['dinheiro', 'pix', 'cartao', 'fiado'];
  
  // Vendas de hoje
  sales.push({
    id: 's_today_1',
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30).toISOString(),
    clientId: null,
    clientName: 'Consumidor Final',
    items: [
      { productId: 'p1', name: 'Refrigerante Cola 2L', quantity: 2, unitPrice: 8.50, totalPrice: 17.00 },
      { productId: 'p4', name: 'Biscoito Recheado Chocolate 140g', quantity: 3, unitPrice: 3.80, totalPrice: 11.40 }
    ],
    subtotal: 28.40,
    discount: 2.00,
    total: 26.40,
    paymentMethod: 'pix',
    seller: 'Ana (Funcionário)'
  });

  sales.push({
    id: 's_today_2',
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 15).toISOString(),
    clientId: 'c1',
    clientName: 'Carlos Souza',
    items: [
      { productId: 'p2', name: 'Arroz Integral Tipo 1 5kg', quantity: 1, unitPrice: 27.90, totalPrice: 27.90 },
      { productId: 'p6', name: 'Leite Integral UHT 1L', quantity: 6, unitPrice: 5.40, totalPrice: 32.40 }
    ],
    subtotal: 60.30,
    discount: 0.00,
    total: 60.30,
    paymentMethod: 'fiado',
    seller: 'Ana (Funcionário)'
  });

  sales.push({
    id: 's_today_3',
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0).toISOString(),
    clientId: null,
    clientName: 'Consumidor Final',
    items: [
      { productId: 'p7', name: 'Café Torrado e Moído Vácuo 500g', quantity: 2, unitPrice: 18.90, totalPrice: 37.80 }
    ],
    subtotal: 37.80,
    discount: 0.00,
    total: 37.80,
    paymentMethod: 'dinheiro',
    seller: 'Julio (Administrador)'
  });

  // Vendas dos dias anteriores (últimos 7 dias)
  for (let i = 1; i <= 7; i++) {
    const saleDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // 2 a 3 vendas por dia anterior
    const numSales = 2 + Math.floor(Math.random() * 3);
    
    for (let j = 0; j < numSales; j++) {
      const saleHour = 8 + Math.floor(Math.random() * 12);
      const saleMin = Math.floor(Math.random() * 60);
      saleDate.setHours(saleHour, saleMin, 0, 0);
      
      const item1 = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
      const item2 = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
      const qty1 = 1 + Math.floor(Math.random() * 3);
      const qty2 = 1 + Math.floor(Math.random() * 2);
      
      const items = [
        { productId: item1.id, name: item1.name, quantity: qty1, unitPrice: item1.sellingPrice, totalPrice: qty1 * item1.sellingPrice }
      ];
      
      if (item1.id !== item2.id) {
        items.push({ productId: item2.id, name: item2.name, quantity: qty2, unitPrice: item2.sellingPrice, totalPrice: qty2 * item2.sellingPrice });
      }
      
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const discount = Math.random() > 0.7 ? parseFloat((subtotal * 0.05).toFixed(2)) : 0;
      const total = parseFloat((subtotal - discount).toFixed(2));
      const payMethod = paymentMethods[Math.floor(Math.random() * (paymentMethods.length - 1))]; // Sem fiado no mock de dias passados para simplificar
      
      sales.push({
        id: `s_past_${i}_${j}`,
        date: saleDate.toISOString(),
        clientId: null,
        clientName: 'Consumidor Final',
        items,
        subtotal,
        discount,
        total,
        paymentMethod: payMethod,
        seller: Math.random() > 0.5 ? 'Julio (Administrador)' : 'Ana (Funcionário)'
      });
    }
  }

  return sales;
};

const INITIAL_STOCK_MOVEMENTS = [
  { id: 'm1', productId: 'p1', productName: 'Refrigerante Cola 2L', quantity: 30, type: 'input', motive: 'Carga Inicial', date: new Date(Date.now() - 5*24*60*60*1000).toISOString(), user: 'Julio (Administrador)' },
  { id: 'm2', productId: 'p2', productName: 'Arroz Integral Tipo 1 5kg', quantity: 20, type: 'input', motive: 'Carga Inicial', date: new Date(Date.now() - 5*24*60*60*1000).toISOString(), user: 'Julio (Administrador)' },
  { id: 'm3', productId: 'p3', productName: 'Detergente Líquido Limão 500ml', quantity: 15, type: 'input', motive: 'Carga Inicial', date: new Date(Date.now() - 5*24*60*60*1000).toISOString(), user: 'Julio (Administrador)' },
  { id: 'm4', productId: 'p1', productName: 'Refrigerante Cola 2L', quantity: 2, type: 'output', motive: 'Venda nº s_today_1', date: new Date().toISOString(), user: 'Ana (Funcionário)' },
  { id: 'm5', productId: 'p4', productName: 'Biscoito Recheado Chocolate 140g', quantity: 3, type: 'output', motive: 'Venda nº s_today_1', date: new Date().toISOString(), user: 'Ana (Funcionário)' }
];

// --- MOTOR DE BANCO DE DADOS LOCAL ---
export const dbService = {
  // Inicialização básica
  init() {
    if (!localStorage.getItem('sigcomercio_initialized')) {
      localStorage.setItem('sigcomercio_users', JSON.stringify(INITIAL_USERS));
      localStorage.setItem('sigcomercio_products', JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem('sigcomercio_clients', JSON.stringify(INITIAL_CLIENTS));
      localStorage.setItem('sigcomercio_sales', JSON.stringify(generateMockSales()));
      localStorage.setItem('sigcomercio_stockMovements', JSON.stringify(INITIAL_STOCK_MOVEMENTS));
      localStorage.setItem('sigcomercio_initialized', 'true');
    }
  },

  // RESET completo de fábrica (para testes)
  resetToFactory() {
    localStorage.removeItem('sigcomercio_users');
    localStorage.removeItem('sigcomercio_products');
    localStorage.removeItem('sigcomercio_clients');
    localStorage.removeItem('sigcomercio_sales');
    localStorage.removeItem('sigcomercio_stockMovements');
    localStorage.removeItem('sigcomercio_initialized');
    this.init();
    window.location.reload();
  },

  // --- MÉTODOS DE PRODUTOS ---
  getProducts() {
    this.init();
    return JSON.parse(localStorage.getItem('sigcomercio_products') || '[]');
  },

  saveProducts(products) {
    localStorage.setItem('sigcomercio_products', JSON.stringify(products));
  },

  addProduct(product) {
    const products = this.getProducts();
    const newProduct = {
      ...product,
      id: generateUUID(),
      stock: Number(product.stock) || 0,
      minStock: Number(product.minStock) || 0,
      purchasePrice: Number(product.purchasePrice) || 0,
      sellingPrice: Number(product.sellingPrice) || 0
    };
    products.push(newProduct);
    this.saveProducts(products);

    // Adiciona movimentação automática de entrada de estoque
    this.addStockMovement({
      productId: newProduct.id,
      productName: newProduct.name,
      quantity: newProduct.stock,
      type: 'input',
      motive: 'Cadastro Inicial de Produto'
    });

    return newProduct;
  },

  updateProduct(id, updatedFields) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      const oldProduct = products[index];
      const newStock = Number(updatedFields.stock);
      const stockDiff = newStock - oldProduct.stock;

      products[index] = {
        ...oldProduct,
        ...updatedFields,
        stock: newStock,
        minStock: Number(updatedFields.minStock),
        purchasePrice: Number(updatedFields.purchasePrice),
        sellingPrice: Number(updatedFields.sellingPrice)
      };
      
      this.saveProducts(products);

      // Registra movimentação de ajuste de estoque se houver diferença
      if (stockDiff !== 0) {
        this.addStockMovement({
          productId: id,
          productName: products[index].name,
          quantity: Math.abs(stockDiff),
          type: stockDiff > 0 ? 'input' : 'output',
          motive: 'Ajuste manual no cadastro'
        });
      }
      return products[index];
    }
    return null;
  },

  deleteProduct(id) {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    this.saveProducts(filtered);
    return true;
  },

  clearAllProducts() {
    localStorage.setItem('sigcomercio_products', '[]');
    return true;
  },

  // Limpar TODOS os dados do sistema (vendas, clientes, movimentações)
  clearAllData() {
    localStorage.setItem('sigcomercio_products', '[]');
    localStorage.setItem('sigcomercio_clients', '[]');
    localStorage.setItem('sigcomercio_sales', '[]');
    localStorage.setItem('sigcomercio_stockMovements', '[]');
    return true;
  },

  // --- MÉTODOS DE CLIENTES ---
  getClients() {
    this.init();
    return JSON.parse(localStorage.getItem('sigcomercio_clients') || '[]');
  },

  saveClients(clients) {
    localStorage.setItem('sigcomercio_clients', JSON.stringify(clients));
  },

  addClient(client) {
    const clients = this.getClients();
    const newClient = {
      ...client,
      id: generateUUID(),
      debt: 0.00,
      purchaseCount: 0,
      totalSpent: 0.00
    };
    clients.push(newClient);
    this.saveClients(clients);
    return newClient;
  },

  updateClient(id, updatedFields) {
    const clients = this.getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index !== -1) {
      clients[index] = { ...clients[index], ...updatedFields };
      this.saveClients(clients);
      return clients[index];
    }
    return null;
  },

  deleteClient(id) {
    const clients = this.getClients();
    const filtered = clients.filter(c => c.id !== id);
    this.saveClients(filtered);
    return true;
  },

  payClientDebt(id, amount, operatorName) {
    const clients = this.getClients();
    const clientIndex = clients.findIndex(c => c.id === id);
    if (clientIndex !== -1) {
      const client = clients[clientIndex];
      const actualAmount = Math.min(amount, client.debt);
      client.debt = parseFloat((client.debt - actualAmount).toFixed(2));
      this.saveClients(clients);

      // Registra essa amortização em uma "venda mock" negativa ou apenas cria uma nota no histórico de vendas
      const sales = this.getSales();
      sales.push({
        id: generateUUID(),
        date: new Date().toISOString(),
        clientId: id,
        clientName: client.name,
        items: [
          { productId: 'payment', name: 'Amortização de Dívida / Fiado', quantity: 1, unitPrice: -actualAmount, totalPrice: -actualAmount }
        ],
        subtotal: -actualAmount,
        discount: 0,
        total: -actualAmount,
        paymentMethod: 'dinheiro', // forma usada para quitar
        seller: operatorName || 'Sistema'
      });
      localStorage.setItem('sigcomercio_sales', JSON.stringify(sales));
      
      return client;
    }
    return null;
  },

  // --- MÉTODOS DE VENDAS ---
  getSales() {
    this.init();
    return JSON.parse(localStorage.getItem('sigcomercio_sales') || '[]');
  },

  addSale(saleData, operatorName) {
    const sales = this.getSales();
    const products = this.getProducts();
    const clients = this.getClients();

    const newSale = {
      ...saleData,
      id: 'v_' + generateUUID().substring(0, 8),
      date: new Date().toISOString(),
      seller: operatorName || 'Operador'
    };

    // 1. Processar itens: atualizar estoque e movimentações
    newSale.items.forEach(item => {
      const productIndex = products.findIndex(p => p.id === item.productId);
      if (productIndex !== -1) {
        // Reduz estoque
        products[productIndex].stock = Math.max(0, products[productIndex].stock - item.quantity);
        
        // Registra movimentação de saída
        this.addStockMovement({
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          type: 'output',
          motive: `Venda nº ${newSale.id}`,
          user: operatorName
        }, false); // Passa false para não salvar a cada iteração, salvaremos no final
      }
    });

    this.saveProducts(products);

    // 2. Processar Cliente se aplicável (Fiado ou apenas contabilidade de gastos)
    if (newSale.clientId) {
      const clientIndex = clients.findIndex(c => c.id === newSale.clientId);
      if (clientIndex !== -1) {
        clients[clientIndex].purchaseCount += 1;
        clients[clientIndex].totalSpent = parseFloat((clients[clientIndex].totalSpent + newSale.total).toFixed(2));
        
        if (newSale.paymentMethod === 'fiado') {
          clients[clientIndex].debt = parseFloat((clients[clientIndex].debt + newSale.total).toFixed(2));
        }
        
        this.saveClients(clients);
      }
    }

    // 3. Salvar Venda
    sales.push(newSale);
    localStorage.setItem('sigcomercio_sales', JSON.stringify(sales));

    return newSale;
  },

  // --- MÉTODOS DE MOVIMENTAÇÕES DE ESTOQUE ---
  getStockMovements() {
    this.init();
    return JSON.parse(localStorage.getItem('sigcomercio_stockMovements') || '[]');
  },

  addStockMovement(movement, autoSave = true) {
    const movements = this.getStockMovements();
    const newMovement = {
      ...movement,
      id: generateUUID(),
      date: new Date().toISOString(),
      user: movement.user || 'Sistema'
    };
    movements.push(newMovement);
    if (autoSave) {
      localStorage.setItem('sigcomercio_stockMovements', JSON.stringify(movements));
    } else {
      // Salva apenas temporariamente em cache e deve ser chamado externamente
      localStorage.setItem('sigcomercio_stockMovements', JSON.stringify(movements));
    }
    return newMovement;
  },

  // --- MÉTODOS DE USUÁRIOS (ADMIN) ---
  getUsers() {
    this.init();
    return JSON.parse(localStorage.getItem('sigcomercio_users') || '[]');
  },

  saveUsers(users) {
    localStorage.setItem('sigcomercio_users', JSON.stringify(users));
  },

  addUser(user) {
    const users = this.getUsers();
    // Valida duplicidade de username
    if (users.find(u => u.username.toLowerCase() === user.username.toLowerCase())) {
      throw new Error('Este login de usuário já existe.');
    }
    const newUser = {
      ...user,
      id: generateUUID()
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  updateUser(id, updatedFields) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      // Evita duplicar username de outro
      const dup = users.find(u => u.username.toLowerCase() === updatedFields.username.toLowerCase() && u.id !== id);
      if (dup) {
        throw new Error('Este login de usuário já está em uso.');
      }
      users[index] = { ...users[index], ...updatedFields };
      this.saveUsers(users);
      return users[index];
    }
    return null;
  },

  deleteUser(id) {
    const users = this.getUsers();
    // Evita excluir o último admin
    const admins = users.filter(u => u.role === 'admin');
    const toDelete = users.find(u => u.id === id);
    if (toDelete && toDelete.role === 'admin' && admins.length <= 1) {
      throw new Error('Não é possível excluir o único Administrador do sistema.');
    }
    const filtered = users.filter(u => u.id !== id);
    this.saveUsers(filtered);
    return true;
  }
};
