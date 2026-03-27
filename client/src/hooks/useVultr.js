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

  const [apkInfo, setApkInfo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/agency/stats`, getHeaders());
      setStats(data);
    } catch (err) {
      console.warn("Failed to fetch global stats:", err);
    }
  }, [getHeaders]);

  const fetchApkInfo = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/vultr/apk-info`, getHeaders());
      setApkInfo(data);
    } catch (err) {
      console.warn("Failed to fetch APK info:", err);
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

  const clearCmdOutput = () => setCmdOutput("");

  const uploadApk = async (file, version = "1.0") => {
    const formData = new FormData();
    formData.append("apk", file);
    formData.append("version", version);
    setUploadProgress(0);
    try {
      const token = localStorage.getItem("nexus_token");
      const { data } = await axios.post(`${API_BASE}/vultr/upload-apk`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100))
      });
      setApkInfo({ available: true, ...data });
      setUploadProgress(null);
      return data;
    } catch (err) {
      setUploadProgress(null);
      throw err;
    }
  };

  return { status, bandwidth, stats, loading, cmdOutput, clearCmdOutput, error, serverAction, runCommand, gitPull, fetchStatus, apkInfo, uploadApk, uploadProgress };
}
