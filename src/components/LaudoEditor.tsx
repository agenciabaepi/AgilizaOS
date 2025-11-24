'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { useState, useEffect } from 'react';
import { FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiAlignCenter, FiAlignRight, FiLink, FiZap, FiLoader } from 'react-icons/fi';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/Toast';

interface LaudoEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export default function LaudoEditor({ 
  value, 
  onChange, 
  placeholder = 'Descreva o diagnóstico técnico com todos os detalhes relevantes...',
  className = '',
  minHeight = '140px'
}: LaudoEditorProps) {
  const { temRecurso } = useSubscription();
  const { addToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [corrigindo, setCorrigindo] = useState(false);

  // Garantir que o componente está montado no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Configurar editor TipTap
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
      }),
      Underline,
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
  });

  // Atualizar conteúdo do editor quando value mudar externamente
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Função para corrigir texto com IA
  const corrigirComIA = async () => {
    if (!editor) return;

    const textoAtual = editor.getHTML();
    
    if (!textoAtual || textoAtual.trim().length < 10) {
      addToast('warning', 'O texto deve ter pelo menos 10 caracteres para ser corrigido');
      return;
    }

    setCorrigindo(true);
    
    try {
      const response = await fetch('/api/laudo/corrigir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texto: textoAtual }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao corrigir texto');
      }

      // Substituir o conteúdo do editor com o texto corrigido
      editor.commands.setContent(data.textoCorrigido);
      onChange(data.textoCorrigido);
      
      addToast('success', 'Texto corrigido com sucesso!');
    } catch (error: any) {
      console.error('Erro ao corrigir laudo:', error);
      addToast('error', error.message || 'Erro ao corrigir texto. Tente novamente.');
    } finally {
      setCorrigindo(false);
    }
  };

  // Componente da barra de ferramentas
  const Toolbar = () => {
    if (!editor || !mounted) return null;

    const temChatGPT = temRecurso('chatgpt');
    const textoVazio = !editor.getText() || editor.getText().trim().length < 10;

    return (
      <div className="border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-1 items-center">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
          title="Negrito"
          type="button"
        >
          <FiBold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
          title="Itálico"
          type="button"
        >
          <FiItalic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('underline') ? 'bg-gray-300' : ''}`}
          title="Sublinhado"
          type="button"
        >
          <FiUnderline className="w-4 h-4" />
        </button>
        <div className="w-px bg-gray-300 mx-1 h-6"></div>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
          title="Lista com marcadores"
          type="button"
        >
          <FiList className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
          title="Lista numerada"
          type="button"
        >
          <span className="text-sm font-bold">1.</span>
        </button>
        <div className="w-px bg-gray-300 mx-1 h-6"></div>
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''}`}
          title="Alinhar à esquerda"
          type="button"
        >
          <FiAlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''}`}
          title="Centralizar"
          type="button"
        >
          <FiAlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''}`}
          title="Alinhar à direita"
          type="button"
        >
          <FiAlignRight className="w-4 h-4" />
        </button>
        <div className="w-px bg-gray-300 mx-1 h-6"></div>
        <button
          onClick={() => {
            const url = window.prompt('Digite a URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('link') ? 'bg-gray-300' : ''}`}
          title="Inserir link"
          type="button"
        >
          <FiLink className="w-4 h-4" />
        </button>
        
        {/* Botão de correção com IA (apenas se tiver recurso ChatGPT) */}
        {temChatGPT && (
          <>
            <div className="w-px bg-gray-300 mx-1 h-6"></div>
            <button
              onClick={corrigirComIA}
              disabled={corrigindo || textoVazio}
              className={`p-2 rounded transition-colors flex items-center gap-1 ${
                corrigindo || textoVazio
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
              }`}
              title="Corrigir texto com IA (ChatGPT)"
              type="button"
            >
              {corrigindo ? (
                <FiLoader className="w-4 h-4 animate-spin" />
              ) : (
                <FiZap className="w-4 h-4" />
              )}
              <span className="text-xs font-medium">Corrigir com IA</span>
            </button>
          </>
        )}
      </div>
    );
  };

  if (!mounted) {
    return (
      <div className={`border border-gray-300 rounded-xl ${className}`} style={{ minHeight }}>
        <div className="p-4 text-center text-gray-500">Carregando editor...</div>
      </div>
    );
  }

  if (!mounted || !editor) {
    return (
      <div className={`border border-gray-300 rounded-xl ${className}`} style={{ minHeight }}>
        <div className="p-4 text-center text-gray-500">Carregando editor...</div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 rounded-xl flex flex-col bg-white relative ${className}`} style={{ minHeight }}>
      <Toolbar />
      <div className="relative flex-1 min-h-0">
        <EditorContent 
          editor={editor} 
          className="p-4 focus:outline-none overflow-y-auto min-h-full"
        />
        {!editor.getText() && (
          <div className="absolute top-4 left-4 pointer-events-none text-gray-400 text-sm">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

