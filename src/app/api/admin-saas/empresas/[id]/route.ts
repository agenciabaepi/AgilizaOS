import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * Busca detalhes completos de uma empresa
 * GET /api/admin-saas/empresas/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId } = await params;
    const supabase = getSupabaseAdmin();

    // Buscar empresa
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json(
        { ok: false, message: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Contadores
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
        
        // Função recursiva para listar todos os arquivos
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
              // É um arquivo (tem id)
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
        totalBytes += allFiles.reduce((acc: number, file: any) => {
          // O tamanho pode estar em metadata.size ou size diretamente
          const size = file.metadata?.size || file.size || 0;
          return acc + Number(size);
        }, 0);
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
          
          // Listar todos os arquivos do bucket
          const { data: anexosList, error: anexosError } = await supabase.storage
            .from('anexos-contas')
            .list('', {
              limit: 10000,
              sortBy: { column: 'name', order: 'asc' },
            });
          
          if (!anexosError && anexosList) {
            // Filtrar anexos que pertencem às contas da empresa
            // Padrão: anexo_{contaId}_...
            const anexosEmpresa = anexosList.filter((file: any) => 
              file.id && contaIdsArray.some(contaId => file.name?.startsWith(`anexo_${contaId}_`))
            );
            totalBytes += anexosEmpresa.reduce((acc: number, file: any) => {
              const size = file.metadata?.size || file.size || 0;
              return acc + Number(size);
            }, 0);
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
              // Extrair ordemId do nome da pasta (pode ser {ordemId} ou {ordemId}/)
              const ordemId = folder.name.replace('/', '');
              
              if (ordemIdsArray.includes(ordemId)) {
                // Listar arquivos dentro desta pasta
                const { data: files, error: filesError } = await supabase.storage
                  .from('ordens-imagens')
                  .list(folder.name, {
                    limit: 10000,
                  });
                
                if (!filesError && files) {
                  totalBytes += files.reduce((acc: number, file: any) => {
                    if (file.id) {
                      const size = file.metadata?.size || file.size || 0;
                      return acc + Number(size);
                    }
                    return acc;
                  }, 0);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro ao calcular storage ordens-imagens:', err);
      }

      // Converter bytes para MB com 2 casas decimais
      return Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
    }

    const [usuarios, produtos, servicos, ordens, usoMb] = await Promise.all([
      countBy('usuarios', empresaId),
      countProdutos(empresaId),
      countServicos(empresaId),
      countBy('ordens_servico', empresaId),
      storageUsoMb(empresaId),
    ]);

    // Assinatura e cobrança
    let assinatura: any = null;
    try {
      const { data } = await supabase
        .from('assinaturas')
        .select('id,status,proxima_cobranca,plano_id,created_at')
        .eq('empresa_id', empresaId)
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
        .eq('empresa_id', empresaId)
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

    const empresaCompleta = {
      ...empresa,
      metrics: { usuarios, produtos, servicos, ordens, usoMb },
      billing,
    };

    return NextResponse.json({ ok: true, empresa: empresaCompleta });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}
