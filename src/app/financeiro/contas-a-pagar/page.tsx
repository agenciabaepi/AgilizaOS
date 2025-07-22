import MenuLayout from '@/components/MenuLayout';

export default function ContasAPagarPage() {
  return (
    <MenuLayout>
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Contas a Pagar</h1>
        <p className="text-gray-600 mb-8">Gerencie aqui todas as contas a pagar do seu negócio. Em breve, você poderá cadastrar, visualizar e quitar contas diretamente por esta tela.</p>
        {/* Espaço para futura tabela/listagem de contas */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow text-center text-gray-400">
          Nenhuma conta cadastrada ainda.
        </div>
      </div>
    </MenuLayout>
  );
} 