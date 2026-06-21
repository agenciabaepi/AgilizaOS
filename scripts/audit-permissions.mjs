/**
 * Auditoria do sistema de permissões (simulação alinhada ao middleware + menu).
 * Executar: node scripts/audit-permissions.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

const pagePermContent = readFileSync(join(ROOT, 'src/config/pagePermissions.ts'), 'utf8');
const routeMatches = [...pagePermContent.matchAll(/^\s+'([^']+)':\s*(?:'([^']+)'|null)/gm)];
const PAGE_ROUTES = Object.fromEntries(routeMatches.map((m) => [m[1], m[2] ?? null]));

const grantableContent = readFileSync(join(ROOT, 'src/config/grantablePermissions.ts'), 'utf8');
const keyMatches = [...grantableContent.matchAll(/key:\s*'([^']+)'/g)];
const GRANTABLE_KEYS = [...new Set(keyMatches.map((m) => m[1]))];

const MENU_KEYS = [
  'dashboard', 'lembretes', 'ordens', 'caixa', 'movimentacao-caixa', 'clientes',
  'fornecedores', 'equipamentos', 'catalogo', 'financeiro', 'vendas', 'contas-a-pagar',
  'lucro-desempenho', 'bancada', 'comissoes', 'suporte', 'assinatura', 'configuracoes',
];

const CONFIG_TABS = [
  { name: 'Empresa', key: 'empresa' },
  { name: 'Usuários', key: 'usuarios' },
  { name: 'Comissões', key: 'regras-comissoes' },
  { name: 'Precificação', key: 'precificacao' },
  { name: 'Equipamentos', key: 'equipamentos-config' },
  { name: 'Aparelhos', key: 'aparelhos' },
  { name: 'Checklist', key: 'checklist' },
  { name: 'Termos', key: 'termos-config' },
  { name: 'Status', key: 'status' },
  { name: 'Link Público', key: 'link-publico' },
  { name: 'Catálogo', key: 'catalogo-config' },
  { name: 'WhatsApp', key: 'whatsapp' },
  { name: 'Avisos', key: 'avisos' },
];

const TEST_PATHS = [
  '/dashboard-atendente', '/ordens', '/lembretes', '/clientes', '/financeiro',
  '/configuracoes', '/configuracoes/usuarios', '/configuracoes/status',
  '/suporte', '/bancada', '/comissoes', '/catalogo', '/assinatura', '/perfil',
];

const LEGACY = {
  'regras-comissoes': ['comissoes'],
  'equipamentos-config': ['equipamentos'],
  'termos-config': ['termos'],
  'catalogo-config': ['catalogo'],
};

const TECNICO_DEFAULT = ['dashboard', 'bancada', 'comissoes'];

function matchesPermission(permissoes, requiredKey) {
  if (permissoes.includes(requiredKey)) return true;
  for (const [canonical, aliases] of Object.entries(LEGACY)) {
    if (canonical === requiredKey) return aliases.some((a) => permissoes.includes(a));
  }
  return false;
}

function hasFullAccess(nivel) {
  return nivel === 'admin' || nivel === 'usuarioteste';
}

function shouldEnforce(nivel) {
  if (hasFullAccess(nivel)) return false;
  const n = nivel?.toLowerCase?.() ?? nivel;
  return n === 'tecnico' || n === 'atendente' || n === 'financeiro';
}

function resolveUserPermissions(nivel, raw) {
  const list = normalizePermissoes(raw);
  if (hasFullAccess(nivel)) return GRANTABLE_KEYS;
  if (list.length > 0) return list;
  return ROLE_DEFAULTS[nivel] || ['dashboard'];
}

const ROLE_DEFAULTS = {
  tecnico: ['dashboard', 'bancada', 'comissoes', 'suporte'],
  atendente: ['dashboard', 'lembretes', 'clientes', 'ordens', 'equipamentos', 'caixa', 'catalogo', 'suporte'],
  financeiro: ['dashboard', 'lembretes', 'clientes', 'ordens', 'equipamentos', 'financeiro', 'vendas', 'movimentacao-caixa', 'contas-a-pagar', 'lucro-desempenho', 'caixa', 'suporte', 'assinatura'],
};

function normalizePermissoes(raw) {
  if (Array.isArray(raw)) return raw.filter((p) => typeof p === 'string');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((p) => typeof p === 'string');
    } catch { /* ignore */ }
  }
  return [];
}

function canUseModule(key, nivel, raw) {
  if (hasFullAccess(nivel)) return true;
  if (!shouldEnforce(nivel)) return true;
  return matchesPermission(resolveUserPermissions(nivel, raw), key);
}

function isBlockedByNivel(pathname, nivel) {
  const n = nivel;
  const clean = pathname.split('?')[0];
  if (clean === '/comissoes' && n !== 'tecnico') return true;
  if (clean === '/assinatura' && n === 'tecnico') return true;
  if (clean.startsWith('/financeiro/comissoes-tecnicos') && n === 'tecnico') return true;
  return false;
}

