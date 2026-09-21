export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeDate(isoDateString?: string | null): string {
  if (!isoDateString) return 'Sin actividad';

  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return 'Reciente';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Editado ahora';
  if (diffMinutes < 60) return `Editado hace ${diffMinutes} min`;
  if (diffHours < 24) return `Editado hace ${diffHours} h`;
  if (diffDays === 1) return 'Editado ayer';
  if (diffDays < 7) return `Editado hace ${diffDays} días`;

  return `Editado el ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
}
