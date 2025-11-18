'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Canvas, TEvent, Image as FabricImage, Circle, Rect, Line, IText, Group, Triangle, PencilBrush } from 'fabric';
import { 
  FiX, 
  FiSave, 
  FiRotateCw, 
  FiRotateCcw, 
  FiZoomIn, 
  FiZoomOut, 
  FiMaximize2,
  FiType,
  FiCircle,
  FiSquare,
  FiArrowRight,
  FiEdit3,
  FiTrash2,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiMousePointer
} from 'react-icons/fi';
import { useToast } from './Toast';

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (editedImageUrl: string) => Promise<void>;
  osId: string;
}

type Tool = 'select' | 'circle' | 'rectangle' | 'arrow' | 'text' | 'draw';

export default function ImageEditor({ isOpen, onClose, imageUrl, onSave, osId }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const fabricRef = useRef<any>(null);
  const backgroundImageRef = useRef<FabricImage | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const initialStateRef = useRef<string | null>(null);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  
  // Refs para manter estado das ferramentas de desenho
  const drawingStateRef = useRef<{
    circle: any;
    rect: any;
    arrowGroup: any;
    startX: number;
    startY: number;
    rafId: number | null;
  }>({
    circle: null,
    rect: null,
    arrowGroup: null,
    startX: 0,
    startY: 0,
    rafId: null,
  });
  
  const { addToast } = useToast();

  // Salvar estado para histórico
  const updateHistoryButtons = useCallback(() => {
    const history = historyRef.current;
    const index = historyIndexRef.current;
    setCanUndo(index > 0);
    setCanRedo(index < history.length - 1);
  }, []);

  const saveState = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    try {
      // Garantir que a imagem de fundo está no canvas antes de salvar
      if (backgroundImageRef.current) {
        const bgImg = backgroundImageRef.current;
        const objects = fabricCanvasRef.current.getObjects();
        const bgExists = objects.some(obj => obj === bgImg);
        
        if (!bgExists) {
          fabricCanvasRef.current.add(bgImg);
          fabricCanvasRef.current.sendObjectToBack(bgImg);
        }
      }
      
      const json = JSON.stringify(fabricCanvasRef.current.toJSON());
      const history = historyRef.current;
      const index = historyIndexRef.current;

      // Remover estados futuros se houver (quando fazemos uma nova ação após undo)
      if (index < history.length - 1) {
        history.splice(index + 1);
      }
      
      // Adicionar novo estado
      history.push(json);
      
      // Limitar histórico a 50 estados
      if (history.length > 50) {
        history.shift();
        historyIndexRef.current = history.length - 1;
      } else {
        historyIndexRef.current = history.length - 1;
      }

      // Verificar se há mudanças não salvas comparando com o estado inicial
      if (initialStateRef.current) {
        hasUnsavedChangesRef.current = json !== initialStateRef.current;
      }

      updateHistoryButtons();
    } catch (error) {
      console.error('Erro ao salvar estado:', error);
    }
  }, [updateHistoryButtons]);

  // Carregar fabric dinamicamente
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('fabric').then((fabricModule) => {
      // Fabric.js exporta as classes diretamente
      const fabric = fabricModule;
      fabricRef.current = fabric;
      setFabricLoaded(true);
    }).catch((error) => {
      console.error('Erro ao carregar fabric.js:', error);
      addToast('error', 'Erro ao carregar editor de imagem');
    });
  }, [addToast]);

  // Inicializar canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !imageUrl || !fabricLoaded || !fabricRef.current) return;
    
    const fabric = fabricRef.current;
    if (!fabric) return;

    const { Canvas, Image: FabricImage } = fabric;
    const canvas = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      skipOffscreen: false, // Renderizar objetos fora da tela
    });
    
    // Permitir que objetos sejam renderizados fora dos limites do canvas
    canvas.clipPath = undefined;
    
    // Desabilitar clipping do canvas e elementos pais
    if (canvasRef.current) {
      const canvasEl = canvasRef.current;
      canvasEl.style.overflow = 'visible';
      canvasEl.style.position = 'relative';
      
      // Remover clipping de todos os elementos pais
      let parent: HTMLElement | null = canvasEl.parentElement;
      while (parent) {
        parent.style.overflow = 'visible';
        parent = parent.parentElement;
      }
    }

    fabricCanvasRef.current = canvas;

    // Inicializar histórico
    historyRef.current = [];
    historyIndexRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);

    // Carregar imagem
    console.log('🖼️ Carregando imagem:', imageUrl);
    
    // Verificar se a URL é válida
    if (!imageUrl || imageUrl.trim() === '') {
      console.error('❌ URL da imagem inválida');
      addToast('error', 'URL da imagem inválida');
      return;
    }

    // Carregar imagem usando HTML Image primeiro, depois converter para Fabric
    const htmlImg = new Image();
    htmlImg.crossOrigin = 'anonymous';
    
    htmlImg.onload = () => {
      console.log('✅ Imagem HTML carregada:', {
        naturalWidth: htmlImg.naturalWidth,
        naturalHeight: htmlImg.naturalHeight,
        width: htmlImg.width,
        height: htmlImg.height
      });

      try {
        // Criar objeto Fabric Image a partir do elemento HTML
        const fabricImg = new FabricImage(htmlImg);
        
        console.log('✅ Objeto Fabric Image criado:', {
          width: fabricImg.width,
          height: fabricImg.height
        });

        // Obter dimensões reais
        const imgWidth = htmlImg.naturalWidth || htmlImg.width || 800;
        const imgHeight = htmlImg.naturalHeight || htmlImg.height || 600;

        console.log('📐 Dimensões da imagem:', { imgWidth, imgHeight });

        // Ajustar tamanho do canvas para a imagem
        const maxWidth = 1200;
        const maxHeight = 800;

        // Calcular escala para caber no canvas
        const scaleX = maxWidth / imgWidth;
        const scaleY = maxHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        console.log('📏 Escala calculada:', scale);

        // Definir dimensões do canvas
        canvas.setWidth(imgWidth * scale);
        canvas.setHeight(imgHeight * scale);
        
        console.log('📐 Dimensões do canvas:', { 
          width: canvas.getWidth(), 
          height: canvas.getHeight() 
        });
        
        // Configurar escala da imagem
        fabricImg.scaleX = scale;
        fabricImg.scaleY = scale;
        fabricImg.selectable = false;
        fabricImg.evented = false;
        fabricImg.lockMovementX = true;
        fabricImg.lockMovementY = true;
        
        // Adicionar imagem ao canvas (será o primeiro objeto, atrás de tudo)
        canvas.add(fabricImg);
        canvas.sendObjectToBack(fabricImg);
        
        // Armazenar referência da imagem de fundo
        backgroundImageRef.current = fabricImg;
        
        console.log('✅ Imagem adicionada ao canvas');
        canvas.renderAll();
        saveState();
        
        // Salvar estado inicial para comparação
        if (initialStateRef.current === null) {
          initialStateRef.current = JSON.stringify(canvas.toJSON());
          hasUnsavedChangesRef.current = false;
        }
      } catch (error) {
        console.error('❌ Erro ao criar Fabric Image:', error);
        addToast('error', 'Erro ao processar imagem: ' + (error as Error).message);
      }
    };

    htmlImg.onerror = (error) => {
      console.error('❌ Erro ao carregar imagem HTML:', error);
      addToast('error', 'Erro ao carregar imagem. Verifique se a URL está correta e acessível.');
    };

    // Iniciar carregamento
    htmlImg.src = imageUrl;

    // Event listeners
    const handleObjectAdded = () => {
      saveState();
    };

    const handleObjectModified = () => {
      saveState();
    };

    const handleObjectRemoved = () => {
      saveState();
    };

    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:removed', handleObjectRemoved);

    return () => {
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:removed', handleObjectRemoved);
      canvas.dispose();
      fabricCanvasRef.current = null;
      // Limpar histórico ao fechar
      historyRef.current = [];
      historyIndexRef.current = -1;
    };
  }, [isOpen, imageUrl, fabricLoaded, saveState]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const history = historyRef.current;
    const index = historyIndexRef.current;
    
    if (index <= 0 || history.length === 0) {
      return;
    }
    
    historyIndexRef.current--;
    const state = history[historyIndexRef.current];
    
    if (!state) {
      console.error('Estado não encontrado no histórico');
      return;
    }
    
    try {
      // Salvar referência da imagem de fundo antes de carregar
      const bgImg = backgroundImageRef.current;
      
      // Função para restaurar imagem de fundo
      const restoreBackground = () => {
        if (fabricCanvasRef.current && bgImg) {
          const objects = fabricCanvasRef.current.getObjects();
          const bgExists = objects.some(obj => obj === bgImg);
          
          if (!bgExists) {
            fabricCanvasRef.current.add(bgImg);
          }
          fabricCanvasRef.current.sendObjectToBack(bgImg);
          fabricCanvasRef.current.renderAll();
        }
      };
      
      // loadFromJSON pode retornar Promise ou usar callback
      const result = fabricCanvasRef.current.loadFromJSON(state, () => {
        if (fabricCanvasRef.current && bgImg) {
          // Usar requestAnimationFrame para garantir que a restauração aconteça após o loadFromJSON
          requestAnimationFrame(() => {
            restoreBackground();
            updateHistoryButtons();
          });
        } else {
          updateHistoryButtons();
        }
      });
      
      // Se retornar Promise, tratar erro
      if (result && typeof result.catch === 'function') {
        result.catch((error: any) => {
          console.error('Erro ao carregar estado:', error);
          addToast('error', 'Erro ao desfazer ação');
        });
      }
    } catch (error) {
      console.error('Erro ao desfazer:', error);
      addToast('error', 'Erro ao desfazer ação');
    }
  }, [updateHistoryButtons, addToast]);

  const handleRedo = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const history = historyRef.current;
    const index = historyIndexRef.current;
    
    if (index >= history.length - 1 || history.length === 0) {
      return;
    }
    
    historyIndexRef.current++;
    const state = history[historyIndexRef.current];
    
    if (!state) {
      console.error('Estado não encontrado no histórico');
      return;
    }
    
    try {
      // Salvar referência da imagem de fundo antes de carregar
      const bgImg = backgroundImageRef.current;
      
      // Função para restaurar imagem de fundo
      const restoreBackground = () => {
        if (fabricCanvasRef.current && bgImg) {
          const objects = fabricCanvasRef.current.getObjects();
          const bgExists = objects.some(obj => obj === bgImg);
          
          if (!bgExists) {
            fabricCanvasRef.current.add(bgImg);
          }
          fabricCanvasRef.current.sendObjectToBack(bgImg);
          fabricCanvasRef.current.renderAll();
        }
      };
      
      // loadFromJSON pode retornar Promise ou usar callback
      const result = fabricCanvasRef.current.loadFromJSON(state, () => {
        if (fabricCanvasRef.current && bgImg) {
          // Usar requestAnimationFrame para garantir que a restauração aconteça após o loadFromJSON
          requestAnimationFrame(() => {
            restoreBackground();
            updateHistoryButtons();
          });
        } else {
          updateHistoryButtons();
        }
      });
      
      // Se retornar Promise, tratar erro
      if (result && typeof result.catch === 'function') {
        result.catch((error: any) => {
          console.error('Erro ao carregar estado:', error);
          addToast('error', 'Erro ao refazer ação');
        });
      }
    } catch (error) {
      console.error('Erro ao refazer:', error);
      addToast('error', 'Erro ao refazer ação');
    }
  }, [updateHistoryButtons, addToast]);

  // Configurar ferramentas
  useEffect(() => {
    if (!fabricCanvasRef.current || !fabricLoaded || !fabricRef.current) return;
    
    const fabric = fabricRef.current;
    if (!fabric) return;

    const canvas = fabricCanvasRef.current;
    canvas.isDrawingMode = activeTool === 'draw';
    canvas.selection = activeTool === 'select';
    canvas.defaultCursor = activeTool === 'select' ? 'default' : 'crosshair';

    // Remover listeners anteriores
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    // Se for modo de seleção, não adicionar listeners de criação
    if (activeTool === 'select') {
      // Apenas garantir que a seleção está habilitada
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      return;
    }

    if (activeTool === 'circle') {
      const { Circle } = fabric;
      const state = drawingStateRef.current;
      
      const handleMouseDown = (opt: TEvent) => {
        console.log('🖱️ Circle mouse:down', opt);
        
        // Se clicou em um objeto existente, não criar novo
        const target = canvas.findTarget(opt.e);
        console.log('🎯 Target:', target);
        if (target && target !== canvas.backgroundImage) {
          console.log('⏭️ Clicou em objeto existente, ignorando');
          return;
        }

        const pointer = canvas.getPointer(opt.e);
        state.startX = pointer.x;
        state.startY = pointer.y;
        
        console.log('📍 Iniciando círculo em:', state.startX, state.startY);
        
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        
        state.circle = new Circle({
          left: state.startX,
          top: state.startY,
          radius: 0,
          fill: 'transparent',
          stroke: '#ff0000',
          strokeWidth: 3,
        });
        canvas.add(state.circle);
        setIsDrawing(true);
        console.log('✅ Círculo criado e adicionado ao canvas');
      };

      const handleMouseMove = (opt: TEvent) => {
        if (!state.circle) {
          return;
        }

        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
        }

        state.rafId = requestAnimationFrame(() => {
          const pointer = canvas.getPointer(opt.e);
          const radius = Math.sqrt(
            Math.pow(pointer.x - state.startX, 2) + Math.pow(pointer.y - state.startY, 2)
          );
          state.circle.set({ radius });
          canvas.renderAll();
        });
      };

      const handleMouseUp = () => {
        console.log('🖱️ Circle mouse:up');
        
        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
        
        // Se não arrastou o suficiente, remover o círculo
        if (state.circle) {
          if (state.circle.radius < 5) {
            console.log('❌ Círculo muito pequeno, removendo');
            canvas.remove(state.circle);
          } else {
            console.log('✅ Círculo salvo, raio:', state.circle.radius);
            saveState();
          }
          state.circle = null;
        }
        
        setIsDrawing(false);
        canvas.selection = true;
        canvas.defaultCursor = 'default';
      };

      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);
    } else if (activeTool === 'rectangle') {
      const { Rect } = fabric;
      const state = drawingStateRef.current;
      
      const handleMouseDown = (opt: TEvent) => {
        console.log('🖱️ Rectangle mouse:down', opt);
        
        // Se clicou em um objeto existente, não criar novo
        const target = canvas.findTarget(opt.e);
        console.log('🎯 Target:', target);
        if (target && target !== canvas.backgroundImage) {
          console.log('⏭️ Clicou em objeto existente, ignorando');
          return;
        }

        const pointer = canvas.getPointer(opt.e);
        state.startX = pointer.x;
        state.startY = pointer.y;
        
        console.log('📍 Iniciando retângulo em:', state.startX, state.startY);
        
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        
        state.rect = new Rect({
          left: state.startX,
          top: state.startY,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: '#ff0000',
          strokeWidth: 3,
        });
        canvas.add(state.rect);
        setIsDrawing(true);
        console.log('✅ Retângulo criado e adicionado ao canvas');
      };

      const handleMouseMove = (opt: TEvent) => {
        if (!state.rect) {
          return;
        }

        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
        }

        state.rafId = requestAnimationFrame(() => {
          const pointer = canvas.getPointer(opt.e);
          const width = pointer.x - state.startX;
          const height = pointer.y - state.startY;
          
          state.rect.set({
            left: width < 0 ? pointer.x : state.startX,
            top: height < 0 ? pointer.y : state.startY,
            width: Math.abs(width),
            height: Math.abs(height),
          });
          canvas.renderAll();
        });
      };

      const handleMouseUp = () => {
        console.log('🖱️ Rectangle mouse:up');
        
        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
        
        // Se não arrastou o suficiente, remover o retângulo
        if (state.rect) {
          if (state.rect.width < 5 || state.rect.height < 5) {
            console.log('❌ Retângulo muito pequeno, removendo');
            canvas.remove(state.rect);
          } else {
            console.log('✅ Retângulo salvo, dimensões:', state.rect.width, state.rect.height);
            saveState();
          }
          state.rect = null;
        }
        
        setIsDrawing(false);
        canvas.selection = true;
        canvas.defaultCursor = 'default';
      };

      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);
    } else if (activeTool === 'arrow') {
      const { Line, Group, Triangle } = fabric;
      const state = drawingStateRef.current;
      
      const handleMouseDown = (opt: TEvent) => {
        // Se clicou em um objeto existente, não criar novo
        const target = canvas.findTarget(opt.e);
        if (target && target !== canvas.backgroundImage) {
          return;
        }

        const pointer = canvas.getPointer(opt.e);
        state.startX = pointer.x;
        state.startY = pointer.y;
        
        setIsDrawing(true);
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';

        // Criar linha principal da seta
        const mainLine = new Line([0, 0, 1, 0], {
          stroke: '#ff0000',
          strokeWidth: 3,
          originX: 'left',
          originY: 'center',
        });

        // Criar ponta da seta usando Triangle
        const arrowSize = 15;
        const arrowHead = new Triangle({
          width: arrowSize,
          height: arrowSize,
          fill: '#ff0000',
          stroke: '#ff0000',
          strokeWidth: 2,
          originX: 'left',
          originY: 'center',
          left: 1,
          top: 0,
          angle: 0,
        });

        // Criar grupo com linha e seta
        state.arrowGroup = new Group([mainLine, arrowHead], {
          left: state.startX,
          top: state.startY,
        });
        canvas.add(state.arrowGroup);
      };

      const handleMouseMove = (opt: TEvent) => {
        if (!state.arrowGroup) {
          return;
        }

        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
        }

        state.rafId = requestAnimationFrame(() => {
          const pointer = canvas.getPointer(opt.e);
          const dx = pointer.x - state.startX;
          const dy = pointer.y - state.startY;
          
          // Calcular comprimento
          const length = Math.sqrt(dx * dx + dy * dy);
          const finalLength = length < 0.01 ? 0.01 : length;
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;

          const objects = state.arrowGroup.getObjects();
          const mainLine = objects[0] as Line;
          const arrowHead = objects[1] as Triangle;

          // Atualizar linha principal
          mainLine.set({
            x2: finalLength,
            y2: 0,
          });

          // Atualizar triângulo da ponta
          const arrowSize = Math.min(30, Math.max(10, finalLength * 0.1));
          arrowHead.set({
            left: finalLength,
            top: 0,
            width: arrowSize,
            height: arrowSize,
            angle: 0,
          });

          // Atualizar grupo com o ângulo
          state.arrowGroup.set({
            angle: angle,
          });
          
          canvas.renderAll();
        });
      };

      const handleMouseUp = () => {
        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
        
        // Se não arrastou o suficiente, remover a seta
        if (state.arrowGroup) {
          const objects = state.arrowGroup.getObjects();
          const mainLine = objects[0] as Line;
          if (mainLine && mainLine.x2 < 10) {
            canvas.remove(state.arrowGroup);
          } else {
            saveState();
          }
          state.arrowGroup = null;
        }
        
        setIsDrawing(false);
        canvas.selection = true;
        canvas.defaultCursor = 'default';
      };

      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);
    } else if (activeTool === 'text') {
      const { IText } = fabric;
      canvas.on('mouse:down', (opt) => {
        const pointer = canvas.getPointer(opt.e);
        const text = new IText('Digite aqui...', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: '#ff0000',
          fontFamily: 'Arial',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.renderAll();
      });
    } else if (activeTool === 'draw') {
      const { PencilBrush } = fabric;
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.width = 3;
      canvas.freeDrawingBrush.color = '#ff0000';
    }

    return () => {
      canvas.off('mouse:down');
      canvas.off('mouse:move');
      canvas.off('mouse:up');
    };
  }, [activeTool, fabricLoaded]);

  // Zoom
  const handleZoomIn = () => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
    fabricCanvasRef.current.setZoom(newZoom);
  };

  const handleZoomOut = () => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.max(zoom / 1.2, 0.5);
    setZoom(newZoom);
    fabricCanvasRef.current.setZoom(newZoom);
  };

  const handleResetZoom = () => {
    if (!fabricCanvasRef.current) return;
    setZoom(1);
    fabricCanvasRef.current.setZoom(1);
  };

  // Rotação
  const handleRotate = (direction: 'cw' | 'ccw') => {
    if (!fabricCanvasRef.current) return;
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject) {
      const angle = activeObject.angle || 0;
      activeObject.set('angle', angle + (direction === 'cw' ? 90 : -90));
      fabricCanvasRef.current.renderAll();
      saveState();
    }
  };

  // Deletar objeto selecionado
  const handleDelete = () => {
    if (!fabricCanvasRef.current) return;
    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    activeObjects.forEach(obj => fabricCanvasRef.current?.remove(obj));
    fabricCanvasRef.current.discardActiveObject();
    fabricCanvasRef.current.renderAll();
    saveState();
  };

  // Salvar imagem editada
  const handleSave = async () => {
    if (!fabricCanvasRef.current) return;

    setIsSaving(true);
    try {
      // Exportar canvas como imagem
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });

      // Converter dataURL para Blob
      const response = await fetch(dataURL);
      const blob = await response.blob();
      const file = new File([blob], `laudo-editado-${Date.now()}.png`, { type: 'image/png' });

      // Upload para Supabase
      const formData = new FormData();
      formData.append('files', file);
      formData.append('osId', osId);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Erro ao fazer upload');
      }

      const editedImageUrl = uploadResult.files[0].url;
      await onSave(editedImageUrl);
      
      // Resetar estado de mudanças não salvas
      if (fabricCanvasRef.current) {
        initialStateRef.current = JSON.stringify(fabricCanvasRef.current.toJSON());
        hasUnsavedChangesRef.current = false;
      }
      
      addToast('success', 'Imagem editada salva com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      addToast('error', 'Erro ao salvar imagem editada');
    } finally {
      setIsSaving(false);
    }
  };

  // Função para verificar e lidar com fechamento
  const handleClose = () => {
    // Se não há mudanças não salvas, fechar diretamente
    if (!hasUnsavedChangesRef.current) {
      onClose();
      return;
    }

    // Se há mudanças, mostrar diálogo de confirmação
    setShowUnsavedDialog(true);
  };

  // Função para salvar e fechar
  const handleSaveAndClose = async () => {
    setShowUnsavedDialog(false);
    await handleSave();
    // O handleSave já chama onClose após salvar com sucesso
  };

  // Função para descartar mudanças e fechar
  const handleDiscardAndClose = () => {
    setShowUnsavedDialog(false);
    hasUnsavedChangesRef.current = false;
    onClose();
  };

  // Função para cancelar fechamento
  const handleCancelClose = () => {
    setShowUnsavedDialog(false);
  };

  if (!isOpen) {
    return null;
  }
  
  if (!fabricLoaded) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando editor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Editor de Imagem</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            aria-label="Fechar"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 bg-gray-50 flex-wrap">
          {/* Ferramentas */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setActiveTool('select')}
              className={`p-2 rounded transition-colors ${
                activeTool === 'select'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Selecionar e mover objetos"
            >
              <FiMousePointer size={18} />
            </button>
            <button
              onClick={() => setActiveTool('circle')}
              className={`p-2 rounded transition-colors ${
                activeTool === 'circle'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Círculo"
            >
              <FiCircle size={18} />
            </button>
            <button
              onClick={() => setActiveTool('rectangle')}
              className={`p-2 rounded transition-colors ${
                activeTool === 'rectangle'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Retângulo"
            >
              <FiSquare size={18} />
            </button>
            <button
              onClick={() => setActiveTool('arrow')}
              className={`p-2 rounded transition-colors ${
                activeTool === 'arrow'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Seta"
            >
              <FiArrowRight size={18} />
            </button>
            <button
              onClick={() => setActiveTool('text')}
              className={`p-2 rounded transition-colors ${
                activeTool === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Texto"
            >
              <FiType size={18} />
            </button>
            <button
              onClick={() => setActiveTool('draw')}
              className={`p-2 rounded transition-colors ${
                activeTool === 'draw'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Desenhar"
            >
              <FiEdit3 size={18} />
            </button>
          </div>

          <div className="w-px h-8 bg-gray-300 mx-2" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Desfazer"
            >
              <FiCornerUpLeft size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refazer"
            >
              <FiCornerUpRight size={18} />
            </button>
          </div>

          <div className="w-px h-8 bg-gray-300 mx-2" />

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded text-gray-600 hover:bg-gray-100 transition-colors"
              title="Diminuir zoom"
            >
              <FiZoomOut size={18} />
            </button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded text-gray-600 hover:bg-gray-100 transition-colors"
              title="Aumentar zoom"
            >
              <FiZoomIn size={18} />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Resetar zoom"
            >
              Reset
            </button>
          </div>

          <div className="w-px h-8 bg-gray-300 mx-2" />

          {/* Rotação */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleRotate('ccw')}
              className="p-2 rounded text-gray-600 hover:bg-gray-100 transition-colors"
              title="Rotacionar anti-horário"
            >
              <FiRotateCcw size={18} />
            </button>
            <button
              onClick={() => handleRotate('cw')}
              className="p-2 rounded text-gray-600 hover:bg-gray-100 transition-colors"
              title="Rotacionar horário"
            >
              <FiRotateCw size={18} />
            </button>
          </div>

          <div className="w-px h-8 bg-gray-300 mx-2" />

          {/* Deletar */}
          <button
            onClick={handleDelete}
            className="p-2 rounded text-red-600 hover:bg-red-50 transition-colors"
            title="Deletar selecionado"
          >
            <FiTrash2 size={18} />
          </button>

          <div className="flex-1" />

          {/* Salvar */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiSave size={18} />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-100 p-4 flex items-center justify-center" style={{ overflow: 'visible', position: 'relative' }}>
          <div className="bg-white rounded-lg shadow-lg p-4 inline-block" style={{ overflow: 'visible' }}>
            <canvas ref={canvasRef} style={{ overflow: 'visible' }} />
          </div>
        </div>

        {/* Footer com instruções */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            <strong>Dica:</strong> Use as ferramentas para fazer anotações na imagem. 
            Clique e arraste para criar formas. Use a ferramenta de texto para adicionar anotações.
          </p>
        </div>
      </div>
      
      {/* Diálogo de confirmação para mudanças não salvas */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Há edições não salvas
            </h3>
            <p className="text-gray-600 mb-6">
              Você tem edições não salvas. O que deseja fazer?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDiscardAndClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={handleSaveAndClose}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

