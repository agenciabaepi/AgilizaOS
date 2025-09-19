const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateDatabase() {
  try {
    console.log('🔧 MIGRAÇÃO CONTAS A PAGAR: Iniciando...');
    
    // Executar migração
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Adicionar colunas para contas fixas mensais
        ALTER TABLE contas_pagar 
        ADD COLUMN IF NOT EXISTS conta_fixa BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS parcelas_totais INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS parcela_atual INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS data_fixa_mes INTEGER DEFAULT 1 CHECK (data_fixa_mes >= 1 AND data_fixa_mes <= 31),
        ADD COLUMN IF NOT EXISTS proxima_geracao DATE;
        
        -- Criar índices para as novas colunas
        CREATE INDEX IF NOT EXISTS idx_contas_pagar_conta_fixa ON contas_pagar(conta_fixa);
        CREATE INDEX IF NOT EXISTS idx_contas_pagar_data_fixa_mes ON contas_pagar(data_fixa_mes);
        CREATE INDEX IF NOT EXISTS idx_contas_pagar_proxima_geracao ON contas_pagar(proxima_geracao);
      `
    });
    
    if (error) {
      console.error('❌ Erro na migração:', error);
      return;
    }
    
    console.log('✅ Migração concluída com sucesso!');
    
    // Verificar colunas
    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'contas_pagar' 
        AND column_name IN ('conta_fixa', 'parcelas_totais', 'parcela_atual', 'data_fixa_mes', 'proxima_geracao')
        ORDER BY column_name;
      `
    });
    
    if (columnsError) {
      console.warn('⚠️ Erro ao verificar colunas:', columnsError);
    } else {
      console.log('📋 Colunas adicionadas:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

migrateDatabase();

