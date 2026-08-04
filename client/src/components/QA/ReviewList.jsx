import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Přehled zapsaných hodnocení komunikace.
 *
 * Doplňuje ovládání ve schránce: tam hodnocení vzniká, tady je vidět
 * pohromadě a dá se filtrovat na jednu operátorku.
 *
 * Text zprávy se nedotahuje odsud — chodí ze serveru přes relaci na Message,
 * protože v QaReview uložený není. Když se konverzace smaže, zmizí i tohle.
 *
 * Vykresluje se jen vedoucím rolím. Server GET stejně odmítne (403), ale
 * prázdný panel s nadpisem „Kontrola komunikace" by operátorce prozrazoval,
 * že něco takového existuje — a to je přesně to, čemu se u owner sekce
 * v sidebaru vyhýbáme.
 */
const ReviewList = ({ apiBase, token, isCz, operators = [] }) => {
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState(null);
  const [operatorId, setOperatorId] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const url = `${apiBase}/qa/reviews${operatorId !== 'all' ? `?operatorId=${encodeURIComponent(operatorId)}` : ''}`;
    axios
      .get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (!cancelled) { setReviews(Array.isArray(res.data) ? res.data : []); setError(null); } })
      .catch(err => {
        if (cancelled) return;
        // Prázdný seznam a chyba nesmí vypadat stejně — jinak by to vypadalo,
        // že nikdo nic nehodnotil, i když se jen nepodařilo načíst.
        setReviews([]);
        setError(err?.response?.status === 403
          ? (isCz ? 'Na kontrolu komunikace nemáte oprávnění.' : 'You are not allowed to see communication reviews.')
          : (isCz ? 'Hodnocení se nepodařilo načíst.' : 'Could not load reviews.'));
      });
    return () => { cancelled = true; };
  }, [open, operatorId, apiBase, token, isCz]);

  const fmt = (d) => {
    const date = new Date(d);
    return isNaN(date) ? '—' : date.toLocaleDateString(isCz ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div data-testid="qa-review-list" style={{ borderBottom: '1px solid var(--card-border)' }}>
      <button
        data-testid="qa-review-list-toggle"
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', minHeight: '48px', padding: '0.8rem 1rem', background: 'none', border: 'none', color: 'var(--text-primary)', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }}
      >
        <ClipboardCheck size={16} color="#60a5fa" style={{ flex: 'none' }} />
        {isCz ? 'Kontrola komunikace' : 'Communication review'}
        {open ? <ChevronUp size={15} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={15} style={{ marginLeft: 'auto' }} />}
      </button>

      {open && (
        <div style={{ padding: '0 1rem 1rem' }}>
          <select
            data-testid="qa-review-operator-filter"
            value={operatorId}
            onChange={e => setOperatorId(e.target.value)}
            style={{ width: '100%', minHeight: '40px', padding: '0.4rem 0.6rem', marginBottom: '0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', color: 'white', fontSize: '0.8rem' }}
          >
            <option value="all">{isCz ? 'Všechny operátorky' : 'All operators'}</option>
            {(operators || []).filter(o => o?.id).map(o => (
              <option key={o.id} value={o.id}>{o.name || o.id}</option>
            ))}
          </select>

          {error && (
            <div role="alert" style={{ padding: '0.6rem 0.8rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.78rem', marginBottom: '0.6rem' }}>
              {error}
            </div>
          )}

          {reviews === null && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isCz ? 'Načítám…' : 'Loading…'}</div>
          )}

          {reviews !== null && reviews.length === 0 && !error && (
            <div data-testid="qa-review-empty" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {isCz
                ? 'Zatím žádná hodnocení. Zapisují se u konkrétní zprávy ve schránce.'
                : 'No reviews yet. They are recorded on individual messages in the inbox.'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(reviews || []).map(r => (
              <div key={r.id} data-testid="qa-review-item" style={{ padding: '0.65rem 0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.8rem' }}>{r.operator?.name || (isCz ? 'Neznámá' : 'Unknown')}</span>
                  <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: '800' }}>{r.rating}/5</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{fmt(r.createdAt)}</span>
                </div>
                {r.message?.text && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: r.note ? '0.3rem' : 0 }}>
                    „{String(r.message.text).slice(0, 90)}{String(r.message.text).length > 90 ? '…' : ''}"
                  </div>
                )}
                {r.note && <div style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>{r.note}</div>}
                <div style={{ marginTop: '0.3rem', fontSize: '0.66rem', color: 'rgba(255,255,255,0.3)' }}>
                  {isCz ? 'Hodnotila: ' : 'Reviewed by: '}{r.reviewer?.name || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
