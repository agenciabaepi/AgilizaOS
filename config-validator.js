#!/usr/bin/env node

/**
 * 🛡️ VALIDADOR DE CONFIGURAÇÕES CRÍTICAS
 * 
 * Este script valida se as configurações críticas estão corretas
 * antes de qualquer deploy ou modificação importante.
 */

const fs = require('fs');
const path = require('path');

// Cores para terminal
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateConfig() {
  log('\n🛡️  VALIDANDO CONFIGURAÇÕES CRÍTICAS...', 'blue');
  log('='.repeat(50), 'blue');
  
  let hasErrors = false;
  
  // 1. Validar domínio em arquivos
  const filesToCheck = [
    'vercel.json',
    'next.config.js',
    'next.config.ts',
    '.env.local',
    'env_producao.txt'
  ];
  
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Verificar se tem consert.app (ERRO)
      if (content.includes('consert.app')) {
        log(`❌ ERRO CRÍTICO em ${file}: Encontrado 'consert.app'`, 'red');
        log(`   🔧 CORRIJA para: gestaoconsert.com.br`, 'yellow');
        hasErrors = true;
      }
      
      // Verificar se tem gestaoconsert.com.br (OK)
      if (content.includes('gestaoconsert.com.br')) {
        log(`✅ OK em ${file}: Domínio correto`, 'green');
      }
      
      // Verificar chaves Supabase antigas (JWT) - buscar padrões específicos
      const supabaseJwtPatterns = [
        /NEXT_PUBLIC_SUPABASE_ANON_KEY.*eyJ/,
        /SUPABASE_SERVICE_ROLE_KEY.*eyJ/
      ];
      
      supabaseJwtPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          log(`❌ ERRO em ${file}: Chave Supabase antiga (JWT)`, 'red');
          log(`   🔧 CORRIJA para: sb_publishable_ ou sb_secret_`, 'yellow');
          hasErrors = true;
        }
      });
      
      // Verificar chaves Supabase novas (OK)
      if (content.includes('sb_publishable_') || content.includes('sb_secret_')) {
        log(`✅ OK em ${file}: Chaves Supabase corretas`, 'green');
      }
    }
  });
  
  // 2. Validar configuração protegida
  if (fs.existsSync('.protected-config.json')) {
    const protectedConfig = JSON.parse(fs.readFileSync('.protected-config.json', 'utf8'));
    log(`\n📋 CONFIGURAÇÕES PROTEGIDAS:`, 'blue');
    log(`   🌐 Domínio: ${protectedConfig.protected.domain.production_url}`, 'green');
    log(`   🔑 Supabase URL: ${protectedConfig.protected.supabase.url}`, 'green');
    log(`   👤 Admin: ${protectedConfig.protected.admin.emails}`, 'green');
  }
  
  // 3. Resultado final
  log('\n' + '='.repeat(50), 'blue');
  
  if (hasErrors) {
    log('❌ VALIDAÇÃO FALHOU! Corrija os erros antes de continuar.', 'red');
    log('\n🚨 LEMBRE-SE:', 'yellow');
    log('   • SEMPRE usar gestaoconsert.com.br', 'yellow');
    log('   • NUNCA usar consert.app', 'yellow');
    log('   • Usar apenas chaves sb_publishable_ e sb_secret_', 'yellow');
    process.exit(1);
  } else {
    log('✅ TODAS AS CONFIGURAÇÕES ESTÃO CORRETAS!', 'green');
    log('🚀 Seguro para deploy!', 'green');
  }
}

function showProtectedConfig() {
  if (fs.existsSync('.protected-config.json')) {
    const config = JSON.parse(fs.readFileSync('.protected-config.json', 'utf8'));
    
    log('\n🛡️  CONFIGURAÇÕES PROTEGIDAS:', 'blue');
    log('='.repeat(50), 'blue');
    
    log('\n🌐 DOMÍNIO:', 'yellow');
    log(`   Production: ${config.protected.domain.production_url}`, 'green');
    log(`   ⚠️  ${config.protected.domain.warning}`, 'red');
    
    log('\n🔑 SUPABASE:', 'yellow');
    log(`   URL: ${config.protected.supabase.url}`, 'green');
    log(`   Anon Key: ${config.protected.supabase.anon_key}`, 'green');
    log(`   Service Key: ${config.protected.supabase.service_key}`, 'green');
    log(`   ⚠️  ${config.protected.supabase.warning}`, 'red');
    
    log('\n📋 REGRAS DE VALIDAÇÃO:', 'yellow');
    (config.protected.validation_rules || []).forEach(rule => {
      if (rule.startsWith('✅')) {
        log(`   ${rule}`, 'green');
      } else {
        log(`   ${rule}`, 'red');
      }
    });
  }
}

// Executar baseado no argumento
const command = process.argv[2];

switch(command) {
  case 'validate':
    validateConfig();
    break;
  case 'show':
    showProtectedConfig();
    break;
  default:
    log('🛡️  VALIDADOR DE CONFIGURAÇÕES', 'blue');
    log('\nComandos disponíveis:', 'yellow');
    log('  node config-validator.js validate  - Validar configurações', 'green');
    log('  node config-validator.js show      - Mostrar config protegida', 'green');
    log('\n💡 Execute antes de qualquer deploy!', 'blue');
}
