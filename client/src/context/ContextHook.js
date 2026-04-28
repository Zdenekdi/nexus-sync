import { useContext } from 'react';
import { NexusContext } from './ContextObject';

/**
 * Clean hook to access Nexus context.
 * Points to the isolated ContextObject to prevent initialization loops.
 */
export const useNexus = () => {
  const context = useContext(NexusContext);
  // Return a safe empty object if context is missing during boot/transitions
  return context || {};
};
