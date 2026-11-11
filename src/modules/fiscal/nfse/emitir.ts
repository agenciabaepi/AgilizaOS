import type { SupabaseClient } from '@supabase/supabase-js';
import { ReceitaRejectionError, TipoAmbiente } from 'open-nfse';
import type { EmitirNfseInput } from '../types';
import { onlyDigitsDoc } from '../crypto/certificado';
import {
  createFiscalNfseClient,
  mapOpcaoSimples,
  mapRegimeApuracao,
  mapRegimeEspecial,
} from './client';

export type EmitirNfseResult =
  | {
      ok: true;
      status: 'autorizada';
      nfseId: string;
      chaveAcesso: string;
      idDps: string;
      numeroNfse: string | null;
    }
  | {
      ok: true;
      status: 'pendente';
      pendingId: string;
      message: string;
    }
  | {
      ok: false;
      status: 'rejeitada' | 'erro';
      codigo?: string;
      message: string;
    };

function buildTomadorDocumento(doc: string): { CPF: string } | { CNPJ: string } {
  const d = onlyDigitsDoc(doc);
  if (d.length === 11) return { CPF: d };
  if (d.length === 14) return { CNPJ: d };
  throw new Error('Documento do tomador deve ser CPF (11) ou CNPJ (14).');
}

