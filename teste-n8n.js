// Script para testar a integração N8N via console do navegador
// Cole este código no console do navegador na página do seu sistema

async function testarN8N(tipo = 'nova-os') {
  try {
    console.log(`🧪 Testando N8N - Tipo: ${tipo}`);
    
    const dadosTeste = {
      os_id: 'test-os-' + Date.now(),
      empresa_id: 'test-empresa-123',
      tecnico_nome: 'João Silva',
      tecnico_whatsapp: '5511999999999',
      cliente_nome: 'Maria Santos',
      cliente_telefone: '5511888888888',
      equipamento: 'iPhone 12',
      servico: 'Troca de tela',
      numero_os: Math.floor(Math.random() * 1000),
      status: tipo === 'nova-os' ? 'Pendente' : 'APROVADO',
      valor: 'R$ 250,00',
      link_os: `https://gestaoconsert.com.br/ordens/test-os-${Date.now()}`
    };

    const response = await fetch('/api/n8n/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo,
        dados: dadosTeste
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Sucesso:', result.message);
      console.log('📊 Resultado completo:', result);
    } else {
      console.error('❌ Erro:', result.message);
      console.error('📊 Detalhes:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
    return { success: false, error: error.message };
  }
}

// Funções de teste específicas
async function testarNovaOS() {
  return await testarN8N('nova-os');
}

async function testarOSAprovada() {
  return await testarN8N('os-aprovada');
}

async function testarMudancaStatus() {
  return await testarN8N('mudanca-status');
}

// Executar todos os testes
async function executarTodosTestes() {
  console.log('🚀 Iniciando todos os testes N8N...');
  
  const resultados = {
    novaOS: await testarNovaOS(),
    osAprovada: await testarOSAprovada(),
    mudancaStatus: await testarMudancaStatus()
  };
  
  console.log('📊 Resumo dos testes:', resultados);
  return resultados;
}

console.log('🧪 Funções de teste N8N carregadas!');
console.log('📋 Comandos disponíveis:');
console.log('  • testarNovaOS() - Testa nova OS');
console.log('  • testarOSAprovada() - Testa OS aprovada');
console.log('  • testarMudancaStatus() - Testa mudança de status');
console.log('  • executarTodosTestes() - Executa todos os testes');
console.log('');
console.log('💡 Exemplo: testarNovaOS()');

