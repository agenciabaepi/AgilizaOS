import type { SupabaseClient } from '@supabase/supabase-js';
import { JustificativaCancelamento, ReceitaRejectionError } from 'open-nfse';
import { onlyDigitsDoc } from '../crypto/certificado';
import { createFiscalNfseClient } from './client';

export type CancelarNfseResult =
  | { ok: true; message: string }
  | { ok: false; message: string; codigo?: string };

/**
 * Cancela NFS-e autorizada (evento 101101) via SEFIN Nacional.
 */
export async function cancelarNfseNacional(
  admin: SupabaseClient,
  empresaId: string,
  chaveAcesso: string,
  opts?: { motivoCodigo?: JustificativaCancelamento; xMotivo?: string }
): Promise<CancelarNfseResult> {
  const { data: nfse, error } = await admin
    .from('fiscal_nfse')
    .select('id, chave_acesso, status')
    .eq('empresa_id', empresaId)
    .eq('chave_acesso', chaveAcesso)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!nfse) return { ok: false, message: 'NFS-e não encontrada.' };
  if (nfse.status !== 'autorizada') {
    return { ok: false, message: `NFS-e já está ${nfse.status}.` };
  }

  const bundle = await createFiscalNfseClient(admin, empresaId);
  try {
    const cnpj = onlyDigitsDoc(bundle.config.cnpj);
    const xMotivo = (opts?.xMotivo || 'Cancelamento solicitado pelo emitente').slice(0, 255);
    const cMotivo = opts?.motivoCodigo ?? JustificativaCancelamento.ErroEmissao;

    const r = await bundle.client.cancelar({
      chaveAcesso,
      autor: { CNPJ: cnpj },
      cMotivo,
      xMotivo,
    });

    if (r.status === 'retry_pending') {
      return {
        ok: true,
        message: 'Cancelamento pendente de reenvio (falha transitória na SEFIN).',
      };
    }

    const xmlEvento =
      (r.evento as { xmlEvento?: string; xmlAssinado?: string } | undefined)?.xmlEvento ||
      (r.evento as { xmlAssinado?: string } | undefined)?.xmlAssinado ||
      '';

    await admin.from('fiscal_nfse_eventos').insert({
      empresa_id: empresaId,
      nfse_id: nfse.id,
      chave_acesso: chaveAcesso,
      tipo_evento: '101101',
      num_seq_evento: 1,
      xml_evento: xmlEvento,
      dh_registro: new Date().toISOString(),
    });

    await admin
      .from('fiscal_nfse')
      .update({ status: 'cancelada', updated_at: new Date().toISOString() })
      .eq('id', nfse.id);

    return { ok: true, message: 'NFS-e cancelada com sucesso.' };
  } catch (err) {
    if (err instanceof ReceitaRejectionError) {
      return { ok: false, codigo: err.codigo, message: `[${err.codigo}] ${err.descricao}` };
    }
    return { ok: false, message: err instanceof Error ? err.message : 'Erro ao cancelar' };
  } finally {
    await bundle.close();
  }
}