export async function emitirNfseNacional(
  admin: SupabaseClient,
  empresaId: string,
  input: EmitirNfseInput,
  opts?: { usuarioId?: string | null }
): Promise<EmitirNfseResult> {
  if (!input.valorServico || input.valorServico <= 0) {
    return { ok: false, status: 'erro', message: 'Valor do serviço deve ser maior que zero.' };
  }
  if (!input.tomador?.documento || !input.tomador?.nome?.trim()) {
    return { ok: false, status: 'erro', message: 'Tomador (documento e nome) é obrigatório.' };
  }

  const bundle = await createFiscalNfseClient(admin, empresaId);
  const { client, config, close } = bundle;

  try {
    const cTribNac = (input.cTribNac || config.c_trib_nac || '').replace(/\D/g, '');
    if (cTribNac.length !== 6) {
      return {
        ok: false,
        status: 'erro',
        message: 'Informe o código de tributação nacional (cTribNac) com 6 dígitos.',
      };
    }

    const descricao =
      (input.descricao || config.descricao_servico_padrao || '').trim() ||
      'Serviço de assistência técnica';

    const opcao = mapOpcaoSimples(config.opcao_simples);
    const aliqIss = input.aliqIss ?? config.aliquota_iss ?? undefined;
    const pTotTribSN =
      input.pTotTribSN ?? config.percentual_tot_trib_sn ?? (config.opcao_simples === 'me_epp' ? 6 : undefined);

    const valores: {
      vServ: number;
      aliqIss?: number;
      pTotTribSN?: number;
    } = {
      vServ: Number(input.valorServico),
    };
    if (aliqIss != null) valores.aliqIss = Number(aliqIss);
    // ME/EPP Simples: totTrib via pTotTribSN; MEI usa indTotTrib automático na lib
    if (config.opcao_simples === 'me_epp' && pTotTribSN != null) {
      valores.pTotTribSN = Number(pTotTribSN);
    }

    const servico: { cTribNac: string; cNBS?: string; descricao: string } = {
      cTribNac,
      descricao,
    };
    const cNbs = (input.cNbs || config.c_nbs || '').replace(/\D/g, '');
    if (cNbs.length === 9) servico.cNBS = cNbs;

    const emitenteRegime: {
      opSimpNac: typeof opcao;
      regApTribSN?: ReturnType<typeof mapRegimeApuracao>;
      regEspTrib: ReturnType<typeof mapRegimeEspecial>;
    } = {
      opSimpNac: opcao,
      regEspTrib: mapRegimeEspecial(config.regime_especial),
    };
    if (config.opcao_simples === 'me_epp') {
      emitenteRegime.regApTribSN = mapRegimeApuracao(config.regime_apuracao_sn);
    }

    // E0120: se o município não tem info complementar no CNC, a SEFIN rejeita IM.
    // Só envia quando fiscal_empresa_config.informar_im = true (opt-in).
    const informarIm = Boolean((config as { informar_im?: boolean }).informar_im);
    const im = (config.inscricao_municipal || '').trim();

    const emitirParams = {
      emitente: {
        cnpj: onlyDigitsDoc(config.cnpj),
        ...(informarIm && im ? { inscricaoMunicipal: im } : {}),
        codMunicipio: config.cod_municipio_ibge,
        regime: emitenteRegime,
      },
      serie: config.serie_dps || '1',
      servico,
      valores,
      tomador: {
        documento: buildTomadorDocumento(input.tomador.documento),
        nome: input.tomador.nome.trim(),
        email: input.tomador.email,
      },
    } as const;

    let r;
    try {
      r = await client.emitir(emitirParams);
    } catch (firstErr) {
      // Next às vezes quebra o WASM do xmllint; SEFIN ainda valida o XML.
      const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      if (/xmllint|wasm|Cannot find module/i.test(msg)) {
        console.warn('fiscal: validação XSD local indisponível, reenviando com skipValidation', msg);
        r = await client.emitir({ ...emitirParams, skipValidation: true });
      } else {
        throw firstErr;
      }
    }

    if (r.status === 'retry_pending') {
      return {
        ok: true,
        status: 'pendente',
        pendingId: r.pending.id,
        message:
          'Envio aceito localmente; falha transitória na SEFIN. Será reenviado automaticamente.',
      };
    }

    // status === 'ok'
    const nfse = r.nfse;
    const chave = nfse.chaveAcesso;
    const idDps = nfse.idDps;
    const xml = nfse.xmlNfse;
    const numero =
      (nfse as { nfse?: { infNFSe?: { nNFSe?: string } } }).nfse?.infNFSe?.nNFSe ?? null;
    const dhProc = nfse.dataHoraProcessamento
      ? new Date(nfse.dataHoraProcessamento).toISOString()
      : new Date().toISOString();
    // open-nfse devolve TipoAmbiente ("PRODUCAO" | "HOMOLOGACAO"), não 1/2
    const tipoAmbiente =
      nfse.tipoAmbiente === TipoAmbiente.Producao ||
      nfse.tipoAmbiente === 'PRODUCAO' ||
      config.ambiente === 'producao'
        ? 1
        : 2;

    const { data: row, error: insErr } = await admin
      .from('fiscal_nfse')
      .insert({
        empresa_id: empresaId,
        chave_acesso: chave,
        id_dps: String(idDps).slice(0, 60),
        numero_nfse: numero,
        status: 'autorizada',
        tipo_ambiente: tipoAmbiente,
        xml_nfse: xml,
        valor_servico: Number(input.valorServico),
        valor_liquido: Number(input.valorServico),
        tomador_documento: onlyDigitsDoc(input.tomador.documento),
        tomador_nome: input.tomador.nome.trim(),
        descricao_servico: descricao,
        c_trib_nac: cTribNac,
        dh_proc: dhProc,
        serie_dps: config.serie_dps,
        ordem_servico_id: input.ordemServicoId ?? null,
        venda_id: input.vendaId ?? null,
        emitido_por_usuario_id: opts?.usuarioId ?? null,
      })
      .select('id')
      .single();

    if (insErr) {
      // Nota autorizada na SEFIN mas falhou persistência — não perder a chave
      console.error('fiscal_nfse insert após autorização:', insErr, { chave, idDps });
      return {
        ok: true,
        status: 'autorizada',
        nfseId: '',
        chaveAcesso: chave,
        idDps,
        numeroNfse: numero,
      };
    }

    return {
      ok: true,
      status: 'autorizada',
      nfseId: row.id,
      chaveAcesso: chave,
      idDps,
      numeroNfse: numero,
    };
  } catch (err) {
    if (err instanceof ReceitaRejectionError) {
      const complemento = err.complemento;
      await admin.from('fiscal_nfse_rejeicoes').insert({
        empresa_id: empresaId,
        codigo: err.codigo,
        descricao: err.descricao,
        mensagens: err.mensagens ?? null,
        payload_resumo: {
          valor: input.valorServico,
          tomador: onlyDigitsDoc(input.tomador.documento),
          complemento: complemento ?? null,
        },
      });
      return {
        ok: false,
        status: 'rejeitada',
        codigo: err.codigo,
        message: complemento
          ? `[${err.codigo}] ${err.descricao} — ${complemento}`
          : `[${err.codigo}] ${err.descricao}`,
      };
    }
    const message = err instanceof Error ? err.message : 'Erro ao emitir NFS-e';
    return { ok: false, status: 'erro', message };
  } finally {
    await close();
  }
}
