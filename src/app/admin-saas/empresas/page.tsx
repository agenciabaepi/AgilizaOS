export const dynamic = 'force-dynamic';

import EmpresasClient from '../EmpresasClient';

export default function EmpresasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie aprovação, ativação e criação de empresas na plataforma.
        </p>
      </div>
      <EmpresasClient />
    </div>
  );
}


