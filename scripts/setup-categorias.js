#!/usr/bin/env node

/**
 * Script para configurar as tabelas de categorias de produtos
 * Execute: node scripts/setup-categorias.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Configurando tabelas de categorias de produtos...\n');

// Ler o arquivo SQL
const sqlFile = path.join(__dirname, '../src/lib/sql/categorias.sql');

// Verificar se o arquivo existe
if (!fs.existsSync(sqlFile)) {
  console.error('❌ Arquivo SQL não encontrado:', sqlFile);
  console.log('📁 Verificando arquivos disponíveis...');
  
  // Listar arquivos SQL disponíveis
  const dbDir = path.join(__dirname, '../database');
  if (fs.existsSync(dbDir)) {
    const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.sql'));
    console.log('📋 Arquivos SQL encontrados:', files);
  }
  
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFile, 'utf8');

console.log('📋 SQL encontrado:', sqlFile);
console.log('📏 Tamanho:', sqlContent.length, 'caracteres');

// Instruções para o usuário
console.log('\n📝 INSTRUÇÕES PARA EXECUTAR:');
console.log('=====================================');
console.log('1. Acesse o Supabase Dashboard');
console.log('2. Vá para SQL Editor');
console.log('3. Cole o SQL abaixo');
console.log('4. Clique em "Run"');
console.log('5. Aguarde a execução');
console.log('6. Verifique se não há erros');

console.log('\n📋 SQL PARA EXECUTAR:');
console.log('=====================================');
console.log(sqlContent);
console.log('=====================================');

console.log('\n✅ Após executar o SQL, as seguintes tabelas serão criadas:');
console.log('   - grupos_produtos');
console.log('   - categorias_produtos');
console.log('   - subcategorias_produtos');

console.log('\n🎯 Execute o SQL no Supabase para ativar o sistema de categorias.');