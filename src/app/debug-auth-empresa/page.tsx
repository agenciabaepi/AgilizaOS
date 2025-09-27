'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

interface DebugInfo {
  timestamp: string;
  user: any;
  session: any;
  usuarioData: any;
  empresaData: any;
  loading: boolean;
}

export default function DebugAuthEmpresa() {
  const { user, session, usuarioData, empresaData, loading } = useAuth();
  const [debugHistory, setDebugHistory] = useState<DebugInfo[]>([]);

  useEffect(() => {
    const newDebugInfo: DebugInfo = {
      timestamp: new Date().toLocaleTimeString(),
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      session: session ? {
        access_token: session.access_token ? 'PRESENTE' : 'AUSENTE',
        refresh_token: session.refresh_token ? 'PRESENTE' : 'AUSENTE',
        expires_at: session.expires_at,
        expires_in: session.expires_in
      } : null,
      usuarioData: usuarioData ? {
        empresa_id: usuarioData.empresa_id,
        nome: usuarioData.nome,
        email: usuarioData.email,
        nivel: usuarioData.nivel,
        permissoes: usuarioData.permissoes
      } : null,
      empresaData: empresaData ? {
        id: empresaData.id,
        nome: empresaData.nome,
        plano: empresaData.plano
      } : null,
      loading
    };

    setDebugHistory(prev => [newDebugInfo, ...prev.slice(0, 9)]);
  }, [user, session, usuarioData, empresaData, loading]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🔍 Debug - Auth & Empresa Data</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado Atual */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-blue-600">📊 Estado Atual</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700">🔐 User:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(user ? { id: user.id, email: user.email } : null, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700">👤 Usuario Data:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(usuarioData, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700">🏢 Empresa Data:</h3>
              <div className={`p-2 rounded ${empresaData?.id ? 'bg-green-100' : 'bg-red-100'}`}>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(empresaData, null, 2)}
                </pre>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700">⏳ Loading:</h3>
              <span className={`px-2 py-1 rounded text-sm ${loading ? 'bg-yellow-200' : 'bg-green-200'}`}>
                {loading ? 'SIM' : 'NÃO'}
              </span>
            </div>
          </div>
        </div>

        {/* Validações */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-purple-600">✅ Validações</h2>
          
          <div className="space-y-3">
            <div className={`p-3 rounded flex items-center justify-between ${
              user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <span>User existe</span>
              <span className="font-bold">{user ? '✅' : '❌'}</span>
            </div>
            
            <div className={`p-3 rounded flex items-center justify-between ${
              session ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <span>Session existe</span>
              <span className="font-bold">{session ? '✅' : '❌'}</span>
            </div>
            
            <div className={`p-3 rounded flex items-center justify-between ${
              usuarioData ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <span>Usuario Data existe</span>
              <span className="font-bold">{usuarioData ? '✅' : '❌'}</span>
            </div>
            
            <div className={`p-3 rounded flex items-center justify-between ${
              usuarioData?.empresa_id ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <span>Usuario tem empresa_id</span>
              <span className="font-bold">{usuarioData?.empresa_id ? '✅' : '❌'}</span>
            </div>
            
            <div className={`p-3 rounded flex items-center justify-between ${
              empresaData ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <span>Empresa Data existe</span>
              <span className="font-bold">{empresaData ? '✅' : '❌'}</span>
            </div>
            
            <div className={`p-3 rounded flex items-center justify-between ${
              empresaData?.id ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <span>Empresa tem ID válido</span>
              <span className="font-bold">{empresaData?.id ? '✅' : '❌'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-600">📈 Histórico de Mudanças</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {debugHistory.map((info, index) => (
            <div key={index} className="border-l-4 border-gray-200 pl-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{info.timestamp}</span>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    info.empresaData?.id ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                  }`}>
                    Empresa: {info.empresaData?.id ? 'OK' : 'NULL'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    info.loading ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'
                  }`}>
                    {info.loading ? 'Loading' : 'Loaded'}
                  </span>
                </div>
              </div>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
{`empresaData: ${JSON.stringify(info.empresaData)}
usuarioData.empresa_id: ${info.usuarioData?.empresa_id || 'null'}`}
              </pre>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">💡 Como usar:</h3>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Observe se "Empresa tem ID válido" está ✅</li>
          <li>2. Se estiver ❌, verifique o histórico para ver quando mudou</li>
          <li>3. Verifique se usuarioData.empresa_id existe</li>
          <li>4. Se empresa_id existe mas empresaData.id é null, há problema no fallback</li>
        </ol>
      </div>
    </div>
  );
}
