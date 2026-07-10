function buildSshConfig(options = {}) {
  const host = process.env[options.hostEnv || 'SSH_HOST'] || process.env.VPS_SSH_HOST;
  const username = process.env[options.userEnv || 'SSH_USER'] || process.env.VPS_SSH_USER || 'root';
  const privateKeyPath = process.env.SSH_KEY_PATH;
  const password = process.env.SSH_PASSWORD || process.env.VPS_SSH_PASSWORD;

  if (!host) {
    throw new Error(`${options.hostEnv || 'SSH_HOST'} or VPS_SSH_HOST is required`);
  }

  if (!privateKeyPath && !password) {
    throw new Error('SSH_KEY_PATH is required. SSH_PASSWORD/VPS_SSH_PASSWORD is supported only for local emergency use.');
  }

  return privateKeyPath
    ? { host, username, privateKeyPath }
    : { host, username, password };
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

module.exports = {
  buildSshConfig,
  shellQuote
};
