'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { finalizeImpersonationLogin, exitImpersonationClient } from '@/lib/impersonation-client';
import { FiExternalLink, FiLogIn, FiRefreshCw, FiUsers } from 'react-icons/fi';

type UsuarioEmpresa = {
  id: string;
  nome: string;
  email?: string | null;
  usuario?: string | null;
  nivel?: string | null;
  auth_user_id?: string | null;
  created_at?: string | null;
};

const NIVEL_LABEL: Record<string, string> = {
  admin: 'Admin',
  tecnico: 'Técnico',
  atendente: 'Atendente',
  financeiro: 'Financeiro',
  usuarioteste: 'Teste',
};

type Props = {
  empresaId: string;
  empresaNome?: string;
};

export default function AdminEmpresaUsuariosSection({ empresaId, empresaNome }: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin-saas/empresas/${empresaId}/usuarios`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || json.reason || 'Falha ao carregar usuários');
      }
      setUsuarios(json.usuarios || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function entrarComo(usuario: UsuarioEmpresa) {
    const nome = usuario.nome || usuario.email || 'este usuário';
    if (
      !window.confirm(
        `Entrar no sistema como "${nome}"${empresaNome ? ` (${empresaNome})` : ''}?\n\nVocê verá o sistema exatamente como este usuário. A ação será registrada em auditoria.`
      )
    ) {
      return;
    }

    setImpersonatingId(usuario.id);
    try {
      const res = await fetch('/api/admin-saas/impersonate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuario.id, empresa_id: empresaId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Não foi possível iniciar impersonation');
      }
      if (!json.session?.access_token || !json.session?.refresh_token) {
        throw new Error('Sessão não retornada pelo servidor');
      }
      await finalizeImpersonationLogin(json.session, json.redirect || '/dashboard');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao entrar como usuário');
      setImpersonatingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <FiUsers className="text-indigo-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Usuários da empresa</h2>
            <p className="text-sm text-gray-500">Entre como qualquer usuário para suporte ou diagnóstico.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={carregar}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-4">Carregando usuários...</p>
      ) : error ? (
        <p className="text-sm text-red-600 py-2">{error}</p>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">Nenhum usuário com login vinculado.</p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Login</th>
                <th className="px-3 py-2">Nível</th>
                <th className="px-3 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/80">
                  <td className="px-3 py-3 font-medium text-gray-900">{u.nome || '—'}</td>
                  <td className="px-3 py-3 text-gray-600">
                    <div>{u.usuario ? `@${u.usuario}` : u.email || '—'}</div>
                    {u.usuario && u.email ? (
                      <div className="text-xs text-gray-400">{u.email}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {NIVEL_LABEL[u.nivel || ''] || u.nivel || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      disabled={impersonatingId === u.id}
                      onClick={() => entrarComo(u)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <FiLogIn className="mr-1.5" size={14} />
                      {impersonatingId === u.id ? 'Entrando...' : 'Entrar como'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500 flex items-start gap-1.5">
        <FiExternalLink className="shrink-0 mt-0.5" size={12} />
        Todas as impersonations são registradas com data, admin e usuário alvo. Use apenas para suporte autorizado.
      </p>
    </div>
  );
}
