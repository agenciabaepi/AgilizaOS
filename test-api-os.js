// =====================================================
// TESTE DA API DE CRIAÇÃO DE OS
// =====================================================
// Este script testa a API de criação de OS para identificar o problema

const testCreateOS = async () => {
  try {
    console.log('🧪 Testando criação de OS...');
    
    // Dados de teste para criar uma OS
    const testData = {
      numero_os: 'TESTE-' + Date.now(),
      cliente_id: '123e4567-e89b-12d3-a456-426614174000', // UUID fake
      usuario_id: '123e4567-e89b-12d3-a456-426614174001', // UUID fake
      empresa_id: '123e4567-e89b-12d3-a456-426614174002', // UUID fake
      equipamento: 'Smartphone',
      marca: 'Samsung',
      modelo: 'Galaxy S21',
      problema_relatado: 'Não liga',
      status: 'ABERTA',
      created_at: new Date().toISOString()
    };
    
    console.log('📋 Dados de teste:', testData);
    
    // Testar a API
    const response = await fetch('/api/ordens/criar', {
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
      console.log('✅ API funcionando!');
      return { success: true, data: result };
    } else {
      console.log('❌ Erro na API:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return { success: false, error: error.message };
  }
};

// Executar o teste
testCreateOS().then(result => {
  console.log('🎯 Resultado final:', result);
});

// =====================================================
// INSTRUÇÕES DE USO:
// =====================================================
// 1. Abra o console do navegador (F12)
// 2. Cole este código
// 3. Execute e veja o resultado
// 4. Se der erro, copie a mensagem de erro

