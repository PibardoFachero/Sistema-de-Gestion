import type { LegalDocument } from '@/components/legal/legalDocumentData';

export function LegalDocumentBody({
  document,
  compact = false,
  idPrefix = '',
}: {
  document: LegalDocument;
  compact?: boolean;
  idPrefix?: string;
}) {
  const bodyClass = compact
    ? 'text-xs leading-relaxed text-on-surface-variant'
    : 'text-sm leading-relaxed text-on-surface-variant sm:text-base';
  const headingClass = compact
    ? 'text-base font-bold tracking-tight text-primary'
    : 'text-xl font-bold tracking-tight text-primary sm:text-2xl';

  return (
    <div className={compact ? 'space-y-7' : 'space-y-12'}>
      {document.sections.map((section, index) => (
        <section key={section.id} id={`${idPrefix}${section.id}`} className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
              {index + 1}
            </span>
            <h2 className={headingClass}>{section.title}</h2>
          </div>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className={bodyClass}>
              {paragraph}
            </p>
          ))}
          {section.bullets && (
            <ul className={`list-inside list-disc space-y-2 ${bodyClass}`}>
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
          {section.note && (
            <p
              className={`rounded-xl border-l-4 border-accent-amber bg-surface-container-low p-4 ${bodyClass}`}
            >
              {section.note}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
