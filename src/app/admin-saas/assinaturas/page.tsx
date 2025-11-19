export const dynamic = 'force-dynamic';

import AssinaturasClient from './AssinaturasClient';

export default function AssinaturasPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Assinaturas</h1>
      <p className="text-sm text-gray-600 mb-4">
        Gerencie todas as assinaturas do sistema. Visualize status, planos e próximas cobranças.
      </p>
      <AssinaturasClient />
    </div>
  );
}


