'use client';

import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';

export default function TesteConfiguracoesPage({ embedded = false }: { embedded?: boolean }) {
  const content = (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          ✅ PÁGINA DE TESTE FUNCIONANDO!
        </h1>
        <p className="text-lg text-gray-700 mb-4">
          Se você está vendo esta mensagem, a página está funcionando!
        </p>
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Informações de Debug:</h2>
          <TesteInfo />
        </div>
      </div>
  );
  return embedded ? content : <MenuLayout>{content}</MenuLayout>;
}

function TesteInfo() {
  const { user, session, usuarioData, loading } = useAuth();

  return (
    <div className="space-y-2 text-sm">
      <div><strong>User:</strong> {user ? '✅ Presente' : '❌ Ausente'}</div>
      <div><strong>Session:</strong> {session ? '✅ Presente' : '❌ Ausente'}</div>
      <div><strong>UsuarioData:</strong> {usuarioData ? '✅ Presente' : '❌ Ausente'}</div>
      <div><strong>Loading:</strong> {loading ? '🔄 Sim' : '✅ Não'}</div>
      {usuarioData && (
        <>
          <div><strong>Nível:</strong> {usuarioData.nivel}</div>
          <div><strong>Permissões:</strong> {JSON.stringify(usuarioData.permissoes)}</div>
        </>
      )}
    </div>
  );
}
