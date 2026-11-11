/**
 * Recupera NFS-e autorizada na SEFIN que falhou ao gravar localmente.
 * Uso: node scripts/fiscal-recuperar-nfse.mjs <empresaId> <chaveAcesso>
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: resolve(root, '.env.local') });
loadEnv({ path: resolve(root, '.env') });

const empresaId = process.argv[2];
const chave = process.argv[3];
if (!empresaId || !chave) {
  console.error('Uso: node scripts/fiscal-recuperar-nfse.mjs <empresaId> <chaveAcesso>');
  process.exit(1);
}

const { createFiscalNfseClient } = await import('../src/modules/fiscal/nfse/client.ts');

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const bundle = await createFiscalNfseClient(admin, empresaId);
try {
  const r = await bundle.client.fetchByChave(chave);
  const xml = r.xmlNfse ?? r.xml ?? '';
  const idDps = r.idDps ?? `NFS${chave}`;
  const numero = r.nfse?.infNFSe?.nNFSe ?? null;
  const tipoAmbiente = Number(r.tipoAmbiente) === 1 ? 1 : 2;
  const dhProc = r.dataHoraProcessamento
    ? new Date(r.dataHoraProcessamento).toISOString()
    : new Date().toISOString();

  const { data, error } = await admin
    .from('fiscal_nfse')
    .upsert(
      {
        empresa_id: empresaId,
        chave_acesso: chave,
        id_dps: String(idDps).slice(0, 60),
        numero_nfse: numero,
        status: 'autorizada',
        tipo_ambiente: tipoAmbiente,
        xml_nfse: xml,
        dh_proc: dhProc,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'empresa_id,chave_acesso' }
    )
    .select('id, chave_acesso, numero_nfse')
    .single();

  if (error) throw error;
  console.log('OK', data);
} finally {
  await bundle.close();
}
