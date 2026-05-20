import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Plus, 
  TrendingUp, 
  AlertTriangle,
  Search,
  X
} from 'lucide-react';

export const Stock = () => {
  const { user, addToast } = useAuth();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  
  // Filtros de Histórico
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, input, output
  
  // Controle de Modal de Entrada/Saída
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    type: 'input', // input = entrada, output = saída
    quantity: '',
    motive: 'Compra de Fornecedor'
  });

  const loadData = () => {
    setProducts(dbService.getProducts());
    // Classifica as movimentações por data decrescente (mais recentes primeiro)
    const allMovements = dbService.getStockMovements();
    const sorted = [...allMovements].sort((a, b) => new Date(b.date) - new Date(a.date));
    setMovements(sorted);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler para abrir modal de ajuste rápido
  const handleOpenAdjust = () => {
    const prods = dbService.getProducts();
    setAdjustForm({
      productId: prods[0]?.id || '',
      type: 'input',
      quantity: '',
      motive: 'Compra de Fornecedor'
    });
    setIsAdjustModalOpen(true);
  };

  // Ajusta o tipo padrão de motivo com base na entrada/saída para facilitar a digitação
  const handleTypeChange = (type) => {
    setAdjustForm(prev => ({
      ...prev,
      type,
      motive: type === 'input' ? 'Compra de Fornecedor' : 'Ajuste de Quebra/Perda'
    }));
  };

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    const qty = parseInt(adjustForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      addToast('A quantidade deve ser um número positivo maior que zero.', 'error');
      return;
    }

    const prod = products.find(p => p.id === adjustForm.productId);
    if (!prod) {
      addToast('Produto inválido.', 'error');
      return;
    }

    // Valida se há estoque suficiente em caso de saída
    if (adjustForm.type === 'output' && prod.stock < qty) {
      addToast(`Estoque insuficiente! O produto possui apenas ${prod.stock} un disponíveis.`, 'warning');
      return;
    }

    // Calcula novo estoque
    const stockDiff = adjustForm.type === 'input' ? qty : -qty;
    const updatedStock = prod.stock + stockDiff;

    try {
      // 1. Atualiza produto
      dbService.updateProduct(prod.id, {
        ...prod,
        stock: updatedStock
      });

      // 2. Registra a movimentação no histórico
      dbService.addStockMovement({
        productId: prod.id,
        productName: prod.name,
        quantity: qty,
        type: adjustForm.type,
        motive: adjustForm.motive.trim(),
        user: user.name
      });

      addToast(`Estoque de "${prod.name}" ajustado com sucesso!`, 'success');
      setIsAdjustModalOpen(false);
      loadData();
    } catch (e) {
      addToast('Erro ao ajustar estoque.', 'error');
    }
  };

  // Filtros aplicados no histórico
  const filteredMovements = movements.filter(m => {
    const matchProduct = m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.motive.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.user.toLowerCase().includes(searchTerm.toLowerCase());
                         
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    
    return matchProduct && matchType;
  });

  // Cálculos financeiros do estoque
  const stockMetrics = products.reduce((acc, p) => {
    acc.costTotal += (p.stock * p.purchasePrice);
    acc.sellTotal += (p.stock * p.sellingPrice);
    if (p.stock <= p.minStock) acc.alertsCount += 1;
    return acc;
  }, { costTotal: 0, sellTotal: 0, alertsCount: 0 });

  return (
    <div className="page-container animate-fade">
      
      {/* 1. MÉTRICAS E BOTÕES GERAIS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>Controle de Inventário</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Monitore movimentações, gerencie reposições de fornecedores e audite perdas</span>
        </div>
        <button onClick={handleOpenAdjust} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          Registrar Entrada / Saída
        </button>
      </div>

      {/* 2. CARDS FINANCEIROS DE ESTOQUE */}
      <section className="stats-grid">
        {/* Capital Imobilizado */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Capital Imobilizado (Custo)</span>
            <span className="stat-value" style={{ fontSize: '1.75rem' }}>
              R$ {stockMetrics.costTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Total investido na compra dos produtos
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            <Package size={22} />
          </div>
        </div>

        {/* Faturamento Estimado em Vendas */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Valor de Venda Potencial</span>
            <span className="stat-value" style={{ fontSize: '1.75rem', color: 'var(--success)' }}>
              R$ {stockMetrics.sellTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Receita prevista com a venda total do estoque
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Projeção de Lucro Bruto do Estoque */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Projeção de Lucro</span>
            <span className="stat-value" style={{ fontSize: '1.75rem', color: 'var(--primary)' }}>
              R$ {(stockMetrics.sellTotal - stockMetrics.costTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Margem de lucro total em estoque
            </span>
          </div>
          <div className="stat-icon">
            <ArrowUpRight size={22} />
          </div>
        </div>
      </section>

      {/* 3. HISTÓRICO DE MOVIMENTAÇÕES COM BUSCA */}
      <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Barra superior do histórico */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} style={{ color: 'var(--primary)' }} />
            Histórico Geral de Movimentações
          </h3>
          
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }} id="stock-history-filters">
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Buscar produto, motivo, operador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.85rem' }}
              />
            </div>

            <select
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: '150px', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="all">Tipos (Todos)</option>
              <option value="input">Entradas</option>
              <option value="output">Saídas</option>
            </select>
          </div>
        </div>

        {/* Tabela do Histórico */}
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Produto</th>
                <th style={{ textAlign: 'center' }}>Tipo</th>
                <th style={{ textAlign: 'center' }}>Quantidade</th>
                <th>Motivo / Descrição</th>
                <th>Operador / Usuário</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                    Nenhuma movimentação registrada no histórico de estoque.
                  </td>
                </tr>
              ) : (
                filteredMovements.map(movement => {
                  const isInput = movement.type === 'input';
                  const dateObj = new Date(movement.date);
                  const formattedDate = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={movement.id}>
                      {/* Data */}
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {formattedDate}
                      </td>

                      {/* Produto */}
                      <td style={{ fontWeight: '600' }}>
                        {movement.productName}
                      </td>

                      {/* Tipo (Entrada/Saída) */}
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className="badge"
                          style={{
                            backgroundColor: isInput ? 'var(--success-light)' : 'var(--danger-light)',
                            color: isInput ? 'var(--success)' : 'var(--danger)',
                            gap: '3px',
                            fontSize: '0.7rem'
                          }}
                        >
                          {isInput ? (
                            <>
                              <ArrowUpRight size={12} /> Entrada
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft size={12} /> Saída
                            </>
                          )}
                        </span>
                      </td>

                      {/* Quantidade */}
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {movement.quantity} un
                      </td>

                      {/* Motivo */}
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {movement.motive}
                        </span>
                      </td>

                      {/* Operador */}
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {movement.user}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* --- 4. MODAL DE AJUSTE MANUAL DE ESTOQUE (ENTRADA/SAÍDA) --- */}
      {isAdjustModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}
        >
          <div
            className="premium-card animate-fade"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '2.5rem',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>Ajustar Inventário</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="btn btn-ghost btn-icon-only" style={{ width: '32px', height: '32px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Seleção do Produto */}
              <div className="form-group">
                <label className="form-label">Selecionar Produto</label>
                <select
                  className="form-control"
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  required
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Atual: {p.stock} un)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo: Entrada ou Saída */}
              <div className="form-group">
                <label className="form-label">Tipo de Movimentação</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('input')}
                    className="btn"
                    style={{
                      border: '1.5px solid var(--border-color)',
                      backgroundColor: adjustForm.type === 'input' ? 'var(--success-light)' : 'transparent',
                      color: adjustForm.type === 'input' ? 'var(--success)' : 'var(--text-secondary)',
                      borderColor: adjustForm.type === 'input' ? 'var(--success)' : 'var(--border-color)',
                      fontWeight: 'bold',
                      gap: '5px'
                    }}
                  >
                    <ArrowUpRight size={16} /> Entrada / Acréscimo
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('output')}
                    className="btn"
                    style={{
                      border: '1.5px solid var(--border-color)',
                      backgroundColor: adjustForm.type === 'output' ? 'var(--danger-light)' : 'transparent',
                      color: adjustForm.type === 'output' ? 'var(--danger)' : 'var(--text-secondary)',
                      borderColor: adjustForm.type === 'output' ? 'var(--danger)' : 'var(--border-color)',
                      fontWeight: 'bold',
                      gap: '5px'
                    }}
                  >
                    <ArrowDownLeft size={16} /> Saída / Baixa
                  </button>
                </div>
              </div>

              {/* Quantidade */}
              <div className="form-group">
                <label className="form-label">Quantidade de Itens</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Ex: 10"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  required
                  min="1"
                />
              </div>

              {/* Motivo */}
              <div className="form-group">
                <label className="form-label">Mecanismo / Motivo</label>
                {adjustForm.type === 'input' ? (
                  <select
                    className="form-control"
                    value={adjustForm.motive}
                    onChange={(e) => setAdjustForm({ ...adjustForm, motive: e.target.value })}
                    required
                  >
                    <option value="Compra de Fornecedor">Compra de Fornecedor</option>
                    <option value="Ajuste de Inventário">Ajuste de Inventário (Sobrou)</option>
                    <option value="Devolução de Cliente">Devolução de Cliente</option>
                  </select>
                ) : (
                  <select
                    className="form-control"
                    value={adjustForm.motive}
                    onChange={(e) => setAdjustForm({ ...adjustForm, motive: e.target.value })}
                    required
                  >
                    <option value="Ajuste de Quebra/Perda">Ajuste de Quebra/Perda</option>
                    <option value="Produto Vencido">Produto Vencido / Descartado</option>
                    <option value="Uso e Consumo Interno">Uso e Consumo Interno</option>
                    <option value="Roubo/Furto Detectado">Roubo/Furto Detectado</option>
                  </select>
                )}
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={`btn ${adjustForm.type === 'input' ? 'btn-success' : 'btn-danger'}`} 
                  style={{ padding: '0.75rem 2rem' }}
                >
                  Registrar Ajuste
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          #stock-history-filters {
            width: 100% !important;
            justify-content: flex-start !important;
          }
          #stock-history-filters div {
            width: 100% !important;
          }
          #stock-history-filters select {
            width: 100% !important;
          }
        }
      `}</style>

    </div>
  );
};
