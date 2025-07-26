import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const { cnpj } = await req.json();
  const rawCnpj = cnpj.replace(/\D/g, '');

  const { data } = await supabase
    .from('empresas')
    .select('id')
    .eq('cnpj', rawCnpj)
    .maybeSingle();

  return NextResponse.json({ existe: !!data });
}