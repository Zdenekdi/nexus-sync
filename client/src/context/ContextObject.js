import { createContext } from 'react';

// This is the absolute base of the application context.
// It must have ZERO dependencies to prevent initialization errors in production builds.
export const NexusContext = createContext(null);
