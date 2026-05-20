import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Download, 
  Calendar, 
  Package, 
  Search, 
  ChevronRight, 
  FileSpreadsheet, 
  AlertTriangle,
  User,
  Activity,
  ArrowUpRight,
  Printer
} from 'lucide-react';

export const Reports = () => {
  const { user, addToast } = useAuth();
  
  // Filtros de período: 'today' | '7days' | '30days' | 'all'
  const [period, setPeriod] = useState('30days');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de dados consolidados
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalCogs: 0,
    estimatedProfit: 0,
    profitMargin: 0,
    outstandingDebts: 0,
    currentStockValue: 0
  });

  const [topProducts, setTopProducts] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  
  // Modal de amortização rápida diretamente dos relatórios
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Carrega e consolida dados com base no período selecionado
  const loadReportData = () => {
    const allProducts = dbService.getProducts();
    const allSales = dbService.getSales();
    const allClients = dbService.getClients();
    
    // 1. Filtrar vendas pelo período
    const now = new Date();
    let startDate = new Date();
    
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate = new Date(0); // All time
    }

    const periodSales = allSales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= startDate;
    });

    // 2. Calcular Métricas Financeiras
    let totalRev = 0;
    let totalCost = 0;
    
    // Mapeamento rápido de custos de produtos
    const productCostMap = {};
    allProducts.forEach(p => {
      productCostMap[p.id] = p.purchasePrice;
    });

    periodSales.forEach(sale => {
      // Ignorar amortizações (valores negativos) do faturamento bruto de vendas
      if (sale.total > 0) {
        totalRev += sale.total;
        
        sale.items.forEach(item => {
          if (item.productId === 'payment') return;
          const costPrice = productCostMap[item.productId] || (item.unitPrice * 0.6); // Fallback: 60% do preço de venda
          totalCost += (costPrice * item.quantity);
        });

        // Deduz desconto do custo de forma proporcional
        if (sale.discount > 0 && sale.subtotal > 0) {
          const discountRatio = sale.total / sale.subtotal;
          totalCost = totalCost * discountRatio;
        }
      }
    });

    const estProfit = Math.max(0, totalRev - totalCost);
    const margin = totalRev > 0 ? (estProfit / totalRev) * 100 : 0;
    
    // Contas Fiadas Totais (saldo devedor atual de todos os clientes)
    const totalOutstanding = allClients.reduce((sum, c) => sum + (c.debt || 0), 0);
    
    // Valor total do estoque em mãos (custo de compra e valor de venda)
    const totalStockCost = allProducts.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.stock || 0)), 0);

    setMetrics({
      totalRevenue: totalRev,
      totalCogs: totalCost,
      estimatedProfit: estProfit,
      profitMargin: margin,
      outstandingDebts: totalOutstanding,
      currentStockValue: totalStockCost
    });

    // 3. Ranking de Produtos Mais Vendidos (Top 5)
    const productQtyMap = {};
    periodSales.forEach(sale => {
      if (sale.total > 0) {
        sale.items.forEach(item => {
          if (item.productId === 'payment') return;
          productQtyMap[item.name] = (productQtyMap[item.name] || 0) + item.quantity;
        });
      }
    });

    const sortedProducts = Object.keys(productQtyMap)
      .map(name => ({ name, qty: productQtyMap[name] }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
      
    setTopProducts(sortedProducts);

    // 4. Vendas por Categoria
    const categoryRevMap = {};
    const productCategoryMap = {};
    allProducts.forEach(p => {
      productCategoryMap[p.id] = p.category;
    });

    periodSales.forEach(sale => {
      if (sale.total > 0) {
        sale.items.forEach(item => {
          if (item.productId === 'payment') return;
          const cat = productCategoryMap[item.productId] || 'Outros';
          categoryRevMap[cat] = (categoryRevMap[cat] || 0) + item.totalPrice;
        });
      }
    });

    const totalCatRevenue = Object.values(categoryRevMap).reduce((sum, val) => sum + val, 0);
    const sortedCategories = Object.keys(categoryRevMap).map(cat => ({
      name: cat,
      value: categoryRevMap[cat],
      percent: totalCatRevenue > 0 ? Math.round((categoryRevMap[cat] / totalCatRevenue) * 100) : 0
    })).sort((a, b) => b.value - a.value);

    setCategoryStats(sortedCategories);

    // 5. Clientes Devedores (Top 10)
    const activeDebtors = allClients
      .filter(c => c.debt > 0)
      .sort((a, b) => b.debt - a.debt)
      .slice(0, 10);
    setDebtors(activeDebtors);

    // 6. Lista de Vendas do período filtrada
    setFilteredSales(periodSales.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  useEffect(() => {
    loadReportData();
  }, [period]);

  // Exportar logs de vendas para arquivo CSV
  const handleExportCSV = () => {
    if (filteredSales.length === 0) {
      addToast('Não há transações no período para exportar.', 'warning');
      return;
    }

    const headers = ['Venda ID', 'Data/Hora', 'Cliente', 'Itens', 'Subtotal', 'Desconto', 'Total', 'Forma Pagamento', 'Operador'];
    const rows = filteredSales.map(s => {
      const itemsDesc = s.items.map(i => `${i.name} (${i.quantity}x)`).join(' | ');
      const dateFormated = new Date(s.date).toLocaleString('pt-BR');
      return [
        s.id,
        `"${dateFormated}"`,
        `"${s.clientName || 'Consumidor Final'}"`,
        `"${itemsDesc}"`,
        s.subtotal.toFixed(2),
        s.discount.toFixed(2),
        s.total.toFixed(2),
        s.paymentMethod,
        `"${s.seller}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sigcomercio_relatorio_${period}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Relatório CSV baixado com sucesso!', 'success');
  };

  // Filtrar histórico de vendas com base no input de pesquisa
  const salesHistory = filteredSales.filter(sale => {
    const query = searchTerm.toLowerCase();
    return (
      sale.id.toLowerCase().includes(query) ||
      (sale.clientName && sale.clientName.toLowerCase().includes(query)) ||
      sale.paymentMethod.toLowerCase().includes(query) ||
      (sale.seller && sale.seller.toLowerCase().includes(query))
    );
  });

  // Executar quitação rápida de débito
  const handleQuickAmortize = (e) => {
    e.preventDefault();
    if (!selectedDebtor) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast('Informe um valor de pagamento válido.', 'error');
      return;
    }

    const updated = dbService.payClientDebt(selectedDebtor.id, amount, `${user?.name} (Relatório)`);
    if (updated) {
      addToast(`Amortização de R$ ${amount.toFixed(2)} registrada para ${selectedDebtor.name}.`, 'success');
      setSelectedDebtor(null);
      setPaymentAmount('');
      loadReportData();
    } else {
      addToast('Erro ao processar a quitação.', 'error');
    }
  };

  return (
    <div className="page-container animate-fade">
      
      {/* HEADER DA PÁGINA COM FILTRO DE TEMPO */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1.25rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Relatórios Financeiros</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Visão analítica profunda e indicadores de desempenho comercial</p>
        </div>

        {/* Seleção de Período */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
          {[
            { id: 'today', label: 'Hoje' },
            { id: '7days', label: '7 Dias' },
            { id: '30days', label: '30 Dias' },
            { id: 'all', label: 'Tudo' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="btn"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                borderRadius: '6px',
                backgroundColor: period === p.id ? 'var(--primary)' : 'transparent',
                color: period === p.id ? 'var(--text-white)' : 'var(--text-secondary)',
                boxShadow: period === p.id ? 'var(--shadow-primary)' : 'none',
                fontWeight: period === p.id ? '600' : '400'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* METRICAS PRINCIPAIS */}
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        
        {/* Card 1: Faturamento Bruto */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Faturamento de Vendas</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>
              R$ {metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Receita de produtos no período
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Card 2: Lucro Líquido Estimado */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Lucro Líquido Estimado</span>
            <span className="stat-value" style={{ color: 'var(--primary)' }}>
              R$ {metrics.estimatedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Margem média: {metrics.profitMargin.toFixed(1)}% do faturamento
            </span>
          </div>
          <div className="stat-icon">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Card 3: Valor de Estoque Físico */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Valor de Custo do Estoque</span>
            <span className="stat-value">
              R$ {metrics.currentStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Capital imobilizado em mercadorias
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            <Package size={22} />
          </div>
        </div>

        {/* Card 4: Contas Fiadas a Receber */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Carteira Fiada (A Receber)</span>
            <span className="stat-value" style={{ color: metrics.outstandingDebts > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
              R$ {metrics.outstandingDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Total devido por clientes
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
            <Users size={22} />
          </div>
        </div>

      </section>

      {/* GRÁFICOS E RANKING */}
      <section 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', 
          gap: '1.5rem',
          width: '100%'
        }}
      >
        
        {/* Gráfico SVG Horizontal: Produtos Mais Vendidos */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '340px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              Produtos Mais Procurados (Quantidade)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Itens com maior número de unidades vendidas no período</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyItems: 'center', justifyContent: 'center' }}>
            {topProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                <Package size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>Sem movimentações de produtos neste período.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                {(() => {
                  const maxQty = Math.max(...topProducts.map(p => p.qty), 1);
                  return topProducts.map((p, idx) => {
                    const barWidthPercent = (p.qty / maxQty) * 100;
                    const colors = [
                      'linear-gradient(90deg, var(--primary), var(--secondary))',
                      'linear-gradient(90deg, #10B981, #059669)',
                      'linear-gradient(90deg, #3B82F6, #1D4ED8)',
                      'linear-gradient(90deg, #F59E0B, #D97706)',
                      'linear-gradient(90deg, #EC4899, #BE185D)'
                    ];
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '500' }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                            {idx + 1}. {p.name}
                          </span>
                          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{p.qty} un.</span>
                        </div>
                        <div style={{ height: '14px', width: '100%', backgroundColor: 'var(--bg-input)', borderRadius: '7px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${barWidthPercent}%`, 
                              background: colors[idx % colors.length], 
                              borderRadius: '7px',
                              transition: 'width 0.8s ease'
                            }} 
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Faturamento por Categorias */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '340px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpRight size={18} style={{ color: 'var(--success)' }} />
              Faturamento por Categoria
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Divisão da receita de vendas gerada em cada departamento</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
            {categoryStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                <AlertTriangle size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>Nenhum dado por categoria registrado no período.</p>
              </div>
            ) : (
              categoryStats.map((cat, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: '500' }}>{cat.name}</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                      R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({cat.percent}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${cat.percent}%`, 
                        backgroundColor: 'var(--primary)',
                        opacity: 1 - (idx * 0.15), // Efeito degradê nas barras
                        borderRadius: '4px',
                        transition: 'width 0.8s ease'
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </section>

      {/* PAINEL DE CLIENTES COM DÍVIDAS ATIVAS */}
      <section className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} style={{ color: 'var(--warning)' }} />
            Clientes com Contas Fiadas Ativas (Top 10 Maiores Devedores)
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Clientes locais que possuem pendências na caderneta de pagamentos</span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Nome do Cliente</th>
                <th>Telefone</th>
                <th style={{ textAlign: 'right' }}>Total Gasto</th>
                <th style={{ textAlign: 'right' }}>Total de Compras</th>
                <th style={{ textAlign: 'right', color: 'var(--danger)' }}>Saldo Devedor</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {debtors.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                    Parabéns! Não existem clientes com pendências financeiras de fiado atualmente.
                  </td>
                </tr>
              ) : (
                debtors.map(debtor => (
                  <tr key={debtor.id}>
                    <td style={{ fontWeight: '600' }}>{debtor.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{debtor.phone || 'Sem telefone'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>
                      R$ {debtor.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{debtor.purchaseCount} compras</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>
                      R$ {debtor.debt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => setSelectedDebtor(debtor)}
                        className="btn btn-outline" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '3px' }}
                      >
                        Quitar Débito
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* LOG DE TRANSAÇÕES COMPLETO */}
      <section className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Controles de pesquisa e exportação */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>Histórico Detalhado de Transações</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Log de auditoria de todas as operações efetuadas no período</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Input de Busca */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Buscar por ID, cliente, método..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '0.65rem 1rem 0.65rem 2.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: 'var(--bg-input)',
                  fontSize: '0.85rem',
                  width: '280px',
                  transition: 'border-color var(--transition-fast)'
                }}
              />
              <Search 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '0.75rem', 
                  color: 'var(--text-muted)' 
                }} 
              />
            </div>

            {/* Botão de Exportar */}
            <button 
              onClick={handleExportCSV}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem', gap: '6px' }}
            >
              <FileSpreadsheet size={16} />
              Exportar Planilha (CSV)
            </button>
          </div>
        </div>

        {/* Tabela de logs */}
        <div className="table-container" style={{ margin: 0 }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Cód Transação</th>
                <th>Data e Hora</th>
                <th>Cliente</th>
                <th>Produtos / Itens Vendidos</th>
                <th style={{ textAlign: 'right' }}>Desconto</th>
                <th style={{ textAlign: 'right' }}>Valor Total</th>
                <th>Meio Pagto</th>
                <th>Operador</th>
              </tr>
            </thead>
            <tbody>
              {salesHistory.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                    Nenhuma transação encontrada no período ou com os filtros inseridos.
                  </td>
                </tr>
              ) : (
                salesHistory.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>#{sale.id}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(sale.date).toLocaleString('pt-BR')}
                    </td>
                    <td>{sale.clientName || 'Consumidor Final'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '380px' }}>
                        {sale.items.map((item, idx) => (
                          <span 
                            key={idx} 
                            style={{ 
                              fontSize: '0.8rem',
                              color: item.totalPrice < 0 ? 'var(--success)' : 'var(--text-primary)',
                              fontWeight: item.totalPrice < 0 ? '600' : '400'
                            }}
                          >
                            {item.name} {item.totalPrice < 0 ? '' : `(${item.quantity}x)`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', color: sale.discount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {sale.discount > 0 ? `- R$ ${sale.discount.toFixed(2)}` : 'R$ 0,00'}
                    </td>
                    <td 
                      style={{ 
                        textAlign: 'right', 
                        fontWeight: 'bold', 
                        color: sale.total < 0 ? 'var(--success)' : 'var(--text-primary)' 
                      }}
                    >
                      {sale.total < 0 ? '+' : ''} R$ {Math.abs(sale.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: 
                            sale.paymentMethod === 'pix' ? 'rgba(99, 102, 241, 0.12)' :
                            sale.paymentMethod === 'cartao' ? 'rgba(59, 130, 246, 0.12)' :
                            sale.paymentMethod === 'dinheiro' ? 'var(--success-light)' : 'var(--warning-light)',
                          color: 
                            sale.paymentMethod === 'pix' ? '#6366F1' :
                            sale.paymentMethod === 'cartao' ? '#3B82F6' :
                            sale.paymentMethod === 'dinheiro' ? 'var(--success)' : 'var(--warning)'
                        }}
                      >
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sale.seller}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL DE AMORTIZAÇÃO DE DÉBITO RÁPIDO */}
      {selectedDebtor && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div 
            className="premium-card animate-scale" 
            style={{ 
              width: '100%', 
              maxWidth: '420px', 
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} style={{ color: 'var(--primary)' }} />
                Quitação Rápida de Débito
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
                Registrar amortização para o cliente selecionado.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cliente</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '2px' }}>{selectedDebtor.name}</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dívida Atual:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                  R$ {selectedDebtor.debt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <form onSubmit={handleQuickAmortize} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500' }}>Valor do Pagamento (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedDebtor.debt}
                  required
                  placeholder="Ex: 50,00"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-sm)',
                    backgroundColor: 'var(--bg-input)',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    color: 'var(--success)'
                  }}
                  autoFocus
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Min: R$ 0,01</span>
                  <span 
                    onClick={() => setPaymentAmount(selectedDebtor.debt.toString())}
                    style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Quitar Valor Integral
                  </span>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setSelectedDebtor(null)} 
                  className="btn btn-ghost" 
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                >
                  Confirmar Quitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ESTILOS DE ANIMAÇÃO */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-scale {
          animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
};
