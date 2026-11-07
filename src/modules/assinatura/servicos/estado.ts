import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calcularTransicaoPosTrial,
  decidirAcesso,
  hojeYmd,
  toYmd,
  type AssinaturaSnapshot,
} from '@/modules/assinatura';
import { cotarCobranca, resolverTipoCobranca } from '@/modules/assinatura/renovacao';

export async function carregarEstadoAssinaturaEmpresa(
  supabase: SupabaseClient,
  empresaId: string
) {
  const [{ data: rows }, { data: emp }] = await Promise.all([
    supabase
      .from('assinaturas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('empresas')
      .select('created_at, sistema_liberado, dias_trial')
      .eq('id', empresaId)
      .maybeSingle(),
  ]);

  const sistemaLiberado = emp?.sistema_liberado === true;
  const empresaCreatedAt = (emp?.created_at as string) || null;
  const assinatura = (rows || [])[0] || null;

  const decisao = decidirAcesso({
    assinatura: assinatura as AssinaturaSnapshot | null,
    empresaCreatedAt,
    sistemaLiberado,
  });

  const trialFim =
    decisao.trialFimYmd ||
    toYmd(assinatura?.data_trial_fim) ||
    (empresaCreatedAt ? toYmd(calcularTransicaoPosTrial({
      contratacaoYmd: toYmd(empresaCreatedAt)!,
      valorMensal: 0,
    }).trialFimYmd) : null);

  const vencimento = decisao.vencimentoYmd;
  const hoje = hojeYmd();
  const tipo = resolverTipoCobranca({
    dataTrialFimYmd: trialFim,
    vencimentoAtualYmd: vencimento,
    hojeYmd: hoje,
  });

  const valorMensal = Number(assinatura?.valor) > 0 ? Number(assinatura.valor) : 0;
  const cotacao =
    valorMensal > 0
      ? cotarCobranca({
          tipo,
          contratacaoYmd: toYmd(assinatura?.data_inicio) || toYmd(empresaCreatedAt),
          dataTrialFimYmd: trialFim,
          vencimentoAtualYmd: vencimento,
          pagamentoYmd: hoje,
          valorMensal,
        })
      : null;

  return {
    assinatura,
    empresaCreatedAt,
    sistemaLiberado,
    acesso_bloqueado: !decisao.liberado,
    fase: decisao.fase,
    motivo: decisao.motivo,
    vencimento_ymd: vencimento,
    trial_fim_ymd: trialFim,
    tipo_cobranca: tipo,
    cotacao,
    decisao,
  };
}