function checkRouteAccess(pathname, nivel, raw) {
  if (hasFullAccess(nivel)) return true;
  if (isBlockedByNivel(pathname, nivel)) return false;
  if (!shouldEnforce(nivel)) return true;
  const effective = resolveUserPermissions(nivel, raw);
  return canAccessPath(pathname, effective, nivel, normalizePermissoes(raw));
}

function middlewareAllows(pathname, nivel, raw) {
  if (!shouldEnforce(nivel, raw)) return true;
  return checkRouteAccess(pathname, nivel, raw);
}

function getRequired(pathname) {
  const clean = pathname.split('?')[0];
  if (PAGE_ROUTES[clean] !== undefined) return PAGE_ROUTES[clean];
  for (const [route, perm] of Object.entries(PAGE_ROUTES)) {
    if (route.includes('[')) {
      const regex = new RegExp('^' + route.replace(/\[.*?\]/g, '[^/]+').replace(/\//g, '\\/') + '$');
      if (regex.test(clean)) return perm;
    }
  }
  return null;
}

function canAccessPath(pathname, permissoes, nivel, raw) {
  if (hasFullAccess(nivel)) return true;
  const clean = pathname.split('?')[0];
  if (['/perfil', '/sobre', '/politicas-privacidade'].includes(clean)) return true;
  const required = getRequired(clean);
  if (required === null) return !shouldEnforce(nivel);
  return matchesPermission(permissoes, required);
}

const scenarios = [
  { name: 'tecnico restrito (só bancada)', nivel: 'tecnico', permissoes: ['dashboard', 'bancada', 'comissoes'] },
  { name: 'atendente sem ordens', nivel: 'atendente', permissoes: ['dashboard', 'lembretes', 'clientes', 'caixa'] },
  { name: 'atendente legado (sem permissoes)', nivel: 'atendente', permissoes: [] },
  { name: 'financeiro só financeiro', nivel: 'financeiro', permissoes: ['dashboard', 'financeiro', 'vendas'] },
  { name: 'atendente config parcial', nivel: 'atendente', permissoes: ['dashboard', 'configuracoes', 'empresa', 'status'] },
];

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.log('  ❌ FALHA:', message);
    failures += 1;
  }
}

console.log('=== AUDITORIA DE PERMISSÕES ===\n');

for (const s of scenarios) {
  console.log(`--- ${s.name} ---`);

  for (const path of TEST_PATHS) {
    const enforced = shouldEnforce(s.nivel, s.permissoes);
    const allowed = middlewareAllows(path, s.nivel, s.permissoes);
    const perm = getRequired(path);
    console.log(`  ${allowed ? '✅' : '🚫'} ${path}${enforced ? '' : ' (sem enforcement)'} → ${perm ?? 'sem mapa'}`);
  }

  const menuVisible = MENU_KEYS.filter((k) => canUseModule(k, s.nivel, s.permissoes));
  console.log('  Menu:', menuVisible.join(', ') || '(nenhum)');

  if (canUseModule('configuracoes', s.nivel, s.permissoes)) {
    const tabs = CONFIG_TABS.filter((t) => canUseModule(t.key, s.nivel, s.permissoes));
    console.log('  Abas config:', tabs.map((t) => t.name).join(', ') || '(nenhuma)');
  }

  // Regras de consistência menu × middleware
  if (s.nivel === 'tecnico' && s.permissoes.includes('bancada') && !s.permissoes.includes('ordens')) {
    assert(!middlewareAllows('/ordens', s.nivel, s.permissoes), 'tecnico sem ordens não deve acessar /ordens');
    assert(!menuVisible.includes('ordens'), 'tecnico sem ordens não deve ver ordens no menu');
    assert(middlewareAllows('/bancada', s.nivel, s.permissoes), 'tecnico com bancada deve acessar /bancada');
  }

  if (s.nivel === 'atendente' && s.permissoes.length > 0 && !s.permissoes.includes('ordens')) {
    assert(!middlewareAllows('/ordens', s.nivel, s.permissoes), 'atendente sem ordens não deve acessar /ordens');
    assert(!menuVisible.includes('ordens'), 'atendente sem ordens não deve ver ordens no menu');
  }

  if (s.nivel === 'atendente' && s.permissoes.length === 0) {
    assert(middlewareAllows('/ordens', s.nivel, s.permissoes), 'atendente legado usa defaults e acessa ordens');
    assert(menuVisible.includes('ordens'), 'atendente legado vê ordens no menu (defaults)');
  }

  if (s.name === 'atendente config parcial') {
    assert(middlewareAllows('/configuracoes', s.nivel, s.permissoes), 'deve acessar hub config');
    assert(!middlewareAllows('/configuracoes/usuarios', s.nivel, s.permissoes), 'não deve acessar usuários');
    assert(middlewareAllows('/configuracoes/status', s.nivel, s.permissoes), 'deve acessar status direto');
  }

  console.log('');
}

console.log(failures === 0 ? '✅ Todos os testes de consistência passaram.' : `⚠️  ${failures} falha(s) encontrada(s).`);
