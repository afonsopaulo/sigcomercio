import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout/Layout';

// Páginas
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Stock } from './pages/Stock';
import { POS } from './pages/POS';
import { Clients } from './pages/Clients';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';

// Componente Interno que consome o contexto de Autenticação
const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Exibe tela de carregamento estilizada
  if (loading) {
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-primary)',
          gap: '1rem'
        }}
      >
        <div 
          className="pulse-glow"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '3px solid var(--primary)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }}
        />
        <span style={{ fontSize: '0.95rem', fontWeight: '500', opacity: 0.8 }}>
          Carregando SigComércio...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Se não estiver logado, exibe apenas a tela de Login
  if (!user) {
    return <Login />;
  }

  // Renderiza a página ativa com base no estado e valida restrições de Admin
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} />;
      case 'pos':
        return <POS />;
      case 'stock':
        return <Stock />;
      case 'products':
        return <Products />;
      case 'clients':
        return <Clients />;
      case 'reports':
        // Apenas Admin acessa relatórios
        if (user.role !== 'admin') return <AccessDenied />;
        return <Reports />;
      case 'users':
        // Apenas Admin acessa usuários
        if (user.role !== 'admin') return <AccessDenied />;
        return <Users />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

// Componente para exibir quando o acesso for negado
const AccessDenied = () => {
  return (
    <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div 
        className="premium-card text-center" 
        style={{ 
          maxWidth: '500px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '1.25rem',
          padding: '2.5rem'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)' }}>Acesso Restrito</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
          Desculpe, você não tem permissão para visualizar esta página. Esta seção é restrita exclusivamente a administradores do sistema.
        </p>
      </div>
    </div>
  );
};

// Ponto de entrada com os Providers globais
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
