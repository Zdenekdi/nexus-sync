import React, { createContext, useContext, useState, useCallback } from 'react';

const NexusContext = createContext();

export const NexusProvider = ({ children, initialValues }) => {
  // Navigation State
  const [activeTab, setActiveTab ] = useState(initialValues.activeTab || 'dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);
  
  // UI State
  const [lang, setLang] = useState(initialValues.lang || 'cz');
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  
  // Handlers (These can be expanded as we move them from App.jsx)
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const value = {
    activeTab, setActiveTab,
    isSidebarCollapsed, setIsSidebarCollapsed,
    isMobileMenuOpen, setIsMobileMenuOpen,
    isToolsExpanded, setIsToolsExpanded,
    lang, setLang,
    showOnlyOnline, setShowOnlyOnline,
    toggleSidebar,
    toggleMobileMenu,
    ...initialValues // Pass through external values like activeOperator, t, etc.
  };

  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>;
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) throw new Error('useNexus must be used within a NexusProvider');
  return context;
};
