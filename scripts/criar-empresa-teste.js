const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarEmpresaTeste() {
  console.log('🔍 Criando empresa de teste...\n');

  try {
    // Verificar se já existe uma empresa
    const { data: empresasExistentes, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nome')
      .limit(1);

    if (empresasError) {
      console.log('❌ Erro ao verificar empresas:', empresasError);
      return;
    }

    if (empresasExistentes && empresasExistentes.length > 0) {
      console.log('✅ Já existe uma empresa:', empresasExistentes[0]);
      return;
    }

    // Criar empresa de teste
    console.log('📋 Criando empresa de teste...');
    const { data: novaEmpresa, error: empresaError } = await supabase
      .from('empresas')
      .insert({
        nome: 'Empresa Teste',
        email: 'teste@empresa.com',
        telefone: '(11) 99999-9999',
        ativo: true
      })
      .select()
      .single();

    if (empresaError) {
      console.log('❌ Erro ao criar empresa:', empresaError);
      return;
    }

    console.log('✅ Empresa criada com sucesso:', novaEmpresa);

    // Agora criar os tipos de equipamentos para esta empresa
    console.log('\n📋 Criando tipos de equipamentos...');
    
    const tiposEquipamentos = [
      { nome: 'CELULAR', categoria: 'CELULAR', descricao: 'Telefone celular/smartphone' },
      { nome: 'COMPUTADOR', categoria: 'COMPUTADOR', descricao: 'Computador desktop' },
      { nome: 'NOTEBOOK', categoria: 'NOTEBOOK', descricao: 'Notebook/laptop' },
      { nome: 'TABLET', categoria: 'TABLET', descricao: 'Tablet/iPad' },
      { nome: 'IMPRESSORA', categoria: 'IMPRESSORA', descricao: 'Impressora' },
      { nome: 'CAIXA DE SOM', categoria: 'CAIXA DE SOM', descricao: 'Caixa de som/alto-falante' },
      { nome: 'RELÓGIO', categoria: 'RELÓGIO', descricao: 'Relógio inteligente/smartwatch' },
      { nome: 'MONITOR', categoria: 'MONITOR', descricao: 'Monitor de computador' }
    ];

    const equipamentosParaInserir = tiposEquipamentos.map(tipo => ({
      ...tipo,
      empresa_id: novaEmpresa.id,
      ativo: true,
      quantidade_cadastrada: 0
    }));

    const { data: equipamentosCriados, error: equipamentosError } = await supabase
      .from('equipamentos_tipos')
      .insert(equipamentosParaInserir)
      .select();

    if (equipamentosError) {
      console.log('❌ Erro ao criar equipamentos:', equipamentosError);
    } else {
      console.log('✅ Equipamentos criados com sucesso:', equipamentosCriados?.length || 0);
    }

    console.log('\n🎉 Setup completo! Agora você pode acessar a página de equipamentos.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

criarEmpresaTeste();
