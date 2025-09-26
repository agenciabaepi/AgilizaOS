const fetch = require('node-fetch');

async function testarAPICompleta() {
  console.log('🔍 Testando API completa de equipamentos...\n');

  const baseUrl = 'http://localhost:3001';
  const empresaId = '22a804a8-b16e-4c6a-8c8f-9f6b1d8784ed';

  try {
    // Teste 1: GET - Listar equipamentos
    console.log('1️⃣ Testando GET /api/equipamentos-tipos...');
    const getResponse = await fetch(`${baseUrl}/api/equipamentos-tipos?empresa_id=${empresaId}`);
    const getData = await getResponse.json();
    
    console.log('Status:', getResponse.status);
    console.log('Equipamentos encontrados:', getData.equipamentos?.length || 0);
    
    if (getResponse.ok) {
      console.log('✅ GET funcionando perfeitamente');
    } else {
      console.log('❌ Erro no GET:', getData);
    }

    // Teste 2: POST - Criar equipamento
    console.log('\n2️⃣ Testando POST /api/equipamentos-tipos...');
    const postData = {
      nome: 'IMPRESSORA',
      categoria: 'IMPRESSORA',
      descricao: 'Impressora de teste',
      ativo: true,
      empresa_id: empresaId
    };

    const postResponse = await fetch(`${baseUrl}/api/equipamentos-tipos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData)
    });

    const postResult = await postResponse.json();
    console.log('Status:', postResponse.status);
    
    if (postResponse.ok) {
      console.log('✅ POST funcionando perfeitamente');
      console.log('Equipamento criado:', postResult.equipamento?.nome);
    } else {
      console.log('❌ Erro no POST:', postResult);
    }

    // Teste 3: GET novamente para verificar se foi criado
    console.log('\n3️⃣ Verificando se equipamento foi criado...');
    const getResponse2 = await fetch(`${baseUrl}/api/equipamentos-tipos?empresa_id=${empresaId}`);
    const getData2 = await getResponse2.json();
    
    console.log('Equipamentos após criação:', getData2.equipamentos?.length || 0);
    
    const impressora = getData2.equipamentos?.find(e => e.nome === 'IMPRESSORA');
    if (impressora) {
      console.log('✅ Impressora encontrada:', impressora.nome);
    } else {
      console.log('❌ Impressora não encontrada');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testarAPICompleta();
