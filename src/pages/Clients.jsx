import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  User, 
  Phone, 
  MapPin, 
  DollarSign, 
  History, 
  X, 
  Eye,
  Check
} from 'lucide-react';

export const Clients = () => {
  const { user, addToast } = useAuth();
  
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');

  // Modais de Controle
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  // Painel de Detalhes
  const [viewingClient, setViewingClient] = useState(null);
  
  // Modal de Amortização de Dívida
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Modal de Exclusão
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Estado do Formulário
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const loadData = () => {
    setClients(dbService.getClients());
    setSales(dbService.getSales());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredClients = clients.filter(c => {
    return c.name.toLowerCase().includes(search.toLowerCase()) || 
           c.phone.includes(search) || 
           (c.address && c.address.toLowerCase().includes(search.toLowerCase()));
  });

  // Formulário - Novo Cliente
  const handleOpenCreate = () => {
    setEditingClient(null);
    setForm({ name: '', phone: '', address: '' });
    setIsFormModalOpen(true);
  };

  // Formulário - Editar Cliente
  const handleOpenEdit = (e, client) => {
    e.stopPropagation(); // Evita abrir os detalhes ao clicar no botão
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phone,
      address: client.address || ''
    });
    setIsFormModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim()
    };

    try {
      if (editingClient) {
        dbService.updateClient(editingClient.id, payload);
        addToast(`Cliente "${payload.name}" atualizado com sucesso!`, 'success');
      } else {
        dbService.addClient(payload);
        addToast(`Cliente "${payload.name}" cadastrado com sucesso!`, 'success');
      }
      setIsFormModalOpen(false);
      loadData();
      
      // Se estiver visualizando detalhes do mesmo cliente, atualiza seu estado
      if (viewingClient && viewingClient.id === editingClient?.id) {
        setViewingClient(prev => ({ ...prev, ...payload }));
      }
    } catch (err) {
      addToast('Erro ao salvar cliente.', 'error');
    }
  };

  // Exclusão
  const handleDeleteRequest = (e, client) => {
    e.stopPropagation();
    setDeleteTarget(client);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      dbService.deleteClient(deleteTarget.id);
      addToast(`Cliente "${deleteTarget.name}" removido com sucesso.`, 'info');
      setDeleteTarget(null);
      
      if (viewingClient?.id === deleteTarget.id) {
        setViewingClient(null);
      }
      loadData();
    }
  };

  // --- CONTROLE DE AMORTIZAÇÃO DE FIADO ---
  const handleOpenPayment = () => {
    setPaymentAmount(viewingClient.debt.toString());
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      addToast('Informe um valor de pagamento válido maior que zero.', 'error');
      return;
    }

    if (amount > viewingClient.debt) {
      addToast('O valor do pagamento não pode ser maior que o saldo devedor atual.', 'warning');
      return;
    }

    try {
      const updatedClient = dbService.payClientDebt(viewingClient.id, amount, user.name);
      addToast(`Recebido R$ ${amount.toFixed(2)} de ${viewingClient.name}. Saldo devedor atualizado!`, 'success');
      
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      
      // Atualiza painéis
      setViewingClient(updatedClient);
      loadData();
    } catch (err) {
      addToast('Erro ao processar pagamento.', 'error');
    }
  };

  // Extrato de Compras Particular do Cliente Visualizado
  const clientPurchases = sales.filter(s => s.clientId === viewingClient?.id);

  return (
    <div className="page-container animate-fade">
      
      {/* 1. BARRA DE TÍTULO E AÇÃO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>Base de Clientes</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cadastre novos clientes, acompanhe históricos de vendas e audite contas fiadas</span>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          Cadastrar Cliente
        </button>
      </div>

      {/* 2. BUSCA */}
      <div className="premium-card">
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nome, telefone ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      {/* 3. TELA DIVIDIDA SE ESTIVER VISUALIZANDO DETALHES DE UM CLIENTE */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: viewingClient ? '1.1fr 0.9fr' : '1fr', 
          gap: '1.5rem',
          transition: 'all 0.3s ease'
        }}
        id="clients-split-container"
      >
        
        {/* TABELA DE LISTAGEM */}
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th>Telefone</th>
                <th>Endereço</th>
                <th style={{ textAlign: 'center' }}>Total Compras</th>
                <th style={{ textAlign: 'right' }}>Total Gasto</th>
                <th style={{ textAlign: 'right' }}>Saldo Devedor (Fiado)</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                    Nenhum cliente correspondente encontrado.
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => {
                  const hasDebt = client.debt > 0;
                  const isSelected = viewingClient?.id === client.id;

                  return (
                    <tr 
                      key={client.id}
                      onClick={() => setViewingClient(client)}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                        borderColor: isSelected ? 'var(--primary)' : 'inherit'
                      }}
                    >
                      {/* Nome */}
                      <td style={{ fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={16} style={{ color: 'var(--text-muted)' }} />
                          {client.name}
                        </div>
                      </td>

                      {/* Telefone */}
                      <td style={{ fontSize: '0.85rem' }}>{client.phone}</td>

                      {/* Endereço */}
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {client.address || 'Não informado'}
                      </td>

                      {/* Compras count */}
                      <td style={{ textAlign: 'center' }}>{client.purchaseCount}</td>

                      {/* Total gasto */}
                      <td style={{ textAlign: 'right', fontWeight: '500' }}>
                        R$ {client.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Fiado */}
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        <span 
                          className={`badge ${hasDebt ? 'badge-danger' : 'badge-neutral'}`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          R$ {client.debt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Ações */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button 
                            onClick={() => setViewingClient(client)}
                            className="btn btn-ghost btn-icon-only" 
                            style={{ width: '28px', height: '28px' }}
                            title="Ver Detalhes"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={(e) => handleOpenEdit(e, client)}
                            className="btn btn-ghost btn-icon-only" 
                            style={{ width: '28px', height: '28px' }}
                            title="Editar Cliente"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteRequest(e, client)}
                            className="btn btn-ghost btn-icon-only" 
                            style={{ width: '28px', height: '28px', color: 'var(--danger)' }}
                            title="Excluir Cliente"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ================= PAINEL DE DETALHES (COLUNA DA DIREITA) ================= */}
        {viewingClient && (
          <div 
            className="premium-card animate-fade" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.25rem',
              border: '1.5px solid var(--primary)',
              height: 'fit-content'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <strong style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User size={18} style={{ color: 'var(--primary)' }} />
                Ficha do Cliente
              </strong>
              <button onClick={() => setViewingClient(null)} className="btn btn-ghost btn-icon-only" style={{ width: '28px', height: '28px' }}>
                <X size={16} />
              </button>
            </div>

            {/* Informações Básicas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <strong style={{ minWidth: '70px', color: 'var(--text-secondary)' }}>Nome:</strong>
                <span>{viewingClient.name}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                <strong style={{ minWidth: '70px', color: 'var(--text-secondary)' }}>Telefone:</strong>
                <span>{viewingClient.phone}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <MapPin size={14} style={{ color: 'var(--text-muted)', marginTop: '3px' }} />
                <strong style={{ minWidth: '70px', color: 'var(--text-secondary)' }}>Endereço:</strong>
                <span style={{ lineHeight: '1.3' }}>{viewingClient.address || 'Não cadastrado'}</span>
              </div>
            </div>

            {/* Card de Fiado de Destaque */}
            <div 
              style={{
                backgroundColor: viewingClient.debt > 0 ? 'var(--danger-light)' : 'var(--success-light)',
                border: '1px solid ' + (viewingClient.debt > 0 ? 'var(--danger)' : 'var(--success)'),
                borderRadius: 'var(--border-radius-sm)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: viewingClient.debt > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  Saldo devedor (Fiado)
                </span>
                <strong style={{ fontSize: '1.5rem', color: viewingClient.debt > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  R$ {viewingClient.debt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>

              {viewingClient.debt > 0 && (
                <button 
                  onClick={handleOpenPayment} 
                  className="btn btn-danger"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem', gap: '4px' }}
                >
                  <DollarSign size={14} /> Quitar Débito
                </button>
              )}
            </div>

            {/* Histórico de Compras */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <History size={14} /> Extrato de Compras Recentes
              </span>

              <div 
                className="table-container" 
                style={{ 
                  maxHeight: '220px', 
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)' 
                }}
              >
                <table className="premium-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Meio Pago</th>
                      <th style={{ textAlign: 'right' }}>Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientPurchases.length === 0 ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                          Nenhuma compra registrada para este cliente.
                        </td>
                      </tr>
                    ) : (
                      clientPurchases.map(sale => (
                        <tr key={sale.id}>
                          <td>{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                          <td>
                            <span 
                              className="badge"
                              style={{ 
                                fontSize: '0.6rem',
                                backgroundColor: sale.paymentMethod === 'fiado' ? 'var(--danger-light)' : 'var(--bg-input)',
                                color: sale.paymentMethod === 'fiado' ? 'var(--danger)' : 'var(--text-secondary)'
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

          </div>
        )}

      </div>

      {/* --- 4. MODAL: CADASTRO/EDIÇÃO DE CLIENTE --- */}
      {isFormModalOpen && (
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
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
                {editingClient ? `Editar Cliente: ${editingClient.name}` : 'Cadastrar Novo Cliente'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="btn btn-ghost btn-icon-only" style={{ width: '32px', height: '32px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Nome */}
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Carlos Augusto Silva"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* Telefone */}
              <div className="form-group">
                <label className="form-label">Telefone de Contato</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: (11) 98765-4321"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>

              {/* Endereço */}
              <div className="form-group">
                <label className="form-label">Endereço Completo (Opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Rua das Palmeiras, 15 - Bloco B"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsFormModalOpen(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                  Salvar Cliente
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- 5. MODAL: REGISTRAR PAGAMENTO DE FIADO (AMORTIZAÇÃO) --- */}
      {isPaymentModalOpen && viewingClient && (
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
              maxWidth: '450px',
              padding: '2.5rem',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>Dar Baixa em Fiado</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="btn btn-ghost btn-icon-only" style={{ width: '32px', height: '32px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--bg-input)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cliente:</span>
                <h4 style={{ margin: '5px 0' }}>{viewingClient.name}</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Total Pendente: <strong style={{ color: 'var(--danger)' }}>R$ {viewingClient.debt.toFixed(2)}</strong>
                </span>
              </div>

              {/* Valor Pago */}
              <div className="form-group">
                <label className="form-label">Valor Recebido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  max={viewingClient.debt}
                  min="0.01"
                />
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1, gap: '5px' }}>
                  <Check size={16} /> Confirmar Recebimento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- 6. MODAL: DELETAR CLIENTE --- */}
      {deleteTarget && (
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
              <Trash2 size={26} />
            </div>
            
            <div>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)' }}>Remover Cadastro de Cliente?</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                Deseja mesmo excluir o cliente <strong>{deleteTarget.name}</strong>? Se ele possuir um saldo devedor de fiado pendente, esta dívida será perdida.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => setDeleteTarget(null)} 
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleConfirmDelete} 
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Excluir Cadastro
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 992px) {
          #clients-split-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
};
