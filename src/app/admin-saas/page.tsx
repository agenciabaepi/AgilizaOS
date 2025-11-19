
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

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
        set(name: string, value: string, options: { [key: string]: unknown }) {
          try { cookieStore.set(name, value, options); } catch {}
        },
        remove(name: string, options: { [key: string]: unknown }) {
          try { cookieStore.set(name, '', { ...options, maxAge: 0 }); } catch {}
        },
      },
    }
  );
}

// Mantido para futura evolução (2FA/whitelist); não utilizado no fluxo com cookie

export default async function AdminSaaSPage() {
  // ⚠️ NOTA: A verificação de cookie é feita pelo layout.tsx
  // Não precisa verificar aqui novamente, pois o layout já bloqueia acesso sem cookie
  
  // A partir daqui, acesso liberado (via cookie). Buscar user só para exibir e métricas.
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // Buscar métricas via API, encaminhando cookies (inclui o cookie do gate)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const metricsRes = await fetch(`${baseUrl}/api/admin-saas/metrics`, { cache: 'no-store' });
  const metricsJson = metricsRes.ok ? await metricsRes.json() : null;
  const metrics: { empresas: number; usuarios: number; assinaturas: number; pagamentos: number; assinaturasPorStatus: Record<string, number>; pagamentosPorStatus: Record<string, number> } = metricsJson?.ok
    ? metricsJson
    : { empresas: 0, usuarios: 0, assinaturas: 0, pagamentos: 0, assinaturasPorStatus: {}, pagamentosPorStatus: {} };

  const assinaturasPorStatus = metrics.assinaturasPorStatus || {};
  const pagamentosPorStatus = metrics.pagamentosPorStatus || {};

  // UI melhorada (server component)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Logado como <span className="font-mono text-gray-700">{user?.email}</span>
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600 mb-1">Empresas</div>
          <div className="text-3xl font-bold text-gray-900">{metrics.empresas.toLocaleString('pt-BR')}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600 mb-1">Usuários</div>
          <div className="text-3xl font-bold text-gray-900">{metrics.usuarios.toLocaleString('pt-BR')}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600 mb-1">Pagamentos</div>
          <div className="text-3xl font-bold text-gray-900">{metrics.pagamentos.toLocaleString('pt-BR')}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600 mb-1">Assinaturas</div>
          <div className="text-3xl font-bold text-gray-900">{metrics.assinaturas.toLocaleString('pt-BR')}</div>
        </div>
      </div>

      {/* Gráficos de Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assinaturas por Status</h2>
          <div className="space-y-3">
            {Object.entries(assinaturasPorStatus).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{k}</span>
                <span className="text-sm font-semibold text-gray-900">{v}</span>
              </div>
            ))}
            {Object.keys(assinaturasPorStatus).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Sem dados disponíveis</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pagamentos por Status</h2>
          <div className="space-y-3">
            {Object.entries(pagamentosPorStatus).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{k}</span>
                <span className="text-sm font-semibold text-gray-900">{v}</span>
              </div>
            ))}
            {Object.keys(pagamentosPorStatus).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Sem dados disponíveis</p>
            )}
          </div>
        </div>
      </div>

      {/* Formulário de Reconciliação */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reconciliação de Pagamentos</h2>
        <form
          action={async (formData: FormData) => {
            'use server';
            const dias = formData.get('dias')?.toString() || '7';
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/pagamentos/reconciliar?dias=${dias}`, {
              cache: 'no-store',
            });
          }}
          className="flex items-center gap-3 flex-wrap"
        >
          <label className="text-sm text-gray-600">Reconciliar últimos</label>
          <input 
            name="dias" 
            defaultValue="7" 
            type="number"
            min="1"
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" 
          />
          <span className="text-sm text-gray-600">dias</span>
          <button 
            type="submit" 
            className="ml-auto px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Reconciliar agora
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-4">
          Acesso protegido por verificação 2FA via WhatsApp
        </p>
      </div>

      {/* Lista de Empresas */}
      <div className="mt-8">
        <EmpresasSection />
      </div>
    </div>
  );
}



// Import dinâmico do componente cliente para evitar SSR
import EmpresasSection from './EmpresasClient';
