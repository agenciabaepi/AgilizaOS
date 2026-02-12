import { NextResponse } from 'next/server';

/** Rota simples para testar se o servidor está respondendo (não passa pelo middleware de auth). */
export async function GET() {
  return NextResponse.json({ ok: true, t: Date.now() });
}
