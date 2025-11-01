'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave } from 'react-icons/fi'

interface Aviso {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'warning' | 'error' | 'success'
  cor_fundo: string
  cor_texto: string
  prioridade: number
  ativo: boolean
  data_inicio: string | null
  data_fim: string | null
  created_at: string
}

export default function AvisosPage() {
  const { usuarioData, empresaData, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [loading, setLoading] = useState(true) // Iniciar como true para mostrar loading na primeira renderização
  const [showModal, setShowModal] = useState(false)
  const [editingAviso, setEditingAviso] = useState<Aviso | null>(null)
  const carregandoRef = useRef(false) // Flag para evitar múltiplas chamadas simultâneas
  const jaCarregouRef = useRef(false) // Flag para evitar recarregar múltiplas vezes no mesmo mount
  const [formData, setFormData] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'error' as 'info' | 'warning' | 'error' | 'success',
    cor_fundo: '#EF4444',
    cor_texto: '#FFFFFF',
    prioridade: 0,
    ativo: true,
    data_inicio: '',
    data_fim: '',
  })

  // Verificar se é admin
  const isAdmin = usuarioData?.nivel === 'admin' || usuarioData?.nivel === 'usuarioteste'

  // Carregar avisos quando tiver empresaId e for admin
  useEffect(() => {
    if (!isAdmin) {
      setAvisos([])
      setLoading(false)
      return
    }
    
    const empresaId = empresaData?.id || usuarioData?.empresa_id
    
    // Se já carregou uma vez e tem o mesmo empresaId, não recarregar
    if (jaCarregouRef.current && empresaId) {
      return
    }
    
    if (!empresaId) {
      // Se não tem empresaId ainda, aguardar apenas uma tentativa
      const timer = setTimeout(() => {
        const novoEmpresaId = empresaData?.id || usuarioData?.empresa_id
        if (novoEmpresaId && !carregandoRef.current && !jaCarregouRef.current) {
          jaCarregouRef.current = true
          carregarAvisos(true)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
    
    // Tem empresaId - carregar apenas uma vez
    if (!carregandoRef.current && !jaCarregouRef.current) {
      jaCarregouRef.current = true
      carregarAvisos(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, empresaData?.id, usuarioData?.empresa_id])

  const carregarAvisos = async (forcarDoBanco = false) => {
    // Prevenir múltiplas chamadas simultâneas
    if (carregandoRef.current) {
      return
    }
    
    const empresaId = empresaData?.id || usuarioData?.empresa_id
    if (!empresaId) {
      setAvisos([])
      setLoading(false)
      return
    }
    
    carregandoRef.current = true
    
    try {
      setLoading(true)
      
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)
      const url = `/api/avisos?empresa_id=${empresaId}&todos=true&_t=${timestamp}&_r=${randomId}`
      
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        setAvisos([])
        setLoading(false)
        return
      }
      
      const data = await response.json()
      const avisosDoBanco = Array.isArray(data.avisos) ? data.avisos : []
      
      const avisosNovos = avisosDoBanco.map(a => ({
        id: a.id,
        titulo: a.titulo,
        mensagem: a.mensagem,
        tipo: a.tipo,
        cor_fundo: a.cor_fundo,
        cor_texto: a.cor_texto,
        prioridade: a.prioridade || 0,
        ativo: Boolean(a.ativo),
        data_inicio: a.data_inicio,
        data_fim: a.data_fim,
        created_at: a.created_at
      }))
      
      // Atualizar estado de uma vez só - usar batch update do React
      setLoading(false)
      setAvisos(avisosNovos)
    } catch (error) {
      setAvisos([])
      setLoading(false)
    } finally {
      carregandoRef.current = false
    }
  }

  const abrirModal = (aviso?: Aviso) => {
    if (aviso) {
      setEditingAviso(aviso)
      setFormData({
        titulo: aviso.titulo || '',
        mensagem: aviso.mensagem || '',
        tipo: aviso.tipo || 'error',
        cor_fundo: aviso.cor_fundo || '#EF4444',
        cor_texto: aviso.cor_texto || '#FFFFFF',
        prioridade: aviso.prioridade || 0,
        ativo: aviso.ativo !== undefined ? aviso.ativo : true,
        data_inicio: aviso.data_inicio ? aviso.data_inicio.split('T')[0] : '',
        data_fim: aviso.data_fim ? aviso.data_fim.split('T')[0] : '',
      })
    } else {
      setEditingAviso(null)
      setFormData({
        titulo: '',
        mensagem: '',
        tipo: 'error',
        cor_fundo: '#EF4444',
        cor_texto: '#FFFFFF',
        prioridade: 0,
        ativo: true,
        data_inicio: '',
        data_fim: '',
      })
    }
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditingAviso(null)
  }

  const salvarAviso = async () => {
    try {
      if (!formData.titulo?.trim() || !formData.mensagem?.trim()) {
        addToast('error', 'Preencha título e mensagem')
        return
      }

      // IMPORTANTE: SEMPRE buscar empresaId diretamente do AuthContext no momento de salvar
      // Não usar valores em cache ou variáveis antigas
      const empresaIdAtual = empresaData?.id || usuarioData?.empresa_id
      
      console.log('[AVISOS] salvarAviso - Validando empresaId:', {
        empresaDataId: empresaData?.id,
        usuarioDataEmpresaId: usuarioData?.empresa_id,
        empresaIdAtual,
        empresaIdAtual_tipo: typeof empresaIdAtual,
        empresaIdAtual_valido: !!empresaIdAtual && empresaIdAtual !== 'undefined' && empresaIdAtual !== 'null'
      })
      
      if (!empresaIdAtual) {
        console.error('[AVISOS] salvarAviso - empresaId não disponível!')
        addToast('error', 'Dados da empresa não disponíveis. Recarregue a página e tente novamente.')
        return
      }
      
      // Validar que não é string inválida
      const empresaIdFinal = String(empresaIdAtual).trim()
      if (!empresaIdFinal || empresaIdFinal === 'undefined' || empresaIdFinal === 'null' || empresaIdFinal.length < 10) {
        console.error('[AVISOS] salvarAviso - empresaId inválido:', empresaIdFinal)
        addToast('error', 'Erro: ID da empresa inválido. Recarregue a página.')
        return
      }
      
      const empresaId = empresaIdFinal
      
      console.log('[AVISOS] salvarAviso - empresaId validado:', empresaId)

      // Converter datas para formato ISO se estiverem preenchidas
      let dataInicioISO = null;
      let dataFimISO = null;
      
      if (formData.data_inicio && formData.data_inicio.trim() !== '') {
        const data = new Date(formData.data_inicio + 'T00:00:00');
        if (!isNaN(data.getTime())) {
          dataInicioISO = data.toISOString();
        }
      }
      
      if (formData.data_fim && formData.data_fim.trim() !== '') {
        const data = new Date(formData.data_fim + 'T23:59:59');
        if (!isNaN(data.getTime())) {
          dataFimISO = data.toISOString();
        }
      }
      
      console.log('Datas processadas:', {
        data_inicio_input: formData.data_inicio,
        data_inicio_iso: dataInicioISO,
        data_fim_input: formData.data_fim,
        data_fim_iso: dataFimISO
      })

      // Criar payload com empresa_id garantido
      const payload = {
        titulo: formData.titulo.trim(),
        mensagem: formData.mensagem.trim(),
        tipo: formData.tipo,
        cor_fundo: formData.cor_fundo,
        cor_texto: formData.cor_texto,
        prioridade: formData.prioridade || 0,
        ativo: formData.ativo,
        data_inicio: dataInicioISO,
        data_fim: dataFimISO,
        empresa_id: empresaId, // Garantir que está aqui
      }
      
      // Validação final
      if (!payload.empresa_id) {
        console.error('❌ empresa_id ainda undefined no payload:', payload)
        addToast('error', 'Erro: empresa_id não encontrado')
        return
      }

      if (editingAviso) {
        // Atualizar
        if (!empresaId) {
          addToast('error', 'Dados da empresa não disponíveis. Aguarde alguns segundos e tente novamente.')
          return
        }
        
        const updatePayload = {
          id: editingAviso.id,
          empresa_id: empresaId,
          titulo: formData.titulo.trim(),
          mensagem: formData.mensagem.trim(),
          tipo: formData.tipo,
          cor_fundo: formData.cor_fundo,
          cor_texto: formData.cor_texto,
          prioridade: formData.prioridade || 0,
          ativo: formData.ativo,
        }
        
        // Sempre incluir datas (pode ser null para limpar)
        updatePayload.data_inicio = dataInicioISO
        updatePayload.data_fim = dataFimISO
        
        
        const response = await fetch('/api/avisos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        })

        const text = await response.text()
        let responseData
        try {
          responseData = JSON.parse(text)
        } catch (e) {
          console.error('Erro ao parsear resposta:', e, 'Text:', text)
          addToast('error', `Erro ${response.status}`)
          return
        }

        if (response.ok) {
          addToast('success', 'Aviso atualizado com sucesso')
          fecharModal()
          
          jaCarregouRef.current = false // Permitir recarregar após atualizar
          await carregarAvisos(true)
          
          // Disparar evento para o banner também atualizar
          window.dispatchEvent(new Event('avisosAtualizados'))
        } else {
          console.error('Erro ao atualizar aviso:', responseData)
          const errorMessage = responseData?.error || 'Erro ao atualizar aviso'
          addToast('error', errorMessage)
        }
      } else {
        // Criar
        if (!empresaId) {
          addToast('error', 'Dados da empresa não disponíveis. Aguarde alguns segundos e tente novamente.')
          return
        }

        // Garantir empresa_id antes de enviar - FORÇANDO INCLUSÃO
        console.log('🔥 ANTES de criar payloadFinal - empresaId:', empresaId)
        console.log('🔥 ANTES de criar payloadFinal - payload:', payload)
        
        const payloadFinal = {
          titulo: payload.titulo,
          mensagem: payload.mensagem,
          tipo: payload.tipo,
          cor_fundo: payload.cor_fundo,
          cor_texto: payload.cor_texto,
          prioridade: payload.prioridade,
          ativo: payload.ativo,
          data_inicio: payload.data_inicio,
          data_fim: payload.data_fim,
          empresa_id: String(empresaId), // FORÇAR como string e garantir
        }
        
        console.log('🔥 DEPOIS de criar payloadFinal - empresaId:', empresaId)
        console.log('🔥 DEPOIS - payloadFinal.empresa_id:', payloadFinal.empresa_id)
        console.log('🔥 DEPOIS - JSON completo:', JSON.stringify(payloadFinal))
        
        if (!payloadFinal.empresa_id) {
          console.error('❌ ERRO CRÍTICO: empresa_id ainda undefined após forçar!')
          console.error('❌ payloadFinal completo:', payloadFinal)
          addToast('error', 'Erro: empresa_id não encontrado')
          return
        }
        
        try {
          // CRIAR BODY DIRETAMENTE com empresa_id GARANTIDO
          // IMPORTANTE: Usar empresaId validado, não qualquer variável em cache
          const bodyDireto = {
            titulo: formData.titulo.trim(),
            mensagem: formData.mensagem.trim(),
            tipo: formData.tipo,
            cor_fundo: formData.cor_fundo,
            cor_texto: formData.cor_texto,
            prioridade: formData.prioridade || 0,
            ativo: formData.ativo,
            data_inicio: dataInicioISO,
            data_fim: dataFimISO,
            empresa_id: empresaId, // Usar empresaId validado acima
          }
          
          console.log('[AVISOS] salvarAviso - bodyDireto criado:', {
            ...bodyDireto,
            empresa_id: bodyDireto.empresa_id,
            empresa_id_tipo: typeof bodyDireto.empresa_id,
            empresa_id_length: bodyDireto.empresa_id?.length
          })
          
          // VERIFICAÇÃO FINAL
          if (!bodyDireto.empresa_id || bodyDireto.empresa_id === 'undefined' || bodyDireto.empresa_id === 'null') {
            console.error('[AVISOS] salvarAviso - empresa_id inválido no bodyDireto:', bodyDireto.empresa_id)
            addToast('error', 'Erro: empresa_id inválido')
            return
          }
          
          const response = await fetch('/api/avisos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyDireto),
          })

          console.log('📥 Response status:', response.status)
          
          const text = await response.text()
          console.log('📥 Response text:', text)
          
          let responseData
          try {
            responseData = JSON.parse(text)
            console.log('📥 Response parsed:', responseData)
          } catch (parseError) {
            console.error('❌ Erro ao parsear JSON:', parseError, 'Text:', text)
            addToast('error', `Erro ${response.status}: ${text.substring(0, 100)}`)
            return
          }

          if (response.ok) {
            addToast('success', 'Aviso criado com sucesso')
            fecharModal()
            
            jaCarregouRef.current = false // Permitir recarregar após criar
            await carregarAvisos(true)
            
            // Disparar evento para o banner também atualizar
            window.dispatchEvent(new Event('avisosAtualizados'))
          } else {
            console.error('❌ Erro HTTP:', response.status, responseData)
            const errorMsg = responseData?.error || responseData?.message || 'Erro ao criar aviso'
            addToast('error', errorMsg)
          }
        } catch (fetchError) {
          console.error('❌ Erro no fetch:', fetchError)
          addToast('error', 'Erro ao enviar requisição')
        }
      }
    } catch (error) {
      addToast('error', 'Erro ao salvar aviso')
    }
  }

  const deletarAviso = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aviso?')) return

    try {
      const empresaId = empresaData?.id || usuarioData?.empresa_id
      if (!empresaId) {
        addToast('error', 'Dados da empresa não disponíveis.')
        return
      }
      const response = await fetch(`/api/avisos?id=${id}&empresa_id=${empresaId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        addToast('success', 'Aviso excluído com sucesso')
        jaCarregouRef.current = false // Permitir recarregar após excluir
        await carregarAvisos(true)
        
        // Disparar evento para o banner também atualizar
        window.dispatchEvent(new Event('avisosAtualizados'))
      } else {
        addToast('error', 'Erro ao excluir aviso')
      }
    } catch (error) {
      console.error('Erro ao deletar aviso:', error)
      addToast('error', 'Erro ao excluir aviso')
    }
  }

  const toggleAtivo = async (aviso: Aviso) => {
    try {
      const empresaId = empresaData?.id || usuarioData?.empresa_id
      if (!empresaId) {
        addToast('error', 'Dados da empresa não disponíveis.')
        return
      }
      
      const novoStatus = !aviso.ativo
      const payload = { 
        id: aviso.id, 
        empresa_id: empresaId, 
        ativo: novoStatus 
      }
      
      const response = await fetch('/api/avisos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const text = await response.text()
      let responseData
      try {
        responseData = JSON.parse(text)
      } catch (e) {
        console.error('❌ Erro ao parsear resposta:', e, 'Text:', text)
        addToast('error', `Erro ${response.status}`)
        return
      }

      if (response.ok) {
        addToast('success', `Aviso ${novoStatus ? 'ativado' : 'desativado'} com sucesso`)
        
        jaCarregouRef.current = false // Permitir recarregar após alterar status
        await carregarAvisos(true)
        
        // Disparar evento para o banner também atualizar
        window.dispatchEvent(new Event('avisosAtualizados'))
      } else {
        console.error('❌ Erro ao alterar status:', responseData)
        const errorMessage = responseData?.error || 'Erro ao alterar status do aviso'
        addToast('error', errorMessage)
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error)
      addToast('error', 'Erro ao alterar status do aviso')
      addToast('error', 'Erro ao alterar status do aviso')
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Avisos do Sistema</h2>
          <p className="text-gray-600 mt-1">Gerencie os avisos que aparecem no topo do sistema para todos os usuários</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
        >
          <FiPlus size={20} />
          Novo Aviso
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : avisos.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">Nenhum aviso cadastrado ainda.</p>
          <button
            onClick={() => abrirModal()}
            className="mt-4 text-black underline hover:no-underline"
          >
            Criar primeiro aviso
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {avisos.map((aviso) => (
            <div
              key={aviso.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{aviso.titulo}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        aviso.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {aviso.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Prioridade: {aviso.prioridade}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{aviso.mensagem}</p>
                  <div
                    className="p-3 rounded-lg mb-3"
                    style={{
                      backgroundColor: aviso.cor_fundo,
                      color: aviso.cor_texto,
                    }}
                  >
                    <p className="font-medium">{aviso.titulo}</p>
                    <p className="text-sm opacity-90">{aviso.mensagem}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {aviso.data_inicio ? (
                      <>
                        <span>Início: {(() => {
                          try {
                            const date = new Date(aviso.data_inicio);
                            if (!isNaN(date.getTime())) {
                              return date.toLocaleDateString('pt-BR');
                            }
                          } catch (e) {
                            console.error('Erro ao formatar data_inicio:', e, aviso.data_inicio);
                          }
                          return aviso.data_inicio;
                        })()}</span>
                        {aviso.data_fim && ' • '}
                      </>
                    ) : null}
                    {aviso.data_fim ? (
                      <span>Fim: {(() => {
                        try {
                          const date = new Date(aviso.data_fim);
                          if (!isNaN(date.getTime())) {
                            return date.toLocaleDateString('pt-BR');
                          }
                        } catch (e) {
                          console.error('Erro ao formatar data_fim:', e, aviso.data_fim);
                        }
                        return aviso.data_fim;
                      })()}</span>
                    ) : null}
                    {!aviso.data_inicio && !aviso.data_fim && <span>Sem data de início/fim</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleAtivo(aviso)}
                    className={`p-2 rounded hover:bg-gray-100 ${
                      aviso.ativo ? 'text-orange-600' : 'text-green-600'
                    }`}
                    title={aviso.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {aviso.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => abrirModal(aviso)}
                    className="p-2 rounded hover:bg-gray-100 text-blue-600"
                    title="Editar"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    onClick={() => deletarAviso(aviso.id)}
                    className="p-2 rounded hover:bg-gray-100 text-red-600"
                    title="Excluir"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criar/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">
                {editingAviso ? 'Editar Aviso' : 'Novo Aviso'}
              </h3>
              <button
                onClick={fecharModal}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Ex: Fechamento do sistema"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mensagem *</label>
                <textarea
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  rows={4}
                  placeholder="Ex: No dia 25/12 vamos fechar para manutenção"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="error">Erro (Vermelho)</option>
                    <option value="warning">Aviso (Laranja)</option>
                    <option value="info">Info (Azul)</option>
                    <option value="success">Sucesso (Verde)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Prioridade</label>
                  <input
                    type="number"
                    value={formData.prioridade}
                    onChange={(e) => setFormData({ ...formData, prioridade: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Quanto maior, mais importante (aparece primeiro)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cor de Fundo</label>
                  <input
                    type="color"
                    value={formData.cor_fundo}
                    onChange={(e) => setFormData({ ...formData, cor_fundo: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cor do Texto</label>
                  <input
                    type="color"
                    value={formData.cor_texto}
                    onChange={(e) => setFormData({ ...formData, cor_texto: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data de Início (opcional)</label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deixe em branco para exibir imediatamente</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Data de Fim (opcional)</label>
                  <input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deixe em branco para permanente</p>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Aviso ativo</span>
                </label>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: formData.cor_fundo,
                    color: formData.cor_texto,
                  }}
                >
                  <p className="font-semibold text-lg mb-1">{formData.titulo || 'Título do aviso'}</p>
                  <p className="text-sm opacity-90">{formData.mensagem || 'Mensagem do aviso aparecerá aqui'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <button
                onClick={fecharModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAviso}
                disabled={!empresaData?.id && !usuarioData?.empresa_id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  empresaData?.id || usuarioData?.empresa_id
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!empresaData?.id && !usuarioData?.empresa_id ? 'Aguarde o carregamento dos dados' : ''}
              >
                <FiSave size={18} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

