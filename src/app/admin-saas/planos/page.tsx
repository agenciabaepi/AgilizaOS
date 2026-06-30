export const dynamic = 'force-dynamic';

import PlanosClient from './PlanosClient';

export default function AdminPlanosPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Planos e preços</h1>
      <p className="text-sm text-gray-600 mb-6">
        Configure os valores mensais do Plano Básico e do Plano Completo.
      </p>
      <PlanosClient />
    </div>
  );
}
