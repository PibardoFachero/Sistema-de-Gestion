import 'server-only';

/**
 * Normaliza el texto removiendo diacríticos (tildes), caracteres repetidos o símbolos leet.
 */
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lista de términos obscenos, vulgares, insultos o contenido no apto en contextos académicos.
 */
const OBSCENE_TERMS = [
  'puta',
  'puto',
  'putas',
  'putos',
  'putita',
  'putito',
  'mierda',
  'mierdas',
  'pendejo',
  'pendeja',
  'pendejos',
  'pendejas',
  'coño',
  'coños',
  'marica',
  'maricon',
  'maricones',
  'cabron',
  'cabrona',
  'cabrones',
  'verga',
  'vergas',
  'vergacion',
  'chucha',
  'chuchas',
  'mamaguevo',
  'mamahuevo',
  'mamaguevos',
  'malparido',
  'malparida',
  'estupido',
  'estupida',
  'imbecil',
  'imbeciles',
  'zorra',
  'zorras',
  'culo',
  'culos',
  'culiao',
  'culiaos',
  'carajo',
  'carajos',
  'perra',
  'perras',
  'idiota',
  'idiotas',
  'bastardo',
  'bastarda',
  'fuck',
  'fucking',
  'shit',
  'bitch',
  'asshole',
  'cunt',
  'dick',
  'pussy',
  'hijo de puta',
  'hija de puta',
  'gonorrea',
  'carechimba',
  'huevon',
  'huevona',
];

/**
 * Lista de términos peligrosos, que incitan a la violencia, amenazas, armas,
 * actividades ilegales o daño físico/psicológico.
 */
const DANGEROUS_TERMS = [
  'bomba',
  'bombas',
  'atentado',
  'atentados',
  'terrorismo',
  'terrorista',
  'asesinar',
  'asesinato',
  'asesinatos',
  'homicidio',
  'homicidios',
  'suicidio',
  'suicidarse',
  'matar',
  'descuartizar',
  'tiroteo',
  'tiroteos',
  'secuestro',
  'secuestros',
  'secuestrar',
  'extorsion',
  'extorsionar',
  'veneno',
  'envenenar',
  'explosivo',
  'explosivos',
  'cianuro',
  'arma de fuego',
  'armas de fuego',
  'rifle',
  'dinamita',
  'narcotrafico',
  'cocaina',
  'heroina',
  'fentanilo',
  'hackear banco',
  'fabricar arma',
  'fabricar bomba',
  'hacer una bomba',
  'como matar',
  'como suicidarse',
];

export interface ContentValidationResult {
  isValid: boolean;
  error?: string;
  detectedTerm?: string;
  type?: 'obscene' | 'dangerous';
}

/**
 * Valida si un texto contiene palabras peligrosas u obscenas.
 * Se ejecuta exclusivamente en el backend para impedir la creación o actualización de proyectos
 * con lenguaje inapropiado o potencialmente dañino.
 */
export function validateContent(text: string): ContentValidationResult {
  if (!text || text.trim() === '') {
    return { isValid: true };
  }

  const normalized = normalizeText(text);
  const words = normalized.split(' ');

  // 1. Verificar términos peligrosos (frases compuestas o palabras individuales)
  for (const dangerous of DANGEROUS_TERMS) {
    if (dangerous.includes(' ')) {
      if (normalized.includes(dangerous)) {
        return {
          isValid: false,
          error:
            'El contenido contiene términos peligrosos o no permitidos relacionados con violencia o seguridad.',
          detectedTerm: dangerous,
          type: 'dangerous',
        };
      }
    } else {
      if (words.includes(dangerous)) {
        return {
          isValid: false,
          error:
            'El contenido contiene términos peligrosos o no permitidos relacionados con violencia o seguridad.',
          detectedTerm: dangerous,
          type: 'dangerous',
        };
      }
    }
  }

  // 2. Verificar términos obscenos o vulgares
  for (const obscene of OBSCENE_TERMS) {
    if (obscene.includes(' ')) {
      if (normalized.includes(obscene)) {
        return {
          isValid: false,
          error:
            'El contenido contiene lenguaje obsceno, vulgar o inapropiado. Por favor utiliza un lenguaje profesional y respetuoso.',
          detectedTerm: obscene,
          type: 'obscene',
        };
      }
    } else {
      if (words.includes(obscene)) {
        return {
          isValid: false,
          error:
            'El contenido contiene lenguaje obsceno, vulgar o inapropiado. Por favor utiliza un lenguaje profesional y respetuoso.',
          detectedTerm: obscene,
          type: 'obscene',
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Valida los campos de un proyecto (título y descripción/objetivo) en el backend.
 */
export function validateProjectContent(
  titulo: string,
  objetivo?: string | null,
): ContentValidationResult {
  const titleValidation = validateContent(titulo);
  if (!titleValidation.isValid) {
    return titleValidation;
  }

  if (objetivo) {
    const objectiveValidation = validateContent(objetivo);
    if (!objectiveValidation.isValid) {
      return objectiveValidation;
    }
  }

  return { isValid: true };
}
