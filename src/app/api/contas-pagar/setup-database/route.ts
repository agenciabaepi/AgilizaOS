import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    console.log('🔧 SETUP CONTAS A PAGAR: Criando estrutura do banco...');
    
    // 1. Criar tabela de categorias
    console.log('📋 Criando tabela categorias_contas...');
    const { error: categoriasError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS categorias_contas (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
          nome VARCHAR(100) NOT NULL,
          descricao TEXT,
          tipo VARCHAR(20) DEFAULT 'fixa' CHECK (tipo IN ('fixa', 'variavel', 'pecas')),
          cor VARCHAR(7) DEFAULT '#3B82F6',
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (categoriasError) {
      console.error('❌ Erro ao criar tabela categorias_contas:', categoriasError);
    } else {
      console.log('✅ Tabela categorias_contas criada');
    }
    
    // 2. Criar tabela de contas a pagar
    console.log('📋 Criando tabela contas_pagar...');
    const { error: contasError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS contas_pagar (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
          categoria_id UUID REFERENCES categorias_contas(id) ON DELETE SET NULL,
          tipo VARCHAR(20) DEFAULT 'fixa' CHECK (tipo IN ('fixa', 'variavel', 'pecas')),
          descricao VARCHAR(255) NOT NULL,
          valor DECIMAL(10,2) NOT NULL,
          data_vencimento DATE NOT NULL,
          data_pagamento DATE,
          status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
          fornecedor VARCHAR(255),
          observacoes TEXT,
          os_id UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
          peca_nome VARCHAR(255),
          peca_quantidade INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (contasError) {
      console.error('❌ Erro ao criar tabela contas_pagar:', contasError);
    } else {
      console.log('✅ Tabela contas_pagar criada');
    }
    
    // 3. Criar índices para performance
    console.log('📋 Criando índices...');
    const { error: indicesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_contas_pagar_empresa ON contas_pagar(empresa_id);
        CREATE INDEX IF NOT EXISTS idx_contas_pagar_categoria ON contas_pagar(categoria_id);
        CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
        CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
        CREATE INDEX IF NOT EXISTS idx_contas_pagar_os ON contas_pagar(os_id);
        CREATE INDEX IF NOT EXISTS idx_categorias_contas_empresa ON categorias_contas(empresa_id);
      `
    });
    
    if (indicesError) {
      console.error('❌ Erro ao criar índices:', indicesError);
    } else {
      console.log('✅ Índices criados');
    }
    
    // 4. Criar RLS (Row Level Security)
    console.log('📋 Configurando RLS...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE categorias_contas ENABLE ROW LEVEL SECURITY;
        ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;
        
        -- Políticas para categorias_contas
        CREATE POLICY IF NOT EXISTS "Usuários podem ver categorias da própria empresa" 
          ON categorias_contas FOR SELECT 
          USING (empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
          ));
          
        CREATE POLICY IF NOT EXISTS "Usuários podem inserir categorias na própria empresa" 
          ON categorias_contas FOR INSERT 
          WITH CHECK (empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
          ));
          
        CREATE POLICY IF NOT EXISTS "Usuários podem atualizar categorias da própria empresa" 
          ON categorias_contas FOR UPDATE 
          USING (empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
          ));
          
        CREATE POLICY IF NOT EXISTS "Usuários podem deletar categorias da própria empresa" 
          ON categorias_contas FOR DELETE 
          USING (empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
          ));
        
        -- Políticas para contas_pagar
        CREATE POLICY IF NOT EXISTS "Usuários podem ver contas da própria empresa" 
          ON contas_pagar FOR SELECT 
          USING (empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
          ));
          
        CREATE POLICY IF NOT EXISTS "Usuários podem inserir contas na própria empresa" 
          ON contas_pagar FOR INSERT 
          WITH CHECK (empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
          ));
          
        CREATE POLICY IF NOT EXISTS "Usuários podem atualizar contas da própria empresa" 
          ON contas_pagar FOR UPDATE 
          USING (empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
          ));
          
        CREATE POLICY IF NOT EXISTS "Usuários podem deletar contas da própria empresa" 
          ON contas_pagar FOR DELETE 
          USING (empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
          ));
      `
    });
    
    if (rlsError) {
      console.error('❌ Erro ao configurar RLS:', rlsError);
    } else {
      console.log('✅ RLS configurado');
    }
    
    // 5. Inserir categorias padrão
    console.log('📋 Inserindo categorias padrão...');
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id');
    
    if (empresas && empresas.length > 0) {
      const categoriasPadrao = [
        { nome: 'Aluguel', tipo: 'fixa', cor: '#EF4444' },
        { nome: 'Energia Elétrica', tipo: 'fixa', cor: '#F59E0B' },
        { nome: 'Água', tipo: 'fixa', cor: '#3B82F6' },
        { nome: 'Internet', tipo: 'fixa', cor: '#8B5CF6' },
        { nome: 'Telefone', tipo: 'fixa', cor: '#06B6D4' },
        { nome: 'Colaboradores', tipo: 'fixa', cor: '#10B981' },
        { nome: 'Material de Escritório', tipo: 'variavel', cor: '#6B7280' },
        { nome: 'Marketing', tipo: 'variavel', cor: '#EC4899' },
        { nome: 'Manutenção', tipo: 'variavel', cor: '#F97316' },
        { nome: 'Peças', tipo: 'pecas', cor: '#84CC16' },
        { nome: 'Ferramentas', tipo: 'variavel', cor: '#6366F1' },
        { nome: 'Outros', tipo: 'variavel', cor: '#64748B' }
      ];
      
      for (const empresa of empresas) {
        for (const categoria of categoriasPadrao) {
          const { error: insertError } = await supabase
            .from('categorias_contas')
            .upsert({
              empresa_id: empresa.id,
              nome: categoria.nome,
              tipo: categoria.tipo,
              cor: categoria.cor,
              descricao: `Categoria padrão para ${categoria.nome.toLowerCase()}`
            }, {
              onConflict: 'empresa_id,nome'
            });
          
          if (insertError) {
            console.warn(`⚠️ Erro ao inserir categoria ${categoria.nome}:`, insertError);
          }
        }
      }
      console.log('✅ Categorias padrão inseridas');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Estrutura do banco de dados criada com sucesso!',
      details: {
        tabelas_criadas: ['categorias_contas', 'contas_pagar'],
        indices_criados: 6,
        rls_configurado: true,
        categorias_padrao: 12
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro geral no setup:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
