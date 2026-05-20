import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout = ({ children, currentPage, setCurrentPage }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Menu Lateral */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Área de Conteúdo Principal */}
      <div 
        className="main-content"
        style={{
          paddingLeft: collapsed ? '80px' : '280px',
          transition: 'padding-left var(--transition-normal)'
        }}
        id="app-main-content-element"
      >
        <Header 
          currentPage={currentPage} 
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen} 
        />
        
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #app-main-content-element {
            padding-left: 0px !important;
            padding-top: 0px !important;
          }
        }
      `}</style>
    </div>
  );
};
