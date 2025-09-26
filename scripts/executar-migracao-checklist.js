// Script para executar a migração do checklist automaticamente
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executarMigracaoChecklist() {
  console.log('🚀 Executando migração do sistema de checklist...\n');

  try {
    // 1. Criar tabela checklist_itens
    console.log('1️⃣ Criando tabela checklist_itens...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS checklist_itens (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        categoria VARCHAR(100) DEFAULT 'geral',
        ativo BOOLEAN DEFAULT true,
        ordem INTEGER DEFAULT 0,
        obrigatorio BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });

    if (createError) {
      console.log('⚠️ Função exec_sql não disponível, tentando método alternativo...');
      
      // Método alternativo: usar query direta
      const { error: directError } = await supabase
        .from('checklist_itens')
        .select('id')
        .limit(1);
        
      if (directError && directError.code === 'PGRST116') {
        console.log('❌ Tabela não existe e não foi possível criar automaticamente');
        console.log('📋 Execute manualmente o SQL no Supabase SQL Editor:');
        console.log('\n' + createTableSQL);
        return;
      }
    } else {
      console.log('✅ Tabela checklist_itens criada com sucesso');
    }

    // 2. Criar índices
    console.log('\n2️⃣ Criando índices...');
    const indexesSQL = [
      'CREATE INDEX IF NOT EXISTS idx_checklist_itens_empresa_id ON checklist_itens(empresa_id);',
      'CREATE INDEX IF NOT EXISTS idx_checklist_itens_ativo ON checklist_itens(ativo);',
      'CREATE INDEX IF NOT EXISTS idx_checklist_itens_categoria ON checklist_itens(categoria);'
    ];

    for (const indexSQL of indexesSQL) {
      try {
        await supabase.rpc('exec_sql', { sql: indexSQL });
        console.log('✅ Índice criado');
      } catch (err) {
        console.log('⚠️ Índice já existe ou erro:', err.message);
      }
    }

    // 3. Criar trigger para updated_at
    console.log('\n3️⃣ Criando trigger updated_at...');
    const triggerSQL = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_checklist_itens_updated_at ON checklist_itens;
      CREATE TRIGGER update_checklist_itens_updated_at 
          BEFORE UPDATE ON checklist_itens 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      await supabase.rpc('exec_sql', { sql: triggerSQL });
      console.log('✅ Trigger criado com sucesso');
    } catch (err) {
      console.log('⚠️ Erro ao criar trigger:', err.message);
    }

    // 4. Buscar empresas existentes
    console.log('\n4️⃣ Buscando empresas existentes...');
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nome');

    if (empresasError) {
      console.error('❌ Erro ao buscar empresas:', empresasError.message);
      return;
    }

    if (!empresas || empresas.length === 0) {
      console.log('⚠️ Nenhuma empresa encontrada');
      return;
    }

    console.log(`✅ Encontradas ${empresas.length} empresas`);

    // 5. Inserir itens padrão para cada empresa
    console.log('\n5️⃣ Inserindo itens padrão...');
    
    const itensPadrao = [
      { nome: 'Aparelho não liga', descricao: 'Verificar se o aparelho liga normalmente', categoria: 'geral', ordem: 0, obrigatorio: false },
      { nome: 'Alto-falante', descricao: 'Testar funcionamento do alto-falante', categoria: 'audio', ordem: 1, obrigatorio: false },
      { nome: 'Microfone', descricao: 'Testar funcionamento do microfone', categoria: 'audio', ordem: 2, obrigatorio: false },
      { nome: 'Câmera frontal', descricao: 'Testar funcionamento da câmera frontal', categoria: 'video', ordem: 3, obrigatorio: false },
      { nome: 'Câmera traseira', descricao: 'Testar funcionamento da câmera traseira', categoria: 'video', ordem: 4, obrigatorio: false },
      { nome: 'Conectores', descricao: 'Testar funcionamento dos conectores (USB, P2, etc.)', categoria: 'conectividade', ordem: 5, obrigatorio: false },
      { nome: 'Botões', descricao: 'Testar funcionamento dos botões físicos', categoria: 'hardware', ordem: 6, obrigatorio: false },
      { nome: 'Vibração', descricao: 'Testar funcionamento da vibração', categoria: 'hardware', ordem: 7, obrigatorio: false },
      { nome: 'WiFi', descricao: 'Testar conectividade WiFi', categoria: 'conectividade', ordem: 8, obrigatorio: false },
      { nome: 'Bluetooth', descricao: 'Testar conectividade Bluetooth', categoria: 'conectividade', ordem: 9, obrigatorio: false },
      { nome: 'Biometria', descricao: 'Testar funcionamento da biometria (impressão digital, face)', categoria: 'seguranca', ordem: 10, obrigatorio: false },
      { nome: 'Carga', descricao: 'Testar funcionamento da carga', categoria: 'energia', ordem: 11, obrigatorio: false },
      { nome: 'Toque na tela', descricao: 'Testar responsividade do toque na tela', categoria: 'display', ordem: 12, obrigatorio: false }
    ];

    let totalInseridos = 0;
    for (const empresa of empresas) {
      console.log(`   📋 Inserindo itens para ${empresa.nome}...`);
      
      for (const item of itensPadrao) {
        // Verificar se o item já existe
        const { data: existe } = await supabase
          .from('checklist_itens')
          .select('id')
          .eq('empresa_id', empresa.id)
          .eq('nome', item.nome)
          .single();

        if (!existe) {
          const { error: insertError } = await supabase
            .from('checklist_itens')
            .insert({
              ...item,
              empresa_id: empresa.id
            });

          if (insertError) {
            console.log(`   ⚠️ Erro ao inserir ${item.nome}:`, insertError.message);
          } else {
            totalInseridos++;
          }
        }
      }
    }

    console.log(`✅ ${totalInseridos} itens inseridos com sucesso`);

    // 6. Verificar resultado final
    console.log('\n6️⃣ Verificando resultado final...');
    const { data: totalItens, error: countError } = await supabase
      .from('checklist_itens')
      .select('id', { count: 'exact' });

    if (countError) {
      console.error('❌ Erro ao contar itens:', countError.message);
    } else {
      console.log(`✅ Total de itens de checklist no sistema: ${totalItens?.length || 0}`);
    }

    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Recarregue a página de configurações');
    console.log('2. Acesse a aba "Checklist"');
    console.log('3. Personalize os itens conforme necessário');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    console.log('\n📋 EXECUTE MANUALMENTE NO SUPABASE SQL EDITOR:');
    console.log('Copie e cole o conteúdo do arquivo: scripts/migrate-checklist-personalizado.sql');
  }
}

// Executar migração
executarMigracaoChecklist().then(() => {
  console.log('\n🏁 Migração finalizada!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
