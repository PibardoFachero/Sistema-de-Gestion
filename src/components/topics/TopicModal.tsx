'use client';

import React, { useState } from 'react';
import { X, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string) => Promise<void>;
  initialTitle?: string;
  initialDescription?: string;
  isEditing?: boolean;
}

export function TopicModal({
  isOpen,
  onClose,
  onSubmit,
  initialTitle = '',
  initialDescription = '',
  isEditing = false,
}: TopicModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <TopicModalContent
        key={`${isEditing ? 'edit' : 'new'}-${initialTitle}`}
        onClose={onClose}
        onSubmit={onSubmit}
        initialTitle={initialTitle}
        initialDescription={initialDescription}
        isEditing={isEditing}
      />
    </div>
  );
}

interface TopicModalContentProps {
  onClose: () => void;
  onSubmit: (title: string, description: string) => Promise<void>;
  initialTitle: string;
  initialDescription: string;
  isEditing: boolean;
}

function TopicModalContent({
  onClose,
  onSubmit,
  initialTitle,
  initialDescription,
  isEditing,
}: TopicModalContentProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('El título del tema es requerido.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSubmit(cleanTitle, description.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div className="flex items-center gap-2 text-primary font-bold">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="size-4" />
          </div>
          <span>{isEditing ? 'Editar Tema' : 'Nuevo Tema de Estudio'}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-outline hover:bg-surface-container-low transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-xl bg-error/10 border border-error/20 text-error font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1.5">
            Título del tema <span className="text-error">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Programación Backend y APIs"
            className="w-full rounded-xl border border-outline-variant/70 bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1.5">
            Descripción o enfoque
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Fundamentos, buenas prácticas y arquitectura..."
            rows={3}
            className="w-full rounded-xl border border-outline-variant/70 bg-surface p-3.5 text-sm outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
            maxLength={300}
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
          <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={loading || !title.trim()} className="gap-2">
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Tema'}
          </Button>
        </div>
      </form>
    </div>
  );
}
