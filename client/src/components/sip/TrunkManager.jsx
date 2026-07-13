/**
 * TrunkManager.jsx — per-agenturní správa SIP trunků (BYOT) + DID mapování.
 *
 * Agentura zadá svého VoIP providera + DID a namapuje DID na modelku (profil).
 * Backend (/api/trunks) pak generuje Asterisk config → přesměrovaný hovor ze
 * SIMky modelky dorazí operátorovi (obousměrné audio, bez rootu).
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PhoneForwarded, Plus, Trash2, Server, Hash, Info } from 'lucide-react';
import { useNexus } from '../../context/ContextHook';

const EMPTY_TRUNK = { name: '', host: '', port: 5060, authMode: 'register', username: '', password: '', codecs: 'ulaw,alaw' };

export default function TrunkManager() {
  const { token, API_BASE, profiles, activeRole, activeOperator, showToast, isMobile } = useNexus();
  const isManager =
    activeRole === 'app_owner' || activeRole === 'agency_admin' || activeRole === 'agency_manager' ||
    activeOperator?.isManager || activeOperator?.isSeniorOperator;

  const [trunks, setTrunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_TRUNK);
  const [didDraft, setDidDraft] = useState({}); // trunkId -> { number, profileId }

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const load = useCallback(async () => {
    if (!token || !isManager) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/trunks`, authHeader);
      setTrunks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast?.(`Nepodařilo se načíst trunky: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, API_BASE, isManager]);

  useEffect(() => { load(); }, [load]);

  const createTrunk = async (e) => {
    e.preventDefault();
    if (!form.name || !form.host) return showToast?.('Vyplň název a host', 'error');
    try {
      await axios.post(`${API_BASE}/trunks`, form, authHeader);
      showToast?.('Trunk vytvořen', 'success');
      setForm(EMPTY_TRUNK);
      load();
    } catch (err) {
      showToast?.(`Chyba: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const deleteTrunk = async (id) => {
    if (!window.confirm('Smazat trunk včetně jeho DIDů?')) return;
    try {
      await axios.delete(`${API_BASE}/trunks/${id}`, authHeader);
      showToast?.('Trunk smazán', 'success');
      load();
    } catch (err) {
      showToast?.(`Chyba: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const addDid = async (trunkId) => {
    const draft = didDraft[trunkId] || {};
    if (!draft.number) return showToast?.('Zadej DID číslo', 'error');
    try {
      await axios.post(`${API_BASE}/trunks/${trunkId}/dids`, {
        number: draft.number,
        profileId: draft.profileId || null,
      }, authHeader);
      showToast?.('DID přidán', 'success');
      setDidDraft((d) => ({ ...d, [trunkId]: { number: '', profileId: '' } }));
      load();
    } catch (err) {
      showToast?.(`Chyba: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const deleteDid = async (trunkId, didId) => {
    try {
      await axios.delete(`${API_BASE}/trunks/${trunkId}/dids/${didId}`, authHeader);
      load();
    } catch (err) {
      showToast?.(`Chyba: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  if (!isManager) return null;

  const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', background: 'var(--input-bg, rgba(255,255,255,0.05))', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary, white)', fontSize: '0.9rem' };
  const labelStyle = { fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.35rem', display: 'block' };

  return (
    <div className="settings-section" style={{ marginBottom: '3rem' }}>
      <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <PhoneForwarded size={24} color="var(--accent-color)" /> SIP trunky (BYOT)
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Zadej svého VoIP providera a namapuj DID na modelku. Na SIMce nastav
        přesměrování <code>**21*&lt;DID&gt;#</code> — příchozí hovor pak dorazí operátorovi.
      </p>

      {/* In-app návod */}
      <details className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={16} /> Jak to zprovoznit (návod)
        </summary>
        <div style={{ marginTop: '1rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 0.75rem' }}><strong style={{ color: 'var(--text-primary, #fff)' }}>Předpoklad:</strong> běžící Asterisk dostupný providerovi (veřejná IP, SIP/RTP porty).</p>
          <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li><strong style={{ color: 'var(--text-primary, #fff)' }}>Pořiď DID u providera</strong> — telefonní číslo v cílové zemi + SIP údaje (host, username, heslo). Provider musí umět SIP trunk.</li>
            <li><strong style={{ color: 'var(--text-primary, #fff)' }}>Přidej trunk</strong> ve formuláři níže (heslo se uloží šifrovaně).</li>
            <li><strong style={{ color: 'var(--text-primary, #fff)' }}>Přidej DID</strong> a namapuj ho na modelku (profil).</li>
            <li><strong style={{ color: 'var(--text-primary, #fff)' }}>Na SIMce modelky zapni přesměrování:</strong> <code>**21*&lt;DID&gt;#</code> (vše), nebo podmíněné <code>**61/**62/**67*&lt;DID&gt;#</code> (nezvednuto/nedostupné/obsazeno). Zrušení: <code>##21#</code>.</li>
            <li><strong style={{ color: 'var(--text-primary, #fff)' }}>Test:</strong> zavolej na číslo modelky → hovor dorazí operátorovi (obousměrně).</li>
          </ol>
          <p style={{ margin: '0.75rem 0 0' }}>
            <strong style={{ color: 'var(--text-primary, #fff)' }}>Pozn.:</strong> SMS jedou dál přes relay aplikaci (nemění se) — přesměrovává se jen hlas.
            Pro spolehlivé rozlišení modelek doporučujeme <strong style={{ color: 'var(--text-primary, #fff)' }}>1 DID na modelku</strong>.
          </p>
        </div>
      </details>

      {/* Formulář: nový trunk */}
      <form onSubmit={createTrunk} className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
          <div><label style={labelStyle}>Název</label><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MyProvider CZ" /></div>
          <div><label style={labelStyle}>Host / IP</label><input style={inputStyle} value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="sip.provider.cz" /></div>
          <div><label style={labelStyle}>Port</label><input style={inputStyle} type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></div>
          <div>
            <label style={labelStyle}>Auth mód</label>
            <select style={inputStyle} value={form.authMode} onChange={(e) => setForm({ ...form, authMode: e.target.value })}>
              <option value="register">register (user/heslo)</option>
              <option value="ip">ip (ACL)</option>
            </select>
          </div>
          <div><label style={labelStyle}>Username</label><input style={inputStyle} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={form.authMode === 'ip'} /></div>
          <div><label style={labelStyle}>Heslo</label><input style={inputStyle} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={form.authMode === 'ip'} placeholder="uloží se šifrovaně" /></div>
          <div><label style={labelStyle}>Kodeky</label><input style={inputStyle} value={form.codecs} onChange={(e) => setForm({ ...form, codecs: e.target.value })} placeholder="ulaw,alaw" /></div>
        </div>
        <button type="submit" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Přidat trunk
        </button>
      </form>

      {/* Seznam trunků */}
      {loading && <div style={{ color: 'var(--text-secondary)', padding: '1rem' }}>Načítám…</div>}
      {!loading && trunks.length === 0 && (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Info size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
          <div>Zatím žádné trunky. Přidej svého providera výše.</div>
        </div>
      )}

      {trunks.map((t) => (
        <div key={t.id} className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Server size={18} color="var(--accent-color)" />
              <strong>{t.name}</strong>
              <code style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.host}:{t.port} · {t.authMode}{t.hasPassword ? ' · 🔒' : ''}</code>
              {t.active === false && <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>(neaktivní)</span>}
            </div>
            <button onClick={() => deleteTrunk(t.id)} className="btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <Trash2 size={14} /> Smazat
            </button>
          </div>

          {/* DIDy */}
          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
            {(t.dids || []).length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Žádné DID čísla — přidej níže.</div>}
            {(t.dids || []).map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Hash size={14} color="var(--text-secondary)" />
                  <code style={{ fontWeight: 700 }}>{d.number}</code>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>→ {d.profile?.name || '(nenamapováno)'}</span>
                </div>
                <button onClick={() => deleteDid(t.id, d.id)} style={{ background: 'none', border: 'none', color: 'var(--_err-color, #ef4444)', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
            ))}

            {/* Přidat DID */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <input
                style={{ ...inputStyle, flex: isMobile ? '1 1 100%' : '1 1 160px' }}
                placeholder="+420111222333"
                value={didDraft[t.id]?.number || ''}
                onChange={(e) => setDidDraft((s) => ({ ...s, [t.id]: { ...s[t.id], number: e.target.value } }))}
              />
              <select
                style={{ ...inputStyle, flex: isMobile ? '1 1 100%' : '1 1 200px' }}
                value={didDraft[t.id]?.profileId || ''}
                onChange={(e) => setDidDraft((s) => ({ ...s, [t.id]: { ...s[t.id], profileId: e.target.value } }))}
              >
                <option value="">— modelka (profil) —</option>
                {(profiles || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={() => addDid(t.id)} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Plus size={14} /> DID
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
