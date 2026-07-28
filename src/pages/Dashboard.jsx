import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Plus, 
  ArrowRight,
  TrendingDown,
  Percent,
  Trash2,
  X
} from 'lucide-react';

export const Dashboard = ({ setCurrentPage }) => {
  const { user, addToast } = useAuth();
  
  // Estados para dados calculados
  const [stats, setStats] = useState({
    todaySales: 0,
    productCount: 0,
    lowStockCount: 0,
    clientCount: 0,
    todayProfit: 0
  });
  
  const [recentSales, setRecentSales] = useState([]);
  const [weeklySalesData, setWeeklySalesData] = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  
  // Modal de confirmação para limpar tudo
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  useEffect(() => {
    // Executa cálculos consolidados do Dashboard
    const loadDashboardData = async () => {
      const [allProducts, allSales, allClients] = await Promise.all([dbService.getProducts(), dbService.getSales(), dbService.getClients()]);
      
      const todayStr = new Date().toDateString();
      
      // 1. Vendas de Hoje
      const salesToday = allSales.filter(s => {
        return new Date(s.date).toDateString() === todayStr && s.total > 0;
      });
      const sumTodaySales = salesToday.reduce((sum, s) => sum + s.total, 0);

      // 2. Lucro Estimado de Hoje
      // Margem = Venda - Preço de compra dos itens correspondentes
      let sumTodayProfit = 0;
      salesToday.forEach(sale => {
        sale.items.forEach(item => {
          // Se for amortização de dívida, ignore no cálculo do lucro de produtos vendidos
          if (item.productId === 'payment') return;
          
          const prod = allProducts.find(p => p.id === item.productId);
          if (prod) {
            const cost = prod.purchasePrice * item.quantity;
            const revenue = item.unitPrice * item.quantity;
            sumTodayProfit += (revenue - cost);
          } else {
            // Se produto deletado, estima lucro de 40%
            sumTodayProfit += (item.totalPrice * 0.4);
          }
        });
        // Aplica o desconto proporcional da venda ao lucro
        if (sale.discount > 0 && sale.subtotal > 0) {
          const discountRatio = sale.total / sale.subtotal;
          sumTodayProfit = sumTodayProfit * discountRatio;
        }
      });

      // 3. Estoque Baixo
      const lowStock = allProducts.filter(p => p.stock <= p.minStock).length;

      setStats({
        todaySales: sumTodaySales,
        productCount: allProducts.length,
        lowStockCount: lowStock,
        clientCount: allClients.length,
        todayProfit: Math.max(0, sumTodayProfit)
      });

      // 4. Últimas 5 Vendas
      const sortedSales = [...allSales]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      setRecentSales(sortedSales);

      // 5. Histórico Semanal (Últimos 7 dias incluindo hoje)
      const weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toDateString();
        
        // Busca rótulo do dia da semana em PT-BR
        const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        
        const daySalesSum = allSales
          .filter(s => new Date(s.date).toDateString() === dayStr && s.total > 0)
          .reduce((sum, s) => sum + s.total, 0);
          
        weeklyData.push({
          label: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
          amount: parseFloat(daySalesSum.toFixed(2))
        });
      }
      setWeeklySalesData(weeklyData);

      // 6. Estatísticas de Formas de Pagamento
      const payCounts = { dinheiro: 0, pix: 0, cartao: 0, fiado: 0 };
      let totalSalesCount = 0;
      
      allSales.forEach(s => {
        if (s.total > 0 && payCounts[s.paymentMethod] !== undefined) {
          payCounts[s.paymentMethod] += s.total;
          totalSalesCount += s.total;
        }
      });

      const methodLabels = { dinheiro: 'Dinheiro', pix: 'Pix', cartao: 'Cartão', fiado: 'Fiado' };
      const methodColors = { dinheiro: '#10B981', pix: '#6366F1', cartao: '#3B82F6', fiado: '#F59E0B' };
      
      const parsedPayStats = Object.keys(payCounts).map(key => ({
        id: key,
        name: methodLabels[key],
        value: parseFloat(payCounts[key].toFixed(2)),
        percent: totalSalesCount > 0 ? Math.round((payCounts[key] / totalSalesCount) * 100) : 0,
        color: methodColors[key]
      })).sort((a, b) => b.value - a.value);

      setPaymentStats(parsedPayStats);
    };

    loadDashboardData();
    // Atualiza a cada 5 segundos para refletir vendas do PDV imediatamente
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- MATEMÁTICA PARA GRÁFICO DE LINHA SVG ---
  // Calcula a coordenada dos pontos para o SVG baseado no tamanho (500x180)
  const renderLineChartPath = () => {
    if (weeklySalesData.length === 0) return { linePath: '', areaPath: '', points: [] };
    
    const width = 500;
    const height = 140;
    const paddingLeft = 40;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 15;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const maxAmount = Math.max(...weeklySalesData.map(d => d.amount), 100); // Garante escala mínima
    
    const points = weeklySalesData.map((d, index) => {
      const x = paddingLeft + (index * (chartWidth / (weeklySalesData.length - 1)));
      // Inverte o eixo Y pois 0 é no topo da tela
      const y = height - paddingBottom - ((d.amount / maxAmount) * chartHeight);
      return { x, y, amount: d.amount, label: d.label };
    });
    
    // Constrói a linha suavizada ou reta
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }
    
    // Constrói a área preenchida fechando na base Y
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    
    return { linePath, areaPath, points, maxAmount, height, paddingBottom };
  };

  const chartData = renderLineChartPath();

  // Limpar todos os dados do sistema
  const handleClearAllData = async () => {
    await dbService.clearAllData();
    addToast('Todos os dados foram removidos. Sistema zerado.', 'info');
    setShowClearAllConfirm(false);
    // Recarrega os dados do dashboard
    setStats({
      todaySales: 0,
      productCount: 0,
      lowStockCount: 0,
      clientCount: 0,
      todayProfit: 0
    });
    setRecentSales([]);
    setWeeklySalesData([]);
    setPaymentStats([]);
  };

  return (
    <div className="page-container animate-fade">
      
      {/* 1. MÉTRIQUES GERAIS (CARDS SUPERIORES) */}
      <section className="stats-grid">
        {/* Card 1: Faturamento do Dia */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Vendas de Hoje</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>
              R$ {stats.todaySales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <TrendingUp size={12} style={{ color: 'var(--success)' }} /> 
              Faturamento bruto em tempo real
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <ShoppingCart size={24} />
          </div>
        </div>

        {/* Card 2: Lucro Estimado do Dia (ADMIN APENAS) */}
        {user?.role === 'admin' ? (
          <div className="premium-card stat-card">
            <div className="stat-info">
              <span className="stat-label">Lucro Estimado</span>
              <span className="stat-value" style={{ color: 'var(--primary)' }}>
                R$ {stats.todayProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Percent size={12} style={{ color: 'var(--primary)' }} />
                Calculado sobre preço de custo
              </span>
            </div>
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
          </div>
        ) : (
          /* Se for funcionário, mostra Total de Clientes em vez de Lucro */
          <div className="premium-card stat-card">
            <div className="stat-info">
              <span className="stat-label">Total de Clientes</span>
              <span className="stat-value">
                {stats.clientCount}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Base de clientes locais ativa
              </span>
            </div>
            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
              <Users size={24} />
            </div>
          </div>
        )}

        {/* Card 3: Produtos Cadastrados */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Total de Produtos</span>
            <span className="stat-value">
              {stats.productCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Itens ativos no catálogo
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            <Package size={24} />
          </div>
        </div>

        {/* Card 4: Alertas de Estoque Baixo */}
        <div 
          className="premium-card stat-card" 
          onClick={() => setCurrentPage('stock')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-info">
            <span className="stat-label">Estoque Crítico</span>
            <span className="stat-value" style={{ color: stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {stats.lowStockCount}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {stats.lowStockCount > 0 ? 'Exige reposição imediata' : 'Nenhum alerta pendente'}
            </span>
          </div>
          <div 
            className="stat-icon" 
            style={{ 
              backgroundColor: stats.lowStockCount > 0 ? 'var(--danger-light)' : 'var(--success-light)', 
              color: stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--success)' 
            }}
          >
            <AlertTriangle size={24} className={stats.lowStockCount > 0 ? 'pulse-glow' : ''} />
          </div>
        </div>
      </section>

      {/* 2. GRÁFICOS (DUAS COLUNAS EM TELAS GRANDES) */}
      <section 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '1.5rem',
          width: '100%'
        }}
        className="dashboard-charts-row"
      >
        
        {/* Gráfico 1: Vendas Semanais (SVG Puro) */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '300px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>Faturamento Diário (Últimos 7 dias)</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Evolução financeira da última semana</span>
          </div>
          
          <div style={{ flex: 1, position: 'relative', minHeight: '160px' }}>
            <svg 
              viewBox="0 0 500 160" 
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              {/* Definições de Gradientes */}
              <defs>
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Linhas de Grade de Fundo */}
              <line x1="40" y1="15" x2="485" y2="15" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="40" y1="65" x2="485" y2="65" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="40" y1="115" x2="485" y2="115" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="40" y1="140" x2="485" y2="140" stroke="var(--border-color)" strokeWidth="1.5" />

              {/* Rótulos do Eixo Y */}
              <text x="32" y="20" fill="var(--text-secondary)" fontSize="9" textAnchor="end">
                R${Math.round(chartData.maxAmount).toString()}
              </text>
              <text x="32" y="70" fill="var(--text-secondary)" fontSize="9" textAnchor="end">
                R${Math.round(chartData.maxAmount / 2).toString()}
              </text>
              <text x="32" y="120" fill="var(--text-secondary)" fontSize="9" textAnchor="end">
                R$0
              </text>

              {/* Área e Linha */}
              {chartData.points.length > 0 && (
                <>
                  <path d={chartData.areaPath} fill="url(#chart-area-grad)" />
                  <path d={chartData.linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
                  
                  {/* Pontos Individuais com tooltip de hover simulado por CSS */}
                  {chartData.points.map((pt, i) => (
                    <g key={i} className="chart-dot-group" style={{ cursor: 'pointer' }}>
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r="4" 
                        fill="var(--bg-card)" 
                        stroke="var(--primary)" 
                        strokeWidth="2.5" 
                      />
                      {/* Círculo invisível maior para facilitar hover */}
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r="12" 
                        fill="transparent" 
                      />
                      {/* Valor acima do ponto */}
                      <text 
                        x={pt.x} 
                        y={pt.y - 10} 
                        fill="var(--text-primary)" 
                        fontSize="9" 
                        fontWeight="600" 
                        textAnchor="middle"
                        className="chart-dot-val"
                      >
                        R${Math.round(pt.amount)}
                      </text>
                      {/* Legenda do Eixo X */}
                      <text 
                        x={pt.x} 
                        y={chartData.height - chartData.paddingBottom + 12} 
                        fill="var(--text-secondary)" 
                        fontSize="9" 
                        textAnchor="middle"
                      >
                        {pt.label}
                      </text>
                    </g>
                  ))}
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Gráfico 2: Formas de Pagamento (Barra SVG) */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '300px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>Distribuição de Meios de Pagamento</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Porcentagem de faturamento por modalidade</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem', flex: 1, justifyContent: 'center' }}>
            {paymentStats.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Sem vendas registradas.</p>
            ) : (
              paymentStats.map(stat => (
                <div key={stat.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: stat.color }} />
                      {stat.name}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                      R$ {stat.value.toLocaleString('pt-BR')} ({stat.percent}%)
                    </span>
                  </div>
                  
                  {/* Barra de progresso customizada */}
                  <div 
                    style={{ 
                      height: '8px', 
                      width: '100%', 
                      backgroundColor: 'var(--bg-input)', 
                      borderRadius: '4px',
                      overflow: 'hidden' 
                    }}
                  >
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${stat.percent}%`, 
                        backgroundColor: stat.color, 
                        borderRadius: '4px',
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </section>

      {/* 3. ÚLTIMAS VENDAS E AÇÕES RÁPIDAS (DUAS COLUNAS) */}
      <section 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '1.5rem',
          width: '100%'
        }}
        className="dashboard-bottom-row"
      >
        
        {/* Tabela de Vendas Recentes */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>Vendas Recentes</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Últimas transações do dia</span>
            </div>
            <button 
              onClick={() => setCurrentPage('reports')}
              className="btn btn-ghost" 
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '4px' }}
            >
              Ver Relatório <ArrowRight size={14} />
            </button>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="premium-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Venda ID</th>
                  <th>Cliente</th>
                  <th>Pagamento</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                      Nenhuma venda registrada ainda.
                    </td>
                  </tr>
                ) : (
                  recentSales.map(sale => (
                    <tr key={sale.id}>
                      <td style={{ fontWeight: '600', color: 'var(--primary)' }}>#{sale.id}</td>
                      <td>{sale.clientName || 'Consumidor Final'}</td>
                      <td>
                        <span 
                          className="badge" 
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor: 
                              sale.paymentMethod === 'pix' ? 'rgba(99, 102, 241, 0.15)' :
                              sale.paymentMethod === 'cartao' ? 'rgba(59, 130, 246, 0.15)' :
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
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card de Atalhos e Ações Rápidas */}
        <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>Operações Rápidas</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ações comuns do dia a dia</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
            <button 
              onClick={() => setCurrentPage('pos')}
              className="btn btn-primary"
              style={{ justifyContent: 'flex-start', padding: '0.95rem 1.25rem', gap: '1rem', borderRadius: 'var(--border-radius-sm)' }}
            >
              <Plus size={18} />
              Nova Venda (Frente de Caixa)
            </button>

            <button 
              onClick={() => setCurrentPage('products')}
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start', padding: '0.95rem 1.25rem', gap: '1rem' }}
            >
              <Package size={18} />
              Cadastrar Novo Produto
            </button>

            <button 
              onClick={() => setCurrentPage('stock')}
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start', padding: '0.95rem 1.25rem', gap: '1rem' }}
            >
              <AlertTriangle size={18} />
              Ver Ajustes de Estoque
            </button>

            {user?.role === 'admin' && (
              <button 
                onClick={() => setCurrentPage('users')}
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', padding: '0.95rem 1.25rem', gap: '1rem' }}
              >
                <Users size={18} />
                Gerenciar Usuários (Operadores)
              </button>
            )}

            {user?.role === 'admin' && (
              <button 
                onClick={() => setShowClearAllConfirm(true)}
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', padding: '0.95rem 1.25rem', gap: '1rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                <Trash2 size={18} />
                Zerar Sistema Completo
              </button>
            )}
          </div>
        </div>

      </section>

      {/* Estilos para efeito de hover dos pontos do gráfico SVG */}
      <style>{`
        .chart-dot-group .chart-dot-val {
          opacity: 0;
          transition: opacity var(--transition-fast) transform var(--transition-fast);
          transform: translateY(3px);
        }
        .chart-dot-group:hover .chart-dot-val {
          opacity: 1;
          transform: translateY(0px);
        }
        .chart-dot-group:hover circle {
          r: 6;
          fill: var(--primary);
        }
        @media (max-width: 768px) {
          .dashboard-charts-row, .dashboard-bottom-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* MODAL DE CONFIRMAÇÃO - ZERAR SISTEMA */}
      {showClearAllConfirm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
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
              maxWidth: '450px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={26} />
            </div>
            
            <div>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)', color: 'var(--danger)' }}>Zerar Todo o Sistema?</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                Esta ação irá <strong>remover permanentemente</strong> todos os produtos, vendas, clientes e movimentações de estoque. Os usuários serão mantidos. Esta ação não pode ser desfeita.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => setShowClearAllConfirm(false)} 
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleClearAllData} 
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Sim, Zerar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
