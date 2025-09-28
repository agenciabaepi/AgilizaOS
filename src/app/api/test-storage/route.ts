import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined; },
          set() {},
          remove() {},
        },
      }
    );

    // Listar buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    // Tentar listar arquivos no bucket logos
    let logosFiles = null;
    let logosError = null;
    if (buckets?.some(b => b.name === 'logos')) {
      const result = await supabase.storage.from('logos').list('logos');
      logosFiles = result.data;
      logosError = result.error;
    }

    // Tentar listar arquivos no bucket empresa-assets
    let empresaAssetsFiles = null;
    let empresaAssetsError = null;
    if (buckets?.some(b => b.name === 'empresa-assets')) {
      const result = await supabase.storage.from('empresa-assets').list('logos');
      empresaAssetsFiles = result.data;
      empresaAssetsError = result.error;
    }

    return NextResponse.json({
      buckets: buckets,
      bucketsError: bucketsError,
      logosFiles: logosFiles,
      logosError: logosError,
      empresaAssetsFiles: empresaAssetsFiles,
      empresaAssetsError: empresaAssetsError
    });

  } catch (error: unknown) {
    console.error('❌ Erro na API test-storage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
