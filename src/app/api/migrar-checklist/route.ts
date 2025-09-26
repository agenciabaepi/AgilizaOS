import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para criar cliente Supabase com service role
const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variáveis de ambiente do Supabase não encontradas');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando migração do checklist...');
    
    const client = getSupabaseAdminClient();
    
    // 1. Verificar se a tabela existe
    console.log('1️⃣ Verificando se a tabela checklist_itens existe...');
    
    const { data: testData, error: testError } = await client
      .from('checklist_itens')
      .select('id')
      .limit(1);

    if (testError && testError.code === 'PGRST116') {
      console.log('❌ Tabela não existe. Criando...');
      
      // 2. Criar tabela via SQL
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

      // Tentar executar SQL de criação via RPC
      let createError = null;
      try {
        const result = await client.rpc('exec_sql', { 
          sql: createTableSQL 
        });
        if (result.error) {
          createError = result.error;
        }
      } catch (rpcError) {
        console.log('⚠️ RPC exec_sql não disponível, tentando método alternativo...');
        createError = rpcError;
      }
      
      if (createError) {
        console.error('❌ Erro ao criar tabela via RPC:', createError);
        return NextResponse.json({ 
          error: 'Não foi possível criar a tabela automaticamente. Execute o SQL manualmente no Supabase SQL Editor.',
          details: 'A função exec_sql não está disponível. Use o SQL fornecido no arquivo scripts/migrate-checklist-personalizado.sql',
          sql: createTableSQL
        }, { status: 500 });
      }
      
      console.log('✅ Tabela checklist_itens criada com sucesso!');
      
      // 3. Criar índices
      console.log('2️⃣ Criando índices...');
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_checklist_itens_empresa_id ON checklist_itens(empresa_id);',
        'CREATE INDEX IF NOT EXISTS idx_checklist_itens_ativo ON checklist_itens(ativo);',
        'CREATE INDEX IF NOT EXISTS idx_checklist_itens_categoria ON checklist_itens(categoria);'
      ];

      for (const indexSQL of indexes) {
        try {
          await client.rpc('exec_sql', { sql: indexSQL });
          console.log('✅ Índice criado');
        } catch (err) {
          console.log('⚠️ Índice já existe ou erro:', err);
        }
      }

      // 4. Criar trigger
      console.log('3️⃣ Criando trigger...');
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
        await client.rpc('exec_sql', { sql: triggerSQL });
        console.log('✅ Trigger criado');
      } catch (err) {
        console.log('⚠️ Erro ao criar trigger:', err);
      }

    } else if (testError) {
      console.error('❌ Erro ao verificar tabela:', testError);
      return NextResponse.json({ 
        error: 'Erro ao verificar tabela', 
        details: testError.message 
      }, { status: 500 });
    } else {
      console.log('✅ Tabela checklist_itens já existe!');
    }

    // 5. Buscar empresas e inserir itens padrão
    console.log('4️⃣ Inserindo itens padrão...');
    const { data: empresas, error: empresasError } = await client
      .from('empresas')
      .select('id, nome');

    if (empresasError) {
      console.error('❌ Erro ao buscar empresas:', empresasError);
      return NextResponse.json({ 
        error: 'Erro ao buscar empresas', 
        details: empresasError.message 
      }, { status: 500 });
    }

    if (!empresas || empresas.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhuma empresa encontrada' 
      }, { status: 400 });
    }

    console.log(`✅ Encontradas ${empresas.length} empresas`);

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
      console.log(`   📋 Processando ${empresa.nome}...`);
      
      for (const item of itensPadrao) {
        // Verificar se já existe
        const { data: existe } = await client
          .from('checklist_itens')
          .select('id')
          .eq('empresa_id', empresa.id)
          .eq('nome', item.nome)
          .single();

        if (!existe) {
          const { error: insertError } = await client
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

    // 6. Verificar resultado
    console.log('5️⃣ Verificando resultado...');
    const { data: totalItens, error: countError } = await client
      .from('checklist_itens')
      .select('id', { count: 'exact' });

    if (countError) {
      console.error('❌ Erro ao contar itens:', countError);
    } else {
      console.log(`✅ Total de itens no sistema: ${totalItens?.length || 0}`);
    }

    console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');

    return NextResponse.json({ 
      success: true,
      message: 'Migração executada com sucesso!',
      totalItens: totalItens?.length || 0,
      itensInseridos: totalInseridos,
      empresas: empresas.length
    });

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
