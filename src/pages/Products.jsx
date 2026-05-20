import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Sparkles,
  Upload,
  Link,
  Package,
  AlertTriangle,
  X,
  RefreshCw
} from 'lucide-react';

const CATEGORIES = [
  'Bebidas',
  'Mercearia',
  'Limpeza',
  'Biscoitos & Doces',
  'Higiene Pessoal',
  'Laticínios',
  'Outros'
];

export const Products = () => {
  const { addToast } = useAuth();
  const [products, setProducts] = useState([]);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, empty

  // Controle de Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Controle de Modal de Confirmação de Exclusão (Substitutos de confirm() nativo)
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Controle de Modal de Confirmação de Limpar Tudo
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Estados do Formulário
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'Mercearia',
    purchasePrice: '',
    sellingPrice: '',
    stock: '',
    minStock: '',
    imageType: 'url', // 'url' ou 'file'
    imageUrl: '',
    imageFileBase64: ''
  });

  const loadProducts = () => {
    const list = dbService.getProducts();
    setProducts(list);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Handler para busca e filtros combinados
  const filteredProducts = products.filter(p => {
    const matchText = p.name.toLowerCase().includes(search.toLowerCase()) || 
                      p.sku.includes(search) || 
                      p.category.toLowerCase().includes(search.toLowerCase());
    
    const matchCategory = selectedCategory === '' || p.category === selectedCategory;
    
    let matchStock = true;
    if (stockFilter === 'low') {
      matchStock = p.stock <= p.minStock;
    } else if (stockFilter === 'empty') {
      matchStock = p.stock === 0;
    }

    return matchText && matchCategory && matchStock;
  });

  // Abre formulário para criação
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      sku: '',
      category: 'Mercearia',
      purchasePrice: '',
      sellingPrice: '',
      stock: '0',
      minStock: '5',
      imageType: 'url',
      imageUrl: '',
      imageFileBase64: ''
    });
    setIsModalOpen(true);
  };

  // Abre formulário para edição
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category || 'Mercearia',
      purchasePrice: product.purchasePrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      imageType: product.image?.startsWith('data:image') ? 'file' : 'url',
      imageUrl: product.image?.startsWith('data:image') ? '' : (product.image || ''),
      imageFileBase64: product.image?.startsWith('data:image') ? product.image : ''
    });
    setIsModalOpen(true);
  };

  // Gerador de SKU fictício (EAN-13)
  const handleGenerateSKU = () => {
    let sku = '789'; // Código de barras do Brasil
    for (let i = 0; i < 10; i++) {
      sku += Math.floor(Math.random() * 10).toString();
    }
    setForm(prev => ({ ...prev, sku }));
    addToast('Código SKU gerado com sucesso!', 'info');
  };

  // Processa upload e converte para Base64 compactado
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      addToast('A imagem deve ter no máximo 200KB para evitar sobrecarregar o banco de dados local.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({
        ...prev,
        imageFileBase64: reader.result
      }));
      addToast('Imagem carregada com sucesso!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Envio do formulário
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validações básicas de negócio
    const purchase = parseFloat(form.purchasePrice);
    const selling = parseFloat(form.sellingPrice);

    if (isNaN(purchase) || purchase < 0 || isNaN(selling) || selling < 0) {
      addToast('Os preços devem ser valores numéricos positivos.', 'error');
      return;
    }

    if (selling < purchase) {
      if (!window.confirm('O preço de venda é menor que o preço de compra. Deseja continuar mesmo assim?')) {
        return; // Alerta amigável
      }
    }

    const productPayload = {
      name: form.name.trim(),
      sku: form.sku.trim() || 'S/N',
      category: form.category,
      purchasePrice: purchase,
      sellingPrice: selling,
      stock: parseInt(form.stock) || 0,
      minStock: parseInt(form.minStock) || 0,
      image: form.imageType === 'file' ? form.imageFileBase64 : form.imageUrl
    };

    try {
      if (editingProduct) {
        dbService.updateProduct(editingProduct.id, productPayload);
        addToast(`Produto "${productPayload.name}" editado com sucesso!`, 'success');
      } else {
        dbService.addProduct(productPayload);
        addToast(`Produto "${productPayload.name}" cadastrado com sucesso!`, 'success');
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      addToast(err.message || 'Erro ao salvar produto.', 'error');
    }
  };

  // Solicita exclusão (abre modal de confirmação)
  const handleDeleteRequest = (product) => {
    setDeleteTarget(product);
  };

  // Confirma exclusão
  const handleConfirmDelete = () => {
    if (deleteTarget) {
      dbService.deleteProduct(deleteTarget.id);
      addToast(`Produto "${deleteTarget.name}" removido com sucesso.`, 'info');
      setDeleteTarget(null);
      loadProducts();
    }
  };

  // Limpar todos os produtos
  const handleClearAll = () => {
    dbService.clearAllProducts();
    addToast('Todos os produtos foram removidos.', 'info');
    setShowClearAllConfirm(false);
    loadProducts();
  };

  return (
    <div className="page-container animate-fade">
      
      {/* 1. BARRA DE TÍTULO E AÇÃO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>Gerenciamento do Catálogo</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cadastre novos produtos, gerencie preços e consulte estoque</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowClearAllConfirm(true)} className="btn btn-danger" style={{ gap: '0.5rem', fontSize: '0.85rem' }}>
            <Trash2 size={16} />
            Limpar Tudo
          </button>
          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.5rem' }}>
            <Plus size={18} />
            Adicionar Produto
          </button>
        </div>
      </div>

      {/* 2. BARRA DE BUSCA E FILTROS */}
      <div 
        className="premium-card" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr auto auto auto', 
          gap: '1rem',
          alignItems: 'center'
        }}
        id="products-filter-bar"
      >
        {/* Busca Textual */}
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nome, SKU ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Filtro de Categoria */}
        <select 
          className="form-control" 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ width: '180px', cursor: 'pointer' }}
        >
          <option value="">Todas Categorias</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Filtro de Estoque */}
        <select 
          className="form-control" 
          value={stockFilter} 
          onChange={(e) => setStockFilter(e.target.value)}
          style={{ width: '180px', cursor: 'pointer' }}
        >
          <option value="all">Todo Estoque</option>
          <option value="low">Estoque Baixo</option>
          <option value="empty">Esgotado</option>
        </select>

        {/* Limpar Filtros */}
        {(search || selectedCategory || stockFilter !== 'all') && (
          <button 
            onClick={() => { setSearch(''); setSelectedCategory(''); setStockFilter('all'); }} 
            className="btn btn-ghost"
            style={{ fontSize: '0.85rem' }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* 3. LISTAGEM DE PRODUTOS */}
      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Foto / Nome</th>
              <th>SKU</th>
              <th>Categoria</th>
              <th style={{ textAlign: 'right' }}>Preço Custo</th>
              <th style={{ textAlign: 'right' }}>Preço Venda</th>
              <th style={{ textAlign: 'center' }}>Estoque Atual</th>
              <th style={{ textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                  Nenhum produto correspondente encontrado no catálogo.
                </td>
              </tr>
            ) : (
              filteredProducts.map(product => {
                const isLow = product.stock <= product.minStock;
                const isOutOfStock = product.stock === 0;

                return (
                  <tr key={product.id}>
                    {/* Imagem + Nome */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            style={{ 
                              width: '45px', 
                              height: '45px', 
                              borderRadius: 'var(--border-radius-sm)', 
                              objectFit: 'cover',
                              border: '1px solid var(--border-color)' 
                            }} 
                            onError={(e) => {
                              // Se der erro de link, substitui pelo ícone fallback
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        
                        {/* Fallback de Ícone se não houver foto */}
                        <div
                          style={{
                            width: '45px',
                            height: '45px',
                            borderRadius: 'var(--border-radius-sm)',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-muted)',
                            display: product.image ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Package size={20} />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600' }}>{product.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mínimo sugerido: {product.minStock} un</span>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td>
                      <code style={{ fontSize: '0.8rem', letterSpacing: '0.02em', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>
                        {product.sku}
                      </code>
                    </td>

                    {/* Categoria */}
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{product.category}</span>
                    </td>

                    {/* Preço Compra */}
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>
                      R$ {product.purchasePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Preço Venda */}
                    <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--primary)' }}>
                      R$ {product.sellingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Estoque Status */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <span 
                          style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: 'bold',
                            color: isOutOfStock ? 'var(--danger)' : isLow ? 'var(--warning)' : 'inherit'
                          }}
                        >
                          {product.stock} un
                        </span>
                        {isOutOfStock ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>Esgotado</span>
                        ) : isLow ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.6rem', gap: '2px' }}>
                            <AlertTriangle size={10} /> Estoque Baixo
                          </span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Ok</span>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleOpenEdit(product)}
                          className="btn btn-ghost btn-icon-only" 
                          style={{ width: '32px', height: '32px' }}
                          title="Editar Produto"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRequest(product)}
                          className="btn btn-ghost btn-icon-only" 
                          style={{ width: '32px', height: '32px', color: 'var(--danger)' }}
                          title="Remover Produto"
                        >
                          <Trash2 size={15} />
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

      {/* --- 4. MODAL DE CADASTRO/EDIÇÃO (GLASSMORPHIC OVERLAY) --- */}
      {isModalOpen && (
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
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2.5rem',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
                {editingProduct ? `Editar: ${editingProduct.name}` : 'Cadastrar Novo Produto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-icon-only" style={{ width: '32px', height: '32px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Nome */}
              <div className="form-group">
                <label className="form-label">Nome do Produto</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Coca-cola Lata 350ml"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* SKU & Categoria */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Código de Barras / SKU
                    <button 
                      type="button" 
                      onClick={handleGenerateSKU} 
                      className="btn btn-ghost" 
                      style={{ padding: 0, height: 'auto', fontSize: '0.75rem', gap: '2px', color: 'var(--primary)' }}
                    >
                      <Sparkles size={12} /> Auto-gerar
                    </button>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: 7891000..."
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select
                    className="form-control"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Preço Custo & Venda */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Preço de Compra (Custo R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Estoque Inicial & Mínimo */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantidade em Estoque</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="5"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Controle de Imagem Híbrido */}
              <div className="form-group" style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--bg-input)' }}>
                <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Imagem do Produto</label>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="imageType" 
                      checked={form.imageType === 'url'} 
                      onChange={() => setForm({ ...form, imageType: 'url' })} 
                    />
                    Link de Internet (URL)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="imageType" 
                      checked={form.imageType === 'file'} 
                      onChange={() => setForm({ ...form, imageType: 'file' })} 
                    />
                    Enviar Foto Local
                  </label>
                </div>

                {form.imageType === 'url' ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Link size={16} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      style={{ backgroundColor: 'var(--bg-card)' }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div 
                      style={{ 
                        border: '1.5px dashed var(--border-color)', 
                        borderRadius: 'var(--border-radius-sm)', 
                        padding: '1rem', 
                        textAlign: 'center',
                        backgroundColor: 'var(--bg-card)',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                      />
                      <Upload size={22} style={{ color: 'var(--text-muted)', marginBottom: '5px' }} />
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Clique aqui para carregar a foto (Max: 200KB)
                      </p>
                    </div>
                    {form.imageFileBase64 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', textAlign: 'center', fontWeight: '500' }}>
                        ✓ Foto local carregada no formulário
                      </span>
                    )}
                  </div>
                )}
                
                {/* Preview da Imagem */}
                {(form.imageType === 'url' ? form.imageUrl : form.imageFileBase64) && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                    <img 
                      src={form.imageType === 'url' ? form.imageUrl : form.imageFileBase64} 
                      alt="Preview" 
                      style={{ maxHeight: '80px', borderRadius: 'var(--border-radius-sm)', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                  Salvar Produto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- 5. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (REACT EMBEDDED) --- */}
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
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)' }}>Excluir Produto?</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                Tem certeza que deseja remover o produto <strong>{deleteTarget.name}</strong>? Esta ação é definitiva e removerá o produto do catálogo.
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
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 6. MODAL DE CONFIRMAÇÃO LIMPAR TUDO --- */}
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
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-heading)', color: 'var(--danger)' }}>Limpar Todos os Produtos?</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                Esta ação irá <strong>remover permanentemente</strong> todos os {products.length} produtos do catálogo. Esta ação não pode ser desfeita.
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
                onClick={handleClearAll} 
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          #products-filter-bar {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
};
