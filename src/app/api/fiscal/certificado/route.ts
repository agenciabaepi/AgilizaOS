import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess, sealPfx } from '@/modules/fiscal';

async function resolveEmpresa(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return null;
  const empresaId = await getEmpresaIdForUser(userId);
  if (!empresaId) return null;
  return { userId, empresaId };
}

/** Upload de certificado A1 (.pfx / .p12) — multipart: file + password */
export async function POST(req: NextRequest) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file');
    const password = String(form.get('password') || '');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo .pfx/.p12 é obrigatório.' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Senha do certificado é obrigatória.' }, { status: 400 });
    }

    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.pfx') && !name.endsWith('.p12')) {
      return NextResponse.json({ error: 'Envie um arquivo .pfx ou .p12 (A1).' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx. 2 MB).' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());

    let sealed;
    try {
      sealed = sealPfx(buf, password);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : 'Não foi possível ler o PFX. Verifique a senha e se é A1 ICP-Brasil.',
        },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('fiscal_certificados')
      .upsert(
        {
          empresa_id: auth.empresaId,
          tipo: 'A1',
          subject_cn: sealed.meta.subjectCn,
          cnpj_certificado: sealed.meta.cnpj,
          not_before: sealed.meta.notBefore.toISOString(),
          not_after: sealed.meta.notAfter.toISOString(),
          fingerprint_sha256: sealed.meta.fingerprintSha256,
          pfx_ciphertext: sealed.pfxCiphertext,
          password_ciphertext: sealed.passwordCiphertext,
          ativo: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'empresa_id' }
      )
      .select(
        'id, empresa_id, tipo, subject_cn, cnpj_certificado, not_before, not_after, fingerprint_sha256, ativo, created_at'
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { error } = await admin.from('fiscal_certificados').delete().eq('empresa_id', auth.empresaId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
