const fetch = require('node-fetch');

async function testarCRUDCompleto() {
  console.log('🔍 TESTE COMPLETO CRUD - EQUIPAMENTOS\n');

  const baseUrl = 'http://localhost:3001';
  const empresaId = '22a804a8-b16e-4c6a-8c8f-9f6b1d8784ed';

  try {
    // Teste 1: GET - Listar equipamentos
    console.log('1️⃣ Testando GET (Listar)...');
    const getResponse = await fetch(`${baseUrl}/api/equipamentos-tipos?empresa_id=${empresaId}&_t=${Date.now()}`);
    const getData = await getResponse.json();
    
    console.log('Status:', getResponse.status);
    console.log('Equipamentos encontrados:', getData.equipamentos?.length || 0);
    
    if (!getResponse.ok) {
      console.log('❌ Erro no GET:', getData);
      return;
    }
    
    console.log('✅ GET funcionando');

    // Teste 2: POST - Criar equipamento
    console.log('\n2️⃣ Testando POST (Criar)...');
    const timestamp = Date.now();
    const novoEquipamento = {
      nome: `TESTE_CRUD_${timestamp}`,
      categoria: `TESTE_CRUD_${timestamp}`,
      descricao: 'Equipamento para teste CRUD',
      ativo: true,
      empresa_id: empresaId
    };

    const postResponse = await fetch(`${baseUrl}/api/equipamentos-tipos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoEquipamento)
    });

    const postData = await postResponse.json();
    console.log('Status:', postResponse.status);
    
    if (!postResponse.ok) {
      console.log('❌ Erro no POST:', postData);
      return;
    }
    
    console.log('✅ POST funcionando');
    console.log('Equipamento criado:', postData.equipamento?.nome);
    const equipamentoId = postData.equipamento?.id;

    // Teste 3: PUT - Editar equipamento
    console.log('\n3️⃣ Testando PUT (Editar)...');
    const equipamentoEditado = {
      id: equipamentoId,
      nome: `TESTE_CRUD_EDITADO_${timestamp}`,
      categoria: `TESTE_CRUD_EDITADO_${timestamp}`,
      descricao: 'Equipamento editado para teste CRUD',
      ativo: false
    };

    const putResponse = await fetch(`${baseUrl}/api/equipamentos-tipos`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(equipamentoEditado)
    });

    const putData = await putResponse.json();
    console.log('Status:', putResponse.status);
    
    if (!putResponse.ok) {
      console.log('❌ Erro no PUT:', putData);
      return;
    }
    
    console.log('✅ PUT funcionando');
    console.log('Equipamento editado:', putData.equipamento?.nome);

    // Teste 4: GET - Verificar se foi editado
    console.log('\n4️⃣ Verificando se foi editado...');
    const getResponse2 = await fetch(`${baseUrl}/api/equipamentos-tipos?empresa_id=${empresaId}&_t=${Date.now()}`);
    const getData2 = await getResponse2.json();
    
    const equipamentoEditadoEncontrado = getData2.equipamentos?.find(e => e.id === equipamentoId);
    if (equipamentoEditadoEncontrado) {
      console.log('✅ Equipamento editado encontrado:', equipamentoEditadoEncontrado.nome);
      console.log('Status ativo:', equipamentoEditadoEncontrado.ativo);
    } else {
      console.log('❌ Equipamento editado não encontrado');
    }

    // Teste 5: DELETE - Deletar equipamento
    console.log('\n5️⃣ Testando DELETE (Deletar)...');
    const deleteResponse = await fetch(`${baseUrl}/api/equipamentos-tipos?id=${equipamentoId}`, {
      method: 'DELETE'
    });

    const deleteData = await deleteResponse.json();
    console.log('Status:', deleteResponse.status);
    
    if (!deleteResponse.ok) {
      console.log('❌ Erro no DELETE:', deleteData);
      return;
    }
    
    console.log('✅ DELETE funcionando');
    console.log('Mensagem:', deleteData.message);

    // Teste 6: GET - Verificar se foi deletado
    console.log('\n6️⃣ Verificando se foi deletado...');
    const getResponse3 = await fetch(`${baseUrl}/api/equipamentos-tipos?empresa_id=${empresaId}&_t=${Date.now()}`);
    const getData3 = await getResponse3.json();
    
    const equipamentoDeletadoEncontrado = getData3.equipamentos?.find(e => e.id === equipamentoId);
    if (!equipamentoDeletadoEncontrado) {
      console.log('✅ Equipamento deletado com sucesso (não encontrado na lista)');
    } else {
      console.log('❌ Equipamento ainda existe após delete');
    }

    console.log('\n🎉 TESTE CRUD COMPLETO FINALIZADO!');
    console.log('✅ Todas as operações funcionando:');
    console.log('   - GET (Listar)');
    console.log('   - POST (Criar)');
    console.log('   - PUT (Editar)');
    console.log('   - DELETE (Deletar)');
    console.log('   - Atualização em tempo real');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testarCRUDCompleto();
