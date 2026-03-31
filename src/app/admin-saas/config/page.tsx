export const dynamic = 'force-dynamic';

import ConfigClient from './ConfigClient';

export default function ConfigPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Configurações</h1>
      <ConfigClient />
    </div>
  );
}
