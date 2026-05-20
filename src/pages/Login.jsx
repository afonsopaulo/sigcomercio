import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Lock, Store, Sun, Moon } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    
    setLoading(true);
    try {
      // Simula um atraso sutil de rede de 500ms para renderizar a animação de loading e dar a sensação de validação profissional!
      await new Promise(resolve => setTimeout(resolve, 500));
      await login(username, password);
    } catch (error) {
      // O erro já é tratado exibindo toast no AuthContext
      setLoading(false);
    }
  };

  // Função para atalho rápido de login de teste
  const handleQuickLogin = (role) => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
      // Submete diretamente após um microdelay
      setTimeout(() => {
        login('admin', 'admin123');
      }, 100);
    } else {
      setUsername('vendedor');
      setPassword('vendedor123');
      setTimeout(() => {
        login('vendedor', 'vendedor123');
      }, 100);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--bg-app), var(--primary-light), var(--bg-app))',
        position: 'relative',
        overflow: 'hidden',
        padding: '1.5rem'
      }}
    >
      {/* Botão de Tema no Canto Superior Direito */}
      <button
        onClick={toggleTheme}
        className="btn btn-outline btn-icon-only"
        style={{
          position: 'absolute',
          top: '2rem',
          right: '2rem',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-card)'
        }}
        title="Alternar Tema"
      >
        {theme === 'dark' ? <Sun size={18} style={{ color: 'var(--warning)' }} /> : <Moon size={18} />}
      </button>

      {/* Card de Login Glassmorphic */}
      <div
        className="glass-panel animate-fade"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--glass-border)'
        }}
      >
        {/* LOGO E TÍTULO */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--border-radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: 'var(--shadow-primary)'
            }}
          >
            <Store size={28} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', margin: 0 }}>SigComércio</h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Gestão simplificada e inteligente para seu negócio
            </span>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Usuário / Login</label>
            <div style={{ position: 'relative' }}>
              <User 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="text"
                className="form-control"
                placeholder="Ex: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '0.85rem',
              fontSize: '1rem',
              fontWeight: '600',
              marginTop: '0.5rem'
            }}
            disabled={loading || !username.trim() || !password}
          >
            {loading ? (
              <div 
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
            ) : 'Entrar no Sistema'}
          </button>
        </form>

        {/* ATALHOS DE LOGIN DE TESTE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: '500' }}>
            Acesso Rápido para Avaliação:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={() => handleQuickLogin('admin')}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}
              type="button"
            >
              <strong>Administrador</strong>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>admin / admin123</span>
            </button>
            <button
              onClick={() => handleQuickLogin('employee')}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}
              type="button"
            >
              <strong>Funcionário</strong>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>vendedor / vendedor123</span>
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
