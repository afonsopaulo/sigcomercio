import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Inicializa a sessão ao carregar a página
  useEffect(() => {
    const activeUser = authService.getCurrentUser();
    if (activeUser) {
      setUser(activeUser);
    }
    setLoading(false);
  }, []);

  // --- SISTEMA DE TOASTS INTEGRADO ---
  const addToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    // Remove automaticamente após 3.5 segundos
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- MÉTODOS DE AUTENTICAÇÃO ---
  const login = async (username, password) => {
    try {
      // O login no Supabase é assíncrono; aguardar a resposta garante que
      // o cargo retornado pelo banco (admin/employee) seja salvo na sessão.
      const loggedUser = await authService.login(username, password);
      setUser(loggedUser);
      addToast(`Bem-vindo de volta, ${loggedUser.name}!`, 'success');
      return loggedUser;
    } catch (error) {
      addToast(error.message || 'Erro ao realizar login.', 'error');
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    addToast('Sessão encerrada com sucesso.', 'info');
    setUser(null);
    // Redireciona forçadamente para limpar qualquer estado de memória residual
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, toasts, addToast, removeToast }}>
      {children}
      
      {/* Container de Toasts flutuantes */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
            style={{ cursor: 'pointer' }}
          >
            <span>{toast.message}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              style={{
                marginLeft: 'auto',
                background: 'none',
                color: 'inherit',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1rem',
                border: 'none',
                opacity: 0.8
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
