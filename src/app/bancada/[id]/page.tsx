'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FiClipboard, FiSave, FiBox, FiTool, FiPlayCircle, FiX, FiCamera, FiTrash2, FiEdit, FiCheck, FiAlertCircle, FiLock, FiArrowLeft, FiUser, FiDollarSign, FiMessageCircle, FiPackage, FiAlertTriangle, FiEdit3, FiVideo, FiPlay } from 'react-icons/fi';
import MenuLayout from '@/components/MenuLayout';
// Removido ProtectedArea - agora é responsabilidade do MenuLayout
import ProdutoServicoManager from '@/components/ProdutoServicoManager';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import DynamicChecklist from '@/components/DynamicChecklist';
import ImageEditor from '@/components/ImageEditor';
import LaudoEditor from '@/components/LaudoEditor';
import CollapsibleSection from '@/components/CollapsibleSection';
import Lottie from 'lottie-react';
import uploadingAnimation from '@/assets/animations/Uploading file.json';

// Etapas da OS para a barra de progresso (status por etapa) — ordem do fluxo
const OS_STEPS = [
  { label: 'Início', key: 'AGUARDANDO INÍCIO' },
  { label: 'Em análise', key: 'EM ANÁLISE' },
  { label: 'Orçamento', key: 'ORÇAMENTO' },
  { label: 'Aguard. peça', key: 'AGUARDANDO PEÇA' },
  { label: 'Em execução', key: 'EM EXECUÇÃO' },
  { label: 'Sem reparo', key: 'SEM REPARO' },
  { label: 'Concluído', key: 'REPARO CONCLUÍDO' },
] as const;

function getStatusStepIndex(status: string | undefined, statusTecnico: string): number {
  const st = (statusTecnico || status || '').toUpperCase();
  if (!st || /AGUARDANDO\s*IN[IÍ]CIO|AGUARDANDO INICIO/.test(st)) return 0;
  if (/EM\s*AN[ÁA]LISE|EM_ANALISE/.test(st)) return 1;
  if (/OR[ÇC]AMENTO|ORCAMENTO/.test(st)) return 2;
  if (/AGUARDANDO\s*PE[ÇC]A|AGUARDANDO_PECA/.test(st)) return 3;
  if (/EM\s*EXECU[ÇC][ÃA]O|EM_EXECUCAO/.test(st)) return 4;
  if (/SEM\s*REPARO|SEM_REPARO/.test(st)) return 5;
  if (/CONCLU[IÍ]DO|REPARO CONCLU[IÍ]DO/.test(st)) return 6;
  return 0;
}

