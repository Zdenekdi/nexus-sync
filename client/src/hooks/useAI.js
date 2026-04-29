import { useState } from 'react';
import axios from 'axios';
import { useNexus } from '../context/ContextHook';

/**
 * Hook for interacting with Nexus AI (Llama 3.1 on Hetzner)
 */
export const useAI = () => {
  const { API_BASE, token, lang } = useNexus();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const askAi = async (prompt, system) => {
    try {
      setIsAiLoading(true);
      setAiError(null);
      
      const response = await axios.post(`${API_BASE}/ai/test`, {
        prompt,
        system
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.data.response;
    } catch (err) {
      console.error('AI Hook Error:', err);
      const msg = lang === 'cz' 
        ? 'AI asistent je momentálně zaneprázdněn nebo nedostupný.' 
        : 'AI assistant is currently busy or unavailable.';
      setAiError(msg);
      return null;
    } finally {
      setIsAiLoading(false);
    }
  };

  const getSuggestion = async (messages, profileId) => {
    try {
      setIsAiLoading(true);
      setAiError(null);
      
      const response = await axios.post(`${API_BASE}/ai/suggest`, {
        messages,
        profileId: profileId === 'all' ? null : profileId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.data.response;
    } catch (err) {
      console.error('AI Suggestion Error:', err);
      const msg = lang === 'cz' 
        ? 'Nepodařilo se načíst AI návrhy.' 
        : 'Failed to load AI suggestions.';
      setAiError(msg);
      return null;
    } finally {
      setIsAiLoading(false);
    }
  };

  return { askAi, getSuggestion, isAiLoading, aiError };
};

export default useAI;
