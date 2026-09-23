// scripts/test_moderation_i18n.mjs
import fs from 'fs';
import path from 'path';

// Cargar los JSONs directamente
const esDict = JSON.parse(
  fs.readFileSync(path.resolve('src/lib/moderation/locales/es.json'), 'utf8')
);
const enDict = JSON.parse(
  fs.readFileSync(path.resolve('src/lib/moderation/locales/en.json'), 'utf8')
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

const DANGEROUS_WORDS = prepareWordSet([
  ...esDict.dangerous.words,
  ...enDict.dangerous.words,
]);
const DANGEROUS_PHRASES = preparePhrases([
  ...esDict.dangerous.phrases,
  ...enDict.dangerous.phrases,
]);
const OBSCENE_WORDS = prepareWordSet([
  ...esDict.obscene.words,
  ...enDict.obscene.words,
]);
const OBSCENE_PHRASES = preparePhrases([
  ...esDict.obscene.phrases,
  ...enDict.obscene.phrases,
]);

function validateContent(text, locale = 'es') {
  if (!text || text.trim() === '') return { isValid: true };
  const messages = DICTIONARIES[locale]?.messages || DICTIONARIES.es.messages;
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter(Boolean);

  for (const word of words) {
    if (DANGEROUS_WORDS.has(word)) {
      return { isValid: false, error: messages.dangerous, detectedTerm: word, type: 'dangerous' };
    }
  }
  for (const phrase of DANGEROUS_PHRASES) {
    if (normalized.includes(phrase)) {
      return { isValid: false, error: messages.dangerous, detectedTerm: phrase, type: 'dangerous' };
    }
  }
  for (const word of words) {
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

const testCases = [
  { text: 'Proyecto de investigación sobre redes neuronales', locale: 'es', expectValid: true, desc: 'Texto legítimo' },
  { text: 'Este proyecto es una mierda total', locale: 'es', expectValid: false, expectType: 'obscene', desc: 'Insulto español' },
  { text: 'Como fabricar bomba casera en el laboratorio', locale: 'es', expectValid: false, expectType: 'dangerous', desc: 'Peligroso español frase' },
  { text: 'This is a fucking disaster', locale: 'en', expectValid: false, expectType: 'obscene', desc: 'Insulto inglés con locale en' },
  { text: 'How to commit suicide with cyanide', locale: 'en', expectValid: false, expectType: 'dangerous', desc: 'Peligroso inglés con locale en' },
  { text: 'Un proyecto sobre cianuro y veneno', locale: 'es', expectValid: false, expectType: 'dangerous', desc: 'Palabra peligrosa español' },
  { text: 'Que p3nd3jo y estúpido eres', locale: 'es', expectValid: false, expectType: 'obscene', desc: 'Leet y tildes' },
  { text: 'Mi tarea contiene la palabra bitch', locale: 'es', expectValid: false, expectType: 'obscene', desc: 'Cruce multilingüe (insulto en inglés con locale es)' }
];

console.log('=== Iniciando pruebas de moderación i18n ===\n');
let passed = 0;
for (const tc of testCases) {
  const res = validateContent(tc.text, tc.locale);
  const success = res.isValid === tc.expectValid && (!tc.expectType || res.type === tc.expectType);
  if (success) {
    console.log(`✓ [PASS] ${tc.desc}: "${tc.text}" -> detected: "${res.detectedTerm || 'N/A'}"`);
    passed++;
  } else {
    console.error(`✗ [FAIL] ${tc.desc}:`, res);
  }
}

console.log(`\nResultado: ${passed}/${testCases.length} pruebas pasadas exitosamente.`);
if (passed !== testCases.length) process.exit(1);
