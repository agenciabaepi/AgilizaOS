import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const search = (url.searchParams.get('search') || '').trim();
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const status = url.searchParams.get('status') || '';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('empresas').select('*', { count: 'exact' })
      .order('nome', { ascending: true })
      .range(from, to);

    if (search) {
      // Buscar por nome ou cnpj/email simples
      query = query.or(`nome.ilike.%${search}%,cnpj.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: empresas, error, count } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }

    const empresaIds = (empresas || []).map((e: any) => e.id);

    // Contadores básicos por empresa (chamadas simples por empresa para manter compatibilidade)
    async function countBy(table: string, empresaId: string) {
      const { count } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId);
      return count || 0;
    }
    async function countProdutos(empresaId: string) {
      const { count } = await supabase
        .from('produtos_servicos')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('tipo', 'produto');
      return count || 0;
    }
    async function countServicos(empresaId: string) {
      const { count } = await supabase
        .from('produtos_servicos')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('tipo', 'servico');
      return count || 0;
    }

    async function storageUsoMb(empresaId: string): Promise<number> {
      let totalBytes = 0;

      // 1. Bucket 'produtos' - usar API de Storage
      try {
        const prefix = `produtos/${empresaId}/`;
        const listAllFiles = async (path: string): Promise<any[]> => {
          const { data, error } = await supabase.storage
            .from('produtos')
            .list(path, {
              limit: 10000,
              sortBy: { column: 'name', order: 'asc' },
            });
          
          if (error || !data) return [];
          
          const files: any[] = [];
          for (const item of data) {
            if (item.id) {
              // É um arquivo
              files.push(item);
            } else {
              // É uma pasta, listar recursivamente
              const subFiles = await listAllFiles(`${path}${item.name}/`);
              files.push(...subFiles);
            }
          }
          return files;
        };
        
        const allFiles = await listAllFiles(prefix);
        totalBytes += allFiles.reduce((acc: number, file: any) => acc + (Number(file.metadata?.size) || 0), 0);
      } catch (err) {
        console.error('Erro ao calcular storage produtos:', err);
      }

      // 2. Bucket 'anexos-contas' - relacionar via contas_pagar
      try {
        const { data: contasIds } = await supabase
          .from('contas_pagar')
          .select('id')
          .eq('empresa_id', empresaId);
        
        if (contasIds && contasIds.length > 0) {
          const contaIdsArray = contasIds.map(c => c.id);
          
          const { data: anexosList, error: anexosError } = await supabase.storage
            .from('anexos-contas')
            .list('', {
              limit: 10000,
              sortBy: { column: 'name', order: 'asc' },
            });
          
          if (!anexosError && anexosList) {
            const anexosEmpresa = anexosList.filter((file: any) => 
              contaIdsArray.some(contaId => file.name?.startsWith(`anexo_${contaId}_`))
            );
            totalBytes += anexosEmpresa.reduce((acc: number, file: any) => acc + (Number(file.metadata?.size) || 0), 0);
          }
        }
      } catch (err) {
        console.error('Erro ao calcular storage anexos:', err);
      }

      // 3. Bucket 'ordens-imagens' - relacionar via ordens_servico
      try {
        const { data: ordensIds } = await supabase
          .from('ordens_servico')
          .select('id')
          .eq('empresa_id', empresaId);
        
        if (ordensIds && ordensIds.length > 0) {
          const ordemIdsArray = ordensIds.map(o => o.id);
          
          // Listar todas as pastas (cada pasta é uma ordem)
          const { data: folders, error: foldersError } = await supabase.storage
            .from('ordens-imagens')
            .list('', {
              limit: 10000,
              sortBy: { column: 'name', order: 'asc' },
            });
          
          if (!foldersError && folders) {
            for (const folder of folders) {
              const ordemId = folder.name.split('/')[0] || folder.name;
              if (ordemIdsArray.includes(ordemId)) {
                // Listar arquivos dentro desta pasta
                const { data: files, error: filesError } = await supabase.storage
                  .from('ordens-imagens')
                  .list(folder.name, {
                    limit: 10000,
                  });
                
                if (!filesError && files) {
                  totalBytes += files.reduce((acc: number, file: any) => acc + (Number(file.metadata?.size) || 0), 0);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro ao calcular storage ordens-imagens:', err);
      }

      return Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
    }

    const enriched = await Promise.all((empresas || []).map(async (e: any) => {
      const [usuarios, produtos, servicos, ordens, usoMb] = await Promise.all([
        countBy('usuarios', e.id),
        countProdutos(e.id),
        countServicos(e.id),
        countBy('ordens_servico', e.id),
        storageUsoMb(e.id),
      ]);

      // Assinatura e cobrança
      let assinatura: any = null;
      try {
        const { data } = await supabase
          .from('assinaturas')
          .select('id,status,proxima_cobranca,plano_id,created_at')
          .eq('empresa_id', e.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        assinatura = data || null;
      } catch {}

      let planoNome = 'Acesso Completo';
      if (assinatura?.plano_id) {
        try {
          const { data: plano } = await supabase
            .from('planos')
            .select('nome')
            .eq('id', assinatura.plano_id)
            .limit(1)
            .single();
          if (plano?.nome) planoNome = plano.nome;
        } catch {}
      }

      let ultimoPagamento: any = null;
      try {
        const { data } = await supabase
          .from('pagamentos')
          .select('status,paid_at,created_at,valor')
          .eq('empresa_id', e.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        ultimoPagamento = data || null;
      } catch {}

      // Cálculo de vencimento
      let vencido = false;
      let cobrancaStatus = '—';
      const hoje = new Date();
      if (assinatura?.status === 'trial') {
        cobrancaStatus = 'Trial';
      } else if (assinatura?.status === 'active' || assinatura?.status === 'ativa') {
        cobrancaStatus = 'Em dia';
        if (assinatura?.proxima_cobranca) {
          const prox = new Date(assinatura.proxima_cobranca);
          if (prox < new Date(hoje.toDateString())) {
            vencido = true;
            cobrancaStatus = 'Vencido';
          }
        }
      } else if (assinatura?.status) {
        cobrancaStatus = assinatura.status;
      }

      const billing = {
        plano: { id: assinatura?.plano_id || null, nome: planoNome },
        assinaturaStatus: assinatura?.status || null,
        proximaCobranca: assinatura?.proxima_cobranca || null,
        vencido,
        cobrancaStatus,
        ultimoPagamentoStatus: ultimoPagamento?.status || null,
        ultimoPagamentoPagoEm: ultimoPagamento?.paid_at || null,
        ultimoPagamentoValor: ultimoPagamento?.valor || null,
      };

      return { ...e, metrics: { usuarios, produtos, servicos, ordens, usoMb }, billing };
    }));

    return NextResponse.json({ ok: true, items: enriched, page, pageSize, total: count || 0 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Erro inesperado' }, { status: 500 });
  }
}


