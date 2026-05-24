#!/usr/bin/env node
/**
 * Garante que .next/server/middleware-manifest.json exista.
 * O Next.js em dev às vezes apaga esse arquivo durante recompilação (ex.: após npm run build).
 */
const fs = require('fs');
const path = require('path');

const serverDir = path.join(process.cwd(), '.next', 'server');
const manifestPath = path.join(serverDir, 'middleware-manifest.json');

const manifest = {
  version: 3,
  sortedMiddleware: [],
  middleware: {},
  functions: {},
};

function ensureMiddlewareManifest() {
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }

  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    return true;
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    JSON.parse(raw);
  } catch {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    return true;
  }

  return false;
}

if (require.main === module) {
  const created = ensureMiddlewareManifest();
  if (created) {
    console.log('Created .next/server/middleware-manifest.json');
  }
}

module.exports = { ensureMiddlewareManifest, manifestPath };
