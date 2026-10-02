import type { createAdminClient } from '@/lib/supabaseClient';
import { generateOSPDF } from '@/lib/pdfOS';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/** Gera o PDF da O.S. no servidor (mesmo documento de /api/pdf/gerar-os). */
export async function gerarPdfOsBuffer(
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
