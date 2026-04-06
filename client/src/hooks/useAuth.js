import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

function generateSecureInstallationId() {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return `inst_${Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Custom hook to manage authentication state and logic for Nexus Hub.
 */
export function useAuth({ API_BASE, t, setIsRelayMode, setSelectedChatId, setActiveProfileId, setShowLanding }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('nexus_isLoggedIn') === 'true';
  });
  const [token, setToken] = useState(() => localStorage.getItem('nexus_token'));
  const [activeOperator, setActiveOperator] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_activeOperator');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        let parsed = JSON.parse(saved);
        if (parsed.role === 'App Owner' || parsed.role === 'App Owner') {
          parsed.role = 'App Owner';
          parsed.name = 'App Owner';
        }
        return parsed;
      }
      return null;
    } catch { return null; }
  });
  const [activeClient, setActiveClient] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_activeClient');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
      return null;
    } catch { return null; }
  });

  const [appVariant, setAppVariant] = useState('full');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [originalOperator, setOriginalOperator] = useState(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const isNativeApp = Capacitor.isNativePlatform();

  // Detect App Variant
  useEffect(() => {
    const detectVariant = async () => {
      if (isNativeApp) {
        try {
          const info = await Device.getInfo();
          if (info.id === 'com.nexushub.relay') {
            setAppVariant('relay');
          }
        } catch (e) { console.error('Variant detection failed', e); }
      } else {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'relay') {
          setAppVariant('relay');
        }
      }
    };
    detectVariant();
  }, [isNativeApp]);

  const shouldAutoRelay = useCallback((operator) => {
    if (!operator) return false;
    const role = (operator.role?.name || operator.role || '').toUpperCase();
    return role === 'RELAY_NODE' || role === 'RELAY' || operator.isRelayOnly;
  }, []);

  const verifyNativeDeviceBinding = useCallback(async (authToken, operator) => {
    if (!isNativeApp || !authToken || !operator) return;
    try {
      const info = await Device.getInfo();
      const deviceId = (await Device.getId()).identifier;
      let installationId = localStorage.getItem('nexus_installation_id');
      if (!installationId) {
        installationId = generateSecureInstallationId();
        localStorage.setItem('nexus_installation_id', installationId);
      }

      await axios.post(`${API_BASE}/device/bind`, {
        deviceId,
        installationId,
        model: info.model,
        platform: info.platform,
        operatorId: operator.id
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('[Native] Device binding verified');
    } catch (err) {
      console.warn('[Native] Device binding failed', err.message);
    }
  }, [isNativeApp, API_BASE]);

  const maybePromptRcsAccessOnFirstLogin = useCallback(async (operator) => {
    if (!isNativeApp) return;
    const prompted = localStorage.getItem('nexus_relay_rcs_first_login_prompted') === 'true';
    if (prompted) return;
    if (shouldAutoRelay(operator)) return;

    try {
      const plugin = window.Capacitor?.Plugins?.NexusRelay;
      if (plugin?.requestRcsAccess) {
        const res = await plugin.requestRcsAccess();
        if (res.granted) {
          localStorage.setItem('nexus_relay_rcs_first_login_prompted', 'true');
        }
      }
    } catch (err) {
      console.warn('[RCS] Initial request failed', err);
    }
  }, [isNativeApp, shouldAutoRelay]);

  const handleLogin = async (email, password) => {
    setIsLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('nexus_token', data.token);
        localStorage.setItem('nexus_isLoggedIn', 'true');
        localStorage.setItem('nexus_activeOperator', JSON.stringify(data.user));
        setToken(data.token);
        setActiveOperator(data.user);
        setIsLoggedIn(true);
        
        void verifyNativeDeviceBinding(data.token, data.user);
        void maybePromptRcsAccessOnFirstLogin(data.user);
        
        if (window.Notification && window.Notification.permission === 'default') {
          window.Notification.requestPermission().catch(() => {});
        }
        
        if (shouldAutoRelay(data.user)) {
          setIsRelayMode(true);
        } else {
          window.history.replaceState(null, '', '/dashboard');
        }
        return { success: true };
      } else {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, error: errorData.message || 'loginError' };
      }
    } catch (err) {
      console.error('[Auth] Login failed:', err);
      return { success: false, error: 'connectionError' };
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setShowLanding(true);
    setActiveProfileId(null);
    setSelectedChatId(null);
    setIsRelayMode(false);
    localStorage.removeItem('nexus_isLoggedIn');
    localStorage.removeItem('nexus_activeOperator');
    localStorage.removeItem('nexus_activeClient');
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_lastSelectedChatId');
    localStorage.removeItem('nexus_relay_mode');
    setToken(null);
    setActiveOperator(null);
    setActiveClient(null);
  }, [setIsRelayMode, setSelectedChatId, setActiveProfileId, setShowLanding]);

  const handleRegisterAgency = async (data) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register-agency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch (err) {
      console.error('[Auth] Agency registration failed:', err);
      return false;
    }
  };

  const handleRegisterUser = async (data) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch (err) {
      console.error('[Auth] User registration failed:', err);
      return false;
    }
  };

  const handleResetRequest = async (email) => {
    try {
      await fetch(`${API_BASE}/auth/reset-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return true;
    } catch (err) {
      console.error('[Auth] Reset request failed:', err);
      return false;
    }
  };

  const handleResetRequired = (user) => {
    setTempUser(user);
    setShowResetPassword(true);
  };

  const handleResetComplete = (newPassword, operators = [], setOperators) => {
    if (!tempUser) return;
    
    const operatorsList = operators || [];
    const updatedOperators = operatorsList.map(op => 
      op.id === tempUser.id ? { ...op, password: newPassword, mustResetPassword: false } : op
    );
    setOperators(updatedOperators);
    
    const updatedUser = (updatedOperators || []).find(op => op.id === tempUser.id);
    if (updatedUser) {
      handleLogin(updatedUser.email, newPassword);
    }
    
    setShowResetPassword(false);
    setTempUser(null);
  };

  return {
    isLoggedIn, setIsLoggedIn,
    token, setToken,
    activeOperator, setActiveOperator,
    activeClient, setActiveClient,
    appVariant, setAppVariant,
    showResetPassword, setShowResetPassword,
    tempUser, setTempUser,
    originalOperator, setOriginalOperator,
    isLoginLoading,
    isNativeApp,
    handleLogin,
    handleLogout,
    handleRegisterAgency,
    handleRegisterUser,
    handleResetRequest,
    handleResetRequired,
    handleResetComplete,
    verifyNativeDeviceBinding,
    maybePromptRcsAccessOnFirstLogin,
    shouldAutoRelay
  };
}
