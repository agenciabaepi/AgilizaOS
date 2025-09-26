const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarCriacaoEquipamento() {
  console.log('🔍 Testando criação de equipamento...\n');

  try {
    // Simular os dados que vêm do frontend
    const body = {
      nome: 'CELULAR',
      categoria: 'CELULAR',
      descricao: '',
      ativo: true,
      empresa_id: '22a804a8-b16e-4c6a-8c8f-9f6b1d8784ed'
    };

    console.log('📋 Body recebido:', body);

    const { nome, categoria, descricao, empresa_id } = body;

    if (!nome || !categoria || !empresa_id) {
      console.log('❌ Campos obrigatórios faltando:', { nome, categoria, empresa_id });
      return;
    }

    // Verificar se já existe
    console.log('🔍 Verificando se equipamento já existe...');
    const { data: existing, error: checkError } = await supabase
      .from('equipamentos_tipos')
      .select('id')
      .eq('nome', nome)
      .eq('empresa_id', empresa_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Erro ao verificar equipamento existente:', checkError);
      return;
    }

    if (existing) {
      console.log('❌ Equipamento já existe:', existing);
      return;
    }

    console.log('🔍 Inserindo novo equipamento...');
    const { data, error } = await supabase
      .from('equipamentos_tipos')
      .insert({
        nome,
        categoria,
        descricao: descricao || null,
        empresa_id,
        ativo: true,
        quantidade_cadastrada: 0
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar equipamento:', error);
    } else {
      console.log('✅ Equipamento criado com sucesso:', data);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testarCriacaoEquipamento();
