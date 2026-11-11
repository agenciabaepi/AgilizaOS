import type { SupabaseClient } from '@supabase/supabase-js';
import type { DpsCounter, PendingEvent, RetryStore } from 'open-nfse';
import { isPendingEmission } from 'open-nfse';

type Admin = SupabaseClient;

/**
 * Contador atômico de nDPS por (empresa, CNPJ, série).
 * Usa upsert + incremento; em alta concorrência o ideal é RPC SQL — ver migration futura.
 */
export function createSupabaseDpsCounter(admin: Admin, empresaId: string): DpsCounter {
  return {
    async next({ emitenteCnpj, serie }) {
      const cnpj = emitenteCnpj.toUpperCase();
      const serieNorm = String(serie);

      const { data: existing } = await admin
        .from('fiscal_dps_counters')
        .select('proximo_ndps')
        .eq('empresa_id', empresaId)
        .eq('cnpj', cnpj)
        .eq('serie', serieNorm)
        .maybeSingle();

      if (!existing) {
        const { error } = await admin.from('fiscal_dps_counters').insert({
          empresa_id: empresaId,
          cnpj,
          serie: serieNorm,
          proximo_ndps: 2,
        });
        if (error) throw new Error(`dps_counter insert: ${error.message}`);
        return '1';
      }

      const atual = Number(existing.proximo_ndps);
      const { data: updated, error: updErr } = await admin
        .from('fiscal_dps_counters')
        .update({ proximo_ndps: atual + 1 })
        .eq('empresa_id', empresaId)
        .eq('cnpj', cnpj)
        .eq('serie', serieNorm)
        .eq('proximo_ndps', atual)
        .select('proximo_ndps')
        .maybeSingle();

      if (updErr) throw new Error(`dps_counter update: ${updErr.message}`);
      if (!updated) {
        // Concorrência — tenta de novo uma vez
        return this.next({ emitenteCnpj: cnpj, serie: serieNorm });
      }
      return String(atual);
    },
  };
}

function rowToPending(row: Record<string, unknown>): PendingEvent {
  const common = {
    id: String(row.id),
    xmlAssinado: String(row.xml_assinado),
    firstAttemptAt: new Date(String(row.first_attempt_at)),
    lastAttemptAt: new Date(String(row.last_attempt_at)),
    notBefore: row.not_before ? new Date(String(row.not_before)) : undefined,
    attempts: Number(row.attempts ?? 1),
    lastError: {
      message: String(row.last_error_msg),
      errorName: String(row.last_error_name),
      transient: Boolean(row.last_error_transient),
    },
  };

  if (row.kind === 'emission') {
    return {
      ...common,
      kind: 'emission',
      idDps: String(row.id_dps),
      emitenteCnpj: String(row.emitente_cnpj),
      serie: String(row.serie),
      nDPS: String(row.ndps),
    } as PendingEvent;
  }

  return {
    ...common,
    kind: row.kind as PendingEvent['kind'],
    chaveNfse: String(row.chave_nfse),
    chaveSubstituta: row.chave_substituta ? String(row.chave_substituta) : undefined,
    tipoEvento: String(row.tipo_evento),
    cMotivo: row.c_motivo ? String(row.c_motivo) : undefined,
    xMotivo: row.x_motivo ? String(row.x_motivo) : undefined,
  } as PendingEvent;
}

export function createSupabaseRetryStore(admin: Admin, empresaId: string): RetryStore {
  return {
    async save(e: PendingEvent) {
      const base = {
        id: e.id,
        empresa_id: empresaId,
        kind: e.kind,
        xml_assinado: e.xmlAssinado,
        first_attempt_at: e.firstAttemptAt.toISOString(),
        last_attempt_at: e.lastAttemptAt.toISOString(),
        not_before: e.notBefore?.toISOString() ?? null,
        attempts: e.attempts ?? 1,
        last_error_msg: e.lastError.message,
        last_error_name: e.lastError.errorName,
        last_error_transient: e.lastError.transient,
      };

      const row = isPendingEmission(e)
        ? {
            ...base,
            id_dps: e.idDps,
            emitente_cnpj: e.emitenteCnpj,
            serie: e.serie,
            ndps: Number(e.nDPS),
            chave_nfse: null,
            chave_substituta: null,
            tipo_evento: null,
            c_motivo: null,
            x_motivo: null,
          }
        : {
            ...base,
            id_dps: null,
            emitente_cnpj: null,
            serie: null,
            ndps: null,
            chave_nfse: (e as { chaveNfse: string }).chaveNfse,
            chave_substituta: (e as { chaveSubstituta?: string }).chaveSubstituta ?? null,
            tipo_evento: (e as { tipoEvento: string }).tipoEvento,
            c_motivo: (e as { cMotivo?: string }).cMotivo ?? null,
            x_motivo: (e as { xMotivo?: string }).xMotivo ?? null,
          };

      const { error } = await admin.from('fiscal_nfse_pending').upsert(row, { onConflict: 'id' });
      if (error) throw new Error(`retry_store save: ${error.message}`);
    },

    async list() {
      const { data, error } = await admin
        .from('fiscal_nfse_pending')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('last_attempt_at', { ascending: true });
      if (error) throw new Error(`retry_store list: ${error.message}`);
      return (data ?? []).map((r) => rowToPending(r as Record<string, unknown>));
    },

    async delete(id: string) {
      const { error } = await admin
        .from('fiscal_nfse_pending')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaId);
      if (error) throw new Error(`retry_store delete: ${error.message}`);
    },
  };
}
