// =====================================================
// TESTE DA API DE ATUALIZAÇÃO DE OS
// =====================================================
// Este script testa a API de atualização de OS para identificar o problema

const testUpdateOS = async () => {
  try {
    console.log('🧪 Testando atualização de OS...');
    
    // Dados de teste para atualizar uma OS
    const testData = {
      osId: '124', // ID da OS que você está tentando editar
      newStatus: 'ORÇAMENTO',
      newStatusTecnico: 'em atendimento',
      servico: 'Reparo',
      tecnico_id: 'techrodolfo',
      equipamento: 'CELULAR',
      marca: 'APPLE',
      modelo: 'IPHONE 11',
      cor: 'ROSA',
      numero_serie: '123123',
      problema_relatado: 'NÃO LIGA'
    };
    
    console.log('📋 Dados de teste:', testData);
    
    // Testar a API de atualização de status
    const response = await fetch('/api/ordens/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Resposta da API:', result);
    
    if (response.ok) {
      console.log('✅ API de atualização funcionando!');
      return { success: true, data: result };
    } else {
      console.log('❌ Erro na API de atualização:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return { success: false, error: error.message };
  }
};

// Executar o teste
testUpdateOS().then(result => {
  console.log('🎯 Resultado final:', result);
});

// =====================================================
// INSTRUÇÕES DE USO:
// =====================================================
// 1. Abra o console do navegador (F12)
// 2. Vá para a aba "Console"
// 3. Cole este código
// 4. Execute e veja o resultado
// 5. Se der erro, copie a mensagem de erro completa

