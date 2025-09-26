console.log('🔍 LOGS DE DEBUG ADICIONADOS PARA DIAGNÓSTICO\n');

console.log('❌ PROBLEMA:');
console.log('   - Usuário grava tipo do aparelho');
console.log('   - Salva a OS');
console.log('   - Quando volta, não gravou ❌\n');

console.log('✅ LOGS ADICIONADOS:');
console.log('   1. Na função fetchOrdem (carregamento):');
console.log('      - Log dos dados carregados do banco');
console.log('      - Log específico do campo equipamento');
console.log('      - Log completo dos dados da OS\n');
console.log('   2. Na função handleSalvar (salvamento):');
console.log('      - Log dos dados sendo enviados');
console.log('      - Log específico do campo equipamento');
console.log('      - Log do estado atual do equipamento');
console.log('      - Log completo do updateData\n');

console.log('🧪 COMO TESTAR:');
console.log('   1. Abrir uma OS para editar');
console.log('   2. Verificar logs no console (carregamento)');
console.log('   3. Alterar o tipo de equipamento');
console.log('   4. Salvar a OS');
console.log('   5. Verificar logs no console (salvamento)');
console.log('   6. Recarregar a página');
console.log('   7. Verificar se o equipamento foi salvo\n');

console.log('📋 INFORMAÇÕES DOS LOGS:');
console.log('   - fetchOrdem: mostra se o campo está sendo carregado');
console.log('   - handleSalvar: mostra se o campo está sendo enviado');
console.log('   - API logs: mostram se está sendo processado\n');

console.log('🎯 RESULTADO ESPERADO:');
console.log('   Os logs vão revelar exatamente onde está o problema:');
console.log('   - Se não carrega: problema na query/banco');
console.log('   - Se não envia: problema no estado React');
console.log('   - Se não processa: problema na API');
console.log('   - Se não salva: problema na atualização');
