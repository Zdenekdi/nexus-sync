import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'https://nexus-api.myvnc.com/api';

export function useVultr() {
  const [status, setStatus] = useState(null);
  const [bandwidth, setBandwidth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cmdOutput, setCmdOutput] = useState("");
  const [_err, setError] = useState(null);

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
    } catch (_err) {
      console.error("Failed to fetch Vultr status:", _err);
      setError(_err.response?.data?.error || _err.message);
    }
  }, [getHeaders]);

  const fetchBandwidth = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/vultr/bandwidth`, getHeaders());
      setBandwidth(data);
    } catch (_err) {
      console.warn("Failed to fetch Vultr bandwidth:", _err);
    }
  }, [getHeaders]);

  const [apkInfo, setApkInfo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/agency/stats`, getHeaders());
      setStats(data);
    } catch (_err) {
      console.warn("Failed to fetch global stats:", _err);
    }
  }, [getHeaders]);

  const fetchApkInfo = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/vultr/apk-info`, getHeaders());
      setApkInfo(data);
    } catch (_err) {
      console.warn("Failed to fetch APK info:", _err);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchStatus();
    fetchBandwidth();
    fetchStats();
    fetchApkInfo();
    const interval = setInterval(() => {
      fetchStatus();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchBandwidth, fetchStats, fetchApkInfo]);

  const serverAction = async (action) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/vultr/${action}`, {}, getHeaders());
      setTimeout(fetchStatus, 3500);
    } catch (_err) {
      setError(_err.response?.data?.error || _err.message);
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
    } catch (_err) {
      setCmdOutput("Error: " + (_err.response?.data?.error || _err.message));
    }
  };

  const gitPull = async (path) => {
    setCmdOutput("Stahuji změny...");
    try {
      const { data } = await axios.post(`${API_BASE}/vultr/git-pull`, { path }, getHeaders());
      setCmdOutput(data.stdout || data.stderr || "Git pull dokončen");
    } catch (_err) {
      setCmdOutput("Error: " + (_err.response?.data?.error || _err.message));
    }
  };

  const clearCmdOutput = () => setCmdOutput("");

  const uploadApk = async (file, apkVersion, type = 'relay') => {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("apk", file);
    setUploadProgress(0);
    try {
      const token = localStorage.getItem("nexus_token");
      const { data } = await axios.post(`${API_BASE}/vultr/upload-apk`, formData, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (_err) => setUploadProgress(Math.round((_err.loaded * 100) / _err.total))
      });
      setApkInfo({ available: true, ...data });
      setUploadProgress(null);
      return data;
    } catch (_err) {
      setUploadProgress(null);
      throw _err;
    }
  };

  return { status, bandwidth, stats, loading, cmdOutput, clearCmdOutput, _err, serverAction, runCommand, gitPull, fetchStatus, apkInfo, uploadApk, uploadProgress };
}
