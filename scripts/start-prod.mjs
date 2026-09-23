import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || '3000';

const srvxEntry = resolve(projectRoot, 'node_modules', 'srvx', 'bin', 'srvx.mjs');
const args = [
  '--prod',
  '--dir',
  projectRoot,
  '--host',
  host,
  '--port',
  String(port),
  '--static',
  resolve(projectRoot, 'dist', 'client'),
  '--entry',
  resolve(projectRoot, 'dist', 'server', 'server.js'),
];

const result = spawnSync(process.execPath, [srvxEntry, ...args], {
  stdio: 'inherit',
  env: process.env,
  cwd: projectRoot,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
