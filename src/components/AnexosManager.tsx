import React, { useState, useRef } from 'react';
import { FiUpload, FiX, FiFile, FiDownload, FiEye, FiTrash2 } from 'react-icons/fi';
import { useToast } from '@/hooks/useToast';

interface AnexosManagerProps {
  contaId: string;
  anexos: string[];
  onAnexosChange: (anexos: string[]) => void;
  disabled?: boolean;
}

export default function AnexosManager({ 
  contaId, 
  anexos = [], 
  onAnexosChange, 
  disabled = false 
}: AnexosManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      addToast('error', 'Tipo de arquivo não permitido. Use: JPG, PNG, PDF, DOC, DOCX ou TXT');
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'Arquivo muito grande. Máximo permitido: 10MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contaId', contaId);

      const response = await fetch('/api/contas-pagar/upload-anexo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao fazer upload');
      }

      onAnexosChange(result.anexos);
      addToast('success', 'Anexo adicionado com sucesso!');
      
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Erro no upload:', error);
      addToast('error', error.message || 'Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAnexo = async (url: string) => {
    if (!confirm('Tem certeza que deseja remover este anexo?')) return;

    setRemoving(url);

    try {
      const response = await fetch(
        `/api/contas-pagar/remover-anexo?contaId=${contaId}&url=${encodeURIComponent(url)}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao remover anexo');
      }

      onAnexosChange(result.anexos);
      addToast('success', 'Anexo removido com sucesso!');

    } catch (error: any) {
      console.error('Erro ao remover anexo:', error);
      addToast('error', error.message || 'Erro ao remover anexo');
    } finally {
      setRemoving(null);
    }
  };

  const getFileIcon = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return '🖼️';
    } else if (extension === 'pdf') {
      return '📄';
    } else if (['doc', 'docx'].includes(extension || '')) {
      return '📝';
    } else if (extension === 'txt') {
      return '📃';
    }
    return '📎';
  };

  const getFileName = (url: string) => {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    // Remover prefixos do nome do arquivo
    return fileName.replace(/^anexo_\w+_\d+_\w+\./, '');
  };

  return (
    <div className="space-y-4">
      {/* Upload de arquivo */}
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          disabled={uploading || disabled}
          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FiUpload className="w-4 h-4" />
          {uploading ? 'Enviando...' : 'Adicionar Anexo'}
        </button>

        <span className="text-sm text-gray-500">
          JPG, PNG, PDF, DOC, DOCX, TXT (máx. 10MB)
        </span>
      </div>

      {/* Lista de anexos */}
      {anexos.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Anexos ({anexos.length})</h4>
          <div className="grid gap-2">
            {anexos.map((url, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getFileIcon(url)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getFileName(url)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {url.split('.').pop()?.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(url, '_blank')}
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    title="Visualizar"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>
                  
                  <a
                    href={url}
                    download
                    className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                    title="Download"
                  >
                    <FiDownload className="w-4 h-4" />
                  </a>
                  
                  <button
                    onClick={() => handleRemoveAnexo(url)}
                    disabled={removing === url || disabled}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                    title="Remover"
                  >
                    {removing === url ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiTrash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {anexos.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FiFile className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum anexo adicionado</p>
          <p className="text-sm">Adicione comprovantes, notas fiscais, etc.</p>
        </div>
      )}
    </div>
  );
}
