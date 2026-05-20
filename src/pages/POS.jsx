import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Minus, 
  Plus, 
  Percent, 
  User, 
  FileText,
  Printer,
  X,
  CheckCircle,
  PackageX,
  Sparkles
} from 'lucide-react';

export const POS = () => {
  const { user, addToast } = useAuth();
  
  // Banco de dados em cache local na tela
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  
  // Estados do Carrinho
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [selectedClientId, setSelectedClientId] = useState('');
  
  // Controle do Cupom Fiscal Finalizado
  const [activeReceipt, setActiveReceipt] = useState(null);
  
  const searchInputRef = useRef(null);

  // Carrega produtos e clientes
  const loadData = () => {
    setProducts(dbService.getProducts());
    setClients(dbService.getClients());
  };

  useEffect(() => {
    loadData();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // --- BUSCA INTELIGENTE ---
  // Filtra produtos pela busca por Nome ou SKU
  const filteredProducts = products.filter(p => {
    if (!search.trim()) return false; // Mostra apenas se digitar algo
    return p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search);
  });

  // Produtos recomendados rápidos (Top 6 itens com estoque que aparecem por padrão para cliques rápidos)
  const quickProducts = products.slice(0, 6);

  // Handler ao pressionar Enter na busca
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (filteredProducts.length === 1) {
        // Se houver exatamente 1 correspondência, adiciona ao carrinho automaticamente!
        handleAddToCart(filteredProducts[0]);
        setSearch('');
      } else if (filteredProducts.length > 1) {
        addToast('Múltiplos produtos encontrados. Clique no item desejado.', 'info');
      }
    }
  };

  // --- OPERAÇÕES DO CARRINHO ---
  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      addToast(`Produto "${product.name}" esgotado! Impossível vender.`, 'error');
      return;
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.productId === product.id);
      
      if (existingIndex !== -1) {
        const currentQty = prevCart[existingIndex].quantity;
        // Valida se excede estoque
        if (currentQty + 1 > product.stock) {
          addToast(`Estoque máximo atingido (${product.stock} un disponíveis).`, 'warning');
          return prevCart;
        }
        
        const newCart = [...prevCart];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: currentQty + 1,
          totalPrice: parseFloat(((currentQty + 1) * product.sellingPrice).toFixed(2))
        };
        addToast(`+1 "${product.name}" adicionado.`, 'success');
        return newCart;
      } else {
        addToast(`"${product.name}" adicionado ao carrinho.`, 'success');
        return [...prevCart, {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: product.sellingPrice,
          quantity: 1,
          totalPrice: product.sellingPrice,
          stockAvailable: product.stock
        }];
      }
    });

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleUpdateQuantity = (productId, change) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + change;
          
          if (newQty < 1) return item; // Não reduz abaixo de 1
          if (newQty > item.stockAvailable) {
            addToast(`Estoque máximo atingido (${item.stockAvailable} un).`, 'warning');
            return item;
          }
          
          return {
            ...item,
            quantity: newQty,
            totalPrice: parseFloat((newQty * item.unitPrice).toFixed(2))
          };
        }
        return item;
      });
    });
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    addToast('Item removido do carrinho.', 'info');
  };

  // --- CÁLCULOS TOTAIS ---
  const subtotal = parseFloat(cart.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
  const finalTotal = parseFloat(Math.max(0, subtotal - discount).toFixed(2));

  // --- FECHAMENTO DA VENDA ---
  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      addToast('O carrinho está vazio!', 'error');
      return;
    }

    if (paymentMethod === 'fiado' && !selectedClientId) {
      addToast('Vendas na modalidade "Fiado" exigem a seleção de um cliente cadastrado.', 'error');
      return;
    }

    const selectedClient = clients.find(c => c.id === selectedClientId);

    const salePayload = {
      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      clientId: selectedClientId || null,
      clientName: selectedClient ? selectedClient.name : 'Consumidor Final',
      subtotal,
      discount,
      total: finalTotal,
      paymentMethod
    };

    try {
      // Grava no localStorage e processa estoque/fiado
      const finalized = dbService.addSale(salePayload, user.name);

      // Cria cupom para exibição
      setActiveReceipt({
        saleId: finalized.id,
        date: finalized.date,
        items: finalized.items,
        subtotal: finalized.subtotal,
        discount: finalized.discount,
        total: finalized.total,
        paymentMethod: finalized.paymentMethod,
        clientName: finalized.clientName,
        seller: finalized.seller
      });

      addToast('Venda finalizada com sucesso!', 'success');
      
      // Limpa formulário/carrinho
      setCart([]);
      setDiscount(0);
      setSelectedClientId('');
      setPaymentMethod('dinheiro');
      
      // Atualiza base de dados interna
      loadData();
    } catch (e) {
      addToast('Erro ao processar venda.', 'error');
    }
  };

  return (
    <div 
      className="page-container animate-fade" 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: '1.2fr 0.8fr', 
        gap: '1.5rem',
        paddingTop: '1rem',
        height: 'calc(100vh - 90px)',
        overflow: 'hidden'
      }}
      id="pos-main-grid"
    >
      
      {/* ================= COLUNA ESQUERDA: CATÁLOGO E BUSCA ================= */}
      <section 
        className="premium-card" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem',
          height: '100%',
          overflow: 'hidden' 
        }}
      >
        
        {/* BUSCA INTELIGENTE DE PRODUTO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Buscar Produto (Digite nome/SKU e aperte [Enter])</span>
            {search && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>{filteredProducts.length} itens encontrados</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="form-control"
              placeholder="Digite Coca, Leite, Café, Biscoito ou escaneie o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{ paddingLeft: '2.5rem' }}
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* ÁREA DE RESULTADOS DA BUSCA (DINÂMICA) */}
        {search.trim() !== '' && (
          <div 
            className="table-container"
            style={{ 
              border: '1.5px solid var(--primary)', 
              maxHeight: '180px', 
              overflowY: 'auto',
              boxShadow: 'var(--shadow-md)' 
            }}
          >
            <table className="premium-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>Preço Venda</th>
                  <th style={{ textAlign: 'center' }}>Estoque</th>
                  <th style={{ textAlign: 'center' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                      Nenhum produto correspondente.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '600' }}>{p.name}</td>
                      <td><code>{p.sku}</code></td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                        R$ {p.sellingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center', color: p.stock <= p.minStock ? 'var(--danger)' : 'inherit' }}>
                        {p.stock} un
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => { handleAddToCart(p); setSearch(''); }}
                          className="btn btn-primary"
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                          disabled={p.stock <= 0}
                        >
                          + Adicionar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CATÁLOGO RÁPIDO (PRODUTOS MAIS COMUNS) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={16} style={{ color: 'var(--warning)' }} />
            Itens Rápidos de Catálogo
          </h3>
          
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', 
              gap: '1rem',
              overflowY: 'auto',
              flex: 1,
              paddingRight: '4px' 
            }}
          >
            {quickProducts.map(product => {
              const isOutOfStock = product.stock <= 0;
              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && handleAddToCart(product)}
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-sm)',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    transition: 'all var(--transition-fast)',
                    opacity: isOutOfStock ? 0.5 : 1,
                    position: 'relative',
                    textAlign: 'center'
                  }}
                  className={isOutOfStock ? '' : 'product-fast-card'}
                >
                  {/* Preço flutuante */}
                  <span 
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      backgroundColor: 'var(--primary)',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    R$ {product.sellingPrice.toFixed(2)}
                  </span>

                  {/* Foto compacta */}
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-muted)',
                      display: product.image ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <PackageX size={18} />
                  </div>

                  <strong style={{ fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4rem', lineHeight: '1.2' }}>
                    {product.name}
                  </strong>
                  
                  <span style={{ fontSize: '0.7rem', color: isOutOfStock ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {isOutOfStock ? 'Esgotado' : `Estoque: ${product.stock} un`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* ================= COLUNA DIREITA: CARRINHO E FECHAMENTO ================= */}
      <section 
        className="premium-card" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem',
          height: '100%',
          overflow: 'hidden',
          borderLeft: '1.5px solid var(--border-color)' 
        }}
      >
        
        {/* CABEÇALHO DO CARRINHO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} style={{ color: 'var(--primary)' }} />
            Carrinho de Vendas
          </h3>
          {cart.length > 0 && (
            <button 
              onClick={() => { setCart([]); addToast('Carrinho esvaziado.', 'info'); }}
              className="btn btn-ghost" 
              style={{ color: 'var(--danger)', fontSize: '0.75rem', padding: '2px 8px' }}
            >
              Limpar
            </button>
          )}
        </div>

        {/* LISTAGEM DOS ITENS NO CARRINHO */}
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem',
            paddingRight: '4px' 
          }}
        >
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', opacity: 0.6 }}>
              <ShoppingCart size={40} />
              <span style={{ fontSize: '0.85rem' }}>O carrinho está vazio. Adicione itens.</span>
            </div>
          ) : (
            cart.map(item => (
              <div 
                key={item.productId}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid var(--border-color)'
                }}
              >
                {/* Nome e Preço Unitário */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '50%' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    R$ {item.unitPrice.toFixed(2)} / un
                  </span>
                </div>

                {/* Controles de Quantidade */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button 
                    onClick={() => handleUpdateQuantity(item.productId, -1)}
                    className="btn btn-outline btn-icon-only" 
                    style={{ width: '28px', height: '28px', borderRadius: '4px' }}
                  >
                    <Minus size={12} />
                  </button>
                  <strong style={{ fontSize: '0.875rem', minWidth: '20px', textAlign: 'center' }}>
                    {item.quantity}
                  </strong>
                  <button 
                    onClick={() => handleUpdateQuantity(item.productId, 1)}
                    className="btn btn-outline btn-icon-only" 
                    style={{ width: '28px', height: '28px', borderRadius: '4px' }}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Valor Total e Deletar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>
                    R$ {item.totalPrice.toFixed(2)}
                  </strong>
                  <button 
                    onClick={() => handleRemoveFromCart(item.productId)}
                    style={{ color: 'var(--danger)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

        {/* TOTAIS E CONTROLE FINANCEIRO */}
        <div 
          style={{ 
            borderTop: '1.5px solid var(--border-color)', 
            paddingTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
            <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Desconto */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Percent size={14} /> Desconto (R$)
            </span>
            <input
              type="number"
              className="form-control"
              placeholder="0.00"
              value={discount || ''}
              onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0)))}
              disabled={subtotal === 0}
              style={{ width: '100px', padding: '0.35rem 0.5rem', textAlign: 'right', fontSize: '0.85rem' }}
            />
          </div>

          {/* Valor Final */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.25rem 0' }}>
            <strong style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>TOTAL A PAGAR</strong>
            <strong style={{ fontSize: '1.4rem', color: 'var(--success)' }}>
              R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          {/* Escolha do Método de Pagamento */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Meio de Pagamento</label>
            <select
              className="form-control"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={cart.length === 0}
            >
              <option value="dinheiro">💵 Dinheiro</option>
              <option value="pix">⚡ Pix</option>
              <option value="cartao">💳 Cartão de Crédito/Débito</option>
              <option value="fiado">📝 Fiado (Conta de Cliente)</option>
            </select>
          </div>

          {/* Seletor de Cliente (Obrigatório para Fiado) */}
          {paymentMethod === 'fiado' && (
            <div className="form-group animate-fade" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)' }}>
                <User size={14} /> Selecione o Cliente Devedor
              </label>
              <select
                className="form-control"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                style={{ borderColor: 'var(--warning)' }}
              >
                <option value="">-- Escolher Cliente --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Fiado Atual: R${c.debt.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Botão Finalizar */}
          <button
            onClick={handleFinalizeSale}
            className="btn btn-success"
            style={{ 
              width: '100%', 
              padding: '0.95rem', 
              fontSize: '1.1rem', 
              fontWeight: 'bold',
              borderRadius: 'var(--border-radius-sm)',
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.15)',
              marginTop: '0.5rem'
            }}
            disabled={cart.length === 0 || (paymentMethod === 'fiado' && !selectedClientId)}
          >
            Finalizar Venda
          </button>
        </div>

      </section>

      {/* ================= MODAL: CUPOM FISCAL TÉRMICO SIMULADO ================= */}
      {activeReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}
        >
          <div
            className="animate-fade"
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#fdfdfd', // Fundo papel térmico esbranquiçado
              color: '#1a1a1a', // Letra cinza escuro/preto de impressão
              padding: '2rem 1.5rem',
              borderRadius: '2px', // Estilo reto de recibo cortado
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
              fontFamily: 'monospace', // Visual de impressora matricial/térmica!
              position: 'relative',
              borderTop: '10px solid #222'
            }}
          >
            {/* Fechar Cupom */}
            <button 
              onClick={() => setActiveReceipt(null)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {/* Cabeçalho do Recibo */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: '#10B981', marginBottom: '5px' }}>
                <CheckCircle size={32} />
              </div>
              <strong style={{ fontSize: '1.1rem' }}>*** SIGCOMÉRCIO ***</strong>
              <span style={{ fontSize: '0.75rem' }}>Lojas, Mercados e Conveniência</span>
              <span style={{ fontSize: '0.7rem' }}>CNPJ: 00.000.000/0001-00</span>
              <span style={{ fontSize: '0.7rem' }}>Rua do Comércio Local, s/n</span>
            </div>

            {/* Linha Divisória */}
            <div style={{ borderBottom: '1px dashed #666', margin: '0.75rem 0' }} />

            {/* Metadados da Venda */}
            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span><strong>VENDA ID:</strong> #{activeReceipt.saleId}</span>
              <span><strong>DATA:</strong> {new Date(activeReceipt.date).toLocaleString('pt-BR')}</span>
              <span><strong>OPERADOR:</strong> {activeReceipt.seller}</span>
              <span><strong>CLIENTE:</strong> {activeReceipt.clientName}</span>
            </div>

            <div style={{ borderBottom: '1px dashed #666', margin: '0.75rem 0' }} />

            {/* Tabela de Itens do Cupom */}
            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.5fr 1fr', fontWeight: 'bold' }}>
                <span>Item / Descrição</span>
                <span style={{ textAlign: 'center' }}>Qtd</span>
                <span style={{ textAlign: 'right' }}>Total (R$)</span>
              </div>
              
              {activeReceipt.items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.5fr 1fr' }}>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                  <span style={{ textAlign: 'right' }}>{item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderBottom: '1px dashed #666', margin: '0.75rem 0' }} />

            {/* Totais do Cupom */}
            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>R$ {activeReceipt.subtotal.toFixed(2)}</span>
              </div>
              {activeReceipt.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                  <span>Desconto:</span>
                  <span>- R$ {activeReceipt.discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '4px' }}>
                <span>PAGO TOTAL:</span>
                <span>R$ {activeReceipt.total.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', textTransform: 'uppercase', marginTop: '4px' }}>
                <span>Forma Pago:</span>
                <span>{activeReceipt.paymentMethod}</span>
              </div>
            </div>

            <div style={{ borderBottom: '1px dashed #666', margin: '0.75rem 0' }} />

            {/* Mensagem de Rodapé */}
            <div style={{ textAlign: 'center', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span>Obrigado pela preferência!</span>
              <span>Volte sempre.</span>
              <span style={{ fontSize: '0.6rem', color: '#666', marginTop: '10px' }}>Sistema PDV - SigComércio v1.0.0</span>
            </div>

            {/* Botões de Ação do Recibo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '2rem', fontFamily: 'var(--font-sans)' }}>
              <button 
                onClick={() => { addToast('Simulando impressão física do cupom...', 'info'); }}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.5rem', gap: '3px', color: '#1a1a1a', borderColor: '#666' }}
              >
                <Printer size={14} /> Imprimir
              </button>
              
              <button 
                onClick={() => setActiveReceipt(null)}
                className="btn btn-success"
                style={{ fontSize: '0.8rem', padding: '0.5rem' }}
              >
                Nova Venda
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Adicionar CSS inline para efeitos Hover específicos do PDV */}
      <style>{`
        .product-fast-card:hover {
          transform: translateY(-3px);
          border-color: var(--primary) !important;
          background-color: var(--primary-light) !important;
          box-shadow: var(--shadow-sm);
        }
        @media (max-width: 992px) {
          #pos-main-grid {
            grid-template-columns: 1fr !important;
            height: auto !important;
            overflow-y: auto !important;
          }
        }
      `}</style>

    </div>
  );
};
