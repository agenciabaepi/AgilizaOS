'use client';

export default function TestFeatureFlags() {
  console.log('🔍 TestFeatureFlags - Componente renderizado');

  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg border border-red-200 z-50 max-w-sm">
      <h3 className="font-bold text-lg mb-3">🧪 TESTE SIMPLES</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Status:</strong> COMPONENTE FUNCIONANDO
        </div>
        <div>
          <strong>Cor:</strong> VERMELHO (se estiver vendo, está funcionando)
        </div>
      </div>
      
      <div className="mt-3 p-2 bg-white text-red-800 rounded text-xs">
        <strong>Se você está vendo este painel vermelho, o componente está funcionando!</strong>
      </div>
    </div>
  );
}
