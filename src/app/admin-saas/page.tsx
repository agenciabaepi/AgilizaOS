import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const allowList = (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return allowList.includes(user.email.toLowerCase());
}

export default async function AdminSaaSPage() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const allowed = await isPlatformAdmin();
  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Acesso negado</h1>
        <p className="text-sm text-gray-600">Seu usuário não está autorizado a acessar o painel do SaaS. Garanta que o e-mail esteja listado em PLATFORM_ADMIN_EMAILS e que a sessão esteja ativa neste domínio.</p>
        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <div>Debug: user.email = <span className="font-mono">{user?.email || 'sem sessão'}</span></div>
          <div>Debug: PLATFORM_ADMIN_EMAILS = <span className="font-mono">{(process.env.PLATFORM_ADMIN_EMAILS || '(vazio)')}</span></div>
        </div>
      </div>
    );
  }

  // Métricas básicas
  const [{ count: empresas = 0 }, { count: usuarios = 0 }] = await Promise.all([
    supabase.from('empresas').select('id', { count: 'exact', head: true }),
    supabase.from('usuarios').select('id', { count: 'exact', head: true }),
  ]);

  const { data: assinaturaStats } = await supabase
    .from('assinaturas')
    .select('status');

  const { data: pagamentosStats } = await supabase
    .from('pagamentos')
    .select('status, paid_at');

  const assinaturasPorStatus = (assinaturaStats || []).reduce<Record<string, number>>((acc, a: any) => {
    const k = a?.status || 'desconhecido';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const pagamentosPorStatus = (pagamentosStats || []).reduce<Record<string, number>>((acc, p: any) => {
    const k = p?.status || 'desconhecido';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // UI simples (server component)
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-1">Admin da Plataforma (SaaS)</h1>
      <p className="text-xs text-gray-500 mb-4">Logado como: <span className="font-mono">{user?.email}</span></p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 border rounded-lg bg-white">
          <div className="text-sm text-gray-500">Empresas</div>
          <div className="text-3xl font-bold">{empresas}</div>
        </div>
        <div className="p-4 border rounded-lg bg-white">
          <div className="text-sm text-gray-500">Usuários</div>
          <div className="text-3xl font-bold">{usuarios}</div>
        </div>
        <div className="p-4 border rounded-lg bg-white">
          <div className="text-sm text-gray-500">Pagamentos pendentes</div>
          <div className="text-3xl font-bold">{pagamentosPorStatus['pending'] || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 border rounded-lg bg-white">
          <h2 className="text-lg font-semibold mb-2">Assinaturas por status</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(assinaturasPorStatus).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span className="font-medium">{v}</span></li>
            ))}
            {Object.keys(assinaturasPorStatus).length === 0 && (
              <li className="text-gray-500">Sem dados</li>
            )}
          </ul>
        </div>

        <div className="p-4 border rounded-lg bg-white">
          <h2 className="text-lg font-semibold mb-2">Pagamentos por status</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(pagamentosPorStatus).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span className="font-medium">{v}</span></li>
            ))}
            {Object.keys(pagamentosPorStatus).length === 0 && (
              <li className="text-gray-500">Sem dados</li>
            )}
          </ul>
        </div>
      </div>

      <form
        action={async (formData: FormData) => {
          'use server';
          const dias = formData.get('dias')?.toString() || '7';
          // Chama a rota de reconciliação (autorização por e-mail de plataforma)
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/pagamentos/reconciliar?dias=${dias}`, {
            cache: 'no-store',
          });
        }}
        className="mt-6 p-4 border rounded-lg bg-white flex items-center gap-2"
      >
        <label className="text-sm text-gray-600">Reconciliar últimos</label>
        <input name="dias" defaultValue="7" className="w-16 border rounded px-2 py-1 text-sm" />
        <span className="text-sm text-gray-600">dias</span>
        <button type="submit" className="ml-auto px-3 py-2 text-sm bg-black text-white rounded">Reconciliar agora</button>
      </form>

      <p className="text-xs text-gray-500 mt-3">Apenas e-mails listados em PLATFORM_ADMIN_EMAILS podem acessar.</p>
    </div>
  );
}


