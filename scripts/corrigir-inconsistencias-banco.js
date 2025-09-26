// Script para corrigir inconsistências no banco de dados
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function corrigirInconsistencias() {
  console.log('🔧 Corrigindo inconsistências no banco de dados...\n');

  try {
    // 1. Verificar empresas existentes
    console.log('1️⃣ Verificando empresas existentes...');
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nome');

    if (empresasError) {
      console.error('❌ Erro ao buscar empresas:', empresasError.message);
      return;
    }

    console.log(`📊 Empresas encontradas: ${empresas?.length || 0}`);
    if (empresas && empresas.length > 0) {
      empresas.forEach(empresa => {
        console.log(`  - ${empresa.nome} (ID: ${empresa.id})`);
      });
    }

    // 2. Verificar usuários
    console.log('\n2️⃣ Verificando usuários...');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, nome, empresa_id');

    if (usuariosError) {
      console.error('❌ Erro ao buscar usuários:', usuariosError.message);
      return;
    }

    console.log(`📊 Usuários encontrados: ${usuarios?.length || 0}`);
    if (usuarios && usuarios.length > 0) {
      usuarios.forEach(usuario => {
        console.log(`  - ${usuario.nome} (Empresa ID: ${usuario.empresa_id})`);
      });
    }

    // 3. Verificar itens de checklist
    console.log('\n3️⃣ Verificando itens de checklist...');
    const { data: checklistItens, error: checklistError } = await supabase
      .from('checklist_itens')
      .select('id, nome, empresa_id');

    if (checklistError) {
      console.error('❌ Erro ao buscar itens de checklist:', checklistError.message);
      return;
    }

    console.log(`📊 Itens de checklist encontrados: ${checklistItens?.length || 0}`);
    
    // 4. Identificar empresas ausentes
    const empresasExistentes = new Set(empresas?.map(e => e.id) || []);
    const empresasReferenciadas = new Set();
    
    if (usuarios) {
      usuarios.forEach(u => {
        if (u.empresa_id) empresasReferenciadas.add(u.empresa_id);
      });
    }
    
    if (checklistItens) {
      checklistItens.forEach(c => {
        if (c.empresa_id) empresasReferenciadas.add(c.empresa_id);
      });
    }

    const empresasAusentes = Array.from(empresasReferenciadas).filter(id => !empresasExistentes.has(id));
    
    console.log('\n4️⃣ Empresas ausentes identificadas:');
    if (empresasAusentes.length === 0) {
      console.log('✅ Nenhuma empresa ausente encontrada');
    } else {
      empresasAusentes.forEach(id => {
        console.log(`  - ID: ${id}`);
      });
    }

    // 5. Criar empresas ausentes
    if (empresasAusentes.length > 0) {
      console.log('\n5️⃣ Criando empresas ausentes...');
      
      for (const empresaId of empresasAusentes) {
        const empresaData = {
          id: empresaId,
          nome: `Empresa ${empresaId.substring(0, 8)}`,
          email: `empresa-${empresaId.substring(0, 8)}@exemplo.com`,
          telefone: '(11) 99999-9999',
          ativo: true
        };

        const { data, error } = await supabase
          .from('empresas')
          .insert(empresaData)
          .select()
          .single();

        if (error) {
          console.log(`⚠️ Erro ao criar empresa ${empresaId}:`, error.message);
        } else {
          console.log(`✅ Empresa criada: ${data.nome} (ID: ${data.id})`);
        }
      }
    }

    // 6. Verificar resultado final
    console.log('\n6️⃣ Verificação final...');
    const { data: empresasFinais, error: empresasFinaisError } = await supabase
      .from('empresas')
      .select('id, nome');

    if (empresasFinaisError) {
      console.error('❌ Erro na verificação final:', empresasFinaisError.message);
    } else {
      console.log(`✅ Total de empresas após correção: ${empresasFinais?.length || 0}`);
      if (empresasFinais && empresasFinais.length > 0) {
        empresasFinais.forEach(empresa => {
          console.log(`  - ${empresa.nome} (ID: ${empresa.id})`);
        });
      }
    }

    console.log('\n🎉 Correção de inconsistências concluída!');

  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  }
}

// Executar correção
corrigirInconsistencias().then(() => {
  console.log('\n🏁 Script finalizado!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
