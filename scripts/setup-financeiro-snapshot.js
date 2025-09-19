#!/usr/bin/env node

/**
 * Script para configurar o sistema de snapshot financeiro no Supabase
 * Execute este script após criar as tabelas de vendas e contas a pagar
 */

const fs = require('fs');
const path = require('path');

// Caminho para o arquivo SQL
const sqlFilePath = path.join(__dirname, '../src/lib/sql/snapshot_financeiro.sql');

console.log('🚀 Configurando Snapshot Financeiro...');
console.log('📁 Arquivo SQL:', sqlFilePath);

// Verificar se o arquivo existe
if (!fs.existsSync(sqlFilePath)) {
  console.error('❌ Arquivo SQL não encontrado:', sqlFilePath);
  process.exit(1);
}

// Ler o conteúdo do arquivo SQL
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

console.log('📄 Conteúdo do arquivo SQL:');
console.log('─'.repeat(50));
console.log(sqlContent);
console.log('─'.repeat(50));

console.log('\n📋 Instruções para aplicar no Supabase:');
console.log('1. Acesse o painel do Supabase (https://supabase.com/dashboard)');
console.log('2. Vá para o seu projeto');
console.log('3. Navegue até SQL Editor');
console.log('4. Cole o conteúdo do arquivo SQL acima');
console.log('5. Execute o script');

console.log('\n✅ Após executar o SQL, o sistema estará pronto para usar!');
console.log('\n🔗 URLs disponíveis:');
console.log('- Página de Vendas: /financeiro/vendas');
console.log('- Dashboard Financeiro: /financeiro/dashboard');

console.log('\n📊 Funcionalidades implementadas:');
console.log('- ✅ Snapshot financeiro na página de vendas');
console.log('- ✅ Cards de Receita, Despesas e Lucro');
console.log('- ✅ Dashboard financeiro detalhado');
console.log('- ✅ Filtros por período');
console.log('- ✅ Botão "Ver detalhes" para navegação');
console.log('- ✅ Views SQL para performance');
console.log('- ✅ Funções SQL para cálculos');

console.log('\n🎯 Próximos passos (Task 3 - Opcional):');
console.log('- 📈 Gráficos de receita x despesa');
console.log('- 📊 Comparação com período anterior');
console.log('- 📄 Exportação em PDF/Excel');
console.log('- 🏷️ Gráficos de categorias de despesa');
