'use client';

import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

export default function DebugLoading() {
  const { user, session, usuarioData, empresaData, loading: authLoading } = useAuth();
  const { assinatura, limites, loading: subscriptionLoading } = useSubscription();

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">🔍 Debug Loading</h3>
      <div className="space-y-1">
        <div>Auth Loading: {authLoading ? '🔄 SIM' : '✅ NÃO'}</div>
        <div>User: {user ? '✅ PRESENTE' : '❌ AUSENTE'}</div>
        <div>Session: {session ? '✅ PRESENTE' : '❌ AUSENTE'}</div>
        <div>UsuarioData: {usuarioData ? '✅ PRESENTE' : '❌ AUSENTE'}</div>
        <div>EmpresaData: {empresaData ? '✅ PRESENTE' : '❌ AUSENTE'}</div>
        <div>Empresa ID: {usuarioData?.empresa_id || 'N/A'}</div>
        <div>Subscription Loading: {subscriptionLoading ? '🔄 SIM' : '✅ NÃO'}</div>
        <div>Assinatura: {assinatura ? '✅ PRESENTE' : '❌ AUSENTE'}</div>
        <div>Limites: {limites ? '✅ PRESENTE' : '❌ AUSENTE'}</div>
        <div className="text-xs text-gray-300 mt-2">
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
