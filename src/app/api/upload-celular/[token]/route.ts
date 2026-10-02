import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  UPLOAD_CELULAR_BUCKET,
  UPLOAD_CELULAR_MAX_ARQUIVOS,
  UPLOAD_CELULAR_MAX_IMAGEM_BYTES,
  UPLOAD_CELULAR_MAX_VIDEO_BYTES,
  extensaoSegura,
  tipoPorMimeOuNome,
} from '@/lib/uploadCelular';
import {
  listarArquivosSessao,
  pastaDaSessao,
  validarTokenUploadCelular,
  type SessaoUploadCelular,
} from '@/lib/uploadCelularServer';

type Contexto = { params: Promise<{ token: string }> };

async function sessaoDoToken(
  ctx: Contexto
): Promise<{ sessao: SessaoUploadCelular } | { resposta: NextResponse }> {
  const { token } = await ctx.params;
  const resultado = validarTokenUploadCelular(token);
  if (!resultado.ok) {
    const mensagem =
      resultado.motivo === 'expirado'
        ? 'Este link expirou. Gere um novo QR Code no computador.'
        : 'Link inválido.';
    return { resposta: NextResponse.json({ error: mensagem, motivo: resultado.motivo }, { status: 410 }) };
  }
  return { sessao: resultado.sessao };
}

export async function GET(_request: NextRequest, ctx: Contexto) {
  const r = await sessaoDoToken(ctx);
  if ('resposta' in r) return r.resposta;

  try {
    const arquivos = await listarArquivosSessao(r.sessao.sessaoId);
    return NextResponse.json(
      { arquivos, limite: UPLOAD_CELULAR_MAX_ARQUIVOS, expiraEm: r.sessao.expiraEm },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[upload-celular] listar', error);
    return NextResponse.json({ error: 'Erro ao listar arquivos' }, { status: 500 });
  }
}

interface ArquivoSolicitado {
  nome: string;
  tipo: string;
  tamanho: number;
}

export async function POST(request: NextRequest, ctx: Contexto) {
  const r = await sessaoDoToken(ctx);
  if ('resposta' in r) return r.resposta;

  try {
    const body = (await request.json()) as { arquivos?: ArquivoSolicitado[] };
    const solicitados = Array.isArray(body.arquivos) ? body.arquivos : [];
    if (solicitados.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo informado' }, { status: 400 });
    }

    const existentes = await listarArquivosSessao(r.sessao.sessaoId);
    const restante = UPLOAD_CELULAR_MAX_ARQUIVOS - existentes.length;
    if (solicitados.length > restante) {
      return NextResponse.json(
        {
          error:
            restante <= 0
              ? `Limite de ${UPLOAD_CELULAR_MAX_ARQUIVOS} arquivos atingido.`
              : `Você só pode enviar mais ${restante} arquivo(s).`,
        },
        { status: 400 }
      );
    }

    for (const arq of solicitados) {
      const tipo = tipoPorMimeOuNome(arq.tipo, arq.nome);
      if (!tipo) {
        return NextResponse.json({ error: `Formato não suportado: ${arq.nome}` }, { status: 400 });
      }
      const max = tipo === 'video' ? UPLOAD_CELULAR_MAX_VIDEO_BYTES : UPLOAD_CELULAR_MAX_IMAGEM_BYTES;
      if (Number(arq.tamanho) > max) {
        return NextResponse.json(
          { error: `${arq.nome} é muito grande (máximo ${Math.round(max / 1024 / 1024)}MB).` },
          { status: 400 }
        );
      }
    }

    const storage = getSupabaseAdmin().storage.from(UPLOAD_CELULAR_BUCKET);
    const pasta = pastaDaSessao(r.sessao.sessaoId);
    const uploads: { path: string; signedUrl: string }[] = [];
    for (const arq of solicitados) {
      const path = `${pasta}/${Date.now()}_${randomUUID().slice(0, 8)}.${extensaoSegura(arq.tipo, arq.nome)}`;
      const { data, error } = await storage.createSignedUploadUrl(path);
      if (error || !data) {
        console.error('[upload-celular] assinar', error);
        return NextResponse.json({ error: 'Erro ao preparar o envio' }, { status: 500 });
      }
      uploads.push({ path, signedUrl: data.signedUrl });
    }

    return NextResponse.json({ uploads });
  } catch (error) {
    console.error('[upload-celular] POST', error);
    return NextResponse.json({ error: 'Erro ao preparar o envio' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: Contexto) {
  const r = await sessaoDoToken(ctx);
  if ('resposta' in r) return r.resposta;

  const path = request.nextUrl.searchParams.get('path') || '';
  const pasta = pastaDaSessao(r.sessao.sessaoId);
  if (!path.startsWith(`${pasta}/`) || path.includes('..')) {
    return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().storage.from(UPLOAD_CELULAR_BUCKET).remove([path]);
  if (error) {
    console.error('[upload-celular] remover', error);
    return NextResponse.json({ error: 'Erro ao remover arquivo' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
