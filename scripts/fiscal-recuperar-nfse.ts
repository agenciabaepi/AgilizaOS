import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createFiscalNfseClient } from '../src/modules/fiscal/nfse/client';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const empresaId = process.argv[2];
  const chave = process.argv[3]?.replace(/\D/g, '');
  if (!empresaId || !chave || chave.length !== 50) {
    console.error('Uso: npx tsx scripts/fiscal-recuperar-nfse.ts <empresaId> <chaveAcesso>');
    process.exit(1);
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const bundle = await createFiscalNfseClient(admin, empresaId);
  try {
    const r = await bundle.client.fetchByChave(chave);
    const { data, error } = await admin
      .from('fiscal_nfse')
      .upsert(
        {
          empresa_id: empresaId,
          chave_acesso: chave,
          id_dps: String(r.idDps || `NFS${chave}`).slice(0, 60),
          numero_nfse:
            (r as { nfse?: { infNFSe?: { nNFSe?: string } } }).nfse?.infNFSe?.nNFSe ?? null,
          status: 'autorizada',
          tipo_ambiente: Number(r.tipoAmbiente) === 1 ? 1 : 2,
          xml_nfse: r.xmlNfse,
          valor_servico: 10,
          valor_liquido: 10,
          dh_proc: r.dataHoraProcessamento
            ? new Date(r.dataHoraProcessamento).toISOString()
            : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'empresa_id,chave_acesso' }
      )
      .select('id, chave_acesso, numero_nfse, status')
      .single();

    if (error) throw error;
    console.log('OK', data);
  } finally {
    await bundle.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
