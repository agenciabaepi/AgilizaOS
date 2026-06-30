export const dynamic = 'force-dynamic';

import CuponsClient from './CuponsClient';

export default function AdminCuponsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Cupons de desconto</h1>
      <p className="text-sm text-gray-600 mb-6">
        Crie cupons de uso único com percentual de desconto. O uso é registrado automaticamente quando o
        pagamento PIX é confirmado.
      </p>
      <CuponsClient />
    </div>
  );
}
