import { createContext, useContext } from 'react';

/**
 * NexusBaseContext
 * 
 * We separate the Context definition and the basic hook from the Provider
 * to eliminate circular dependencies. Components import this hook,
 * while the Provider in NexusContext.jsx imports the context object.
 */

export const NexusContext = createContext(null);

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error('useNexus must be used within a NexusProvider');
  }
  return context;
};
