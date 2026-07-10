import type { SupabaseClient } from '@supabase/supabase-js';

const BATCH_SIZE = 20;

async function sumBytesInStoragePath(
  supabase: SupabaseClient,
  bucket: string,
  path: string
): Promise<number> {
  const { data, error } = await supabase.storage.from(bucket).list(path, { limit: 1000 });
  if (error || !data) return 0;

  let bytes = 0;
  const subdirs: string[] = [];

  for (const item of data) {
    if (item.id) {
      bytes += Number(item.metadata?.size || (item as { size?: number }).size || 0);
    } else if (item.name) {
      subdirs.push(path ? `${path}/${item.name}` : item.name);
    }
  }

  if (subdirs.length > 0) {
    const nested = await Promise.all(subdirs.map((sub) => sumBytesInStoragePath(supabase, bucket, sub)));
    bytes += nested.reduce((acc, n) => acc + n, 0);
  }

  return bytes;
}

async function sumOrdensImagensBytes(
  supabase: SupabaseClient,
  ordemIds: string[]
): Promise<number> {
  let totalBytes = 0;

  for (let i = 0; i < ordemIds.length; i += BATCH_SIZE) {
    const batch = ordemIds.slice(i, i + BATCH_SIZE);
    const parts = await Promise.all(
      batch.map(async (ordemId) => {
        const [root, videos] = await Promise.all([
          sumBytesInStoragePath(supabase, 'ordens-imagens', ordemId),
          sumBytesInStoragePath(supabase, 'ordens-imagens', `${ordemId}/videos`),
        ]);
        return root + videos;
      })
    );
    totalBytes += parts.reduce((acc, n) => acc + n, 0);
  }

  return totalBytes;
}

async function sumAnexosContasBytes(
  supabase: SupabaseClient,
  contaIds: string[]
): Promise<number> {
  let totalBytes = 0;

  for (let i = 0; i < contaIds.length; i += BATCH_SIZE) {
    const batch = contaIds.slice(i, i + BATCH_SIZE);
    const parts = await Promise.all(
      batch.map(async (contaId) => {
        const { data, error } = await supabase.storage
          .from('anexos-contas')
          .list('', { search: `anexo_${contaId}_`, limit: 200 });
        if (error || !data) return 0;
        return data.reduce((acc, file) => {
          if (!file.id) return acc;
          return acc + Number(file.metadata?.size || (file as { size?: number }).size || 0);
        }, 0);
      })
    );
    totalBytes += parts.reduce((acc, n) => acc + n, 0);
  }

  return totalBytes;
}

/**
 * Calcula uso de storage (MB) apenas nos paths da empresa — sem varrer buckets inteiros.
 */
export async function computeAdminEmpresaStorageMb(
  supabase: SupabaseClient,
  empresaId: string
): Promise<number> {
  let totalBytes = 0;

  try {
    totalBytes += await sumBytesInStoragePath(supabase, 'produtos', `produtos/${empresaId}`);
  } catch (err) {
    console.error('[adminEmpresaStorageMb] produtos:', err);
  }

  try {
    const { data: contasIds } = await supabase
      .from('contas_pagar')
      .select('id')
      .eq('empresa_id', empresaId);

    if (contasIds?.length) {
      totalBytes += await sumAnexosContasBytes(
        supabase,
        contasIds.map((c) => c.id as string)
      );
    }
  } catch (err) {
    console.error('[adminEmpresaStorageMb] anexos-contas:', err);
  }

  try {
    const { data: ordensIds } = await supabase
      .from('ordens_servico')
      .select('id')
      .eq('empresa_id', empresaId);

    if (ordensIds?.length) {
      totalBytes += await sumOrdensImagensBytes(
        supabase,
        ordensIds.map((o) => o.id as string)
      );
    }
  } catch (err) {
    console.error('[adminEmpresaStorageMb] ordens-imagens:', err);
  }

  return Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
}
