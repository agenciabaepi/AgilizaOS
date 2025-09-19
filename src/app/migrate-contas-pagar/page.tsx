'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';

export default function MigrateContasPagarPage() {
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const executeMigration = async () => {
    try {
      setLoading(true);
      setResult(null);
      
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
        setResult({ success: false, error: error.message });
        addToast('error', 'Erro na migração: ' + error.message);
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
        setResult({ 
          success: true, 
          message: 'Migração executada, mas erro ao verificar colunas',
          error: columnsError.message 
        });
      } else {
        console.log('📋 Colunas adicionadas:', columns);
        setResult({ 
          success: true, 
          message: 'Migração concluída com sucesso!',
          columns: columns 
        });
        addToast('success', 'Migração concluída com sucesso!');
      }
      
    } catch (error: any) {
      console.error('❌ Erro geral:', error);
      setResult({ success: false, error: error.message });
      addToast('error', 'Erro geral: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Migração - Contas a Pagar
          </h1>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Adicionar Campos para Contas Fixas Mensais
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Colunas que serão adicionadas:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li><code>conta_fixa</code> (BOOLEAN) - Indica se é uma conta fixa mensal</li>
                  <li><code>parcelas_totais</code> (INTEGER) - Total de parcelas da conta fixa</li>
                  <li><code>parcela_atual</code> (INTEGER) - Parcela atual da conta fixa</li>
                  <li><code>data_fixa_mes</code> (INTEGER) - Dia do mês para vencimento (1-31)</li>
                  <li><code>proxima_geracao</code> (DATE) - Data da próxima geração automática</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Índices que serão criados:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li><code>idx_contas_pagar_conta_fixa</code></li>
                  <li><code>idx_contas_pagar_data_fixa_mes</code></li>
                  <li><code>idx_contas_pagar_proxima_geracao</code></li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={executeMigration}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Executando Migração...' : 'Executar Migração'}
              </Button>
            </div>
          </div>
          
          {result && (
            <div className={`rounded-lg border p-6 ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? '✅ Sucesso' : '❌ Erro'}
              </h3>
              
              <p className={`mb-4 ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message || result.error}
              </p>
              
              {result.columns && (
                <div>
                  <h4 className="font-medium text-green-800 mb-2">Colunas adicionadas:</h4>
                  <div className="bg-white rounded border p-3">
                    <pre className="text-sm text-gray-700">
                      {JSON.stringify(result.columns, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MenuLayout>
  );
}

