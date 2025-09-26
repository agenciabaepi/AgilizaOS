console.log('🔧 CORREÇÃO DO ERRO: Coluna equipamento não encontrada\n');

console.log('❌ PROBLEMA:');
console.log('   Erro: "Could not find the \'equipamento\' column of \'ordens_servico\'"');
console.log('   A coluna equipamento não existe na tabela ordens_servico\n');

console.log('✅ SOLUÇÃO:');
console.log('   1. Acesse o Supabase Dashboard');
console.log('   2. Vá para SQL Editor');
console.log('   3. Execute o seguinte SQL:\n');

console.log('   ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS equipamento VARCHAR(255);\n');

console.log('🔍 VERIFICAÇÃO:');
console.log('   Após executar o SQL, verifique se a coluna foi criada:');
console.log('   SELECT column_name FROM information_schema.columns');
console.log('   WHERE table_name = \'ordens_servico\' AND column_name = \'equipamento\';\n');

console.log('🎯 RESULTADO ESPERADO:');
console.log('   - Coluna equipamento criada na tabela ordens_servico');
console.log('   - Criação de OS funcionando normalmente');
console.log('   - Contador de equipamentos funcionando\n');

console.log('📋 ARQUIVOS CRIADOS:');
console.log('   - migrate-equipamento-column.sql (SQL para executar)');
console.log('   - migrate-equipamento-column.js (este script)\n');

console.log('🚀 APÓS A CORREÇÃO:');
console.log('   - Teste criar uma nova OS');
console.log('   - Verifique se o contador de equipamentos funciona');
console.log('   - Confirme que não há mais erros');
