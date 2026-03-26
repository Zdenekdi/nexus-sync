import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';

export function useVultr() {
  const [status, setStatus] = useState(null);
  const [bandwidth, setBandwidth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cmdOutput, setCmdOutput] = useState("");
  const [error, setError] = useState(null);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('nexus_token');
    return {
      headers: { Authorization: `Bearer ${token}` }
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/vultr/status`, getHeaders());
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch Vultr status:", err);
      setError(err.response?.data?.error || err.message);
    }
  }, [getHeaders]);

  const fetchBandwidth = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/vultr/bandwidth`, getHeaders());
      setBandwidth(data);
    } catch (err) {
      console.warn("Failed to fetch Vultr bandwidth:", err);
    }
  }, [getHeaders]);

  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/agency/stats`, getHeaders());
      setStats(data);
    } catch (err) {
      console.warn("Failed to fetch global stats:", err);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchStatus();
    fetchBandwidth();
    fetchStats();
    const interval = setInterval(() => {
      fetchStatus();
      fetchStats();
    }, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchStatus, fetchBandwidth, fetchStats]);

  const serverAction = async (action) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/vultr/${action}`, {}, getHeaders());
      setTimeout(fetchStatus, 3500); // wait a bit for status to update
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const runCommand = async (command) => {
    if (!command) return;
    setCmdOutput("Spouštím...");
    try {
      const { data } = await axios.post(`${API_BASE}/vultr/command`, { command }, getHeaders());
      setCmdOutput(data.stdout || data.stderr || "Žádný výstup");
    } catch (err) {
      setCmdOutput("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const gitPull = async (path) => {
    setCmdOutput("Stahuji změny...");
    try {
      const { data } = await axios.post(`${API_BASE}/vultr/git-pull`, { path }, getHeaders());
      setCmdOutput(data.stdout || data.stderr || "Git pull dokončen");
    } catch (err) {
      setCmdOutput("Error: " + (err.response?.data?.error || err.message));
    }
  };

  return { status, bandwidth, stats, loading, cmdOutput, error, serverAction, runCommand, gitPull, fetchStatus };
}
