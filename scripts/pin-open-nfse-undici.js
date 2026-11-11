/**
 * open-nfse depende de undici@8 (Node >= 22). No Node 20, forçamos undici@6
 * no nest do pacote para o require de mTLS/HTTP/1.1 continuar funcionando.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const nestedDir = path.join(root, 'node_modules', 'open-nfse', 'node_modules');
const nestedUndici = path.join(nestedDir, 'undici');
const rootUndici = path.join(root, 'node_modules', 'undici');

function versionOf(pkgDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).version;
  } catch {
    return null;
  }
}

if (!fs.existsSync(path.join(root, 'node_modules', 'open-nfse'))) {
  process.exit(0);
}

const rootVer = versionOf(rootUndici);
if (!rootVer || !rootVer.startsWith('6.')) {
  console.warn('[pin-open-nfse-undici] undici@6 não encontrado na raiz; pulando.');
  process.exit(0);
}

const nestedVer = versionOf(nestedUndici);
if (nestedVer && nestedVer.startsWith('6.')) {
  process.exit(0);
}

fs.mkdirSync(nestedDir, { recursive: true });
fs.rmSync(nestedUndici, { recursive: true, force: true });
fs.cpSync(rootUndici, nestedUndici, { recursive: true });
console.log(`[pin-open-nfse-undici] undici@${rootVer} aplicado em open-nfse/node_modules`);
