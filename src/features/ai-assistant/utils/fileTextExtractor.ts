/**
 * Extrae texto legible de un archivo seleccionado por el usuario en el navegador (PDF, TXT, MD, CSV, etc.).
 */
export async function extractTextFromFile(file: File): Promise<{
  text: string;
  isSupported: boolean;
  wordCount: number;
}> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // 1. Archivos de texto plano directo
  const isPlainText =
    fileType.startsWith('text/') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.json') ||
    fileName.endsWith('.csv') ||
    fileName.endsWith('.tsv') ||
    fileName.endsWith('.log') ||
    fileName.endsWith('.js') ||
    fileName.endsWith('.ts') ||
    fileName.endsWith('.jsx') ||
    fileName.endsWith('.tsx') ||
    fileName.endsWith('.html') ||
    fileName.endsWith('.xml') ||
    fileName.endsWith('.css') ||
    fileName.endsWith('.sql') ||
    fileName.endsWith('.py');

  if (isPlainText) {
    try {
      const text = await file.text();
      const cleaned = text.trim();
      const wordCount = cleaned.length > 0 ? cleaned.split(/\s+/).length : 0;
      return {
        text: cleaned,
        isSupported: true,
        wordCount,
      };
    } catch (err) {
      console.warn('Error leyendo archivo de texto:', err);
    }
  }

  // 2. Archivos PDF (.pdf)
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const extracted = await extractTextFromPdfBuffer(arrayBuffer);
      if (extracted && extracted.trim().length > 20) {
        const cleaned = extracted.trim();
        const wordCount = cleaned.split(/\s+/).length;
        return {
          text: cleaned,
          isSupported: true,
          wordCount,
        };
      }
      return {
        text: '',
        isSupported: false,
        wordCount: 0,
      };
    } catch (err) {
      console.warn('No se pudo extraer texto del PDF:', err);
    }
  }

  // Otros tipos de archivos (imágenes, audio, binarios sin texto)
  return {
    text: '',
    isSupported: false,
    wordCount: 0,
  };
}

/**
 * Extractor nativo de texto para flujos y bloques de PDF.
 */
async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  const uint8 = new Uint8Array(buffer);
  const textChunks: string[] = [];

  // Convertir buffer a string binario para buscar streams y bloques BT...ET
  const decoder = new TextDecoder('latin1');
  const pdfString = decoder.decode(uint8);

  // 1. Extraer texto de bloques BT ... ET no comprimidos
  const rawTextMatches = extractTextFromOperators(pdfString);
  if (rawTextMatches.length > 0) {
    textChunks.push(...rawTextMatches);
  }

  // 2. Buscar streams FlateDecode para descomprimirlos y extraer texto
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let streamMatch: RegExpExecArray | null;

  while ((streamMatch = streamRegex.exec(pdfString)) !== null) {
    const rawStream = streamMatch[1];
    if (!rawStream || rawStream.length < 10) continue;

    try {
      const streamUint8 = new Uint8Array(rawStream.length);
      for (let i = 0; i < rawStream.length; i++) {
        streamUint8[i] = rawStream.charCodeAt(i);
      }

      // Intentar descompresión con DecompressionStream ('deflate') nativo en navegadores modernos
      if (typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(streamUint8).catch(() => {});
        writer.close().catch(() => {});

        const decompressedBuffer = await new Response(ds.readable).arrayBuffer().catch(() => null);
        if (decompressedBuffer) {
          const decompressedText = new TextDecoder('latin1').decode(decompressedBuffer);
          const chunkMatches = extractTextFromOperators(decompressedText);
          if (chunkMatches.length > 0) {
            textChunks.push(...chunkMatches);
          }
        }
      }
    } catch {
      // Stream no comprimido con zlib estándar o formato mixto
    }
  }

  // Unir fragmentos eliminando caracteres de escape
  const fullText = textChunks
    .join(' ')
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\s+/g, ' ')
    .trim();

  return fullText;
}

/**
 * Parsea operadores de texto de PDF (Tj, TJ, ', ")
 */
function extractTextFromOperators(content: string): string[] {
  const results: string[] = [];

  // Parsea cadenas simples: (Texto) Tj
  const tjRegex = /\(((?:[^)\\]|\\.)*)\)\s*Tj/g;
  let tjMatch: RegExpExecArray | null;
  while ((tjMatch = tjRegex.exec(content)) !== null) {
    if (tjMatch[1] && tjMatch[1].trim().length > 0) {
      results.push(tjMatch[1]);
    }
  }

  // Parsea arrays de texto: [(Texto1) -20 (Texto2)] TJ
  const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
  let arrMatch: RegExpExecArray | null;
  while ((arrMatch = tjArrayRegex.exec(content)) !== null) {
    const inner = arrMatch[1];
    const strRegex = /\(((?:[^)\\]|\\.)*)\)/g;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = strRegex.exec(inner)) !== null) {
      if (sMatch[1] && sMatch[1].trim().length > 0) {
        results.push(sMatch[1]);
      }
    }
  }

  return results;
}