// Componente simples para exibir o padrão Android
const PatternDisplay = ({ pattern }: { pattern: string | number[] }) => {
  let positions: number[] = [];
  
  if (typeof pattern === 'string') {
    try {
      positions = JSON.parse(pattern);
    } catch {
      return <span className="text-gray-500">Padrão inválido</span>;
    }
  } else {
    positions = pattern;
  }
  
  if (!Array.isArray(positions) || positions.length === 0) {
    return <span className="text-gray-500">Nenhum padrão definido</span>;
  }
  
  return (
    <div className="grid grid-cols-3 gap-2 w-24 mx-auto">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <div
          key={num}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
            positions.includes(num)
              ? 'bg-blue-500 border-blue-600 text-white'
              : 'bg-gray-100 border-gray-300 text-gray-500'
          }`}
        >
          {positions.includes(num) ? positions.indexOf(num) + 1 : ''}
        </div>
      ))}
    </div>
  );
};

export default function DetalheBancadaPage() {
  const params = useParams();
  const id = params?.id as string;
  const { addToast, showModal } = useToast();
  const confirm = useConfirm();
  interface OrdemServico {
    id: string;
    empresa_id: string;
    cliente_id: string;
    tecnico_id: string;
    status: string;
    created_at: string;
    atendente: string;
    tecnico: string;
    categoria: string;
    marca: string;
    modelo: string;
    cor: string;
    numero_serie: string;
    servico: string;
    qtd_servico: string;
    peca: string;
    qtd_peca: string;
    termo_garantia: string | null;
    relato: string;
    observacao: string;
    data_cadastro: string;
    numero_os: string;
    data_entrega: string | null;
    vencimento_garantia: string | null;
    valor_peca: string;
    valor_servico: string;
    desconto: string | null;
    valor_faturado: string;
    status_tecnico: string;
    acessorios: string;
    condicoes_equipamento: string;
    cliente?: {
      nome: string;
    };
    [key: string]: unknown;
  }
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusTecnico, setStatusTecnico] = useState('');
  const [laudo, setLaudo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [produtos, setProdutos] = useState<string>('');
  const [servicos, setServicos] = useState<string>('');
  const [salvando, setSalvando] = useState(false);
  const [saveStep, setSaveStep] = useState<'imagens' | 'videos' | 'dados' | null>(null);
  const [statusTecnicoOptions, setStatusTecnicoOptions] = useState<{ id: string, nome: string }[]>([]);
  const [mostrarBotaoIniciar, setMostrarBotaoIniciar] = useState(false);
  const [progressBarReady, setProgressBarReady] = useState(false);

  // Estados para produtos e serviços selecionados
  const [produtosSelecionados, setProdutosSelecionados] = useState<Array<{
    id: string;
    nome: string;
    preco: number;
    quantidade: number;
  }>>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<Array<{
    id: string;
    nome: string;
    preco: number;
  }>>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  
  // Estados para upload de imagens
  // Entrada (anexadas pelo atendente na criação/edição da OS)
  const [imagensEntradaExistentes, setImagensEntradaExistentes] = useState<string[]>([]);
  // Técnico (anexadas pelo técnico na bancada)
  const [imagensTecnicoNovas, setImagensTecnicoNovas] = useState<File[]>([]);
  const [previewImagensTecnico, setPreviewImagensTecnico] = useState<string[]>([]);
  const [imagensTecnicoExistentes, setImagensTecnicoExistentes] = useState<string[]>([]);
  const [uploadingImagens, setUploadingImagens] = useState(false);

  // Estados para upload de vídeos (técnico)
  const [videosTecnicoNovas, setVideosTecnicoNovas] = useState<File[]>([]);
  const [previewVideosTecnico, setPreviewVideosTecnico] = useState<string[]>([]);
  const [videosTecnicoExistentes, setVideosTecnicoExistentes] = useState<string[]>([]);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  
  // Estado do editor de imagem
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingNewImage, setEditingNewImage] = useState<boolean>(false);
  const [editingExistingImage, setEditingExistingImage] = useState<boolean>(false);
  const [previewImagemUrl, setPreviewImagemUrl] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  
  // Estados para checklist e senha
  const [checklistData, setChecklistData] = useState<any>(null);
  const [checklistItens, setChecklistItens] = useState<any[]>([]);

  useEffect(() => {
    const fetchOS = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *, 
          cliente:cliente_id(nome), 
          senha_aparelho, 
          senha_padrao, 
          checklist_entrada,
          equipamento,
          problema_relatado
        `)
        .eq('id', id)
        .single();
        
      if (error) {
        setLoading(false);
        return;
      }
      
      if (!data) {
        setLoading(false);
        return;
      }
      
      if (data) {
        // Mapear problema_relatado para relato
        const osData = {
          ...data,
          relato: data.problema_relatado || data.relato
        };
        setOs(osData);
        setEmpresaId(data.empresa_id);
        
        // Carregar imagens existentes (entrada / atendente)
        if (data.imagens) {
          const urlsEntrada = data.imagens.split(',').filter((url: string) => url.trim() !== '');
          setImagensEntradaExistentes(urlsEntrada);
        }
        // Carregar imagens do técnico (se a coluna existir)
        if ((data as any).imagens_tecnico) {
          const urlsTecnico = String((data as any).imagens_tecnico)
            .split(',')
            .filter((url: string) => url.trim() !== '');
          setImagensTecnicoExistentes(urlsTecnico);
        }
        // Carregar vídeos do técnico (se a coluna existir)
        if ((data as any).videos_tecnico) {
          const urlsVideos = String((data as any).videos_tecnico)
            .split(',')
            .filter((url: string) => url.trim() !== '');
          setVideosTecnicoExistentes(urlsVideos);
        }
        
        // Carregar dados do checklist
        if (data.checklist_entrada) {
          try {
            const checklistParsed = typeof data.checklist_entrada === 'string' 
              ? JSON.parse(data.checklist_entrada) 
              : data.checklist_entrada;
            setChecklistData(checklistParsed);
          } catch (error) {
            setChecklistData(null);
          }
        }
        
        // Buscar itens do checklist da empresa
        if (data.empresa_id) {
          const { data: itensData } = await supabase
            .from('checklist_itens')
            .select('*')
            .eq('empresa_id', data.empresa_id)
            .eq('ativo', true)
            .order('created_at');
          
          if (itensData) {
            setChecklistItens(itensData);
          }
        }
        
        // Normalizar status/status_tecnico (Supabase pode retornar objeto da relação)
        const norm = (v: unknown): string => {
          if (v == null || v === '') return '';
          if (typeof v === 'string') return v.trim();
          if (typeof v === 'object' && v !== null && 'nome' in v && typeof (v as { nome: string }).nome === 'string')
            return (v as { nome: string }).nome.trim();
          return String(v).trim();
        };
        const statusOs = norm(data.status);
        let statusInicial = norm(data.status_tecnico);
        
        if (!statusInicial) {
          switch (statusOs.toUpperCase()) {
            case 'ORÇAMENTO':
            case 'ORCAMENTO':
              statusInicial = 'AGUARDANDO INÍCIO';
              break;
            case 'EM_ANALISE':
              statusInicial = 'EM ANÁLISE';
              break;
            case 'AGUARDANDO_PECA':
              statusInicial = 'AGUARDANDO PEÇA';
              break;
            case 'CONCLUIDO':
              statusInicial = 'REPARO CONCLUÍDO';
              break;
            default:
              statusInicial = 'AGUARDANDO INÍCIO';
          }
        }
        
        setStatusTecnico(statusInicial);
        setLaudo(data.laudo || '');
        setObservacoes(data.observacao || '');
        setProdutos(data.peca || '');
        setServicos(data.servico || '');
        
        // Carregar produtos e serviços existentes para edição
        if (data.peca) {
          const produtosParsed = parseTextToItems(data.peca, 'produto');
          // Filtrar itens inválidos (nome vazio, apenas números, etc)
          const produtosValidos = produtosParsed.filter(p => 
            p.nome && 
            p.nome.trim() !== '' && 
            !/^[\d\s]+$/.test(p.nome.trim()) && // Não apenas números
            p.nome.trim().length > 1 // Nome com pelo menos 2 caracteres
          );
          setProdutosSelecionados(produtosValidos);
        } else {
          setProdutosSelecionados([]);
        }

        if (data.servico) {
          const servicosParsed = parseTextToItems(data.servico, 'servico');
          // Filtrar itens inválidos (nome vazio, apenas números, etc)
          const servicosValidos = servicosParsed.filter(s => 
            s.nome && 
            s.nome.trim() !== '' && 
            !/^[\d\s]+$/.test(s.nome.trim()) && // Não apenas números
            s.nome.trim().length > 1 // Nome com pelo menos 2 caracteres
          );
          setServicosSelecionados(servicosValidos);
        } else {
          setServicosSelecionados([]);
        }
        
        // Só permitir editar depois que o técnico clicar em "Iniciar OS" (status → Em análise)
        const aguardandoInicio = !statusInicial || statusInicial.toUpperCase() === 'AGUARDANDO INÍCIO' || statusInicial.toUpperCase() === 'AGUARDANDO INICIO' || /^AGUARDANDO\s*IN[IÍ]CIO$/i.test(statusInicial);
        // Considerar OS como "ainda não iniciada" se status for: ORÇAMENTO, vazio, ou qualquer status que não seja de andamento/conclusão
        const statusOsUpper = statusOs.toUpperCase();
        const statusNaoIniciados = ['ORÇAMENTO', 'ORCAMENTO', ''];
        const statusJaEmAndamento = ['EM_ANALISE', 'EM ANÁLISE', 'AGUARDANDO_PECA', 'AGUARDANDO PEÇA', 'EM_EXECUCAO', 'EM EXECUÇÃO', 'CONCLUIDO', 'REPARO CONCLUÍDO', 'ENTREGUE', 'APROVADO'];
        const aindaAberta = statusNaoIniciados.includes(statusOsUpper) || (!statusJaEmAndamento.some(s => statusOsUpper.includes(s)) && !statusOsUpper);
        setMostrarBotaoIniciar(aindaAberta && aguardandoInicio);
      }
      setLoading(false);
    };
    if (id) fetchOS();
  }, [id]);

  // Animação de entrada da barra de progresso (preenche após mount)
  useEffect(() => {
    const t = setTimeout(() => setProgressBarReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function fetchStatusTecnico() {
      // Status padrão do técnico
      const statusPadrao = [
        { id: '1', nome: 'AGUARDANDO INÍCIO' },
        { id: '2', nome: 'EM ANÁLISE' },
        { id: '3', nome: 'ORÇAMENTO CONCLUÍDO' },
        { id: '4', nome: 'EM EXECUÇÃO' },
        { id: '6', nome: 'SEM REPARO' },
        { id: '7', nome: 'REPARO CONCLUÍDO' }
      ];
      
      // Buscar status técnicos personalizados da empresa
      const { data: statusEmpresa } = await supabase
        .from('status')
        .select('id, nome')
        .eq('tipo', 'tecnico');
      
      // Buscar status técnicos fixos do sistema
      const { data: statusFixos } = await supabase
        .from('status_fixo')
        .select('id, nome')
        .eq('tipo', 'tecnico');
      
      // Combinar todos os status e remover duplicatas
      const todosStatus = [
        ...statusPadrao,
        ...(statusFixos || []),
        ...(statusEmpresa || [])
      ];
      
      // ✅ CORRIGIDO: Remover duplicatas baseado no nome
      const statusUnicos = todosStatus
        // Regra atual: AGUARDANDO PEÇA não é status editável do técnico
        .filter((status) => {
          const nome = (status.nome || '').toUpperCase().trim();
          return nome !== 'AGUARDANDO PEÇA' && nome !== 'AGUARDANDO_PECA';
        })
        .filter((status, index, array) =>
          array.findIndex(s => s.nome === status.nome) === index
        );
      
      setStatusTecnicoOptions(statusUnicos);
    }
    fetchStatusTecnico();
  }, []);

  const handleSalvar = async () => {
    // ✅ VALIDAÇÃO: Verificar se ID e OS existem antes de prosseguir
    if (!id) {
      addToast('error', 'Erro: ID da OS não encontrado. Recarregue a página.');
      return;
    }
    
    if (!os) {
      addToast('error', 'Erro: Dados da OS não carregados. Recarregue a página.');
      return;
    }

    if ((os.status || '').toUpperCase() === 'ENTREGUE') {
      addToast('error', 'O.S. entregue está bloqueada para edição.');
      return;
    }
    
    setSalvando(true);
    
    try {
      setSaveStep('imagens');
      const novasImagens = await uploadImagens();
      setSaveStep('videos');
      const novosVideos = await uploadVideos();
      setSaveStep('dados');
      
      // Garantir que sempre temos um status técnico para salvar (nunca enviar vazio e apagar no banco)
      const statusAtualOs = typeof os.status_tecnico === 'string' ? os.status_tecnico : (os as any).status_tecnico?.nome ?? '';
      let statusTecnicoParaSalvar = (statusTecnico && statusTecnico.trim()) ? statusTecnico.trim() : (statusAtualOs && statusAtualOs.trim() ? statusAtualOs.trim() : 'AGUARDANDO INÍCIO');
      // Normalizar para o nome exato de uma opção (evitar diferença de acento/caixa entre select e DB)
      const opcaoCorrespondente = statusTecnicoOptions.find(s => (s.nome || '').toUpperCase() === statusTecnicoParaSalvar.toUpperCase());
      if (opcaoCorrespondente?.nome) statusTecnicoParaSalvar = opcaoCorrespondente.nome;
      const tecnicoSelecionouSemReparo = /SEM\s*REPARO|SEM_REPARO/.test((statusTecnicoParaSalvar || '').toUpperCase());
      // Se o técnico preencheu o laudo e o status ainda não é de orçamento concluído, marcar como ORÇAMENTO CONCLUÍDO
      const laudoPreenchido = typeof laudo === 'string' && laudo.trim().length > 0;
      const jaOrcamentoEnviado = (statusTecnicoParaSalvar || '').toUpperCase().includes('ORÇAMENTO CONCLUÍDO');
      if (laudoPreenchido && !jaOrcamentoEnviado && !tecnicoSelecionouSemReparo) {
        const opcaoConcluido = statusTecnicoOptions.find(s => (s.nome || '').toUpperCase() === 'ORÇAMENTO CONCLUÍDO');
        statusTecnicoParaSalvar = opcaoConcluido?.nome ?? 'ORÇAMENTO CONCLUÍDO';
      }
      
      // Atualizar status da OS baseado no status técnico (mapeamento consistente com a API)
      let novoStatus = os?.status;
      const stUpper = (statusTecnicoParaSalvar || '').toUpperCase();
      if (statusTecnicoParaSalvar === 'EM ANÁLISE' || /EM\s*AN[ÁA]LISE|EM_ANALISE/.test(stUpper)) {
        novoStatus = 'EM_ANALISE';
      } else if (statusTecnicoParaSalvar === 'AGUARDANDO INÍCIO' || /AGUARDANDO\s*IN[IÍ]CIO|AGUARDANDO INICIO/.test(stUpper)) {
        novoStatus = 'ORÇAMENTO';
      } else if (/OR[ÇC]AMENTO CONCLU[IÍ]DO/.test(stUpper)) {
        novoStatus = 'ORÇAMENTO CONCLUÍDO'; // orçamento pronto pelo técnico
      } else if (statusTecnicoParaSalvar === 'REPARO CONCLUÍDO' || /REPARO CONCLU[IÍ]DO/.test(stUpper)) {
        novoStatus = 'CONCLUIDO';
      } else if (/SEM\s*REPARO|SEM_REPARO/.test(stUpper)) {
        // Regra solicitada: espelhar o mesmo status na OS.
        novoStatus = 'SEM REPARO';
      } else if (/EM\s*EXECU[ÇC][ÃA]O|EM_EXECUCAO/.test(stUpper)) {
        // Em execução não deve cair em status de concluído na OS.
        novoStatus = 'APROVADO';
      }

      // Regra de espelhamento: SEM REPARO do técnico deve espelhar na O.S.
      if (/SEM\s*REPARO|SEM_REPARO/.test((statusTecnicoParaSalvar || '').toUpperCase())) {
        statusTecnicoParaSalvar = 'SEM REPARO';
        novoStatus = 'SEM REPARO';
      }

      // Preparar dados dos produtos e serviços
      // Filtrar apenas itens válidos antes de gerar o texto
      const produtosValidos = produtosSelecionados.filter(p => 
        p.nome && 
        p.nome.trim() !== '' && 
        !/^[\d\s]+$/.test(p.nome.trim()) && 
        p.nome.trim().length > 1
      );
      const produtosText = produtosValidos.length > 0 
        ? produtosValidos.map(p => {
            const preco = typeof p.preco === 'number' ? p.preco : parseFloat(String(p.preco || 0));
            const quantidade = typeof p.quantidade === 'number' ? p.quantidade : parseInt(String(p.quantidade || 1));
            const precoTotal = (isNaN(preco) ? 0 : preco) * (isNaN(quantidade) ? 1 : quantidade);
            return `${p.nome} (${quantidade}x) - ${formatPrice(precoTotal)}`;
          }).join(', ')
        : '';
      
      const servicosValidos = servicosSelecionados.filter(s => 
        s.nome && 
        s.nome.trim() !== '' && 
        !/^[\d\s]+$/.test(s.nome.trim()) && 
        s.nome.trim().length > 1
      );
      const servicosText = servicosValidos.length > 0
        ? servicosValidos.map(s => {
            const preco = typeof s.preco === 'number' ? s.preco : parseFloat(String(s.preco || 0));
            return `${s.nome} - ${formatPrice(isNaN(preco) ? 0 : preco)}`;
          }).join(', ')
        : '';
      
      const totalProdutos = calcularTotalProdutos();
      const totalServicos = calcularTotalServicos();
      // Combinar imagens do técnico existentes com novas
      const todasImagensTecnico = [...imagensTecnicoExistentes, ...novasImagens];
      const imagensTecnicoString = todasImagensTecnico.join(',');
      // Combinar vídeos do técnico existentes com novos
      const todosVideosTecnico = [...videosTecnicoExistentes, ...novosVideos];
      const videosTecnicoString = todosVideosTecnico.join(',');

      // (A exclusão dos vídeos no Supabase Storage é feita pela API update-status)

      // Preparar dados para salvar (sem campos JSON por enquanto)
      
      // ✅ CORREÇÃO: Sempre atualizar produtos/serviços, mesmo que vazios (para permitir remoção)
      const updateData: any = {
        status: novoStatus,
        status_tecnico: statusTecnicoParaSalvar,
        // ✅ Sempre atualizar produtos e serviços (permitir limpar quando removidos)
        peca: produtosText,
        servico: servicosText,
        // ✅ Sempre atualizar valores monetários (permitir zerar quando removidos)
        valor_peca: produtosValidos.length > 0 ? calcularTotalProdutos().toString() : '0',
        valor_servico: servicosValidos.length > 0 ? calcularTotalServicos().toString() : '0',
        valor_faturado: (produtosValidos.length > 0 || servicosValidos.length > 0) 
          ? (calcularTotalProdutos() + calcularTotalServicos()).toString() 
          : '0',
        // ✅ PRESERVAR dados existentes se não há novos dados (apenas para laudo e observações)
        ...(laudo && { laudo }),
        ...(observacoes && { observacao: observacoes }),
        // ✅ Imagens e vídeos do técnico - sempre enviar (incluindo vazio) para permitir remoção
        imagens_tecnico: imagensTecnicoString || '',
        videos_tecnico: videosTecnicoString || '',
        // ✅ SALVAR checklist se foi modificado
        ...(checklistData && { checklist_entrada: JSON.stringify(checklistData) })
      };
      
      // Remover campos de debug antes de enviar
      const { _debug, ...updateDataLimpo } = updateData;
      
      // Garantir que status e status_tecnico vão explícitos no body (a API usa esses nomes)
      const requestBody = {
        osId: id,
        newStatus: novoStatus ?? os?.status,
        newStatusTecnico: statusTecnicoParaSalvar,
        ...updateDataLimpo,
        status: novoStatus ?? os?.status,
        status_tecnico: statusTecnicoParaSalvar,
      };
      
      const response = await fetch('/api/ordens/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar ordem');
      }

      // Atualizar estado local (incluindo status técnico se foi alterado automaticamente pelo laudo)
      setStatusTecnico(statusTecnicoParaSalvar);
      if (os) {
        setOs({ 
          ...os, 
          status: novoStatus || os.status,
          status_tecnico: statusTecnicoParaSalvar,
          valor_peca: calcularTotalProdutos().toString(),
          valor_servico: calcularTotalServicos().toString(),
          valor_faturado: (calcularTotalProdutos() + calcularTotalServicos()).toString(),
        });
      }

      // Limpar imagens temporárias do técnico e atualizar listas
      setImagensTecnicoNovas([]);
      setPreviewImagensTecnico([]);
      setImagensTecnicoExistentes(todasImagensTecnico);
      // Limpar vídeos temporários e atualizar listas
      setVideosTecnicoNovas([]);
      setPreviewVideosTecnico([]);
      setVideosTecnicoExistentes(todosVideosTecnico);

      // Atualizar botão iniciar (usar valor salvo, não o state que pode ainda não ter atualizado)
      setMostrarBotaoIniciar(statusTecnicoParaSalvar === 'AGUARDANDO INÍCIO');

      // Mostrar toast de sucesso
      addToast('success', 'Dados salvos com sucesso!');
      // Se enviou orçamento, emite notificação backend
      try {
        if ((statusTecnicoParaSalvar || '').toUpperCase().includes('ORÇAMENTO CONCLUÍDO') && empresaId && id) {
          await fetch('/api/notificacoes/emitir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empresa_id: empresaId,
              tipo: 'orcamento_enviado',
              os_id: id,
              mensagem: `OS #${os?.numero_os || ''} - orçamento enviado pelo técnico.`
            })
          });
        }
        
        // Se concluiu o reparo, emite notificação (usar valor salvo)
        if (statusTecnicoParaSalvar === 'REPARO CONCLUÍDO' && empresaId && id) {
          try {
            const response = await fetch('/api/notificacoes/emitir', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                empresa_id: empresaId,
                tipo: 'reparo_concluido',
                os_id: id,
                mensagem: `OS #${os?.numero_os || ''} - reparo concluído pelo técnico.`
              })
            });
            
            if (response.ok) {
              const result = await response.json();
            }
          } catch (error) {
            // Erro ao emitir notificação
          }
        }
      } catch (e) {
        // Falha ao emitir notificação
      }
      
    } catch (error) {
      const errorMessage = (error as Error).message || 'Erro desconhecido ao salvar';
      addToast('error', `Erro ao atualizar status da OS: ${errorMessage}`);
    } finally {
      setSaveStep(null);
      setSalvando(false);
    }
  };

  const handleIniciarOS = async () => {
    // ✅ VALIDAÇÃO: Verificar se ID existe antes de prosseguir
    if (!id) {
      addToast('error', 'Erro: ID da OS não encontrado. Recarregue a página.');
      return;
    }
    
    setSalvando(true);
    
    try {
      // Usar nossa API que registra histórico e envia notificações
      const response = await fetch('/api/ordens/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          osId: id,
          newStatus: 'EM_ANALISE',
          newStatusTecnico: 'EM ANÁLISE'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao iniciar ordem');
      }

      // Atualizar estado local
      setStatusTecnico('EM ANÁLISE');
      setMostrarBotaoIniciar(false);
      
      if (os) {
        setOs({ ...os, status: 'EM_ANALISE', status_tecnico: 'EM ANÁLISE' });
      }

      addToast('success', 'OS iniciada com sucesso!');
      
    } catch (error) {
      addToast('error', 'Erro ao iniciar OS: ' + (error as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  // Funções para adicionar produtos e serviços
  const handleAdicionarProduto = (produto: { id: string; nome: string; preco: number; tipo: string }) => {
    const produtoExistente = produtosSelecionados.find(p => p.id === produto.id);
    
    if (produtoExistente) {
      setProdutosSelecionados(prev => {
        const updated = prev.map(p => 
          p.id === produto.id 
            ? { ...p, quantidade: p.quantidade + 1 }
            : p
        );
        return updated;
      });
    } else {
      setProdutosSelecionados(prev => {
        const updated = [...prev, { ...produto, quantidade: 1 }];
        return updated;
      });
    }
  };

  const handleAdicionarServico = (servico: { id: string; nome: string; preco: number; tipo: string }) => {
    const servicoExistente = servicosSelecionados.find(s => s.id === servico.id);
    
    if (!servicoExistente) {
      setServicosSelecionados(prev => {
        const updated = [...prev, servico];
        return updated;
      });
    } else {
      }
  };

  const handleRemoverProduto = (produtoId: string) => {
    setProdutosSelecionados(prev => prev.filter(p => p.id !== produtoId));
  };

  const handleRemoverServico = (servicoId: string) => {
    setServicosSelecionados(prev => prev.filter(s => s.id !== servicoId));
  };
  
  const handleEditarProduto = (produtoId: string, novoNome: string, novoPreco: number, novaQuantidade: number) => {
    setProdutosSelecionados(prev => 
      prev.map(p => 
        p.id === produtoId 
          ? { ...p, nome: novoNome, preco: novoPreco, quantidade: novaQuantidade }
          : p
      )
    );
  };
  
  const handleEditarServico = (servicoId: string, novoNome: string, novoPreco: number) => {
    setServicosSelecionados(prev => 
      prev.map(s => 
        s.id === servicoId 
          ? { ...s, nome: novoNome, preco: novoPreco }
          : s
      )
    );
  };

  const handleAlterarQuantidade = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      handleRemoverProduto(produtoId);
      return;
    }
    
    setProdutosSelecionados(prev => 
      prev.map(p => 
        p.id === produtoId 
          ? { ...p, quantidade: novaQuantidade }
          : p
      )
    );
  };

  const calcularTotalProdutos = () => {
    // Filtrar apenas itens válidos antes de calcular
    const produtosValidos = produtosSelecionados.filter(p => 
      p.nome && 
      p.nome.trim() !== '' && 
      !/^[\d\s]+$/.test(p.nome.trim()) && 
      p.nome.trim().length > 1
    );
    
    // Calcular apenas com produtos válidos selecionados
    // Se não há produtos válidos, retornar 0 (não usar valores antigos da OS)
    return produtosValidos.reduce((total, produto) => {
      const preco = typeof produto.preco === 'number' ? produto.preco : parseFloat(String(produto.preco || 0));
      const quantidade = typeof produto.quantidade === 'number' ? produto.quantidade : parseInt(String(produto.quantidade || 1));
      const valorItem = (isNaN(preco) ? 0 : preco) * (isNaN(quantidade) ? 1 : quantidade);
      return total + valorItem;
    }, 0);
  };

  const calcularTotalServicos = () => {
    // Filtrar apenas itens válidos antes de calcular
    const servicosValidos = servicosSelecionados.filter(s => 
      s.nome && 
      s.nome.trim() !== '' && 
      !/^[\d\s]+$/.test(s.nome.trim()) && 
      s.nome.trim().length > 1
    );
    
    // Calcular apenas com serviços válidos selecionados
    // Se não há serviços válidos, retornar 0 (não usar valores antigos da OS)
    return servicosValidos.reduce((total, servico) => {
      const preco = typeof servico.preco === 'number' ? servico.preco : parseFloat(String(servico.preco || 0));
      return total + (isNaN(preco) ? 0 : preco);
    }, 0);
  };

  // Função auxiliar para converter string de preço brasileiro para número
  const parsePrecoBrasileiro = (precoStr: string): number => {
    if (!precoStr) return 0;
    
    // Remover espaços
    let str = precoStr.trim();
    
    // Se tem vírgula, assume formato brasileiro: "1.234,56" ou "1234,56"
    if (str.includes(',')) {
      // Remover pontos (separadores de milhar) e substituir vírgula por ponto
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes('.')) {
      // Se só tem ponto, pode ser formato internacional "1234.56" ou brasileiro "1.234"
      // Verificar se tem mais de um ponto (formato brasileiro com milhar)
      const partes = str.split('.');
      if (partes.length > 2) {
        // Formato brasileiro: "1.234.567" - remover todos os pontos
        str = str.replace(/\./g, '');
      }
      // Se tem apenas um ponto, assumir que é decimal
    }
    
    const valor = parseFloat(str);
    return isNaN(valor) ? 0 : valor;
  };

  // Função para converter texto em itens estruturados (igual à página do atendente)
  const parseTextToItems = (texto: string, tipo: 'produto' | 'servico') => {
    if (!texto || texto.trim() === '') return [];
    
    const itens = [];
    
    // Tentar primeiro o formato com vírgulas (formato atual da bancada)
    const itensComVirgula = texto.split(',').filter(item => item.trim());
    if (itensComVirgula.length > 0) {
      for (const itemTexto of itensComVirgula) {
        if (tipo === 'produto') {
          // Formato: "Nome (2x) - R$ 100,00" ou "Nome (2x) - R$ 1.234,56"
          let match = itemTexto.match(/^(.+?)\s*\(\s*(\d+)\s*x\s*\)\s*-\s*R\$\s*([\d.,\s]+)\s*$/);
          if (match) {
            const precoTotal = parsePrecoBrasileiro(match[3]);
            const quantidade = parseInt(match[2]) || 1;
            // Preço unitário = preço total / quantidade
            const precoUnitario = quantidade > 0 && precoTotal > 0 ? precoTotal / quantidade : 0;
            if (precoUnitario > 0) {
              itens.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                nome: match[1].trim(),
                quantidade,
                preco: precoUnitario,
              });
              continue;
            }
          }
          // Tentar formato: "Nome - Qtd: X - Valor: R$ Y.YY"
          match = itemTexto.match(/^(.+?)\s*-\s*Qtd:\s*(\d+)\s*-\s*Valor:\s*R\$\s*([\d.,\s]+)$/);
          if (match) {
            const precoTotal = parsePrecoBrasileiro(match[3]);
            const quantidade = parseInt(match[2]) || 1;
            const precoUnitario = quantidade > 0 && precoTotal > 0 ? precoTotal / quantidade : 0;
            if (precoUnitario > 0) {
              itens.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                nome: match[1].trim(),
                quantidade,
                preco: precoUnitario,
              });
              continue;
            }
          }
        } else {
          // Formato: "Nome - R$ 100,00" ou "Nome - R$ 1.234,56"
          let match = itemTexto.match(/^(.+?)\s*-\s*R\$\s*([\d.,\s]+)\s*$/);
          if (match) {
            const preco = parsePrecoBrasileiro(match[2]);
            if (preco > 0) {
              itens.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                nome: match[1].trim(),
                preco: preco,
              });
              continue;
            }
          }
          // Tentar formato: "Nome - Valor: R$ Y.YY"
          match = itemTexto.match(/^(.+?)\s*-\s*Valor:\s*R\$\s*([\d.,\s]+)$/);
          if (match) {
            const preco = parsePrecoBrasileiro(match[2]);
            if (preco > 0) {
              itens.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                nome: match[1].trim(),
                preco: preco,
              });
              continue;
            }
          }
        }
      }
      if (itens.length > 0) {
        return itens;
      }
    }
    
    // Tentar formato com quebras de linha (formato do atendente)
    const linhas = texto.split('\n').filter(linha => linha.trim());
    
    for (const linha of linhas) {
      if (tipo === 'produto') {
        // Formato: "Nome - Qtd: X - Valor: R$ Y.YY"
        let match = linha.match(/^(.+?)\s*-\s*Qtd:\s*(\d+)\s*-\s*Valor:\s*R\$\s*([\d.,\s]+)$/);
        if (match) {
          const precoTotal = parsePrecoBrasileiro(match[3]);
          const quantidade = parseInt(match[2]) || 1;
          const precoUnitario = quantidade > 0 && precoTotal > 0 ? precoTotal / quantidade : 0;
          if (precoUnitario > 0) {
            itens.push({
              id: `temp-${Date.now()}-${Math.random()}`,
              nome: match[1].trim(),
              quantidade,
              preco: precoUnitario,
            });
            continue;
          }
        }
      } else {
        // Formato: "Nome - Valor: R$ Y.YY"
        let match = linha.match(/^(.+?)\s*-\s*Valor:\s*R\$\s*([\d.,\s]+)$/);
        if (match) {
          const preco = parsePrecoBrasileiro(match[2]);
          if (preco > 0) {
            itens.push({
              id: `temp-${Date.now()}-${Math.random()}`,
              nome: match[1].trim(),
              preco: preco,
            });
            continue;
          }
        }
        // Tentar outros formatos possíveis
        match = linha.match(/^(.+?)\s*-\s*([\d.,\s]+)$/); // "Nome - 160.00"
        if (match) {
          const preco = parsePrecoBrasileiro(match[2]);
          if (preco > 0) {
            itens.push({
              id: `temp-${Date.now()}-${Math.random()}`,
              nome: match[1].trim(),
              preco: preco,
            });
            continue;
          }
        }
      }
    }
    
    return itens;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Funções para manipular imagens (técnico)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    if (files.length === 0) {
      return;
    }

    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    const validFiles = files.filter(file => file.type.startsWith('image/') && file.size <= MAX_SIZE_BYTES);
    
    if (validFiles.length !== files.length) {
      addToast('warning', 'Algumas imagens foram ignoradas. Apenas imagens até 10MB são permitidas.');
    }
    
    setImagensTecnicoNovas(prev => [...prev, ...validFiles]);
    const previews = validFiles.map(file => URL.createObjectURL(file));
    setPreviewImagensTecnico(prev => [...prev, ...previews]);

    // Permitir selecionar o mesmo arquivo novamente no input
    input.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImagensTecnicoNovas(prev => prev.filter((_, i) => i !== index));
    setPreviewImagensTecnico(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index: number) => {
    setImagensTecnicoExistentes(prev => prev.filter((_, i) => i !== index));
  };

  // Validar duração do vídeo (máx 60 segundos) e retornar Promise<File | null>
  const validarDuracaoVideo = (file: File): Promise<File | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration <= 60) {
          resolve(file);
        } else {
          addToast('warning', `Vídeo "${file.name}" tem ${Math.ceil(video.duration)}s. Máximo permitido: 1 minuto.`);
          resolve(null);
        }
      };
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        addToast('warning', `Não foi possível validar o vídeo "${file.name}". Tente outro formato (MP4, WebM).`);
        resolve(null);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB por vídeo
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    const validByType = files.filter(f => validTypes.includes(f.type) || /\.(mp4|webm|mov|avi)$/i.test(f.name));
    const validBySize = validByType.filter(f => f.size <= MAX_SIZE);

    if (validBySize.length !== validByType.length) {
      addToast('warning', 'Alguns vídeos foram ignorados. Máximo 50MB por arquivo.');
    }
    if (validByType.length !== files.length) {
      addToast('warning', 'Apenas vídeos MP4, WebM, MOV ou AVI são permitidos.');
    }

    const accepted: File[] = [];
    for (const file of validBySize) {
      const ok = await validarDuracaoVideo(file);
      if (ok) accepted.push(ok);
    }

    if (accepted.length > 0) {
      setVideosTecnicoNovas(prev => [...prev, ...accepted]);
      setPreviewVideosTecnico(prev => [...prev, ...accepted.map(f => URL.createObjectURL(f))]);
      addToast('success', `${accepted.length} vídeo(s) adicionado(s). Clique em Salvar para enviar.`);
    }
    input.value = '';
  };

  const handleRemoveVideo = (index: number) => {
    setVideosTecnicoNovas(prev => prev.filter((_, i) => i !== index));
    setPreviewVideosTecnico(prev => {
      const next = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index] || '');
      return next;
    });
  };

  const handleRemoveExistingVideo = (index: number) => {
    setVideosTecnicoExistentes(prev => prev.filter((_, i) => i !== index));
  };

  // Função para abrir editor de imagem
  const abrirEditorImagem = (imageUrl: string, index: number, isNew: boolean = false, isExisting: boolean = false) => {
    setEditingImageUrl(imageUrl);
    setEditingImageIndex(index);
    setEditingNewImage(isNew);
    setEditingExistingImage(isExisting);
  };

  // Função para salvar imagem editada
  const salvarImagemEditada = async (editedImageUrl: string) => {
    if (editingImageIndex === null) return;

    try {
      if (editingNewImage) {
        // Se for uma imagem nova, converter URL editada para File
        const response = await fetch(editedImageUrl);
        const blob = await response.blob();
        const file = new File([blob], `imagem-editada-${Date.now()}.png`, { type: 'image/png' });
        
        // Substituir na lista de novas imagens
        const novasImagensList = [...imagensTecnicoNovas];
        novasImagensList[editingImageIndex] = file;
        setImagensTecnicoNovas(novasImagensList);
        
        // Atualizar preview
        const novasPreviews = [...previewImagensTecnico];
        novasPreviews[editingImageIndex] = editedImageUrl;
        setPreviewImagensTecnico(novasPreviews);
      } else if (editingExistingImage) {
        // Substituir a imagem na lista existente
        const novasImagensList = [...imagensTecnicoExistentes];
        novasImagensList[editingImageIndex] = editedImageUrl;
        setImagensTecnicoExistentes(novasImagensList);

        // Atualizar no banco de dados
        const imagensString = novasImagensList.join(',');
        const { error: updateError } = await supabase
          .from('ordens_servico')
          .update({ imagens_tecnico: imagensString })
          .eq('id', id);

        if (updateError) {
          addToast('error', 'Erro ao atualizar imagem editada');
          return;
        }
      }

      addToast('success', 'Imagem editada salva com sucesso!');
    } catch (error) {
      addToast('error', 'Erro ao salvar imagem editada');
    }
  };

  const uploadImagens = async () => {
    if (imagensTecnicoNovas.length === 0) return [];
    
    setUploadingImagens(true);
    const uploadedUrls: string[] = [];
    
    try {
      const formData = new FormData();
      formData.append('osId', id);
      
      imagensTecnicoNovas.forEach((file) => {
        formData.append('files', file);
      });

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        addToast('error', 'Erro ao fazer upload das imagens: ' + uploadResult.error);
        return [];
      }

      uploadedUrls.push(...uploadResult.files.map((file: any) => file.url));
      
    } catch (error) {
      addToast('error', 'Erro inesperado no upload das imagens');
    } finally {
      setUploadingImagens(false);
    }
    
    return uploadedUrls;
  };

  const uploadVideos = async () => {
    if (videosTecnicoNovas.length === 0) return [];
    setUploadingVideos(true);
    const uploadedUrls: string[] = [];
    const MAX_VIDEO_MB = 50 * 1024 * 1024; // 50MB por vídeo
    try {
      for (const file of videosTecnicoNovas) {
        if (file.size > MAX_VIDEO_MB) {
          addToast('error', `Vídeo "${file.name}" muito grande. Máximo 50MB.`);
          continue;
        }
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${id}/videos/${timestamp}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('ordens-imagens')
          .upload(filePath, file, { upsert: false });
        if (uploadError) {
          const msg = /maximum allowed size|exceeded|too large/i.test(uploadError.message)
            ? 'Vídeo muito grande. Máximo 50MB por arquivo.'
            : uploadError.message;
          addToast('error', `Erro ao enviar "${file.name}": ${msg}`);
          continue;
        }
        const { data: urlData } = supabase.storage.from('ordens-imagens').getPublicUrl(filePath);
        uploadedUrls.push(urlData.publicUrl);
      }
    } catch (error) {
      addToast('error', 'Erro inesperado no upload dos vídeos');
    } finally {
      setUploadingVideos(false);
    }
    return uploadedUrls;
  };

  // const steps = [
  //   { label: 'Orçamento', icon: <FiFileText /> },
  //   { label: 'Aberto', icon: <FiPlay /> },
  //   { label: 'Andamento', icon: <FiTool /> },
  //   { label: 'Concluído', icon: <FiCheck /> },
  //   { label: 'Faturado', icon: <FiDollarSign /> },
  //   { label: 'Finalizado', icon: <FiFlag /> }
  // ];

  if (loading) {
    return (
      <MenuLayout>
        <div className="px-4 sm:px-6 py-8 max-w-full mx-auto text-center text-gray-500 text-sm sm:text-base">Carregando OS...</div>
      </MenuLayout>
    );
  }

  if (!os) {
    return (
      <MenuLayout>
        <div className="px-4 sm:px-6 py-8 max-w-full mx-auto text-center text-red-500 text-sm sm:text-base">Ordem de serviço não encontrada.</div>
      </MenuLayout>
    );
  }

  const aparelho = [os.categoria, os.marca, os.modelo, os.cor].filter(Boolean).join(' ');
  // const entrada = os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '';
  // const valor = ((os.valor_servico || 0) + (os.valor_peca || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MenuLayout>
      <div className="min-h-screen bg-gray-100/80 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm w-full">
          <div className="px-4 sm:px-5 lg:px-6 py-3.5 lg:py-4 max-w-full lg:max-w-7xl mx-auto">
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => window.history.back()}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 transition-colors"
                aria-label="Voltar"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  OS #{os.numero_os || os.id}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {[os.cliente?.nome, aparelho].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <span className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                os.status === 'ORÇAMENTO' ? 'bg-yellow-100 text-yellow-800' :
                os.status === 'EM_ANALISE' ? 'bg-blue-100 text-blue-800' :
                os.status === 'AGUARDANDO_PECA' ? 'bg-orange-100 text-orange-800' :
                os.status === 'SEM REPARO' || os.status === 'SEM_REPARO' ? 'bg-red-100 text-red-800' :
                os.status === 'CONCLUIDO' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {os.status === 'ORÇAMENTO' ? 'Orçamento' : os.status === 'EM_ANALISE' ? 'Em Análise' : os.status === 'AGUARDANDO_PECA' ? 'Aguardando Peça' : os.status === 'SEM REPARO' || os.status === 'SEM_REPARO' ? 'Sem Reparo' : os.status === 'CONCLUIDO' ? 'Concluído' : os.status}
              </span>
            </div>
            {/* Barra de progresso por etapa */}
            {(() => {
              const currentStep = getStatusStepIndex(os?.status, statusTecnico);
              const progressPercent = ((currentStep + 1) / OS_STEPS.length) * 100;
              const displayPercent = progressBarReady ? progressPercent : 0;
              return (
                <div className="mt-3 w-full">
                  <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-[width] duration-700 ease-out"
                      style={{
                        width: `${displayPercent}%`,
                        boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 gap-1 flex-wrap">
                    {OS_STEPS.map((step, i) => {
                      const isDone = i < currentStep;
                      const isCurrent = i === currentStep;
                      return (
                        <span
                          key={step.key}
                          className={`inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium transition-colors duration-300 ${
                            isDone ? 'text-indigo-600' : isCurrent ? 'text-indigo-700' : 'text-gray-400'
                          } ${isCurrent ? 'rounded-md bg-indigo-50 px-2 py-1 -m-1 animate-status-current' : ''}`}
                        >
                          {isCurrent && (
                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            </span>
                          )}
                          {step.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="px-4 sm:px-5 lg:px-6 py-5 lg:py-7 pb-40 lg:pb-10 max-w-full lg:max-w-7xl mx-auto overflow-x-hidden">
          {/* Aviso: OS não iniciada — em cima */}
          {mostrarBotaoIniciar && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <FiAlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>OS ainda não iniciada.</strong> Clique em &quot;Iniciar OS&quot; abaixo para poder editar diagnóstico, materiais e documentação. O status da OS passará automaticamente para <strong>Em análise</strong>.
              </p>
            </div>
          )}

          {(os.status || '').toUpperCase() === 'ENTREGUE' && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <FiAlertCircle className="w-6 h-6 text-red-600 shrink-0" />
              <p className="text-sm text-red-800">
                <strong>O.S. entregue e bloqueada:</strong> esta ordem ja foi entregue e nao pode mais ser editada.
              </p>
            </div>
          )}

          {/* Resumo da OS */}
          <section className="mb-6 lg:mb-8" aria-label="Resumo da ordem">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3.5">Resumo da OS</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Cliente */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5 shadow-sm flex flex-col min-h-[140px]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cliente</p>
                <p className="text-sm font-medium text-gray-900 break-words">{os.cliente?.nome || '—'}</p>
                <dl className="mt-auto pt-3 space-y-1.5 border-t border-gray-100">
                  <div>
                    <dt className="text-xs text-gray-500">Data de entrada</dt>
                    <dd className="text-sm text-gray-900">{os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Atendente</dt>
                    <dd className="text-sm text-gray-900">{os.atendente || '—'}</dd>
                  </div>
                </dl>
              </div>

              {/* Aparelho */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5 shadow-sm flex flex-col min-h-[140px]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Aparelho</p>
                <p className="text-sm font-medium text-gray-900 break-words">{aparelho || '—'}</p>
                <dl className="mt-auto pt-3 space-y-1.5 border-t border-gray-100">
                  {os.numero_serie && (
                    <div>
                      <dt className="text-xs text-gray-500">Nº Série</dt>
                      <dd className="text-sm text-gray-900 break-all">{os.numero_serie}</dd>
                    </div>
                  )}
                  {os.cor && (
                    <div>
                      <dt className="text-xs text-gray-500">Cor</dt>
                      <dd className="text-sm text-gray-900">{os.cor}</dd>
                    </div>
                  )}
                  {!os.numero_serie && !os.cor && (
                    <div>
                      <dt className="text-xs text-gray-500">Detalhes</dt>
                      <dd className="text-sm text-gray-400">—</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Valores */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5 shadow-sm flex flex-col min-h-[140px]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Valores</p>
                <dl className="space-y-1.5 flex-1">
                  <div>
                    <dt className="text-xs text-gray-500">Peças</dt>
                    <dd className="text-sm text-gray-900">{parseFloat(os.valor_peca || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Serviço</dt>
                    <dd className="text-sm text-gray-900">{parseFloat(os.valor_servico || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd>
                  </div>
                </dl>
                <div className="pt-3 mt-auto border-t border-gray-100">
                  <dt className="text-xs text-gray-500">Total</dt>
                  <dd className="text-base font-semibold text-blue-600">{(parseFloat(os.valor_servico || '0') + parseFloat(os.valor_peca || '0')).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd>
                </div>
              </div>

              {/* Status técnico */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5 shadow-sm flex flex-col min-h-[140px]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status técnico</p>
                <div className="mt-auto">
                  <select
                    value={statusTecnico}
                    onChange={e => setStatusTecnico(e.target.value)}
                    disabled={mostrarBotaoIniciar}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione o status</option>
                    {statusTecnicoOptions.map(option => (
                      <option key={option.id} value={option.nome}>{option.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
            
          {/* Relato e informações do cliente */}
          {(os?.relato || os.acessorios || os.condicoes_equipamento || os?.senha_aparelho || os?.senha_padrao) && (
            <section className="mb-6 lg:mb-8" aria-label="Relato e informações">
              <CollapsibleSection
                title="Relato e informações do cliente"
                subtitle="Relato, acessórios, condições e senhas"
                icon={<FiMessageCircle className="w-5 h-5 text-orange-600" />}
                defaultOpen={true}
              >
                <div className="space-y-5 pt-3 pb-1">
                  {os?.relato && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Relato do cliente</p>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-sm text-gray-900 leading-relaxed break-words">{os.relato}</p>
                      </div>
                    </div>
                  )}
                  {os.acessorios && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Acessórios</p>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-sm text-gray-900 leading-relaxed break-words">{os.acessorios}</p>
                      </div>
                    </div>
                  )}
                  {os.condicoes_equipamento && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Condições do equipamento</p>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <p className="text-sm text-gray-900 leading-relaxed break-words">{os.condicoes_equipamento}</p>
                      </div>
                    </div>
                  )}
                  {os?.senha_aparelho && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <FiLock className="w-3.5 h-3.5 text-amber-600" /> Senha do aparelho
                      </p>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 overflow-x-auto">
                        <code className="text-sm font-mono text-gray-900 break-all">{String(os.senha_aparelho)}</code>
                      </div>
                    </div>
                  )}
                  {os?.senha_padrao && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <FiLock className="w-3.5 h-3.5 text-amber-600" /> Padrão Android
                      </p>
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <PatternDisplay pattern={os.senha_padrao as string | number[]} />
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            </section>
          )}

          {/* Seu trabalho — só editável após "Iniciar OS" */}
          <div className="space-y-4 w-full max-w-full">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3.5">Seu trabalho</h2>

          <CollapsibleSection
            title="Diagnóstico técnico"
            subtitle="Laudo e observações"
            icon={<FiEdit className="w-5 h-5 text-purple-600" />}
            defaultOpen={true}
          >
            <div className="space-y-5 pt-0 pb-1 w-full max-w-full">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Laudo técnico</p>
                <LaudoEditor
                  value={laudo}
                  onChange={setLaudo}
                  placeholder="Descreva o diagnóstico técnico com todos os detalhes relevantes..."
                  minHeight="180px"
                  readOnly={mostrarBotaoIniciar}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Observações técnicas</p>
                <textarea
                  className="w-full border border-gray-300 px-3 py-2.5 rounded-lg text-sm text-gray-900 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Observações adicionais do técnico..."
                  readOnly={mostrarBotaoIniciar}
                  disabled={mostrarBotaoIniciar}
                />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Materiais e serviços"
            subtitle="Produtos utilizados e serviços realizados"
            icon={<FiTool className="w-5 h-5 text-green-600" />}
            defaultOpen={true}
          >
            <div className="space-y-6 pt-1 pb-1">
              {/* Produtos e Serviços usando ProdutoServicoManager */}
              <ProdutoServicoManager
                tipo="produto"
                itens={produtosSelecionados.map(p => ({
                  id: p.id,
                  nome: p.nome,
                  preco: p.preco,
                  quantidade: p.quantidade,
                  total: p.preco * p.quantidade
                }))}
                onItensChange={(itens) => {
                  // Filtrar itens inválidos antes de atualizar
                  const itensValidos = itens.filter(item => 
                    item.nome && 
                    item.nome.trim() !== '' && 
                    !/^[\d\s]+$/.test(item.nome.trim()) && // Não apenas números
                    item.nome.trim().length > 1 // Nome com pelo menos 2 caracteres
                  );
                  const novosProdutos = itensValidos.map(item => ({
                    id: item.id || `temp-${Date.now()}-${Math.random()}`,
                    nome: item.nome.trim(),
                    preco: item.preco || 0,
                    quantidade: item.quantidade || 1
                  }));
                  setProdutosSelecionados(novosProdutos);
                }}
                readonly={mostrarBotaoIniciar}
              />
              
              <ProdutoServicoManager
                tipo="servico"
                itens={servicosSelecionados.map(s => ({
                  id: s.id,
                  nome: s.nome,
                  preco: s.preco,
                  quantidade: 1,
                  total: s.preco
                }))}
                onItensChange={(itens) => {
                  // Filtrar itens inválidos antes de atualizar
                  const itensValidos = itens.filter(item => 
                    item.nome && 
                    item.nome.trim() !== '' && 
                    !/^[\d\s]+$/.test(item.nome.trim()) && // Não apenas números
                    item.nome.trim().length > 1 // Nome com pelo menos 2 caracteres
                  );
                  const novosServicos = itensValidos.map(item => ({
                    id: item.id || `temp-${Date.now()}-${Math.random()}`,
                    nome: item.nome.trim(),
                    preco: item.preco || 0
                  }));
                  setServicosSelecionados(novosServicos);
                }}
                readonly={mostrarBotaoIniciar}
              />
                      </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Documentação"
            subtitle="Imagens, vídeos e checklist de entrada"
            icon={<FiCamera className="w-5 h-5 text-indigo-600" />}
            defaultOpen={false}
          >
            <div className="space-y-6 lg:space-y-8 pt-1 pb-1">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Imagens do técnico</p>
            <div className="space-y-4">
              <div className={`border-2 border-dashed rounded-lg p-4 sm:p-5 md:p-6 text-center transition-colors touch-manipulation ${mostrarBotaoIniciar ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-75' : 'border-gray-300 hover:border-gray-400 active:border-gray-500'}`}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  id="image-upload-edit"
                  onChange={handleImageUpload}
                  disabled={mostrarBotaoIniciar}
                />
                <label htmlFor={mostrarBotaoIniciar ? undefined : 'image-upload-edit'} className={`flex min-h-[120px] sm:min-h-[140px] flex-col justify-center ${mostrarBotaoIniciar ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}>
                  <div className="space-y-2">
                    <div className="text-3xl sm:text-4xl">📷</div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Imagens do técnico (laudo)</p>
                    <p className="text-xs text-gray-500 px-2">PNG, JPG até 10MB cada • Máximo 10 imagens</p>
                    {imagensTecnicoNovas.length > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        {imagensTecnicoNovas.length} imagem{imagensTecnicoNovas.length !== 1 ? 'ns' : ''} selecionada{imagensTecnicoNovas.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {mostrarBotaoIniciar && (
                      <p className="text-xs text-amber-600 font-medium mt-1">Inicie a OS para adicionar imagens</p>
                    )}
                  </div>
                </label>
              </div>

              {/* Preview das novas imagens do técnico */}
              {previewImagensTecnico.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Novas imagens</p>
                    <button
                      type="button"
                      onClick={() => {
                        setImagensTecnicoNovas([]);
                        setPreviewImagensTecnico([]);
                      }}
                      disabled={mostrarBotaoIniciar}
                      className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Limpar todas
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                    {previewImagensTecnico.map((preview, index) => (
                      <div key={index} className="relative group cursor-pointer">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirEditorImagem(preview, index, true, false);
                              }}
                              disabled={mostrarBotaoIniciar}
                              className="bg-purple-600 text-white rounded-lg px-3 py-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-lg min-h-[40px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FiEdit3 size={16} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(index);
                              }}
                              disabled={mostrarBotaoIniciar}
                              className="bg-red-500 text-white rounded-lg px-3 py-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 hover:bg-red-600 active:bg-red-700 transition-colors shadow-lg min-h-[40px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FiTrash2 size={16} />
                              Remover
                          </button>
                          </div>
                        </div>
                      </div>
                    )                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FiVideo className="w-3.5 h-3.5 text-indigo-600" /> Vídeos do técnico
                </p>
                <div className={`border-2 border-dashed rounded-lg p-4 sm:p-5 md:p-6 text-center transition-colors touch-manipulation ${mostrarBotaoIniciar ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-75' : 'border-gray-300 hover:border-gray-400 active:border-gray-500'}`}>
                  <input
                    type="file"
                    multiple
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
                    className="hidden"
                    id="video-upload-edit"
                    onChange={handleVideoUpload}
                    disabled={mostrarBotaoIniciar}
                  />
                  <label htmlFor={mostrarBotaoIniciar ? undefined : 'video-upload-edit'} className={`flex min-h-[100px] flex-col justify-center ${mostrarBotaoIniciar ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}>
                    <div className="space-y-2">
                      <div className="text-3xl sm:text-4xl">🎬</div>
                      <p className="text-xs sm:text-sm text-gray-600 font-medium">Vídeos do técnico (até 1 minuto)</p>
                      <p className="text-xs text-gray-500 px-2">MP4, WebM, MOV até 50MB • Máximo 1 min de duração</p>
                      {videosTecnicoNovas.length > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          {videosTecnicoNovas.length} vídeo{videosTecnicoNovas.length !== 1 ? 's' : ''} selecionado{videosTecnicoNovas.length !== 1 ? 's' : ''}
                        </p>
                      )}
                      {mostrarBotaoIniciar && (
                        <p className="text-xs text-amber-600 font-medium mt-1">Inicie a OS para adicionar vídeos</p>
                      )}
                    </div>
                  </label>
                </div>

                {/* Preview dos novos vídeos */}
                {previewVideosTecnico.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Novos vídeos</p>
                      <button
                        type="button"
                        onClick={() => {
                          setVideosTecnicoNovas([]);
                          previewVideosTecnico.forEach(u => URL.revokeObjectURL(u));
                          setPreviewVideosTecnico([]);
                        }}
                        disabled={mostrarBotaoIniciar}
                        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Limpar todos
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {previewVideosTecnico.map((preview, index) => (
                        <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-black">
                          <video
                            src={preview}
                            className="w-full aspect-video object-contain cursor-pointer"
                            muted
                            playsInline
                            preload="metadata"
                            onClick={() => setPreviewVideoUrl(preview)}
                          />
                          <div className="absolute inset-0 bg-black/50 group-hover:opacity-100 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPreviewVideoUrl(preview); }}
                              className="bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-blue-700"
                            >
                              <FiPlay size={14} /> Visualizar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveVideo(index); }}
                              disabled={mostrarBotaoIniciar}
                              className="bg-red-500 text-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FiTrash2 size={14} /> Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vídeos existentes */}
                {videosTecnicoExistentes.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vídeos já anexados</p>
                      <button
                        type="button"
                        onClick={() => setVideosTecnicoExistentes([])}
                        disabled={mostrarBotaoIniciar}
                        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remover todos
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {videosTecnicoExistentes.map((url, index) => (
                        <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-black">
                          <video
                            src={url}
                            className="w-full aspect-video object-contain cursor-pointer"
                            muted
                            playsInline
                            preload="metadata"
                            onClick={() => setPreviewVideoUrl(url)}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPreviewVideoUrl(url); }}
                              className="bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-blue-700"
                            >
                              <FiPlay size={14} /> Visualizar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveExistingVideo(index); }}
                              disabled={mostrarBotaoIniciar}
                              className="bg-red-500 text-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FiTrash2 size={14} /> Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Imagens de Entrada (Atendente) */}
              {imagensEntradaExistentes.length > 0 && (
                <div id="anexos" className="space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Imagens de entrada (atendente)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                    {imagensEntradaExistentes.map((url, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setPreviewImagemUrl(url)}
                        className="relative group cursor-zoom-in touch-manipulation"
                      >
                        <img
                          src={url}
                          alt={`Imagem entrada ${index + 1}`}
                          className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Imagens do Técnico (Laudo) */}
              {imagensTecnicoExistentes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Imagens do técnico (laudo)</p>
                    <button
                      type="button"
                      onClick={() => setImagensTecnicoExistentes([])}
                      disabled={mostrarBotaoIniciar}
                      className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remover todas
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                    {imagensTecnicoExistentes.map((url, index) => (
                      <div
                        key={index}
                        className="relative group cursor-zoom-in touch-manipulation"
                        onClick={() => setPreviewImagemUrl(url)}
                      >
                        <img
                          src={url}
                          alt={`Imagem técnico ${index + 1}`}
                          className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirEditorImagem(url, index, false, true);
                              }}
                              disabled={mostrarBotaoIniciar}
                              className="bg-purple-600 text-white rounded-lg px-3 py-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-lg min-h-[40px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FiEdit3 size={16} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveExistingImage(index);
                              }}
                              disabled={mostrarBotaoIniciar}
                              className="bg-red-500 text-white rounded-lg px-3 py-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 hover:bg-red-600 active:bg-red-700 transition-colors shadow-lg min-h-[40px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FiTrash2 size={16} />
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>


              <div className="border-t border-gray-200 pt-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FiCheck className="w-3.5 h-3.5 text-green-600" /> Checklist de entrada
                </p>
            
            {checklistItens.length > 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <DynamicChecklist
                  value={checklistData || {}}
                  onChange={setChecklistData}
                  disabled={mostrarBotaoIniciar}
                  equipamentoCategoria={os?.equipamento as string || undefined}
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Nenhum item de checklist configurado para esta empresa.
              </div>
            )}
          </div>
            </div>
          </CollapsibleSection>

          {/* Modal de visualização de imagem (anexos) */}
          {previewImagemUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setPreviewImagemUrl(null)}
            >
              <div
                className="relative max-w-4xl w-full px-4"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setPreviewImagemUrl(null)}
                  className="absolute -top-3 -right-3 bg-black/80 text-white rounded-full p-1.5 shadow-lg hover:bg-black transition-colors"
                >
                  <FiX size={18} />
                </button>
                <div className="bg-black rounded-xl overflow-hidden shadow-2xl max-h-[80vh] flex items-center justify-center">
                  <img
                    src={previewImagemUrl}
                    alt="Visualização do anexo"
                    className="w-full h-full max-h-[80vh] object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal de visualização de vídeo */}
          {previewVideoUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              onClick={() => setPreviewVideoUrl(null)}
            >
              <div
                className="relative max-w-4xl w-full max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setPreviewVideoUrl(null)}
                  className="absolute -top-2 -right-2 z-10 bg-black/80 text-white rounded-full p-2 shadow-lg hover:bg-black transition-colors"
                >
                  <FiX size={20} />
                </button>
                <video
                  src={previewVideoUrl}
                  controls
                  autoPlay
                  className="w-full max-h-[85vh] rounded-xl"
                  playsInline
                />
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="fixed bottom-0 left-0 right-0 lg:relative lg:mt-8 bg-white border-t border-gray-200 lg:border-0 p-4 lg:p-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.08)] lg:shadow-none z-40 safe-area-inset-bottom w-full max-w-full lg:max-w-7xl mx-auto overflow-x-hidden">
            <div className="flex flex-col lg:flex-row gap-3 w-full max-w-full lg:max-w-none">
              {mostrarBotaoIniciar && (
                <Button
                  onClick={handleIniciarOS}
                  disabled={salvando}
                  className="w-full lg:w-auto lg:flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-4 lg:py-3 rounded-xl lg:rounded-lg shadow-lg min-h-[52px] lg:min-h-[44px] touch-manipulation text-base"
                >
                  <FiPlayCircle size={20} className="mr-2" /> 
                  {salvando ? 'Iniciando...' : 'Iniciar OS'}
                </Button>
              )}
              
              <Button
                onClick={handleSalvar}
                disabled={salvando || mostrarBotaoIniciar}
                className="w-full lg:w-auto lg:flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 lg:py-3 rounded-xl lg:rounded-lg shadow-lg min-h-[52px] lg:min-h-[44px] touch-manipulation text-base disabled:opacity-60 disabled:cursor-not-allowed"
                title={mostrarBotaoIniciar ? 'Inicie a OS para poder salvar' : undefined}
              >
                <FiSave size={20} className="mr-2" /> 
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
            </div>
        </div>
      </div>

      {/* Overlay de salvamento com animação Lottie */}
      {salvando && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          style={{ animation: 'save-fade-in 0.25s ease-out' }}
        >
          <div
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 max-w-sm mx-4 flex flex-col items-center gap-6 border border-gray-100 dark:border-zinc-700"
            style={{ animation: 'save-scale-in 0.3s ease-out' }}
          >
            <div className="w-56 h-56 -mt-2 sm:w-64 sm:h-64">
              <Lottie
                animationData={uploadingAnimation}
                loop
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <p className="text-gray-700 dark:text-zinc-200 font-medium text-center -mt-2">
              {saveStep === 'imagens' ? 'Enviando imagens...' : saveStep === 'videos' ? 'Enviando vídeos...' : saveStep === 'dados' ? 'Salvando dados...' : 'Processando...'}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Aguarde, não feche a página</p>
          </div>
        </div>
      )}

      {/* Editor de Imagem */}
      {editingImageUrl && (
        <ImageEditor
          isOpen={!!editingImageUrl}
          onClose={() => {
            setEditingImageUrl(null);
            setEditingImageIndex(null);
            setEditingNewImage(false);
            setEditingExistingImage(false);
          }}
          imageUrl={editingImageUrl}
          onSave={salvarImagemEditada}
          osId={id}
        />
      )}
      </MenuLayout>
    
  );
}