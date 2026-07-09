import React, { useEffect, useRef, useState } from 'react';
import { CreditCard, ShieldCheck, X } from 'lucide-react';

const STRIPE_JS_SRC = 'https://js.stripe.com/v3/';

function loadStripeJs() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Stripe checkout requires a browser'));
  }
  if (window.Stripe) return Promise.resolve(window.Stripe);

  const existing = document.querySelector(`script[src="${STRIPE_JS_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.Stripe), { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = STRIPE_JS_SRC;
    script.async = true;
    script.onload = () => resolve(window.Stripe);
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(script);
  });
}

const StripeEmbeddedCheckoutModal = ({
  checkout,
  lang = 'cz',
  isMobile = false,
  onClose,
  onError
}) => {
  const mountRef = useRef(null);
  const checkoutRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!checkout) {
      setIsLoading(true);
      return undefined;
    }

    let disposed = false;

    async function mountCheckout() {
      if (!checkout?.clientSecret || !checkout?.publishableKey) {
        setIsLoading(false);
        onError?.(lang === 'cz'
          ? 'Platební brána nevrátila data pro vloženou platbu.'
          : 'Payment gateway did not return embedded checkout data.');
        return;
      }

      try {
        setIsLoading(true);
        const Stripe = await loadStripeJs();
        if (disposed) return;
        const stripe = Stripe(checkout.publishableKey);
        const embeddedCheckout = await stripe.initEmbeddedCheckout({
          clientSecret: checkout.clientSecret
        });
        if (disposed) {
          embeddedCheckout.destroy?.();
          return;
        }
        checkoutRef.current = embeddedCheckout;
        embeddedCheckout.mount(mountRef.current);
      } catch (error) {
        console.error('Embedded Stripe Checkout failed:', error);
        onError?.(error?.message || (lang === 'cz'
          ? 'Nepodařilo se načíst platební bránu.'
          : 'Failed to load payment gateway.'));
      } finally {
        if (!disposed) setIsLoading(false);
      }
    }

    mountCheckout();

    return () => {
      disposed = true;
      checkoutRef.current?.destroy?.();
      checkoutRef.current = null;
    };
  }, [checkout, lang, onError]);

  if (!checkout) return null;

  return (
    <div
      data-testid="stripe-embedded-modal"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        background: 'rgba(3, 7, 18, 0.86)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '1.5rem'
      }}
    >
      <div
        style={{
          width: isMobile ? '100%' : 'min(980px, 96vw)',
          maxHeight: isMobile ? '100dvh' : '92vh',
          background: 'var(--card-bg)',
          border: '1px solid rgba(59,130,246,0.32)',
          borderRadius: isMobile ? 0 : '16px',
          overflow: 'hidden',
          boxShadow: '0 26px 80px rgba(0,0,0,0.46)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: isMobile ? '1rem' : '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(15,23,42,0.72)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: 0 }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(59,130,246,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
              flexShrink: 0
            }}>
              <CreditCard size={21} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 900 }}>
                {lang === 'cz' ? 'Platba kartou' : 'Card payment'}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={14} color="#10b981" />
                <span>Stripe</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label={lang === 'cz' ? 'Zavřít platbu' : 'Close payment'}
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ position: 'relative', overflowY: 'auto', flex: 1, background: '#ffffff' }}>
          {isLoading && (
            <div
              data-testid="stripe-embedded-loading"
              style={{
                position: 'absolute',
                inset: 0,
                minHeight: '420px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
                fontWeight: 800,
                background: '#ffffff'
              }}
            >
              {lang === 'cz' ? 'Načítám platbu...' : 'Loading payment...'}
            </div>
          )}
          <div
            data-testid="stripe-embedded-checkout"
            ref={mountRef}
            style={{ minHeight: isMobile ? 'calc(100dvh - 75px)' : '640px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default StripeEmbeddedCheckoutModal;
