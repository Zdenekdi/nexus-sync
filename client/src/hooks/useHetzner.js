import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';

export function useHetzner() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [_err, setError] = useState(null);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('nexus_token');
    return {
      headers: { Authorization: `Bearer ${token}` }
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/hetzner/status`, getHeaders());
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch Hetzner status:", err);
      setError(err.response?.data?.error || err.message);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const serverAction = async (action) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/hetzner/${action}`, {}, getHeaders());
      setTimeout(fetchStatus, 3500);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return { status, loading, _err, serverAction, fetchStatus };
}
