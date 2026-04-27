import React, { useState, useCallback, useEffect, useRef } from 'react';
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
export function useAuth({ API_BASE, _t, setIsRelayMode, setSelectedChatId, setActiveProfileId, setShowLanding }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('nexus_isLoggedIn') === 'true';
  });
  const [token, setToken] = useState(() => localStorage.getItem('nexus_token'));
  const [activeOperator, setActiveOperator] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_activeOperator');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        let parsed = null;
        try {
          parsed = JSON.parse(saved);
        } catch (_err) {
          console.error('[Auth] Failed to parse saved operator', _err);
          return null;
        }

        if (parsed && (parsed.role === 'App Owner' || parsed.role === 'App Owner')) {
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
        let parsed = null;
        try {
          parsed = JSON.parse(saved);
        } catch (_err) {
          console.error('[Auth] Failed to parse saved client', _err);
          return null;
        }
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
  const refreshTimerRef = useRef(null);

  const isNativeApp = Capacitor.isNativePlatform();

  const scheduleTokenRefresh = useCallback((expiresInSec) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Refresh 5 minutes before expiry
    const refreshMs = Math.max((expiresInSec - 300) * 1000, 30000);
    refreshTimerRef.current = setTimeout(async () => {
      const storedRefreshToken = localStorage.getItem('nexus_refreshToken');
      if (!storedRefreshToken) return;
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('nexus_token', data.token);
          localStorage.setItem('nexus_refreshToken', data.refreshToken);
          localStorage.setItem('nexus_isLoggedIn', 'true'); // Ensure it's set
          setToken(data.token);
          if (setShowLanding) setShowLanding(false);
          scheduleTokenRefresh(data.expiresIn || 3600);
          console.log('[Auth] Token refreshed');
        } else if (res.status === 401 || res.status === 403 || res.status === 400) {
          console.warn('[Auth] Session expired, logging out');
          handleLogoutInternal();
        } else {
          console.warn(`[Auth] Refresh failed with status ${res.status}, keeping session for retry`);
        }
      } catch (_err) {
        console.error('[Auth] Refresh _err:', _err);
      }
    }, refreshMs);
  }, [API_BASE, handleLogoutInternal, setShowLanding]);

  useEffect(() => {
    if (isLoggedIn && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          scheduleTokenRefresh(expiresIn);
        } else {
          // Token already expired, try refresh
          const storedRefreshToken = localStorage.getItem('nexus_refreshToken');
          if (storedRefreshToken) scheduleTokenRefresh(0);
        }
      } catch (_err) {
        console.warn('[Auth] Token parsing failed', _err);
      }
    }
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, [isLoggedIn, token, scheduleTokenRefresh]);

  // Detect App Variant
  useEffect(() => {
    const detectVariant = async () => {
      if (isNativeApp) {
        try {
          const info = await Device.getInfo();
          if (info.id === 'com.nexushub.relay') {
            setAppVariant('relay');
          }
        } catch (_err) { console.error('Variant detection failed', _err); }
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
    } catch (_err) {
      console.warn('[Native] Device binding failed', _err.message);
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
    } catch (_err) {
      console.warn('[RCS] Initial request failed', _err);
    }
  }, [isNativeApp, shouldAutoRelay]);

  const handleLogin = useCallback(async (email, password) => {
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
        localStorage.setItem('nexus_refreshToken', data.refreshToken);
        localStorage.setItem('nexus_isLoggedIn', 'true');
        localStorage.setItem('nexus_activeOperator', JSON.stringify(data.user));
        setToken(data.token);
        setActiveOperator(data.user);
        setIsLoggedIn(true);
        
        // Schedule token refresh before expiry
        scheduleTokenRefresh(data.expiresIn || 3600);
        
        void verifyNativeDeviceBinding(data.token, data.user);
        void maybePromptRcsAccessOnFirstLogin(data.user);
        
        if (window.Notification && window.Notification.permission === 'default') {
          window.Notification.requestPermission().catch(() => {});
        }
        
        if (shouldAutoRelay(data.user)) {
          setIsRelayMode(true);
        } else {
          // For Model role on native, auto-start relay background service
          const role = (data.user.role?.name || data.user.role || '').toUpperCase();
          if (isNativeApp && role === 'MODEL') {
            try {
              const plugin = window.Capacitor?.Plugins?.NexusRelay;
              if (plugin?.startBackgroundService) {
                await plugin.startBackgroundService({
                  token: data.token,
                  userId: data.user.id,
                  profileId: data.user.profileId || data.user.activeProfileId
                });
                console.log('[Relay] Background service started for Model');
              }
            } catch (_err) {
              console.warn('[Relay] Background service start failed:', _err.message);
            }
          }
          window.history.replaceState(null, '', '/dashboard');
        }
        return { success: true };
      } else {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, _err: errorData.message || 'loginError' };
      }
    } catch (_err) {
      console.error('[Auth] Login failed:', _err);
      return { success: false, _err: 'connectionError', detail: _err.message || String(_err) };
    } finally {
      setIsLoginLoading(false);
    }
  }, [API_BASE, isNativeApp, maybePromptRcsAccessOnFirstLogin, scheduleTokenRefresh, setIsRelayMode, shouldAutoRelay, verifyNativeDeviceBinding]);

  const handleLogoutInternal = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setIsLoggedIn(false);
    setShowLanding(true);
    setActiveProfileId(null);
    setSelectedChatId(null);
    setIsRelayMode(false);
    localStorage.removeItem('nexus_isLoggedIn');
    localStorage.removeItem('nexus_activeOperator');
    localStorage.removeItem('nexus_activeClient');
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_refreshToken');
    localStorage.removeItem('nexus_lastSelectedChatId');
    localStorage.removeItem('nexus_relay_mode');
    localStorage.removeItem('nexus_hydrated');
    setToken(null);
    setActiveOperator(null);
    setActiveClient(null);
  }, [setIsRelayMode, setSelectedChatId, setActiveProfileId, setShowLanding]);

  const handleLogout = useCallback(() => {
    const storedRefreshToken = localStorage.getItem('nexus_refreshToken');
    if (storedRefreshToken) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      }).catch(() => {});
    }
    handleLogoutInternal();
  }, [API_BASE, handleLogoutInternal]);

  const handleRegisterAgency = useCallback(async (data) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register-agency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) return { success: true, inviteCode: body.inviteCode };
      return { success: false, _err: body.message || 'Registration failed' };
    } catch (_err) {
      console.error('[Auth] Agency registration failed:', _err);
      return { success: false, _err: 'Connection _err' };
    }
  }, [API_BASE]);

  const handleRegisterUser = useCallback(async (data) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) return { success: true };
      return { success: false, _err: body.message || 'Registration failed' };
    } catch (_err) {
      console.error('[Auth] User registration failed:', _err);
      return { success: false, _err: 'Connection _err' };
    }
  }, [API_BASE]);

  const handleResetRequest = useCallback(async (email) => {
    try {
      await fetch(`${API_BASE}/auth/reset-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return true;
    } catch (_err) {
      console.error('[Auth] Reset request failed:', _err);
      return false;
    }
  }, [API_BASE]);

  const handleResetRequired = useCallback((user) => {
    setTempUser(user);
    setShowResetPassword(true);
  }, []);

  const handleResetComplete = useCallback((newPassword, operators = [], setOperators) => {
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
  }, [handleLogin, tempUser]);

  return React.useMemo(() => ({
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
  }), [
    isLoggedIn, token, activeOperator, activeClient, appVariant, 
    showResetPassword, tempUser, originalOperator, isLoginLoading, 
    isNativeApp, handleLogin, handleLogout, handleRegisterAgency, 
    handleRegisterUser, handleResetRequest, handleResetRequired, 
    handleResetComplete, verifyNativeDeviceBinding, 
    maybePromptRcsAccessOnFirstLogin, shouldAutoRelay
  ]);
}
