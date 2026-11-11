import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess, onlyDigitsDoc } from '@/modules/fiscal';

async function resolveEmpresa(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return null;
  const empresaId = await getEmpresaIdForUser(userId);
  if (!empresaId) return null;
  return { userId, empresaId };
}

export async function GET(req: NextRequest) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const [{ data: config }, { data: cert }] = await Promise.all([
      admin.from('fiscal_empresa_config').select('*').eq('empresa_id', auth.empresaId).maybeSingle(),
      admin
        .from('fiscal_certificados')
        .select(
          'id, empresa_id, tipo, subject_cn, cnpj_certificado, not_before, not_after, fingerprint_sha256, ativo, created_at'
        )
        .eq('empresa_id', auth.empresaId)
        .maybeSingle(),
    ]);

    const notAfter = cert?.not_after ? new Date(cert.not_after) : null;
    const now = Date.now();
    const certificado = cert
      ? {
          ...cert,
          expirado: notAfter ? notAfter.getTime() <= now : false,
          expira_em_breve: notAfter
            ? notAfter.getTime() - now < 30 * 24 * 60 * 60 * 1000 && notAfter.getTime() > now
            : false,
        }
      : null;

    // Não devolve o token CSC em claro
    const configSafe = config
      ? {
          ...config,
          nfce_csc: undefined,
          nfce_csc_configured: Boolean(config.nfce_csc),
        }
      : null;

    return NextResponse.json({ success: true, data: { config: configSafe, certificado } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const cnpj = onlyDigitsDoc(String(body.cnpj || ''));
    const codMunicipio = String(body.cod_municipio_ibge || '').replace(/\D/g, '');
    const razao = String(body.razao_social || '').trim();

    if (cnpj.length !== 14) {
      return NextResponse.json({ error: 'CNPJ inválido (14 dígitos).' }, { status: 400 });
    }
    if (codMunicipio.length !== 7) {
      return NextResponse.json({ error: 'Código IBGE do município deve ter 7 dígitos.' }, { status: 400 });
    }
    if (!razao) {
      return NextResponse.json({ error: 'Razão social é obrigatória.' }, { status: 400 });
    }

    const opcao = body.opcao_simples;
    if (!['mei', 'me_epp', 'nao_optante'].includes(opcao)) {
      return NextResponse.json({ error: 'opcao_simples inválida.' }, { status: 400 });
    }

    const ambiente = body.ambiente === 'producao' ? 'producao' : 'producao_restrita';
    const ie = body.inscricao_estadual
      ? String(body.inscricao_estadual).replace(/\D/g, '')
      : null;
    const nfceIdCsc = body.nfce_id_csc
      ? String(body.nfce_id_csc).replace(/\D/g, '').padStart(6, '0').slice(-6)
      : null;
    const nfceCscNovo = body.nfce_csc ? String(body.nfce_csc).trim() : '';

    const payload: Record<string, unknown> = {
      empresa_id: auth.empresaId,
      ambiente,
      opcao_simples: opcao,
      regime_apuracao_sn: opcao === 'me_epp' ? String(body.regime_apuracao_sn || '1') : null,
      regime_especial: String(body.regime_especial || '0'),
      cnpj,
      inscricao_municipal: body.inscricao_municipal ? String(body.inscricao_municipal).trim() : null,
      cod_municipio_ibge: codMunicipio,
      razao_social: razao,
      nome_fantasia: body.nome_fantasia ? String(body.nome_fantasia).trim() : null,
      serie_dps: String(body.serie_dps || '1').replace(/\D/g, '') || '1',
      c_trib_nac: body.c_trib_nac ? String(body.c_trib_nac).replace(/\D/g, '') : null,
      c_nbs: body.c_nbs ? String(body.c_nbs).replace(/\D/g, '') : null,
      descricao_servico_padrao: body.descricao_servico_padrao
        ? String(body.descricao_servico_padrao).trim()
        : null,
      aliquota_iss:
        body.aliquota_iss != null && body.aliquota_iss !== '' ? Number(body.aliquota_iss) : null,
      percentual_tot_trib_sn:
        body.percentual_tot_trib_sn != null && body.percentual_tot_trib_sn !== ''
          ? Number(body.percentual_tot_trib_sn)
          : null,
      ativo: Boolean(body.ativo),
      inscricao_estadual: ie || null,
      uf: (String(body.uf || 'SP').toUpperCase().replace(/[^A-Z]/g, '') || 'SP').slice(0, 2),
      nfce_serie: String(body.nfce_serie || '1').replace(/\D/g, '') || '1',
      nfce_id_csc: nfceIdCsc,
      nfce_ativo: Boolean(body.nfce_ativo),
      nfe_ativo: Boolean(body.nfe_ativo),
      nfe_serie: String(body.nfe_serie || '1').replace(/\D/g, '') || '1',
      nfce_ncm_padrao: body.nfce_ncm_padrao
        ? String(body.nfce_ncm_padrao).replace(/\D/g, '').slice(0, 8)
        : '85177900',
      nfce_cfop_padrao: body.nfce_cfop_padrao
        ? String(body.nfce_cfop_padrao).replace(/\D/g, '').slice(0, 4)
        : '5102',
      nfce_csosn_padrao: body.nfce_csosn_padrao
        ? String(body.nfce_csosn_padrao).replace(/\D/g, '').slice(0, 3)
        : '102',
      end_logradouro: body.end_logradouro ? String(body.end_logradouro).trim() : null,
      end_numero: body.end_numero ? String(body.end_numero).trim() : null,
      end_complemento: body.end_complemento ? String(body.end_complemento).trim() : null,
      end_bairro: body.end_bairro ? String(body.end_bairro).trim() : null,
      end_cep: body.end_cep ? String(body.end_cep).replace(/\D/g, '') : null,
      updated_at: new Date().toISOString(),
    };

    // Só atualiza o token se o usuário enviou um valor novo
    if (nfceCscNovo) {
      payload.nfce_csc = nfceCscNovo;
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('fiscal_empresa_config')
      .upsert(payload, { onConflict: 'empresa_id' })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const dataSafe = data
      ? {
          ...data,
          nfce_csc: undefined,
          nfce_csc_configured: Boolean(data.nfce_csc),
        }
      : data;

    return NextResponse.json({ success: true, data: dataSafe });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
