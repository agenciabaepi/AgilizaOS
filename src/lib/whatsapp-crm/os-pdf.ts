import type { SupabaseClient } from '@supabase/supabase-js';
import type { createAdminClient } from '@/lib/supabaseClient';
import { generateOSPDF } from '@/lib/pdfOS';
import { gerarPdfOsCompleto } from '@/lib/ordem-pdf/gerar-pdf-completo';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/** Gera no servidor o PDF completo da O.S. (igual ao da impressão); cai no resumo se o render falhar. */
export async function gerarPdfOsBuffer(
  supabase: SupabaseAdmin,
  osId: string,
  empresaId?: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  try {
    const completo = await gerarPdfOsCompleto(supabase as unknown as SupabaseClient, osId, empresaId);
    if (completo) return completo;
  } catch (err) {
    console.error('[pdf-os] PDF completo falhou, usando resumo:', err);
  }
  return gerarPdfOsResumo(supabase, osId, empresaId);
}

async function gerarPdfOsResumo(
  supabase: SupabaseAdmin,
  osId: string,
  empresaId?: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  let query = supabase
    .from('ordens_servico')
    .select(
      `id, numero_os, created_at, equipamento, marca, modelo, problema_relatado,
       status, servico, observacao, laudo,
       clientes ( nome, telefone, email ),
       empresas ( nome )`
    )
    .eq('id', osId);
  if (empresaId) query = query.eq('empresa_id', empresaId);

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  const os = data as Record<string, unknown>;
  const buffer = await generateOSPDF({
    ...os,
    clientes: os.clientes ?? null,
    empresa_nome: (os.empresas as { nome?: string } | null)?.nome ?? '',
    observacoes: (os.observacao as string | null) ?? '',
  });

  return { buffer, filename: `OS-${os.numero_os ?? os.id}.pdf` };
}
