/**
 * Prueba de validación de moderación en el backend
 * Ejecución: node scripts/test_backend_moderation.mjs
 */
import fs from 'fs';
import path from 'path';

const esDict = JSON.parse(
  fs.readFileSync(path.resolve('src/lib/moderation/locales/es.json'), 'utf8'),
);
const enDict = JSON.parse(
  fs.readFileSync(path.resolve('src/lib/moderation/locales/en.json'), 'utf8'),
);

function normalizeText(text) {
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

const DICTIONARIES = { es: esDict, en: enDict };

function prepareWordSet(words) {
  const set = new Set();
  for (const word of words) {
    const norm = normalizeText(word);
    if (norm) set.add(norm);
  }
  return set;
}

function preparePhrases(phrases) {
  return phrases.map((phrase) => normalizeText(phrase)).filter(Boolean);
}

const DANGEROUS_WORDS = prepareWordSet([...esDict.dangerous.words, ...enDict.dangerous.words]);
const DANGEROUS_PHRASES = preparePhrases([
  ...esDict.dangerous.phrases,
  ...enDict.dangerous.phrases,
]);
const OBSCENE_WORDS = prepareWordSet([...esDict.obscene.words, ...enDict.obscene.words]);
const OBSCENE_PHRASES = preparePhrases([...esDict.obscene.phrases, ...enDict.obscene.phrases]);

function validateContent(text, locale = 'es') {
  if (!text || text.trim() === '') return { isValid: true };
  const messages = DICTIONARIES[locale]?.messages || DICTIONARIES.es.messages;
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter(Boolean);

  const rawAlphabeticalWords = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const candidateWords = new Set([...words, ...rawAlphabeticalWords]);

  for (const word of candidateWords) {
    if (DANGEROUS_WORDS.has(word)) {
      return { isValid: false, error: messages.dangerous, detectedTerm: word, type: 'dangerous' };
    }
  }
  for (const phrase of DANGEROUS_PHRASES) {
    if (normalized.includes(phrase)) {
      return { isValid: false, error: messages.dangerous, detectedTerm: phrase, type: 'dangerous' };
    }
  }
  for (const word of candidateWords) {
    if (OBSCENE_WORDS.has(word)) {
      return { isValid: false, error: messages.obscene, detectedTerm: word, type: 'obscene' };
    }
  }
  for (const phrase of OBSCENE_PHRASES) {
    if (normalized.includes(phrase)) {
      return { isValid: false, error: messages.obscene, detectedTerm: phrase, type: 'obscene' };
    }
  }
  return { isValid: true };
}

console.log('\n--- Probando Restricciones de Palabras en Campos Clave ---');

const fieldsToTest = [
  // Nombre de usuario
  { field: 'Nombre de usuario', value: 'carlos_estudiante', expected: true },
  { field: 'Nombre de usuario', value: 'puto_master', expected: false },
  { field: 'Nombre de usuario', value: 'terrorista123', expected: false },
  { field: 'Nombre de usuario', value: 'p3nd3jo_99', expected: false },

  // Nombre y Apellido
  { field: 'Nombre y apellido', value: 'Carlos Mendoza', expected: true },
  { field: 'Nombre y apellido', value: 'Juan Mierda', expected: false },
  { field: 'Nombre y apellido', value: 'Sicario Perez', expected: false },
  { field: 'Nombre y apellido', value: 'María Asesina', expected: false },

  // Descripción de perfil
  {
    field: 'Descripción de perfil',
    value: 'Estudiante de ingeniería enfocado en desarrollo web y algoritmos.',
    expected: true,
  },
  {
    field: 'Descripción de perfil',
    value: 'Me encanta fabricar bomba casera en mi tiempo libre',
    expected: false,
  },
  {
    field: 'Descripción de perfil',
    value: 'Todos los profesores son unos idiotas e imbeciles',
    expected: false,
  },

  // Apartado de Temas (título, notas, descripciones)
  { field: 'Título de Tema', value: 'Arquitectura de Software y Patrones', expected: true },
  { field: 'Título de Tema', value: 'Cómo matar personas efectivamente', expected: false },
  {
    field: 'Descripción de Tema',
    value: 'Estudio de redes convolucionales y visión artificial',
    expected: true,
  },
  { field: 'Descripción de Tema', value: 'Este tema es una puta mierda', expected: false },
  { field: 'Nota de Tema', value: 'Conceptos clave de API REST y métodos HTTP', expected: true },
  {
    field: 'Nota de Tema',
    value: 'Cuidado con el cianuro y veneno para envenenar',
    expected: false,
  },
];

let failed = 0;
for (const test of fieldsToTest) {
  const result = validateContent(test.value);
  if (result.isValid === test.expected) {
    console.log(
      `✔ PASS [${test.field}]: "${test.value}" -> ${result.isValid ? 'Permitido' : 'Bloqueado (' + result.detectedTerm + ')'}`,
    );
  } else {
    console.error(
      `✖ FAIL [${test.field}]: "${test.value}" -> esperaba ${test.expected ? 'Permitido' : 'Bloqueado'}, obtuvo ${result.isValid ? 'Permitido' : 'Bloqueado'}`,
    );
    failed++;
  }
}

if (failed > 0) {
  console.error(`\nFallaron ${failed} pruebas.`);
  process.exit(1);
} else {
  console.log(
    `\nTodas las pruebas de moderación pasaron exitosamente (${fieldsToTest.length}/${fieldsToTest.length}).\n`,
  );
}
