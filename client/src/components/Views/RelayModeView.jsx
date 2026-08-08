import React, { lazy, Suspense, useCallback } from 'react';
import { useNexus } from '../../context/ContextHook';

const RelayMode = lazy(() => import('../RelayMode'));

/**
 * Wrapper that embeds RelayMode inside the dashboard layout for Model role.
 * Provides all required props from NexusContext.
 */
const RelayModeView = () => {
  const { activeOperator, token, t, setActiveTab, isNativeApp, loading } = useNexus();



  const operator = activeOperator ? {
    ...activeOperator,
    token,
    profileId: activeOperator.profileId || activeOperator.activeProfileId,
    installationId: activeOperator.installationId || localStorage.getItem('nexus_installation_id')
  } : null;

  // Relay permissions request (Capacitor native only)
  const requestRelayPermissions = useCallback(async () => {
    const plugin = window.Capacitor?.Plugins?.NexusRelay;
    if (!plugin) return null;
    try {
      return await plugin.requestPermissions();
    } catch { return null; }
  }, []);

  // Process outbox (Capacitor native only)
  const processRelayOutbox = useCallback(async () => {
    const plugin = window.Capacitor?.Plugins?.NexusRelay;
    if (!plugin) return;
    try { await plugin.processOutbox(); } catch { /* ignore */ }
  }, []);

  // Sync SMS history (Capacitor native only)
  const syncSmsHistory = useCallback(async () => {
    const plugin = window.Capacitor?.Plugins?.NexusRelay;
    if (!plugin) return;
    try {
      await plugin.syncHistory?.({ limit: 500, lookbackMs: 31 * 24 * 60 * 60 * 1000 });
    } catch { /* ignore */ }
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="spinning" style={{ width: 30, height: 30, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!operator) {
    return (
      <div data-testid="page-relay-container" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {t('login_required')}
      </div>
    );
  }

  if (!isNativeApp) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
        <h3 style={{ marginBottom: '0.5rem' }}>{t('relay')}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {t('relay_native_only')}
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><div className="spinning" style={{ width: 30, height: 30, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-color)', borderRadius: '50%' }} /></div>}>
      <div style={{ height: '100%', overflow: 'auto' }}>
        <RelayMode
          operator={operator}
          t={t}
          onHide={() => setActiveTab('dashboard')}
          onExit={() => setActiveTab('dashboard')}
          syncPushToken={() => {}}
          isSyncingPush={false}
          requestRelayPermissions={requestRelayPermissions}
          processRelayOutbox={processRelayOutbox}
          syncSmsHistory={syncSmsHistory}
        />
      </div>
    </Suspense>
  );
};

export default RelayModeView;
