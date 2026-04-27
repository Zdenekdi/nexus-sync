import { useContext } from 'react';
import { NexusContext } from './ContextObject';

/**
 * Clean hook to access Nexus context.
 * Points to the isolated ContextObject to prevent initialization loops.
 */
export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error('useNexus must be used within a NexusProvider');
  }
  return context;
};
