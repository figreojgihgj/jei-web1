import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const proxyDir = path.join(repoRoot, 'scripts', 'skland-proxy');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripLeadingDashDash(args) {
  if (args.length > 0 && args[0] === '--') {
    return args.slice(1);
  }
  return args;
}

function parseArgs(rawArgs) {
  const args = stripLeadingDashDash(rawArgs);
  const crawlerArgs = [];
  let proxyEndpoint = 'http://127.0.0.1:12345/proxy-request';
  let proxyHost = '127.0.0.1';
  let proxyPort = 12345;
  let skipProxyInstall = false;
  let startupTimeoutMs = 30000;

  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const next = args[i + 1];
    if (key === '--proxy-endpoint' && next) {
      proxyEndpoint = next;
      i += 1;
      continue;
    }
    if (key === '--proxy-host' && next) {
      proxyHost = next;
      i += 1;
      continue;
    }
    if (key === '--proxy-port' && next) {
      proxyPort = Number.parseInt(next, 10) || 12345;
      i += 1;
      continue;
    }
    if (key === '--proxy-start-timeout-ms' && next) {
      startupTimeoutMs = Math.max(3000, Number.parseInt(next, 10) || 30000);
      i += 1;
      continue;
    }
    if (key === '--skip-proxy-install') {
      skipProxyInstall = true;
      continue;
    }
    crawlerArgs.push(key);
  }

  if (!args.includes('--proxy-endpoint')) {
    proxyEndpoint = `http://${proxyHost}:${proxyPort}/proxy-request`;
  }

  return {
    proxyEndpoint,
    skipProxyInstall,
    startupTimeoutMs,
    crawlerArgs,
  };
}

async function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve({ code: code ?? 0, signal }));
  });
}

async function isHealthy(healthUrl, timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(healthUrl, { signal: controller.signal });
    if (!res.ok) return false;
    const json = await res.json().catch(() => ({}));
    return json?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHealth(healthUrl, timeoutMs, processRef) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isHealthy(healthUrl, 1200)) return true;
    if (processRef && processRef.exitCode != null) return false;
    await sleep(400);
  }
  return false;
}

function isLocalProxyEndpoint(endpoint) {
  try {
    const u = new URL(endpoint);
    return ['127.0.0.1', 'localhost', '::1'].includes(u.hostname);
  } catch {
    return false;
  }
}

function healthUrlFromEndpoint(endpoint) {
  const u = new URL(endpoint);
  return `${u.protocol}//${u.host}/health`;
}

async function ensureProxyDeps(skipInstall) {
  const packageJson = path.join(proxyDir, 'package.json');
  if (!fs.existsSync(packageJson)) {
    throw new Error(`Proxy package not found: ${packageJson}`);
  }
  if (skipInstall) return;

  const nodeModules = path.join(proxyDir, 'node_modules');
  if (fs.existsSync(nodeModules)) return;

  console.log('[oneclick] Installing proxy dependencies...');
  const installArgs = ['install'];
  const tried = [];
  let installed = false;

  const candidates = [];
  if (process.env.npm_execpath) {
    const p = process.env.npm_execpath;
    if (/\.(c?m?js)$/i.test(p)) {
      candidates.push({ cmd: process.execPath, args: [p, ...installArgs], label: 'npm_execpath(node)' });
    } else {
      candidates.push({ cmd: p, args: installArgs, label: 'npm_execpath(bin)' });
    }
  }
  if (process.platform === 'win32') {
    candidates.push({ cmd: 'pnpm.cmd', args: installArgs, label: 'pnpm.cmd' });
    candidates.push({ cmd: 'pnpm.exe', args: installArgs, label: 'pnpm.exe' });
    candidates.push({ cmd: 'npm.cmd', args: ['install', '--no-fund', '--no-audit'], label: 'npm.cmd' });
  } else {
    candidates.push({ cmd: 'pnpm', args: installArgs, label: 'pnpm' });
    candidates.push({ cmd: 'npm', args: ['install', '--no-fund', '--no-audit'], label: 'npm' });
  }

  for (const c of candidates) {
    try {
      const result = await runCommand(c.cmd, c.args, { cwd: proxyDir });
      tried.push(`${c.label}:${result.code}`);
      if (result.code === 0) {
        installed = true;
        break;
      }
    } catch (error) {
      tried.push(`${c.label}:spawn_error`);
    }
  }

  if (!installed) {
    throw new Error(`dependency install failed; tried ${tried.join(', ')}`);
  }
}

async function stopProcessGracefully(child) {
  if (!child || child.exitCode != null) return;
  child.kill('SIGTERM');
  const deadline = Date.now() + 2500;
  while (Date.now() < deadline) {
    if (child.exitCode != null) return;
    await sleep(150);
  }
  if (child.exitCode == null) {
    child.kill('SIGKILL');
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const { proxyEndpoint, skipProxyInstall, startupTimeoutMs, crawlerArgs } = parsed;
  const localProxy = isLocalProxyEndpoint(proxyEndpoint);
  const healthUrl = localProxy ? healthUrlFromEndpoint(proxyEndpoint) : '';

  console.log('[oneclick] Proxy endpoint:', proxyEndpoint);

  let startedProxy = null;
  let startedByScript = false;
  let shuttingDown = false;

  const cleanup = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (startedByScript && startedProxy) {
      await stopProcessGracefully(startedProxy);
    }
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(130);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(143);
  });

  try {
    if (localProxy) {
      const alive = await isHealthy(healthUrl);
      if (alive) {
        console.log('[oneclick] Reusing existing local proxy.');
      } else {
        await ensureProxyDeps(skipProxyInstall);
        console.log('[oneclick] Starting local proxy...');
        startedByScript = true;
        startedProxy = spawn(process.execPath, ['server.js'], {
          cwd: proxyDir,
          stdio: 'inherit',
        });
        const ready = await waitForHealth(healthUrl, startupTimeoutMs, startedProxy);
        if (!ready) {
          throw new Error('Local proxy failed to become healthy in time.');
        }
      }
    } else {
      console.log('[oneclick] Non-local proxy endpoint, skip local proxy startup.');
    }

    const crawlArgs = ['scripts/crawl-skland-wiki.mjs', '--proxy-endpoint', proxyEndpoint, ...crawlerArgs];
    const result = await runCommand(process.execPath, crawlArgs, { cwd: repoRoot });
    await cleanup();
    process.exit(result.code ?? 1);
  } catch (error) {
    console.error('[oneclick] Failed:', error.message || String(error));
    await cleanup();
    process.exit(1);
  }
}

main();
