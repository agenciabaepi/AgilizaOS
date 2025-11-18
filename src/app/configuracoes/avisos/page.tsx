'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/Toast'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave } from 'react-icons/fi'
import { supabase } from '@/lib/supabaseClient'

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
  exibir_para_todos: boolean
  usuarios_ids: string[]
  created_at: string
}

interface Usuario {
  id: string
  nome: string
  email: string
}

interface ConfigAvisoContasPagar {
  id: string
  tipo_alerta: 'vencidas' | 'proximas'
  titulo: string
  descricao: string
  cor_fundo: string
  cor_texto: string
  dias_antecedencia: number | null
  ativo: boolean
  exibir_para_todos: boolean
  usuarios_ids: string[]
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
    exibir_para_todos: true,
    usuarios_ids: [] as string[],
  })
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  
  // Estados para configurações de avisos de contas a pagar
  const [configsContasPagar, setConfigsContasPagar] = useState<ConfigAvisoContasPagar[]>([])
  const [loadingConfigsContasPagar, setLoadingConfigsContasPagar] = useState(false)
  const [showModalContasPagar, setShowModalContasPagar] = useState(false)
  const [editingConfigContasPagar, setEditingConfigContasPagar] = useState<ConfigAvisoContasPagar | null>(null)
  const [formDataContasPagar, setFormDataContasPagar] = useState({
    tipo_alerta: 'vencidas' as 'vencidas' | 'proximas',
    titulo: '',
    descricao: '',
    cor_fundo: '#FEE2E2',
    cor_texto: '#991B1B',
    dias_antecedencia: 3,
    ativo: true,
    exibir_para_todos: true,
    usuarios_ids: [] as string[],
  })

  // Verificar se é admin
  const isAdmin = usuarioData?.nivel === 'admin' || usuarioData?.nivel === 'usuarioteste'

  // Carregar usuários da empresa
  useEffect(() => {
    const carregarUsuarios = async () => {
      const empresaId = empresaData?.id || usuarioData?.empresa_id
      if (!empresaId || !isAdmin) {
        setUsuarios([])
        return
      }

      setLoadingUsuarios(true)
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nome, email')
          .eq('empresa_id', empresaId)
          .order('nome', { ascending: true })

        if (error) throw error
        setUsuarios(data || [])
      } catch (error) {
        console.error('Erro ao carregar usuários:', error)
        setUsuarios([])
      } finally {
        setLoadingUsuarios(false)
      }
    }

    carregarUsuarios()
  }, [empresaData?.id, usuarioData?.empresa_id, isAdmin])

  // Carregar configurações de avisos de contas a pagar
  useEffect(() => {
    const empresaId = empresaData?.id || usuarioData?.empresa_id
    if (!empresaId || !isAdmin) {
      setConfigsContasPagar([])
      return
    }

    carregarConfigsContasPagar()
  }, [empresaData?.id, usuarioData?.empresa_id, isAdmin])

  const carregarConfigsContasPagar = async () => {
    const empresaId = empresaData?.id || usuarioData?.empresa_id
    if (!empresaId) return

    setLoadingConfigsContasPagar(true)
    try {
      const response = await fetch(`/api/avisos-contas-pagar?empresa_id=${empresaId}`)
      if (response.ok) {
        const data = await response.json()
        const configs = data.configs || []
        
        // Se não existem configurações, criar padrões e recarregar
        if (configs.length === 0) {
          await criarConfigsPadrao()
          // Recarregar após criar
          const responseNovo = await fetch(`/api/avisos-contas-pagar?empresa_id=${empresaId}`)
          if (responseNovo.ok) {
            const dataNovo = await responseNovo.json()
            setConfigsContasPagar(dataNovo.configs || [])
          }
        } else {
          setConfigsContasPagar(configs)
        }
      } else {
        // Se a API falhar, tentar criar padrões mesmo assim
        console.warn('Erro ao carregar configurações, tentando criar padrões...')
        await criarConfigsPadrao()
        const responseNovo = await fetch(`/api/avisos-contas-pagar?empresa_id=${empresaId}`)
        if (responseNovo.ok) {
          const dataNovo = await responseNovo.json()
          setConfigsContasPagar(dataNovo.configs || [])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de avisos de contas a pagar:', error)
      // Tentar criar padrões mesmo com erro
      try {
        await criarConfigsPadrao()
        const empresaId = empresaData?.id || usuarioData?.empresa_id
        if (empresaId) {
          const response = await fetch(`/api/avisos-contas-pagar?empresa_id=${empresaId}`)
          if (response.ok) {
            const data = await response.json()
            setConfigsContasPagar(data.configs || [])
          }
        }
      } catch (createError) {
        console.error('Erro ao criar configurações padrão:', createError)
      }
    } finally {
      setLoadingConfigsContasPagar(false)
    }
  }

  const criarConfigsPadrao = async () => {
    const empresaId = empresaData?.id || usuarioData?.empresa_id
    if (!empresaId) return

    const configsPadrao = [
      {
        empresa_id: empresaId,
        tipo_alerta: 'vencidas',
        titulo: '{quantidade} conta(s) vencidas',
        descricao: 'Regularize os pagamentos para evitar juros ou bloqueios de serviços.',
        cor_fundo: '#FEE2E2',
        cor_texto: '#991B1B',
        dias_antecedencia: null,
        ativo: true,
        exibir_para_todos: false, // ✅ MUDANÇA: Não exibir para todos por padrão
        usuarios_ids: [], // Vazio = não aparece para ninguém até ser configurado
      },
      {
        empresa_id: empresaId,
        tipo_alerta: 'proximas',
        titulo: '{quantidade} conta(s) vencem em até {dias} dia(s)',
        descricao: 'Antecipe os pagamentos para manter o caixa saudável.',
        cor_fundo: '#FEF3C7',
        cor_texto: '#92400E',
        dias_antecedencia: 3,
        ativo: true,
        exibir_para_todos: false, // ✅ MUDANÇA: Não exibir para todos por padrão
        usuarios_ids: [], // Vazio = não aparece para ninguém até ser configurado
      },
    ]

    try {
      console.log('Criando configurações padrão para empresa:', empresaId)
      const promises = configsPadrao.map(async (config) => {
        const response = await fetch('/api/avisos-contas-pagar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
          console.error('Erro ao criar configuração:', config.tipo_alerta, errorData)
          throw new Error(`Erro ao criar configuração ${config.tipo_alerta}: ${errorData.error || 'Erro desconhecido'}`)
        }
        
        return response.json()
      })

      await Promise.all(promises)
      console.log('Configurações padrão criadas com sucesso')
    } catch (error) {
      console.error('Erro ao criar configurações padrão:', error)
      throw error // Re-throw para que o chamador saiba que falhou
    }
  }

  const abrirModalContasPagar = (config?: ConfigAvisoContasPagar) => {
    if (config) {
      setEditingConfigContasPagar(config)
      setFormDataContasPagar({
        tipo_alerta: config.tipo_alerta,
        titulo: config.titulo,
        descricao: config.descricao,
        cor_fundo: config.cor_fundo,
        cor_texto: config.cor_texto,
        dias_antecedencia: config.dias_antecedencia || 3,
        ativo: config.ativo,
        exibir_para_todos: config.exibir_para_todos,
        usuarios_ids: Array.isArray(config.usuarios_ids) ? config.usuarios_ids : [],
      })
    } else {
      setEditingConfigContasPagar(null)
      setFormDataContasPagar({
        tipo_alerta: 'vencidas',
        titulo: '',
        descricao: '',
        cor_fundo: '#FEE2E2',
        cor_texto: '#991B1B',
        dias_antecedencia: 3,
        ativo: true,
        exibir_para_todos: true,
        usuarios_ids: [],
      })
    }
    setShowModalContasPagar(true)
  }

  const fecharModalContasPagar = () => {
    setShowModalContasPagar(false)
    setEditingConfigContasPagar(null)
  }

  const salvarConfigContasPagar = async () => {
    try {
      const empresaId = empresaData?.id || usuarioData?.empresa_id
      if (!empresaId) {
        addToast('error', 'Dados da empresa não disponíveis.')
        return
      }

      if (!formDataContasPagar.titulo?.trim() || !formDataContasPagar.descricao?.trim()) {
        addToast('error', 'Preencha título e descrição')
        return
      }

      const payload = {
        ...formDataContasPagar,
        empresa_id: empresaId,
        dias_antecedencia: formDataContasPagar.tipo_alerta === 'proximas' ? formDataContasPagar.dias_antecedencia : null,
        usuarios_ids: formDataContasPagar.exibir_para_todos ? [] : formDataContasPagar.usuarios_ids,
      }

      console.log('Salvando configuração:', { 
        editando: !!editingConfigContasPagar, 
        tipo_alerta: payload.tipo_alerta,
        empresa_id: payload.empresa_id,
        payload 
      })

      if (editingConfigContasPagar) {
        const response = await fetch('/api/avisos-contas-pagar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            id: editingConfigContasPagar.id,
          }),
        })

        if (response.ok) {
          addToast('success', 'Configuração atualizada com sucesso')
          
          // Disparar evento ANTES de fechar o modal para garantir que o banner atualize
          window.dispatchEvent(new Event('configAvisosContasPagarAtualizada'))
          
          fecharModalContasPagar()
          await carregarConfigsContasPagar()
          
          // Disparar evento novamente após recarregar para garantir
          setTimeout(() => {
            window.dispatchEvent(new Event('configAvisosContasPagarAtualizada'))
          }, 200)
        } else {
          const data = await response.json()
          addToast('error', data.error || 'Erro ao atualizar configuração')
          console.error('Erro ao atualizar configuração:', data)
        }
      } else {
        const response = await fetch('/api/avisos-contas-pagar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          addToast('success', 'Configuração criada com sucesso')
          
          // Disparar evento ANTES de fechar o modal para garantir que o banner atualize
          window.dispatchEvent(new Event('configAvisosContasPagarAtualizada'))
          
          fecharModalContasPagar()
          await carregarConfigsContasPagar()
          
          // Disparar evento novamente após recarregar para garantir
          setTimeout(() => {
            window.dispatchEvent(new Event('configAvisosContasPagarAtualizada'))
          }, 200)
        } else {
          const data = await response.json()
          addToast('error', data.error || 'Erro ao criar configuração')
          console.error('Erro ao criar configuração:', data)
        }
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      addToast('error', 'Erro ao salvar configuração')
    }
  }

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
        exibir_para_todos: a.exibir_para_todos !== undefined ? a.exibir_para_todos : true,
        usuarios_ids: Array.isArray(a.usuarios_ids) ? a.usuarios_ids : [],
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
        exibir_para_todos: aviso.exibir_para_todos !== undefined ? aviso.exibir_para_todos : true,
        usuarios_ids: Array.isArray(aviso.usuarios_ids) ? aviso.usuarios_ids : [],
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
        exibir_para_todos: true,
        usuarios_ids: [],
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
        
        const updatePayload: any = {
          id: editingAviso.id,
          empresa_id: empresaId,
          titulo: formData.titulo.trim(),
          mensagem: formData.mensagem.trim(),
          tipo: formData.tipo,
          cor_fundo: formData.cor_fundo,
          cor_texto: formData.cor_texto,
          prioridade: formData.prioridade || 0,
          ativo: formData.ativo,
          data_inicio: dataInicioISO,
          data_fim: dataFimISO,
          exibir_para_todos: formData.exibir_para_todos,
          usuarios_ids: formData.exibir_para_todos ? [] : formData.usuarios_ids,
        }
        
        
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
            exibir_para_todos: formData.exibir_para_todos,
            usuarios_ids: formData.exibir_para_todos ? [] : formData.usuarios_ids,
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
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {aviso.exibir_para_todos ? 'Para todos' : `${aviso.usuarios_ids?.length || 0} usuário(s)`}
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

      {/* Seção de Avisos de Contas a Pagar */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Avisos de Contas a Pagar</h2>
            <p className="text-gray-600 mt-1">Configure os avisos automáticos de contas vencendo ou vencidas</p>
          </div>
        </div>

        {loadingConfigsContasPagar ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : configsContasPagar.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">Nenhuma configuração encontrada. As configurações padrão serão criadas automaticamente...</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {configsContasPagar.map((config) => (
              <div
                key={config.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {config.tipo_alerta === 'vencidas' ? 'Contas Vencidas' : 'Contas Próximas ao Vencimento'}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          config.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {config.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {config.tipo_alerta === 'proximas' && config.dias_antecedencia && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {config.dias_antecedencia} dia(s) antes
                        </span>
                      )}
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        {config.exibir_para_todos ? 'Para todos' : `${config.usuarios_ids?.length || 0} usuário(s)`}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-1">
                      <strong>Título:</strong> {config.titulo}
                    </p>
                    <p className="text-gray-700 mb-3">
                      <strong>Descrição:</strong> {config.descricao}
                    </p>
                    <div
                      className="p-3 rounded-lg mb-3"
                      style={{
                        backgroundColor: config.cor_fundo,
                        color: config.cor_texto,
                      }}
                    >
                      <p className="font-medium">{config.titulo.replace('{quantidade}', 'X').replace('{dias}', config.dias_antecedencia?.toString() || '3')}</p>
                      <p className="text-sm opacity-90">{config.descricao}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => abrirModalContasPagar(config)}
                      className="p-2 rounded hover:bg-gray-100 text-blue-600"
                      title="Editar"
                    >
                      <FiEdit2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de criar/editar configuração de avisos de contas a pagar */}
      {showModalContasPagar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">
                {editingConfigContasPagar ? 'Editar Configuração' : 'Nova Configuração'}
              </h3>
              <button
                onClick={fecharModalContasPagar}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Alerta *</label>
                <select
                  value={formDataContasPagar.tipo_alerta}
                  onChange={(e) => setFormDataContasPagar({ ...formDataContasPagar, tipo_alerta: e.target.value as 'vencidas' | 'proximas' })}
                  disabled={!!editingConfigContasPagar}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
                >
                  <option value="vencidas">Contas Vencidas</option>
                  <option value="proximas">Contas Próximas ao Vencimento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input
                  type="text"
                  value={formDataContasPagar.titulo}
                  onChange={(e) => setFormDataContasPagar({ ...formDataContasPagar, titulo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Ex: {quantidade} conta(s) vencidas"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{quantidade}'} para o número de contas e {'{dias}'} para os dias (apenas para "próximas")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrição *</label>
                <textarea
                  value={formDataContasPagar.descricao}
                  onChange={(e) => setFormDataContasPagar({ ...formDataContasPagar, descricao: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  rows={3}
                  placeholder="Ex: Regularize os pagamentos para evitar juros ou bloqueios de serviços."
                />
              </div>

              {formDataContasPagar.tipo_alerta === 'proximas' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Dias de Antecedência *</label>
                  <input
                    type="number"
                    value={formDataContasPagar.dias_antecedencia}
                    onChange={(e) => setFormDataContasPagar({ ...formDataContasPagar, dias_antecedencia: parseInt(e.target.value) || 3 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Quantos dias antes do vencimento mostrar o aviso</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cor de Fundo</label>
                  <input
                    type="color"
                    value={formDataContasPagar.cor_fundo}
                    onChange={(e) => setFormDataContasPagar({ ...formDataContasPagar, cor_fundo: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cor do Texto</label>
                  <input
                    type="color"
                    value={formDataContasPagar.cor_texto}
                    onChange={(e) => setFormDataContasPagar({ ...formDataContasPagar, cor_texto: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formDataContasPagar.ativo}
                    onChange={(e) => setFormDataContasPagar({ ...formDataContasPagar, ativo: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Aviso ativo</span>
                </label>
              </div>

              {/* Seleção de usuários */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Público-alvo</h4>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={formDataContasPagar.exibir_para_todos}
                    onChange={(e) => {
                      setFormDataContasPagar({ 
                        ...formDataContasPagar, 
                        exibir_para_todos: e.target.checked,
                        usuarios_ids: e.target.checked ? [] : formDataContasPagar.usuarios_ids
                      })
                    }}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Exibir para todos os usuários</span>
                </label>

                {!formDataContasPagar.exibir_para_todos && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-2">
                      Selecionar usuários específicos ({formDataContasPagar.usuarios_ids.length} selecionado{formDataContasPagar.usuarios_ids.length !== 1 ? 's' : ''})
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                      {loadingUsuarios ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                        </div>
                      ) : usuarios.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Nenhum usuário encontrado</p>
                      ) : (
                        <div className="space-y-2">
                          {usuarios.map((usuario) => (
                            <label key={usuario.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={formDataContasPagar.usuarios_ids.includes(usuario.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormDataContasPagar({
                                      ...formDataContasPagar,
                                      usuarios_ids: [...formDataContasPagar.usuarios_ids, usuario.id]
                                    })
                                  } else {
                                    setFormDataContasPagar({
                                      ...formDataContasPagar,
                                      usuarios_ids: formDataContasPagar.usuarios_ids.filter(id => id !== usuario.id)
                                    })
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">
                                {usuario.nome} <span className="text-gray-500">({usuario.email})</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {!formDataContasPagar.exibir_para_todos && formDataContasPagar.usuarios_ids.length === 0 && (
                      <p className="text-xs text-red-500 mt-2">Selecione pelo menos um usuário ou marque "Exibir para todos"</p>
                    )}
                  </div>
                )}
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: formDataContasPagar.cor_fundo,
                    color: formDataContasPagar.cor_texto,
                  }}
                >
                  <p className="font-semibold text-lg mb-1">
                    {formDataContasPagar.titulo.replace('{quantidade}', '5').replace('{dias}', formDataContasPagar.dias_antecedencia?.toString() || '3')}
                  </p>
                  <p className="text-sm opacity-90">{formDataContasPagar.descricao || 'Descrição do aviso aparecerá aqui'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <button
                onClick={fecharModalContasPagar}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarConfigContasPagar}
                disabled={(!empresaData?.id && !usuarioData?.empresa_id) || (!formDataContasPagar.exibir_para_todos && formDataContasPagar.usuarios_ids.length === 0)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  (empresaData?.id || usuarioData?.empresa_id) && (formDataContasPagar.exibir_para_todos || formDataContasPagar.usuarios_ids.length > 0)
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <FiSave size={18} />
                Salvar
              </button>
            </div>
          </div>
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

              {/* Seleção de usuários */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Público-alvo</h4>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.exibir_para_todos}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        exibir_para_todos: e.target.checked,
                        usuarios_ids: e.target.checked ? [] : formData.usuarios_ids
                      })
                    }}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Exibir para todos os usuários</span>
                </label>

                {!formData.exibir_para_todos && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-2">
                      Selecionar usuários específicos ({formData.usuarios_ids.length} selecionado{formData.usuarios_ids.length !== 1 ? 's' : ''})
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                      {loadingUsuarios ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                        </div>
                      ) : usuarios.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Nenhum usuário encontrado</p>
                      ) : (
                        <div className="space-y-2">
                          {usuarios.map((usuario) => (
                            <label key={usuario.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={formData.usuarios_ids.includes(usuario.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      usuarios_ids: [...formData.usuarios_ids, usuario.id]
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      usuarios_ids: formData.usuarios_ids.filter(id => id !== usuario.id)
                                    })
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">
                                {usuario.nome} <span className="text-gray-500">({usuario.email})</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {!formData.exibir_para_todos && formData.usuarios_ids.length === 0 && (
                      <p className="text-xs text-red-500 mt-2">Selecione pelo menos um usuário ou marque "Exibir para todos"</p>
                    )}
                  </div>
                )}
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
                disabled={(!empresaData?.id && !usuarioData?.empresa_id) || (!formData.exibir_para_todos && formData.usuarios_ids.length === 0)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  (empresaData?.id || usuarioData?.empresa_id) && (formData.exibir_para_todos || formData.usuarios_ids.length > 0)
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!empresaData?.id && !usuarioData?.empresa_id ? 'Aguarde o carregamento dos dados' : (!formData.exibir_para_todos && formData.usuarios_ids.length === 0 ? 'Selecione pelo menos um usuário' : '')}
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

