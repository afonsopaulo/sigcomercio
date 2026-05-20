import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { dbService } from '../../services/db';
import { 
  Menu, 
  Bell, 
  Sun, 
  Moon, 
  AlertTriangle,
  User
} from 'lucide-react';

export const Header = ({ currentPage, setMobileOpen, mobileOpen }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Mapeia títulos das páginas
  const pageTitles = {
    dashboard: 'Painel Geral (Dashboard)',
    pos: 'Ponto de Venda (PDV)',
    stock: 'Controle & Movimentação de Estoque',
    products: 'Catálogo de Produtos',
    clients: 'Gerenciamento de Clientes & Fiado',
    reports: 'Relatórios Financeiros',
    users: 'Controle de Operadores (Usuários)'
  };

  // Carrega produtos com estoque baixo para a barra de notificação
  const checkStockAlerts = () => {
    try {
      const products = dbService.getProducts();
      const lowStock = products.filter(p => p.stock <= p.minStock);
      setLowStockProducts(lowStock);
    } catch (e) {
      console.error(e);
    }
  };

  // Verifica ao montar e re-verifica a cada 3 segundos para manter o cabeçalho sempre reativo!
  useEffect(() => {
    checkStockAlerts();
    const interval = setInterval(checkStockAlerts, 3000);
    return () => clearInterval(interval);
  }, [currentPage]); // Re-verifica também ao mudar de página

  // Fecha notificações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Obter iniciais do usuário para o avatar
  const getUserInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header
      style={{
        height: '70px',
        backgroundColor: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        position: 'sticky',
        top: 0,
        zIndex: 900
      }}
    >
      {/* LADO ESQUERDO: BOTÃO MOBILE E TÍTULO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="btn btn-ghost hide-desktop btn-icon-only"
          style={{ cursor: 'pointer' }}
        >
          <Menu size={22} />
        </button>

        <h1 
          style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: '1.25rem', 
            margin: 0,
            color: 'var(--text-primary)',
            fontWeight: '600'
          }}
        >
          {pageTitles[currentPage] || 'SigComércio'}
        </h1>
      </div>

      {/* LADO DIREITO: TEMA, NOTIFICAÇÕES E AVATAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginLeft: 'auto' }}>
        
        {/* BOTÃO ALTERNAR TEMA */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-icon-only"
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          style={{ borderRadius: '50%', color: 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? <Sun size={20} style={{ color: 'var(--warning)' }} /> : <Moon size={20} />}
        </button>

        {/* PAINEL NOTIFICAÇÕES (ALERTAS ESTOQUE) */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="btn btn-ghost btn-icon-only"
            style={{ 
              borderRadius: '50%', 
              position: 'relative',
              color: lowStockProducts.length > 0 ? 'var(--warning)' : 'var(--text-secondary)'
            }}
            title="Alertas de Estoque"
          >
            <Bell size={20} className={lowStockProducts.length > 0 ? 'pulse-glow' : ''} />
            {lowStockProducts.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  backgroundColor: 'var(--danger)',
                  color: 'var(--text-white)',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {lowStockProducts.length}
              </span>
            )}
          </button>

          {/* DROPDOWN NOTIFICAÇÕES */}
          {notifOpen && (
            <div
              className="glass-panel animate-fade"
              style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                width: '320px',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '1rem',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                <strong style={{ fontSize: '0.9rem' }}>Alertas de Reposição</strong>
              </div>
              
              {lowStockProducts.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
                  Todos os produtos estão com estoque saudável! 👍
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {lowStockProducts.map(product => (
                    <div 
                      key={product.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.15rem',
                        padding: '0.5rem',
                        borderRadius: 'var(--border-radius-sm)',
                        backgroundColor: 'var(--danger-light)',
                        borderLeft: '3px solid var(--danger)'
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{product.name}</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>Qtd: <strong style={{ color: 'var(--danger)' }}>{product.stock}</strong> un</span>
                        <span>Mínimo: {product.minStock} un</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PAINEL DO OPERADOR LOGADO */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            borderLeft: '1px solid var(--border-color)', 
            paddingLeft: '1.25rem' 
          }}
          className="hide-mobile"
        >
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {user?.name || 'Operador'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
            </span>
          </div>

          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'var(--text-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {getUserInitials(user?.name)}
          </div>
        </div>

      </div>

      <style>{`
        @media (min-width: 769px) {
          .hide-desktop {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
