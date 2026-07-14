/**
 * safeRedirect — allowlist pro `window.location.href` z API odpovědí.
 *
 * Brání open-redirect / `javascript:`/`data:` injection, kdyby endpoint někdy
 * odrážel uživatelský vstup do `url`. Povolené cíle: stejný origin + známé
 * Stripe hosty (checkout / billing portal), kam tyhle redirecty reálně míří.
 */
const ALLOWED_HOSTS = ['checkout.stripe.com', 'billing.stripe.com'];

export function safeRedirect(url) {
  if (!url || typeof url !== 'string' || typeof window === 'undefined') return false;
  try {
    const parsed = new URL(url, window.location.origin);
    const sameOrigin = parsed.origin === window.location.origin;
    // Přesně jen ty dva Stripe hosty, kam redirecty reálně míří (ne celá *.stripe.com).
    const allowedHost = parsed.protocol === 'https:' && ALLOWED_HOSTS.includes(parsed.hostname);
    if (sameOrigin || allowedHost) {
      window.location.href = parsed.href;
      return true;
    }
    console.warn('[safeRedirect] blocked redirect to', parsed.origin);
    return false;
  } catch {
    return false;
  }
}
