#!/usr/bin/env node
/**
 * Garante que .next/server/middleware-manifest.json exista.
 * O Next.js em dev às vezes não gera esse arquivo e o require() falha.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(process.cwd(), '.next');
const serverDir = path.join(distDir, 'server');
const manifestPath = path.join(serverDir, 'middleware-manifest.json');

const manifest = {
  version: 3,
  sortedMiddleware: [],
  middleware: {},
  functions: {}
};

if (!fs.existsSync(serverDir)) {
  fs.mkdirSync(serverDir, { recursive: true });
}

if (!fs.existsSync(manifestPath)) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Created .next/server/middleware-manifest.json');
}
