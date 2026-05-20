import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Tag, 
  Users, 
  BarChart3, 
  UserCog, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Store
} from 'lucide-react';

export const Sidebar = ({ currentPage, setCurrentPage, collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'all' },
    { id: 'pos', label: 'Nova Venda (PDV)', icon: ShoppingCart, role: 'all' },
    { id: 'stock', label: 'Controle de Estoque', icon: Package, role: 'all' },
    { id: 'products', label: 'Produtos', icon: Tag, role: 'all' },
    { id: 'clients', label: 'Clientes', icon: Users, role: 'all' },
    { id: 'reports', label: 'Relatórios', icon: BarChart3, role: 'admin' },
    { id: 'users', label: 'Usuários', icon: UserCog, role: 'admin' }
  ];

  // Filtra itens por papel de usuário
  const filteredMenuItems = menuItems.filter(item => {
    if (item.role === 'all') return true;
    return user?.role === item.role;
  });

  const handleNav = (pageId) => {
    setCurrentPage(pageId);
    setMobileOpen(false); // Fecha no mobile ao clicar
  };

  const activeStyle = {
    background: 'var(--primary)',
    color: 'var(--text-white)',
    boxShadow: 'var(--shadow-primary)'
  };

  return (
    <>
      {/* Overlay para Mobile quando Sidebar está aberta */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      <aside
        style={{
          width: collapsed ? '80px' : '280px',
          height: '100vh',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 999,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'width var(--transition-normal), transform var(--transition-normal)',
          boxShadow: mobileOpen ? 'var(--shadow-lg)' : 'none'
        }}
        // Classes responsivas aplicadas via inline media queries na renderização principal
        className="app-sidebar-element"
      >
        {/* LOGO AREA */}
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            borderBottom: '1px solid var(--border-color)',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--border-radius-sm)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0
            }}
          >
            <Store size={22} />
          </div>
          {!collapsed && (
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              SigComércio
            </span>
          )}
        </div>

        {/* NAVEGAÇÃO */}
        <nav
          style={{
            padding: '1.5rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            flex: 1,
            overflowY: 'auto'
          }}
        >
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`btn ${isActive ? '' : 'btn-ghost'}`}
                style={{
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.95rem',
                  gap: '1rem',
                  width: '100%',
                  ...(isActive ? activeStyle : {}),
                  transition: 'all var(--transition-fast)'
                }}
                title={collapsed ? item.label : ''}
              >
                <Icon size={20} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* CONTROLE DE EXPANSÃO / LOGOUT */}
        <div
          style={{
            padding: '1rem 0.75rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          {/* Botão de colapsamento da sidebar (Desktop) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn btn-ghost hide-mobile"
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '0.75rem',
              fontSize: '0.9rem',
              gap: '1rem',
              width: '100%'
            }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span>Recolher Menu</span>}
          </button>

          {/* Botão de Logout */}
          <button
            onClick={logout}
            className="btn btn-ghost"
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '0.75rem',
              color: 'var(--danger)',
              fontSize: '0.9rem',
              gap: '1rem',
              width: '100%'
            }}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* Adicionar CSS inline no DOM para controle de responsividade da Sidebar */}
      <style>{`
        @media (min-width: 769px) {
          .app-sidebar-element {
            transform: translateX(0) !important;
          }
          .hide-mobile {
            display: inline-flex !important;
          }
        }
        @media (max-width: 768px) {
          .app-sidebar-element {
            width: 280px !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};
