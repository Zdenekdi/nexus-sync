import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Pruh s označením prostředí.
 *
 * Testuje se obojí směr. Kdyby se ověřovalo jen to, že se na testu ukáže,
 * prošlo by to i tehdy, kdyby svítil i na produkci — a hlásit ostrým
 * uživatelům „DATA NEJSOU OSTRÁ" je horší než nemít pruh vůbec.
 *
 * Nevykresluje se přes DOM, ale čte se návratová hodnota komponenty: je to
 * čistá funkce bez stavu a testovací prostředí je tu `node`, ne jsdom.
 */

async function vykresli() {
  vi.resetModules();
  const mod = await import('./EnvironmentBadge.jsx');
  return mod.default();
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('označení prostředí', () => {
  it('na testovacím prostředí se ukáže', async () => {
    vi.stubEnv('VITE_NEXUS_ENVIRONMENT', 'staging');
    const vysledek = await vykresli();

    expect(vysledek).not.toBeNull();
    expect(vysledek.props['data-testid']).toBe('environment-badge');
    expect(vysledek.props.children).toContain('DATA NEJSOU OSTRÁ');
  });

  it('náhled na ostrých datech varuje, že ostrá JSOU', async () => {
    // Nejsnazší způsob, jak tenhle pruh pokazit, je nechat ho tvrdit
    // „data nejsou ostrá" i tam, kde jsou. Náhled pull requestu mluví
    // s produkční databází, dokud nestojí testovací backend.
    vi.stubEnv('VITE_NEXUS_ENVIRONMENT', 'preview');
    const vysledek = await vykresli();

    expect(vysledek).not.toBeNull();
    expect(vysledek.props.children).toContain('OSTRÝMI DATY');
    expect(vysledek.props.children).not.toContain('NEJSOU');
  });

  it('bez nastavené proměnné se nevykreslí nic', async () => {
    vi.stubEnv('VITE_NEXUS_ENVIRONMENT', '');
    expect(await vykresli()).toBeNull();
  });

  it('na produkci se nevykreslí nic (kontrolní vzorek)', async () => {
    // Explicitní 'production' musí mlčet stejně jako chybějící hodnota.
    vi.stubEnv('VITE_NEXUS_ENVIRONMENT', 'production');
    expect(await vykresli()).toBeNull();
  });

  it('nepřekáží v klikání', async () => {
    // Pruh je přes celou šířku dole. Kdyby bral kliknutí, zakryl by na
    // telefonu spodní navigaci a testovat by nešlo nic.
    vi.stubEnv('VITE_NEXUS_ENVIRONMENT', 'staging');
    const vysledek = await vykresli();
    expect(vysledek.props.style.pointerEvents).toBe('none');
  });
});
