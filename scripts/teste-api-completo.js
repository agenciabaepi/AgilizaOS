const fetch = require('node-fetch');

async function testarAPICompleta() {
  console.log('🔍 TESTE COMPLETO DA API DE EQUIPAMENTOS\n');

  const baseUrl = 'http://localhost:3001';
  const empresaId = '22a804a8-b16e-4c6a-8c8f-9f6b1d8784ed';

  try {
    // Teste 1: GET - Listar equipamentos
    console.log('1️⃣ Testando GET /api/equipamentos-tipos...');
    const getResponse = await fetch(`${baseUrl}/api/equipamentos-tipos?empresa_id=${empresaId}&_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log('Status:', getResponse.status);
    console.log('Headers:', Object.fromEntries(getResponse.headers.entries()));
    
    const getData = await getResponse.json();
    console.log('Equipamentos encontrados:', getData.equipamentos?.length || 0);
    
    if (getResponse.ok) {
      console.log('✅ GET funcionando perfeitamente');
      if (getData.equipamentos) {
        getData.equipamentos.forEach(e => {
          console.log(`  - ${e.nome} (${e.categoria})`);
        });
      }
    } else {
      console.log('❌ Erro no GET:', getData);
    }

    // Teste 2: POST - Criar equipamento único
    console.log('\n2️⃣ Testando POST /api/equipamentos-tipos...');
    const timestamp = Date.now();
    const postData = {
      nome: `TESTE_${timestamp}`,
      categoria: `TESTE_${timestamp}`,
      descricao: 'Equipamento de teste',
      ativo: true,
      empresa_id: empresaId
    };

    const postResponse = await fetch(`${baseUrl}/api/equipamentos-tipos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
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

    // Teste 3: POST - Tentar criar duplicado (deve dar erro 409)
    console.log('\n3️⃣ Testando POST com nome duplicado (deve dar erro 409)...');
    const postDataDuplicado = {
      nome: 'CELULAR', // Nome que já existe
      categoria: 'CELULAR',
      descricao: 'Teste de duplicado',
      ativo: true,
      empresa_id: empresaId
    };

    const postResponseDuplicado = await fetch(`${baseUrl}/api/equipamentos-tipos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postDataDuplicado)
    });

    const postResultDuplicado = await postResponseDuplicado.json();
    console.log('Status:', postResponseDuplicado.status);
    
    if (postResponseDuplicado.status === 409) {
      console.log('✅ Erro 409 funcionando corretamente (duplicado detectado)');
    } else {
      console.log('❌ Erro inesperado:', postResultDuplicado);
    }

    // Teste 4: GET final para verificar
    console.log('\n4️⃣ Verificação final...');
    const getResponseFinal = await fetch(`${baseUrl}/api/equipamentos-tipos?empresa_id=${empresaId}&_t=${Date.now()}`);
    const getDataFinal = await getResponseFinal.json();
    
    console.log('Equipamentos finais:', getDataFinal.equipamentos?.length || 0);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testarAPICompleta();
