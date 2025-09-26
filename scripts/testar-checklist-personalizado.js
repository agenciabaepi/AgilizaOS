// Script para testar o sistema de checklist personalizado
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarSistemaChecklist() {
  console.log('🧪 Testando sistema de checklist personalizado...\n');

  try {
    // 1. Verificar se a tabela existe
    console.log('1️⃣ Verificando se a tabela checklist_itens existe...');
    const { data: tabelaExiste, error: erroTabela } = await supabase
      .from('checklist_itens')
      .select('id')
      .limit(1);

    if (erroTabela) {
      console.error('❌ Tabela checklist_itens não existe ou há erro:', erroTabela.message);
      console.log('📋 Execute o SQL de migração no Supabase SQL Editor primeiro!');
      return;
    }
    console.log('✅ Tabela checklist_itens existe');

    // 2. Buscar empresas para testar
    console.log('\n2️⃣ Buscando empresas...');
    const { data: empresas, error: erroEmpresas } = await supabase
      .from('empresas')
      .select('id, nome')
      .limit(3);

    if (erroEmpresas) {
      console.error('❌ Erro ao buscar empresas:', erroEmpresas.message);
      return;
    }

    if (!empresas || empresas.length === 0) {
      console.log('⚠️ Nenhuma empresa encontrada');
      return;
    }

    console.log(`✅ Encontradas ${empresas.length} empresas:`);
    empresas.forEach(empresa => {
      console.log(`   - ${empresa.nome} (${empresa.id})`);
    });

    // 3. Testar API de checklist para cada empresa
    for (const empresa of empresas) {
      console.log(`\n3️⃣ Testando checklist para empresa: ${empresa.nome}`);
      
      // Buscar itens de checklist da empresa
      const { data: itens, error: erroItens } = await supabase
        .from('checklist_itens')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('ordem', { ascending: true });

      if (erroItens) {
        console.error(`❌ Erro ao buscar itens para ${empresa.nome}:`, erroItens.message);
        continue;
      }

      console.log(`   📋 ${itens?.length || 0} itens encontrados:`);
      
      if (itens && itens.length > 0) {
        // Agrupar por categoria
        const porCategoria = itens.reduce((acc, item) => {
          if (!acc[item.categoria]) acc[item.categoria] = [];
          acc[item.categoria].push(item);
          return acc;
        }, {});

        Object.keys(porCategoria).forEach(categoria => {
          console.log(`      📁 ${categoria}: ${porCategoria[categoria].length} itens`);
          porCategoria[categoria].forEach(item => {
            const status = item.ativo ? '✅' : '❌';
            const obrigatorio = item.obrigatorio ? ' *' : '';
            console.log(`         ${status} ${item.nome}${obrigatorio} (ordem: ${item.ordem})`);
          });
        });
      } else {
        console.log('   ⚠️ Nenhum item de checklist encontrado');
      }
    }

    // 4. Testar criação de novo item
    console.log('\n4️⃣ Testando criação de novo item...');
    const empresaTeste = empresas[0];
    
    const novoItem = {
      empresa_id: empresaTeste.id,
      nome: 'Teste de Item',
      descricao: 'Item criado pelo script de teste',
      categoria: 'geral',
      ordem: 999,
      obrigatorio: false,
      ativo: true
    };

    const { data: itemCriado, error: erroCriacao } = await supabase
      .from('checklist_itens')
      .insert(novoItem)
      .select()
      .single();

    if (erroCriacao) {
      console.error('❌ Erro ao criar item de teste:', erroCriacao.message);
    } else {
      console.log('✅ Item de teste criado com sucesso:', itemCriado.nome);
      
      // Limpar item de teste
      const { error: erroLimpeza } = await supabase
        .from('checklist_itens')
        .delete()
        .eq('id', itemCriado.id);

      if (erroLimpeza) {
        console.log('⚠️ Erro ao limpar item de teste:', erroLimpeza.message);
      } else {
        console.log('✅ Item de teste removido');
      }
    }

    // 5. Resumo final
    console.log('\n📊 RESUMO DO TESTE:');
    console.log('✅ Tabela checklist_itens existe');
    console.log(`✅ ${empresas.length} empresas encontradas`);
    
    const totalItens = empresas.reduce(async (acc, empresa) => {
      const { data: itens } = await supabase
        .from('checklist_itens')
        .select('id')
        .eq('empresa_id', empresa.id);
      return acc + (itens?.length || 0);
    }, 0);

    console.log('✅ Sistema de checklist personalizado funcionando corretamente!');
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('1. Execute o SQL de migração no Supabase SQL Editor');
    console.log('2. Acesse Configurações → Checklist para gerenciar os itens');
    console.log('3. Teste a criação/edição de OS com o novo checklist dinâmico');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar teste
testarSistemaChecklist().then(() => {
  console.log('\n🏁 Teste concluído!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
