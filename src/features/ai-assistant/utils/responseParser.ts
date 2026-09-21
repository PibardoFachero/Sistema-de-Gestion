export interface ParsedAssistantResponse {
  reply: string;
  title?: string;
  tasks?: unknown[];
}

/**
 * Limpia y procesa la respuesta devuelta por el servicio de IA (n8n / LLM).
 * Garantiza que nunca se muestren fragmentos técnicos como {"reply":, 'title', etc.
 */
export function extractAssistantResponseAndTitle(
  rawData: unknown,
  options?: { includeTasksInMarkdown?: boolean },
): ParsedAssistantResponse {
  if (!rawData) {
    return { reply: 'Lo siento, no pude procesar tu solicitud.' };
  }

  let data = rawData;

  // Si es un string, intentar limpiarlo de bloques markdown y parsear JSON
  if (typeof data === 'string') {
    let text = data.trim();

    // Remover bloques de código markdown como ```json ... ``` o ``` ... ```
    if (text.startsWith('```')) {
      text = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
    }

    // Intentar JSON.parse
    try {
      data = JSON.parse(text);
    } catch {
      // Si no es JSON estricto, buscar si contiene un objeto JSON con "reply" o "message"
      const jsonMatch = text.match(/\{[\s\S]*"reply"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
        } catch {
          // Intentar extracción por expresiones regulares directas
          const replyMatch = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          const titleMatch = text.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          if (replyMatch && replyMatch[1]) {
            try {
              const unescapedReply = JSON.parse(`"${replyMatch[1]}"`);
              const unescapedTitle =
                titleMatch && titleMatch[1] ? JSON.parse(`"${titleMatch[1]}"`) : undefined;
              return {
                reply: unescapedReply,
                title: unescapedTitle || undefined,
              };
            } catch {
              return {
                reply: replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
                title: titleMatch ? titleMatch[1] : undefined,
              };
            }
          }
        }
      }
    }
  }

  // Si data ahora es un objeto
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;

    // Título si está disponible
    const rawTitle =
      typeof record.title === 'string' && record.title.trim().length > 0
        ? record.title.trim()
        : undefined;

    const rawTasks = Array.isArray(record.tasks)
      ? record.tasks
      : Array.isArray(record.tareas)
        ? record.tareas
        : undefined;

    // Buscar el campo que contiene la respuesta al usuario
    const candidates = [
      record.reply,
      record.output,
      record.message,
      record.response,
      record.content,
      record.text,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        // Si el candidato es un JSON stringificado
        if (candidate.trim().startsWith('{') && candidate.includes('"reply"')) {
          const nested = extractAssistantResponseAndTitle(candidate, options);
          const tasksToUse = nested.tasks || rawTasks;
          return {
            reply: nested.reply,
            title: nested.title || rawTitle,
            tasks: tasksToUse,
          };
        }

        let finalReply = candidate.trim();
        // Si expresamente se pide incluir tareas en markdown y existen tareas estructuradas
        if (
          options?.includeTasksInMarkdown &&
          rawTasks &&
          rawTasks.length > 0 &&
          !finalReply.toLowerCase().includes(String(rawTasks[0]?.title || '').toLowerCase())
        ) {
          finalReply += formatTasksToMarkdown(rawTasks);
        }

        return {
          reply: finalReply,
          title: rawTitle,
          tasks: rawTasks,
        };
      }
    }

    // Si tiene un campo data interno
    if (record.data && typeof record.data === 'object') {
      const nested = extractAssistantResponseAndTitle(record.data);
      return {
        reply: nested.reply,
        title: nested.title || rawTitle,
        tasks: nested.tasks || rawTasks,
      };
    }
  }

  // Si finalmente quedó un string plano
  if (typeof data === 'string') {
    // Si aún contiene rastros como {"reply": ..., removerlos
    let cleanText = data.trim();
    if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
      cleanText = cleanText
        .replace(/^\{/, '')
        .replace(/\}$/, '')
        .replace(/"reply"\s*:\s*"/, '')
        .replace(/"\s*,\s*"title"[\s\S]*$/, '')
        .trim();
    }
    return { reply: cleanText };
  }

  return { reply: 'Lo siento, no pude procesar tu solicitud.' };
}

/**
 * Convierte una lista de tareas estructuradas en formato markdown legible.
 */
function formatTasksToMarkdown(tasks: unknown[]): string {
  if (!Array.isArray(tasks) || tasks.length === 0) return '';
  const lines: string[] = ['\n\n### 📋 Plan sugerido:'];
  tasks.forEach((t, i) => {
    if (typeof t === 'object' && t !== null) {
      const task = t as Record<string, unknown>;
      const title = task.title || task.titulo || `Tarea ${i + 1}`;
      const desc = task.description || task.descripcion || '';
      const dur = task.duration || task.duracion ? ` (⏱️ ${task.duration || task.duracion})` : '';
      const res = task.resourceUrl || task.resource_url || task.url;
      const resName = task.resourceName || 'Ver recurso';

      lines.push(`${i + 1}. **${title}**${dur}`);
      if (desc) lines.push(`   ${desc}`);
      if (res) lines.push(`   🔗 [${resName}](${res})`);
    } else if (typeof t === 'string') {
      lines.push(`${i + 1}. **${t}**`);
    }
  });
  return lines.join('\n');
}
