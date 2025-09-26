const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarEdicaoCompleta() {
  console.log('🧪 TESTANDO EDIÇÃO COMPLETA DE OS\n');

  try {
    // 1. Buscar uma OS para testar
    const { data: ordens } = await supabase
      .from('ordens_servico')
      .select('id, numero_os, equipamento, empresa_id')
      .eq('equipamento', 'CELULAR')
      .limit(1);

    if (!ordens || ordens.length === 0) {
      console.error('❌ Nenhuma OS com CELULAR encontrada');
      return;
    }

    const osTeste = ordens[0];
    console.log(`📋 OS selecionada: ${osTeste.numero_os}`);
    console.log(`📱 Equipamento atual: ${osTeste.equipamento}`);
    console.log(`🏢 Empresa: ${osTeste.empresa_id}\n`);

    // 2. Verificar contadores antes
    console.log('📊 CONTADORES ANTES:');
    const { data: equipamentosAntes } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada')
      .eq('empresa_id', osTeste.empresa_id)
      .in('nome', ['CELULAR', 'FONE DE OUVIDO']);

    equipamentosAntes?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos`);
    });

    // 3. Simular edição completa via API update-status (como o frontend faz)
    console.log(`\n🔄 Simulando edição completa via API update-status...`);
    
    const payloadCompleto = {
      osId: osTeste.id,
      newStatus: 'ORÇAMENTO',
      newStatusTecnico: 'em atendimento',
      equipamento: 'FONE DE OUVIDO',
      marca: 'SAMSUNG',
      modelo: 'GALAXY A14',
      cor: 'AZUL',
      numero_serie: '123456789',
      acessorios: 'CAPINHA PRETA',
      condicoes_equipamento: 'MARCAS DE USO',
      problema_relatado: 'TELA TRINCADA',
      laudo: 'TELA NECESSITA TROCA',
      observacao: 'TESTE DE EDIÇÃO',
      checklist_entrada: JSON.stringify({
        aparelhoNaoLiga: false,
        altoFalante: true,
        microfone: true,
        cameraFrontal: true,
        cameraTraseira: true,
        conectores: true,
        botoes: true,
        vibracao: true,
        wifi: true,
        bluetooth: true,
        biometria: true,
        carga: true,
        toqueTela: true
      })
    };

    console.log(`📋 Payload completo:`, JSON.stringify(payloadCompleto, null, 2));
    
    const response = await fetch('http://localhost:3001/api/ordens/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadCompleto)
    });

    console.log(`📡 Status da resposta: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na API: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log('✅ Resposta da API:', JSON.stringify(result, null, 2));

    // 4. Verificar contadores depois
    console.log('\n📊 CONTADORES DEPOIS:');
    const { data: equipamentosDepois } = await supabase
      .from('equipamentos_tipos')
      .select('nome, quantidade_cadastrada')
      .eq('empresa_id', osTeste.empresa_id)
      .in('nome', ['CELULAR', 'FONE DE OUVIDO']);

    equipamentosDepois?.forEach(eq => {
      console.log(`   - ${eq.nome}: ${eq.quantidade_cadastrada} usos`);
    });

    // 5. Verificar se a OS foi alterada
    const { data: osVerificacao } = await supabase
      .from('ordens_servico')
      .select('equipamento, marca, modelo')
      .eq('id', osTeste.id)
      .single();

    console.log(`\n✅ VERIFICAÇÃO FINAL:`);
    console.log(`   OS ${osTeste.numero_os} agora tem:`);
    console.log(`   - Equipamento: ${osVerificacao?.equipamento}`);
    console.log(`   - Marca: ${osVerificacao?.marca}`);
    console.log(`   - Modelo: ${osVerificacao?.modelo}`);

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testarEdicaoCompleta();
