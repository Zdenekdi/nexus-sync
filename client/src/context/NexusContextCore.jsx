import { createContext, useContext } from 'react';

export const NexusContext = createContext(null);

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error('useNexus must be used within a NexusProvider');
  }
  return context;
};
