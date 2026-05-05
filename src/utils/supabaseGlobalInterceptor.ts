// Interceptador global mais agressivo para Supabase
import { supabase } from '@/lib/supabaseClient';

// Tabelas legadas que em alguns ambientes não existem.
// Não incluir `produtos_servicos` (tabela real usada no catálogo / orçamentos / OS).
const BLOCKED_TABLES = ['servicos', 'produtos'];

function mockReadChain(): any {
  const chain: any = {};
  const next = () => chain;
  chain.eq = next;
  chain.neq = next;
  chain.gt = next;
  chain.gte = next;
  chain.lt = next;
  chain.lte = next;
  chain.or = next;
  chain.not = next;
  chain.filter = next;
  chain.in = next;
  chain.is = next;
  chain.match = next;
  chain.ilike = next;
  chain.like = next;
  chain.order = next;
  chain.range = next;
  chain.limit = () => Promise.resolve({ data: [], error: null });
  chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
  chain.single = () => Promise.resolve({ data: null, error: { code: 'PGRST116' } });
  return chain;
}

// Função para interceptar todas as queries do Supabase
export const initializeSupabaseInterceptor = () => {
  // Interceptar o método from do Supabase
  const originalFrom = supabase.from.bind(supabase);
  
  supabase.from = function(table: string) {
    // Se a tabela está na lista de bloqueadas, retornar um mock
    if (BLOCKED_TABLES.includes(table)) {
      return {
        select: () => mockReadChain(),
        insert: () => Promise.resolve({ data: null, error: { message: 'Table blocked' } }),
        update: () => Promise.resolve({ data: null, error: { message: 'Table blocked' } }),
        delete: () => Promise.resolve({ data: null, error: { message: 'Table blocked' } }),
        upsert: () => Promise.resolve({ data: null, error: { message: 'Table blocked' } })
      } as any;
    }
    
    // Para outras tabelas, usar o comportamento normal
    return originalFrom(table);
  };
};

// Função para inicializar no carregamento da página
if (typeof window !== 'undefined') {
  // Aguardar o Supabase estar carregado
  setTimeout(() => {
    try {
      initializeSupabaseInterceptor();
    } catch (error) {
      // Silenciar erros de inicialização
    }
  }, 100);
}
