'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

export interface FileUploadProps {
  accept?: string;
  maxSize?: number; // em bytes
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  preview?: boolean;
}

export function useFileUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: File[], onFilesSelected: (files: File[]) => void) => {
    setFiles(Array.from(selectedFiles));
    onFilesSelected(Array.from(selectedFiles));
  };

  const clearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return { files, fileInputRef, handleFileSelect, clearFiles };
}

export function FileUploadArea({
  accept = '*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onFilesSelected,
  preview = false
}: FileUploadProps) {
  const { files, fileInputRef, handleFileSelect, clearFiles } = useFileUpload();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');

  const validateFile = (file: File) => {
    if (file.size > maxSize) {
      setError(`Arquivo muito grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return false;
    }
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError('');

    const droppedFiles = Array.from(e.dataTransfer.files).filter(validateFile);
    if (droppedFiles.length > 0) {
      handleFileSelect(multiple ? droppedFiles : [droppedFiles[0]], onFilesSelected);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const validFiles = Array.from(selectedFiles).filter(validateFile);
      if (validFiles.length > 0) {
        handleFileSelect(validFiles, onFilesSelected);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          dragActive
            ? 'border-[#991B1B] bg-[#991B1B]/5'
            : 'border-gray-300 hover:border-[#991B1B] hover:bg-[#991B1B]/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-lg font-semibold text-gray-900 mb-1">Arraste arquivos aqui</p>
        <p className="text-sm text-gray-500">ou clique para selecionar</p>
        <p className="text-xs text-gray-400 mt-2">
          Máximo: {(maxSize / 1024 / 1024).toFixed(0)}MB
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#991B1B]/5 border border-[#991B1B]/20 rounded-lg text-sm text-[#7F1D1D]">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900">Arquivos selecionados:</h4>
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {preview && file.type.startsWith('image/') && (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newFiles = files.filter((_, i) => i !== idx);
                    handleFileSelect(newFiles, onFilesSelected);
                  }}
                  className="flex-shrink-0 ml-3 text-gray-400 hover:text-[#991B1B] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {files.length > 1 && (
            <button
              type="button"
              onClick={() => clearFiles()}
              className="text-sm text-gray-600 hover:text-[#991B1B] transition"
            >
              Limpar tudo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ImagePreview({ src, alt, size = 200 }: { src: string; alt: string; size?: number }) {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className="rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100"
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
}
