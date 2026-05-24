#!/usr/bin/env node
/**
 * Sobe o Next dev e recria middleware-manifest.json se o Next apagar durante HMR.
 */
const { spawn } = require('child_process');
const { ensureMiddlewareManifest } = require('./ensure-middleware-manifest');

const port = process.argv[2] || '3000';
const intervalMs = 1500;

ensureMiddlewareManifest();
const watchTimer = setInterval(ensureMiddlewareManifest, intervalMs);

const child = spawn(
  'node',
  [
    '--require',
    './scripts/node-localstorage-shim.cjs',
    './node_modules/next/dist/bin/next',
    'dev',
    '-p',
    port,
  ],
  { stdio: 'inherit', env: process.env }
);

const cleanup = (code) => {
  clearInterval(watchTimer);
  process.exit(code ?? 0);
};

child.on('exit', (code) => cleanup(code));
process.on('SIGINT', () => {
  child.kill('SIGINT');
});
process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
