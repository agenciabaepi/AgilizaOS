const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createSampleGroups() {
  console.log('🔧 Criando grupos de exemplo...\n');

  const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
  
  const gruposExemplo = [
    {
      nome: 'INFORMÁTICA',
      descricao: 'Equipamentos de informática e tecnologia',
      empresa_id: empresaId
    },
    {
      nome: 'ELETRODOMÉSTICOS',
      descricao: 'Aparelhos eletrodomésticos em geral',
      empresa_id: empresaId
    },
    {
      nome: 'CELULARES',
      descricao: 'Smartphones e acessórios',
      empresa_id: empresaId
    },
    {
      nome: 'ELETRÔNICOS',
      descricao: 'Equipamentos eletrônicos diversos',
      empresa_id: empresaId
    }
  ];

  try {
    console.log(`📊 Inserindo ${gruposExemplo.length} grupos para empresa ${empresaId}...`);
    
    const { data, error } = await supabase
      .from('grupos_produtos')
      .insert(gruposExemplo)
      .select();

    if (error) {
      console.error('❌ Erro ao inserir grupos:', error);
      return;
    }

    console.log('✅ Grupos criados com sucesso!');
    data.forEach((grupo, index) => {
      console.log(`  ${index + 1}. ${grupo.nome} (ID: ${grupo.id})`);
    });

    // Verificar se agora a query funciona
    console.log('\n🔍 Testando query após inserção...');
    const { data: grupos, error: queryError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (queryError) {
      console.error('❌ Erro na query de verificação:', queryError);
    } else {
      console.log(`✅ Query funcionando! Encontrados ${grupos.length} grupos:`);
      grupos.forEach((grupo, index) => {
        console.log(`  ${index + 1}. ${grupo.nome}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

createSampleGroups();