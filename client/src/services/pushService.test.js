import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Registrace FCM tokenu na serveru.
 *
 * Relay varianta si token neregistrovala vůbec — `initPushNotifications` se
 * volalo jedině z NexusContext (plná aplikace). Server pak pro relay telefon
 * nenašel žádný pushDevice a záložní cesta pro odchozí SMS byla mrtvá, přestože
 * nativní strana `send_sms` přes FCM odbavit umí i se zavřenou aplikací.
 *
 * Volání ve `RelayApp.jsx` na tom stojí: opakuje se při každé změně
 * přístupového tokenu, protože registrace jde s tímhle tokenem a při jeho
 * vypršení selže. Tenhle test drží právě tu vlastnost — bez ní by se
 * neúspěšná registrace už nikdy nedotáhla.
 */

const posluchaci = {};

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(async () => ({ receive: 'granted' })),
    addListener: vi.fn((jmeno, fn) => { posluchaci[jmeno] = fn; }),
    register: vi.fn(async () => {}),
    removeAllListeners: vi.fn(async () => {}),
  },
}));

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

const axios = (await import('axios')).default;

async function nactiSluzbu() {
  vi.resetModules();
  for (const k of Object.keys(posluchaci)) delete posluchaci[k];
  return import('./pushService.js');
}

beforeEach(() => { vi.clearAllMocks(); });

describe('registrace push tokenu', () => {
  it('uloží token na server, jakmile ho Firebase vydá', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const { initPushNotifications } = await nactiSluzbu();

    await initPushNotifications('https://api.test/api', 'token-1', () => {});
    await posluchaci.registration({ value: 'fcm-abc' });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, telo, cfg] = axios.post.mock.calls[0];
    expect(url).toBe('https://api.test/api/device/push-token');
    expect(telo).toMatchObject({ token: 'fcm-abc', platform: 'android' });
    expect(cfg.headers.Authorization).toBe('Bearer token-1');
  });

  it('po neúspěchu to zkusí znovu s čerstvým přístupovým tokenem', async () => {
    // Jádro věci. Registrace jde s přístupovým tokenem; když ten mezitím
    // vypršel, server ji odmítne 401. Bez opakovaného volání by token na
    // serveru nebyl NIKDY a push by tiše nefungoval.
    axios.post.mockRejectedValueOnce(new Error('Request failed with status code 401'));
    axios.post.mockResolvedValue({ data: {} });
    const { initPushNotifications } = await nactiSluzbu();

    await initPushNotifications('https://api.test/api', 'stary-token', () => {});
    await posluchaci.registration({ value: 'fcm-abc' });
    expect(axios.post).toHaveBeenCalledTimes(1);

    // Druhé volání = přístupový token se mezitím obnovil.
    await initPushNotifications('https://api.test/api', 'novy-token', () => {});

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(axios.post.mock.calls[1][2].headers.Authorization).toBe('Bearer novy-token');
  });

  it('už uložený token znovu neposílá (kontrolní vzorek)', async () => {
    // Bez tohohle případu by test výš prošel, i kdyby se registrace
    // posílala při každém překreslení dokola — a „opakuje se to" by
    // nevypovídalo nic o tom, že se opakuje jen tehdy, když je potřeba.
    axios.post.mockResolvedValue({ data: {} });
    const { initPushNotifications } = await nactiSluzbu();

    await initPushNotifications('https://api.test/api', 'token-1', () => {});
    await posluchaci.registration({ value: 'fcm-abc' });
    await initPushNotifications('https://api.test/api', 'token-2', () => {});
    await initPushNotifications('https://api.test/api', 'token-3', () => {});

    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('bez uděleného oprávnění se neregistruje', async () => {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    PushNotifications.requestPermissions.mockResolvedValueOnce({ receive: 'denied' });
    const { initPushNotifications } = await nactiSluzbu();

    await initPushNotifications('https://api.test/api', 'token-1', () => {});

    expect(PushNotifications.register).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });
});
