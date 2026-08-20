'use client';

import { Check, RotateCw, Scissors, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface ImageEditorProps {
  src: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageEditor({ src, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const previewStyle = useMemo(() => ({
    transform: `scale(${zoom}) rotate(${rotation}deg)`,
    transformOrigin: 'center center',
    objectPosition: `${50 + offsetX}% ${50 + offsetY}%`,
  }), [offsetX, offsetY, rotation, zoom]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const width = 900;
      const height = 600;
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      const scale = Math.min(width / img.width, height / img.height) * zoom;
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      ctx.translate(width / 2, height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawWidth / 2 + offsetX * 4, -drawHeight / 2 + offsetY * 4, drawWidth, drawHeight);
      ctx.resetTransform();
    };
    img.src = src;
  }, [offsetX, offsetY, rotation, src, zoom]);

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/jpeg', 0.92));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Editor de imagem</h3>
            <p className="text-sm text-gray-600">Ajuste zoom, rotação e posição antes de publicar.</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex h-[420px] items-center justify-center overflow-hidden rounded-xl bg-white">
              {imageLoaded ? (
                <img src={src} alt="Pré-visualização" className="max-h-full max-w-full object-contain" style={previewStyle} />
              ) : (
                <p className="text-sm text-gray-500">Carregando imagem...</p>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Scissors className="h-4 w-4" />
                Zoom
              </label>
              <input type="range" min="0.8" max="2.2" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full" />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <RotateCw className="h-4 w-4" />
                Rotação
              </label>
              <input type="range" min="-180" max="180" step="1" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} className="w-full" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Deslocamento horizontal</label>
                <input type="range" min="-20" max="20" step="1" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} className="w-full" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Deslocamento vertical</label>
                <input type="range" min="-20" max="20" step="1" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} className="w-full" />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p>Essa edição funciona diretamente dentro do administrador e gera uma nova imagem pronta para publicação.</p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleApply} className="flex-1 rounded-lg bg-[#FF796C] px-4 py-3 font-semibold text-white transition hover:bg-[#e86153]">
                <span className="inline-flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" />
                  Aplicar edição
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
