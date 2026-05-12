import React, { useState, useEffect } from 'react';
import { 
  Key, Plus, Trash2, Copy, CheckCircle2, AlertTriangle, 
  ShieldCheck, Globe, Loader2, Terminal, ExternalLink, Info
} from 'lucide-react';
import axios from 'axios';
import { useNexus } from '../../context/ContextHook';

const ApiSettingsView = () => {
  const { t, showNotification } = useNexus();
  const [keys, setKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchKeys = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/developer/keys');
      setKeys(response.data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      showNotification('error', 'Nepodařilo se načíst API klíče');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    const name = e.target.keyName.value;
    const scopes = Array.from(e.target.scopes)
      .filter(i => i.checked)
      .map(i => i.value)
      .join(',');

    try {
      setIsGenerating(true);
      const response = await axios.post('/api/developer/keys', { name, scopes });
      setNewKey(response.data.apiKey);
      fetchKeys();
      showNotification('success', 'API klíč byl vygenerován');
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Chyba při generování klíče');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (id) => {
    try {
      await axios.delete(`/api/developer/keys/${id}`);
      setKeys(keys.filter(k => k.id !== id));
      setShowConfirmDelete(null);
      showNotification('success', 'API klíč byl zneplatněn');
    } catch (error) {
      showNotification('error', 'Nepodařilo se smazat klíč');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    showNotification('info', 'Zkopírováno do schránky');
  };

  return (
    <div className="view-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Terminal size={24} color="var(--accent-color)" />
            <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' }}>Developer API</h1>
          </div>
          <p style={{ color: 'var(--text-dim)', margin: 0, fontSize: '0.95rem' }}>
            Spravujte přístup k vašim datům přes externí aplikace a skripty.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a 
            href="/api/docs" 
            target="_blank" 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              padding: '0.75rem 1.25rem', borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600'
            }}
          >
            <Globe size={16} /> Dokumentace
          </a>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* Main List */}
        <section>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', minHeight: '400px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} /> Aktivní klíče
            </h3>

            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
              </div>
            ) : keys.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', opacity: 0.5 }}>
                <Key size={48} style={{ marginBottom: '1rem' }} />
                <p>Zatím nemáte žádné aktivní API klíče.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {keys.map(key => (
                  <div key={key.id} className="api-key-card" style={{ 
                    padding: '1.25rem', borderRadius: '16px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '700', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {key.name}
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                          {key.keyId}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', gap: '1rem' }}>
                        <span>Vytvořeno: {new Date(key.createdAt).toLocaleDateString()}</span>
                        <span>Poslední užití: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Nikdy'}</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setShowConfirmDelete(key.id)}
                      className="revoke-btn"
                      style={{ 
                        padding: '0.6rem', borderRadius: '10px', 
                        background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)',
                        color: '#ef4444', cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Generate Sidebar */}
        <aside>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', position: 'sticky', top: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> Nový klíč
            </h3>
            
            <form onSubmit={handleCreateKey}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-dim)' }}>Název klíče</label>
                <input 
                  name="keyName"
                  placeholder="Např. Google Sheets Export" 
                  required
                  style={{ 
                    width: '100%', padding: '0.8rem', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.75rem', color: 'var(--text-dim)' }}>Oprávnění (Scopes)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { val: 'read:stats', label: 'Statistiky agentury' },
                    { val: 'read:profiles', label: 'Seznam profilů' },
                    { val: 'read:messages', label: 'Historie zpráv' },
                    { val: 'write:messages', label: 'Odesílání zpráv' }
                  ].map(scope => (
                    <label key={scope.val} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input type="checkbox" name="scopes" value={scope.val} defaultChecked={scope.val === 'read:stats'} />
                      {scope.label}
                    </label>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={isGenerating}
                style={{ 
                  width: '100%', padding: '1rem', borderRadius: '14px',
                  background: 'var(--accent-color)', color: 'white',
                  border: 'none', fontWeight: '800', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                Vygenerovat klíč
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', fontSize: '0.8rem', color: '#60a5fa', display: 'flex', gap: '0.75rem' }}>
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>Klíč uvidíte pouze jednou. Ihned si ho uložte na bezpečné místo.</span>
            </div>
          </div>
        </aside>
      </div>

      {/* New Key Modal (Success) */}
      {newKey && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '32px', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '100px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem' }}>Klíč byl vygenerován!</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>
              Toto je jediný moment, kdy klíč uvidíte. Po zavření tohoto okna už ho nebude možné zobrazit.
            </p>

            <div style={{ 
              padding: '1rem', borderRadius: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', cursor: 'pointer'
            }} onClick={() => copyToClipboard(newKey)}>
              <code style={{ flex: 1, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--accent-color)', fontWeight: '700' }}>
                {newKey}
              </code>
              {copiedKey ? <CheckCircle2 size={20} color="#22c55e" /> : <Copy size={20} opacity={0.5} />}
            </div>

            <button 
              onClick={() => setNewKey(null)}
              style={{ 
                width: '100%', padding: '1rem', borderRadius: '16px',
                background: 'white', color: 'black', border: 'none', fontWeight: '800', cursor: 'pointer'
              }}
            >
              Uložil jsem si klíč
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showConfirmDelete && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Zneplatnit API klíč?</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Všechny aplikace a skripty používající tento klíč okamžitě přestanou fungovat. Tato akce je nevratná.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowConfirmDelete(null)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white' }}
              >
                Zrušit
              </button>
              <button 
                onClick={() => handleRevokeKey(showConfirmDelete)}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: '#ef4444', border: 'none', color: 'white', fontWeight: '700' }}
              >
                Ano, smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiSettingsView;
