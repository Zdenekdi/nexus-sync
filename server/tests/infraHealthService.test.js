const mockExecFile = jest.fn();
const mockConnect = jest.fn();
const mockExecCommand = jest.fn();
const mockDispose = jest.fn();
const mockAiService = {
  getConfig: jest.fn(),
  healthCheck: jest.fn()
};

jest.mock('child_process', () => ({ execFile: mockExecFile }));
jest.mock('node-ssh', () => ({
  NodeSSH: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    execCommand: mockExecCommand,
    dispose: mockDispose
  }))
}));
jest.mock('../src/services/db');
jest.mock('../src/services/logger');
jest.mock('../src/services/aiService', () => mockAiService);

const infraHealthService = require('../src/services/infraHealthService');

const pm2List = (processes) => {
  mockExecFile.mockImplementation((file, args, options, callback) => {
    callback(null, JSON.stringify(processes), '');
  });
};

const backendProcess = {
  name: 'nexus-backend-final',
  pid: 123,
  pm2_env: {
    status: 'online',
    restart_time: 0,
    pm_uptime: Date.now() - 1000
  },
  monit: { memory: 1024 * 1024 * 128, cpu: 3 }
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.AI_TUNNEL_REQUIRED;
  delete process.env.SSH_HOST;
  delete process.env.HETZNER_SSH_HOST;
  delete process.env.SSH_USER;
  delete process.env.HETZNER_SSH_USER;
  delete process.env.SSH_KEY_PATH;
  mockAiService.getConfig.mockReturnValue({ baseUrl: 'https://ai.internal.example/api' });
  mockAiService.healthCheck.mockResolvedValue({ ok: true, model: 'test-model' });
  mockConnect.mockResolvedValue();
  mockExecCommand.mockResolvedValue({ stdout: 'host\n', stderr: '' });
});

describe('infraHealthService', () => {
  it('does not require an AI tunnel when AI_BASE_URL points to a remote/private endpoint', async () => {
    pm2List([backendProcess]);

    const report = await infraHealthService.getPm2Health();

    expect(report.ok).toBe(true);
    expect(report.processes.aiTunnel).toMatchObject({
      name: 'ai-tunnel',
      status: 'not_required',
      ok: true
    });
  });

  it('requires the AI tunnel when the AI endpoint is local', async () => {
    mockAiService.getConfig.mockReturnValue({ baseUrl: 'http://127.0.0.1:11434/api' });
    pm2List([backendProcess]);

    const report = await infraHealthService.getPm2Health();

    expect(report.ok).toBe(false);
    expect(report.processes.aiTunnel).toMatchObject({
      name: 'ai-tunnel',
      status: 'missing',
      ok: false
    });
  });

  it('uses the Hetzner SSH user and does not expose the private key path', async () => {
    process.env.SSH_HOST = 'vultr.example.test';
    process.env.HETZNER_SSH_HOST = 'hetzner.example.test';
    process.env.SSH_USER = 'root';
    process.env.HETZNER_SSH_USER = 'airoot';
    process.env.SSH_KEY_PATH = '/dev/null';

    const report = await infraHealthService.getSshHealth();

    expect(report).not.toHaveProperty('keyPath');
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({
      host: 'vultr.example.test',
      username: 'root'
    }));
    expect(mockConnect).toHaveBeenCalledWith(expect.objectContaining({
      host: 'hetzner.example.test',
      username: 'airoot'
    }));
  });
});
