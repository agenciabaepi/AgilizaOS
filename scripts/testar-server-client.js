const { createServerClient } = require('@supabase/ssr');
const { cookies } = require('next/headers');

async function testarComServerClient() {
  console.log('🧪 TESTANDO COM SERVER CLIENT (como na API)\n');

  try {
    // Simular cookies (vazio para teste)
    const cookieStore = {
      get: () => undefined
    };

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name); },
          set() {},
          remove() {},
        },
      }
    );

    // Testar busca de equipamento
    console.log('1️⃣ Testando busca de equipamento:');
    const { data: equipamentoData, error: equipamentoError } = await supabase
      .from('equipamentos_tipos')
      .select('id, quantidade_cadastrada')
      .eq('nome', 'IMPRESSORA')
      .eq('empresa_id', '22a804a8-b16e-4c6a-8c8f-9f6b1d8784ed')
      .single();

    console.log('Resultado:', { equipamentoData, equipamentoError });

    if (!equipamentoError && equipamentoData) {
      console.log('2️⃣ Testando atualização:');
      const novoValor = equipamentoData.quantidade_cadastrada + 1;
      
      const { error: updateError } = await supabase
        .from('equipamentos_tipos')
        .update({ 
          quantidade_cadastrada: novoValor 
        })
        .eq('id', equipamentoData.id);

      console.log('Resultado da atualização:', { updateError, novoValor });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

testarComServerClient();
