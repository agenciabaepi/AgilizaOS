const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (hardcoded para desenvolvimento)
const supabaseUrl = 'https://mjbxwqhqlvgqzwyrfqkm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qYnh3cWhxbHZncXp3eXJmcWttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQ4MTU4NCwiZXhwIjoyMDQ5MDU3NTg0fQ.mwZ3w6lKJ7p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Configuração do Supabase não encontrada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTiposContaTable() {
  console.log('🚀 Criando tabela tipos_conta...');
  
  try {
    // SQL para criar a tabela
    const createTableSQL = `
      -- Tabela para tipos de conta customizáveis
      CREATE TABLE IF NOT EXISTS tipos_conta (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        cor VARCHAR(7) DEFAULT '#6B7280', -- Cor em hex para exibição
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Índices para performance
      CREATE INDEX IF NOT EXISTS idx_tipos_conta_empresa_id ON tipos_conta(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_tipos_conta_ativo ON tipos_conta(ativo);
    `;

    // Executar SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('❌ Erro ao criar tabela:', error);
      return false;
    }

    console.log('✅ Tabela tipos_conta criada com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

async function createRLSPolicies() {
  console.log('🔐 Criando políticas RLS...');
  
  try {
    const policiesSQL = `
      -- RLS (Row Level Security)
      ALTER TABLE tipos_conta ENABLE ROW LEVEL SECURITY;

      -- Política: usuários só podem ver tipos da sua empresa
      CREATE POLICY IF NOT EXISTS "Usuários podem ver tipos da sua empresa" ON tipos_conta
        FOR SELECT USING (
          empresa_id IN (
            SELECT empresa_id FROM usuarios 
            WHERE auth_user_id = auth.uid()
          )
        );

      -- Política: usuários só podem inserir tipos para sua empresa
      CREATE POLICY IF NOT EXISTS "Usuários podem inserir tipos para sua empresa" ON tipos_conta
        FOR INSERT WITH CHECK (
          empresa_id IN (
            SELECT empresa_id FROM usuarios 
            WHERE auth_user_id = auth.uid()
          )
        );

      -- Política: usuários só podem atualizar tipos da sua empresa
      CREATE POLICY IF NOT EXISTS "Usuários podem atualizar tipos da sua empresa" ON tipos_conta
        FOR UPDATE USING (
          empresa_id IN (
            SELECT empresa_id FROM usuarios 
            WHERE auth_user_id = auth.uid()
          )
        );

      -- Política: usuários só podem deletar tipos da sua empresa
      CREATE POLICY IF NOT EXISTS "Usuários podem deletar tipos da sua empresa" ON tipos_conta
        FOR DELETE USING (
          empresa_id IN (
            SELECT empresa_id FROM usuarios 
            WHERE auth_user_id = auth.uid()
          )
        );
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql: policiesSQL });
    
    if (error) {
      console.error('❌ Erro ao criar políticas RLS:', error);
      return false;
    }

    console.log('✅ Políticas RLS criadas com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

async function createTrigger() {
  console.log('⚡ Criando trigger...');
  
  try {
    const triggerSQL = `
      -- Trigger para atualizar updated_at
      CREATE OR REPLACE FUNCTION update_tipos_conta_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.atualizado_em = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_update_tipos_conta_updated_at ON tipos_conta;
      CREATE TRIGGER trigger_update_tipos_conta_updated_at
        BEFORE UPDATE ON tipos_conta
        FOR EACH ROW
        EXECUTE FUNCTION update_tipos_conta_updated_at();
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql: triggerSQL });
    
    if (error) {
      console.error('❌ Erro ao criar trigger:', error);
      return false;
    }

    console.log('✅ Trigger criado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

async function insertDefaultTypes() {
  console.log('📝 Inserindo tipos padrão...');
  
  try {
    // Buscar todas as empresas
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id');

    if (empresasError) {
      console.error('❌ Erro ao buscar empresas:', empresasError);
      return false;
    }

    if (!empresas || empresas.length === 0) {
      console.log('⚠️ Nenhuma empresa encontrada');
      return true;
    }

    // Tipos padrão
    const tiposPadrao = [
      { nome: 'Fornecedor', descricao: 'Contas relacionadas a fornecedores e compras', cor: '#3B82F6' },
      { nome: 'Energia', descricao: 'Contas de energia elétrica', cor: '#F59E0B' },
      { nome: 'Água', descricao: 'Contas de água e esgoto', cor: '#06B6D4' },
      { nome: 'Internet', descricao: 'Contas de internet e telefone', cor: '#8B5CF6' }
    ];

    // Inserir tipos para cada empresa
    for (const empresa of empresas) {
      for (const tipo of tiposPadrao) {
        const { error } = await supabase
          .from('tipos_conta')
          .upsert({
            empresa_id: empresa.id,
            ...tipo
          }, {
            onConflict: 'empresa_id,nome'
          });

        if (error) {
          console.error(`❌ Erro ao inserir tipo ${tipo.nome} para empresa ${empresa.id}:`, error);
        }
      }
    }

    console.log('✅ Tipos padrão inseridos com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

async function main() {
  console.log('🎯 Iniciando criação da tabela tipos_conta...\n');

  const steps = [
    { name: 'Criar tabela', fn: createTiposContaTable },
    { name: 'Criar políticas RLS', fn: createRLSPolicies },
    { name: 'Criar trigger', fn: createTrigger },
    { name: 'Inserir tipos padrão', fn: insertDefaultTypes }
  ];

  for (const step of steps) {
    console.log(`\n📋 ${step.name}...`);
    const success = await step.fn();
    
    if (!success) {
      console.error(`\n❌ Falha na etapa: ${step.name}`);
      process.exit(1);
    }
  }

  console.log('\n🎉 Tabela tipos_conta criada com sucesso!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Execute o script update_contas_pagar_tipo.sql para adicionar o campo tipo_conta_id');
  console.log('2. Teste a funcionalidade na interface');
}

main().catch(console.error);
