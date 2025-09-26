const fetch = require('node-fetch');

async function testarAPIDireta() {
  console.log('🧪 TESTANDO API DIRETAMENTE VIA HTTP\n');

  try {
    // Dados da OS para teste
    const dadosOS = {
      cliente_id: 'teste-cliente-id',
      tecnico_id: null,
      status: 'EM_ANALISE',
      equipamento: 'IMPRESSORA',
      empresa_id: '22a804a8-b16e-4c6a-8c8f-9f6b1d8784ed',
      numero_os: 'TESTE-HTTP-001',
      marca: 'TESTE',
      modelo: 'TESTE',
      problema_relatado: 'Teste via HTTP'
    };

    console.log('📋 Enviando dados:', dadosOS);

    // Fazer requisição para a API
    const response = await fetch('http://localhost:3000/api/ordens/criar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dadosOS)
    });

    console.log('📡 Status da resposta:', response.status);
    console.log('📡 Headers da resposta:', response.headers.raw());

    const responseText = await response.text();
    console.log('📡 Resposta da API:', responseText);

    if (response.ok) {
      console.log('✅ API respondeu com sucesso!');
    } else {
      console.log('❌ API retornou erro');
    }

  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    console.log('💡 Certifique-se de que o servidor está rodando em http://localhost:3000');
  }
}

testarAPIDireta();
