

'use client'

import MenuLayout from '@/components/MenuLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function UsuariosPage() {
  return (
    <MenuLayout>
      <main className="p-4 sm:p-6 md:p-10">
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Aqui você poderá adicionar, editar e remover usuários vinculados à empresa.
            </p>
            {/* Conteúdo futuro: lista de usuários, formulário etc. */}
          </CardContent>
        </Card>
      </main>
    </MenuLayout>
  )
}