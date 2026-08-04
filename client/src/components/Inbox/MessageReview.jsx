import React, { useState } from 'react';
import axios from 'axios';
import { ClipboardCheck, X } from 'lucide-react';

/**
 * Hodnocení konkrétní odchozí zprávy — kontrola komunikace.
 *
 * Ovládání se ukazuje jen vedoucím rolím. Server to hlídá taky (403), ale UI
 * nemá nabízet akci, která skončí chybou — a hlavně nemá vzbudit dojem, že se
 * hodnocení někam zapsalo, když se nezapsalo.
 *
 * Zapisuje se jen odkaz na zprávu, známka a poznámka. Text zprávy se nikam
 * nekopíruje; drží se na jednom místě a s konverzací se i smaže.
 */
const MessageReview = ({ messageId, apiBase, token, isCz, onSaved, showToast }) => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedRating, setSavedRating] = useState(null);

  const save = async () => {
    if (!rating) return;
    setSaving(true);
    try {
      await axios.post(
        `${apiBase}/qa/reviews`,
        { messageId, rating, note: note.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedRating(rating);
      setOpen(false);
      setNote('');
      showToast?.(isCz ? 'Hodnocení uloženo.' : 'Review saved.', 'success');
      onSaved?.();
    } catch (err) {
      // Neúspěch se nesmí tvářit jako úspěch — bez toho by manažerka věřila,
      // že hodnocení existuje, a ono by nikde nebylo.
      const status = err?.response?.status;
      showToast?.(
        status === 403
          ? (isCz ? 'Na hodnocení komunikace nemáte oprávnění.' : 'You are not allowed to review communication.')
          : (isCz ? 'Hodnocení se nepodařilo uložit.' : 'Could not save the review.'),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  if (savedRating && !open) {
    return (
      <div data-testid={`message-reviewed-${messageId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '5px', fontSize: '0.68rem', color: '#86efac' }}>
        <ClipboardCheck size={12} />
        {isCz ? `Ohodnoceno ${savedRating}/5` : `Reviewed ${savedRating}/5`}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        data-testid={`message-review-open-${messageId}`}
        onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '5px', padding: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer' }}
      >
        <ClipboardCheck size={12} />
        {isCz ? 'Ohodnotit' : 'Review'}
      </button>
    );
  }

  return (
    <div
      data-testid={`message-review-form-${messageId}`}
      style={{ marginTop: '8px', padding: '0.6rem 0.7rem', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            data-testid={`message-review-rating-${n}`}
            onClick={() => setRating(n)}
            style={{
              minWidth: '28px', minHeight: '28px', borderRadius: '7px', cursor: 'pointer',
              border: `1px solid ${rating === n ? '#3b82f6' : 'rgba(255,255,255,0.12)'}`,
              background: rating === n ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: rating === n ? '#60a5fa' : 'rgba(255,255,255,0.5)',
              fontWeight: '800', fontSize: '0.72rem'
            }}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => { setOpen(false); setRating(0); setNote(''); }}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px' }}
          aria-label={isCz ? 'Zavřít' : 'Close'}
        >
          <X size={13} />
        </button>
      </div>

      <input
        data-testid={`message-review-note-${messageId}`}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={isCz ? 'Poznámka (nepovinná)' : 'Note (optional)'}
        style={{ width: '100%', padding: '0.4rem 0.55rem', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem', outline: 'none', marginBottom: '0.5rem' }}
      />

      <button
        data-testid={`message-review-save-${messageId}`}
        onClick={save}
        disabled={!rating || saving}
        style={{
          width: '100%', minHeight: '32px', borderRadius: '8px', border: 'none',
          background: rating ? '#3b82f6' : 'rgba(255,255,255,0.06)',
          color: rating ? 'white' : 'rgba(255,255,255,0.3)',
          fontWeight: '800', fontSize: '0.75rem', cursor: rating ? 'pointer' : 'default'
        }}
      >
        {saving ? (isCz ? 'Ukládám…' : 'Saving…') : (isCz ? 'Uložit hodnocení' : 'Save review')}
      </button>
    </div>
  );
};

export default MessageReview;
