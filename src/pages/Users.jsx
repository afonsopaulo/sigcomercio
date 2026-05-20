import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  User, 
  Lock, 
  Search, 
  UserCog, 
  AlertTriangle,
  X 
} from 'lucide-react';

export const Users = () => {
  const { user: currentUser, addToast } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais de Controle
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Estados dos Formulários
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'employee'
  });

  const loadUsers = () => {
    try {
      const allUsers = dbService.getUsers();
      setUsersList(allUsers);
    } catch (err) {
      addToast('Erro ao carregar usuários.', 'error');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Fechar e limpar campos ao sair
  const closeModals = () => {
    setIsAddModalOpen(false);
    setEditingUser(null);
    setDeletingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'employee'
    });
  };

  // Enviar formulário de adição de usuário
  const handleAddUser = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      addToast('Todos os campos são de preenchimento obrigatório.', 'warning');
      return;
    }

    try {
      dbService.addUser({
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        role: formData.role
      });
      addToast('Usuário (Operador) cadastrado com sucesso!', 'success');
      loadUsers();
      closeModals();
    } catch (err) {
      addToast(err.message || 'Erro ao cadastrar usuário.', 'error');
    }
  };

  // Carregar dados de edição no formulário
  const startEditing = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      username: u.username,
      password: u.password,
      role: u.role
    });
  };

  // Enviar formulário de edição de usuário
  const handleEditUser = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      addToast('Todos os campos devem ser preenchidos.', 'warning');
      return;
    }

    try {
      dbService.updateUser(editingUser.id, {
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        role: formData.role
      });
      addToast('Dados do operador atualizados com sucesso!', 'success');
      loadUsers();
      closeModals();
    } catch (err) {
      addToast(err.message || 'Erro ao atualizar dados do usuário.', 'error');
    }
  };

  // Enviar confirmação de exclusão
  const handleDeleteUser = () => {
    if (!deletingUser) return;
    
    // Bloquear auto-exclusão do próprio usuário logado por engano
    if (deletingUser.id === currentUser.id) {
      addToast('Você não pode excluir a sua própria conta ativa em uso.', 'error');
      setDeletingUser(null);
      return;
    }

    try {
      dbService.deleteUser(deletingUser.id);
      addToast('Operador excluído com sucesso do sistema.', 'success');
      loadUsers();
      closeModals();
    } catch (err) {
      addToast(err.message || 'Erro ao excluir operador.', 'error');
      setDeletingUser(null);
    }
  };

  // Filtra operadores na lista pelo termo de busca
  const filteredUsers = usersList.filter(u => {
    const term = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="page-container animate-fade">
      
      {/* CABEÇALHO COM TÍTULO E AÇÃO DE CRIAÇÃO */}
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
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Gerenciar Usuários</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Administração de operadores e permissões de acesso ao SigComércio</p>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary"
          style={{ gap: '8px' }}
        >
          <UserPlus size={18} />
          Cadastrar Novo Operador
        </button>
      </div>

      {/* METRICAS DE OPERADORES */}
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        
        {/* Card 1: Total de Usuários */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Total de Operadores</span>
            <span className="stat-value">{usersList.length}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Contas cadastradas no sistema
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <UsersIcon size={22} />
          </div>
        </div>

        {/* Card 2: Administradores */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Administradores</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>
              {usersList.filter(u => u.role === 'admin').length}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Acesso total às configurações e finanças
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <Shield size={22} />
          </div>
        </div>

        {/* Card 3: Vendedores / Funcionários */}
        <div className="premium-card stat-card">
          <div className="stat-info">
            <span className="stat-label">Funcionários / PDV</span>
            <span className="stat-value" style={{ color: 'var(--secondary)' }}>
              {usersList.filter(u => u.role === 'employee').length}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Operação exclusiva de vendas
            </span>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--secondary)' }}>
            <UserCog size={22} />
          </div>
        </div>
      </section>

      {/* CONTROLE DE BUSCA E LISTAGEM */}
      <section className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Barra de Filtro */}
        <div style={{ display: 'flex', position: 'relative', maxWidth: '400px', width: '100%' }}>
          <input
            type="text"
            placeholder="Buscar operador por nome ou login..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '0.65rem 1rem 0.65rem 2.25rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-sm)',
              backgroundColor: 'var(--bg-input)',
              fontSize: '0.85rem',
              width: '100%',
              transition: 'border-color var(--transition-fast)'
            }}
          />
          <Search 
            size={16} 
            style={{ 
              position: 'absolute', 
              left: '0.75rem', 
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)' 
            }} 
          />
        </div>

        {/* Tabela de Operadores */}
        <div className="table-container" style={{ margin: 0 }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th>Nome de Usuário (Login)</th>
                <th>Senha de Acesso</th>
                <th>Nível de Permissão</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                    Nenhum operador corresponde aos termos de pesquisa inseridos.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div 
                          style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            backgroundColor: u.role === 'admin' ? 'var(--success-light)' : 'var(--primary-light)',
                            color: u.role === 'admin' ? 'var(--success)' : 'var(--primary)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        {u.name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      {u.username}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                      {u.password}
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: u.role === 'admin' ? 'var(--success-light)' : 'rgba(99, 102, 241, 0.12)',
                          color: u.role === 'admin' ? 'var(--success)' : '#6366F1',
                          fontWeight: '600'
                        }}
                      >
                        {u.role === 'admin' ? 'Administrador' : 'Funcionário / Caixa'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          onClick={() => startEditing(u)}
                          className="btn btn-ghost" 
                          style={{ padding: '0.35rem', color: 'var(--primary)' }}
                          title="Editar operador"
                        >
                          <Edit size={16} />
                        </button>
                        
                        {u.id !== currentUser.id && (
                          <button 
                            onClick={() => setDeletingUser(u)}
                            className="btn btn-ghost" 
                            style={{ padding: '0.35rem', color: 'var(--danger)' }}
                            title="Excluir operador"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL 1: CADASTRAR NOVO OPERADOR */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="premium-card modal-container" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} style={{ color: 'var(--primary)' }} />
                Novo Operador Comercial
              </h3>
              <button onClick={closeModals} className="btn-close"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Nome Completo do Funcionário</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Julio César de Souza"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                  <User size={16} className="input-icon-left" />
                </div>
              </div>

              <div className="form-group">
                <label>Login de Usuário (Username)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="Ex: juliocesar"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  />
                  <UserCog size={16} className="input-icon-left" />
                </div>
                <span className="input-tip">Será digitado na tela de login (letras minúsculas e sem espaços).</span>
              </div>

              <div className="form-group">
                <label>Senha de Acesso</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="Defina uma senha"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                  <Lock size={16} className="input-icon-left" />
                </div>
              </div>

              <div className="form-group">
                <label>Nível de Permissão (Função)</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-sm)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="employee">Funcionário / Caixa Comercial (Acesso Limitado)</option>
                  <option value="admin">Administrador Geral (Acesso Completo)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={closeModals} className="btn btn-ghost" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Salvar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR DADOS DO OPERADOR */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="premium-card modal-container" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={20} style={{ color: 'var(--primary)' }} />
                Editar Operador
              </h3>
              <button onClick={closeModals} className="btn-close"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleEditUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Nome Completo do Funcionário</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Julio César de Souza"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                  <User size={16} className="input-icon-left" />
                </div>
              </div>

              <div className="form-group">
                <label>Login de Usuário (Username)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="Ex: juliocesar"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  />
                  <UserCog size={16} className="input-icon-left" />
                </div>
                <span className="input-tip">Nome único para acesso.</span>
              </div>

              <div className="form-group">
                <label>Senha de Acesso</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="Senha do operador"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                  <Lock size={16} className="input-icon-left" />
                </div>
              </div>

              <div className="form-group">
                <label>Nível de Permissão (Função)</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  disabled={editingUser.id === currentUser.id} // Evita tirar a própria permissão admin acidentalmente
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-sm)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    cursor: editingUser.id === currentUser.id ? 'not-allowed' : 'pointer',
                    opacity: editingUser.id === currentUser.id ? 0.7 : 1
                  }}
                >
                  <option value="employee">Funcionário / Caixa Comercial (Acesso Limitado)</option>
                  <option value="admin">Administrador Geral (Acesso Completo)</option>
                </select>
                {editingUser.id === currentUser.id && (
                  <span className="input-tip" style={{ color: 'var(--warning)' }}>Você não pode alterar seu próprio nível de permissão.</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={closeModals} className="btn btn-ghost" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EXCLUIR OPERADOR - CUSTOM CONFIRMATION OVERLAY */}
      {deletingUser && (
        <div className="modal-overlay">
          <div className="premium-card modal-container" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
            <div 
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}
            >
              <AlertTriangle size={28} />
            </div>
            
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>Excluir Operador?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', lineHeight: '1.4' }}>
              Tem certeza que deseja remover a conta do funcionário <strong style={{ color: 'var(--text-primary)' }}>{deletingUser.name}</strong> ({deletingUser.username})? Esta ação não pode ser desfeita.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
              <button onClick={closeModals} className="btn btn-ghost" style={{ flex: 1 }}>
                Cancelar
              </button>
              <button onClick={handleDeleteUser} className="btn btn-danger" style={{ flex: 1, backgroundColor: 'var(--danger)', color: 'var(--text-white)' }}>
                Excluir Operador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPACT CLASSES UTILIZADAS PELA INTERFACE */}
      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          alignItems: center;
          justify-content: center;
          zIndex: 1000;
          animation: fadeIn 0.2s ease;
        }
        .modal-container {
          width: 100%;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-close {
          cursor: pointer;
          color: var(--text-muted);
          transition: color var(--transition-fast);
        }
        .btn-close:hover {
          color: var(--text-primary);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.25rem;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          backgroundColor: 'var(--bg-input)';
          transition: border-color var(--transition-fast);
        }
        .form-group input:focus {
          border-color: var(--border-color-focus);
        }
        .input-icon-left {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .input-tip {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

    </div>
  );
};
