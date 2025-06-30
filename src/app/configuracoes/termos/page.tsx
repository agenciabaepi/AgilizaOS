

'use client'

import MenuLayout from '@/components/MenuLayout'

export default function TermosPage() {
  return (
    <MenuLayout>
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800">Termos de Garantia</h1>
        <p className="mt-2 text-gray-600">Gerencie aqui os modelos de termos de garantia disponíveis para seleção nas ordens de serviço.</p>
        {/* Aqui você pode adicionar a listagem ou formulário futuramente */}
      </div>
    </MenuLayout>
  )
}