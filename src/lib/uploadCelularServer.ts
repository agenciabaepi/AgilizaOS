import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { readSupabaseServiceKey } from '@/lib/supabase-config';
import {
  UPLOAD_CELULAR_BUCKET,
  UPLOAD_CELULAR_PASTA,
  UPLOAD_CELULAR_VALIDADE_MS,
  tipoPorMimeOuNome,
  type ArquivoCelular,
} from '@/lib/uploadCelular';

export interface SessaoUploadCelular {
  sessaoId: string;
  empresaId: string;
  expiraEm: number;
}

function segredo(): string {
  const s = process.env.UPLOAD_CELULAR_SECRET || readSupabaseServiceKey();
  if (!s) throw new Error('Segredo para upload pelo celular não configurado');
  return s;
}

function assinar(payload: string): string {
  return createHmac('sha256', segredo()).update(payload).digest('base64url').slice(0, 32);
}

export function criarTokenUploadCelular(empresaId: string): { token: string; sessao: SessaoUploadCelular } {
  const sessao: SessaoUploadCelular = {
    sessaoId: randomUUID(),
    empresaId,
    expiraEm: Date.now() + UPLOAD_CELULAR_VALIDADE_MS,
  };
  const payload = Buffer.from(`${sessao.sessaoId}|${sessao.empresaId}|${sessao.expiraEm}`).toString('base64url');
  return { token: `${payload}.${assinar(payload)}`, sessao };
}

export type ResultadoToken =
  | { ok: true; sessao: SessaoUploadCelular }
  | { ok: false; motivo: 'invalido' | 'expirado' };

export function validarTokenUploadCelular(token: string | null | undefined): ResultadoToken {
  if (!token || typeof token !== 'string') return { ok: false, motivo: 'invalido' };
  const [payload, assinatura] = token.split('.');
  if (!payload || !assinatura) return { ok: false, motivo: 'invalido' };

  const esperada = Buffer.from(assinar(payload));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) {
    return { ok: false, motivo: 'invalido' };
  }

  const [sessaoId, empresaId, expiraStr] = Buffer.from(payload, 'base64url').toString('utf8').split('|');
  const expiraEm = Number(expiraStr);
  if (!sessaoId || !empresaId || !Number.isFinite(expiraEm)) return { ok: false, motivo: 'invalido' };
  if (Date.now() > expiraEm) return { ok: false, motivo: 'expirado' };

  return { ok: true, sessao: { sessaoId, empresaId, expiraEm } };
}

export function pastaDaSessao(sessaoId: string): string {
  return `${UPLOAD_CELULAR_PASTA}/${sessaoId}`;
}

export async function listarArquivosSessao(sessaoId: string): Promise<ArquivoCelular[]> {
  const storage = getSupabaseAdmin().storage.from(UPLOAD_CELULAR_BUCKET);
  const pasta = pastaDaSessao(sessaoId);
  const { data, error } = await storage.list(pasta, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'asc' },
  });
  if (error) throw new Error(error.message);

  return (data || [])
    .filter((obj) => obj.id && !obj.name.startsWith('.'))
    .map((obj) => {
      const path = `${pasta}/${obj.name}`;
      const meta = (obj.metadata || {}) as { mimetype?: string; size?: number };
      return {
        path,
        url: storage.getPublicUrl(path).data.publicUrl,
        nome: obj.name,
        tipo: tipoPorMimeOuNome(meta.mimetype || '', obj.name) || 'imagem',
        tamanho: meta.size || 0,
        criadoEm: obj.created_at || null,
      };
    });
}
