export type SupportedLocale = 'es' | 'en';

export interface ModerationDictionary {
  messages: {
    dangerous: string;
    obscene: string;
  };
  dangerous: {
    words: string[];
    phrases: string[];
  };
  obscene: {
    words: string[];
    phrases: string[];
  };
}

export interface ContentValidationResult {
  isValid: boolean;
  error?: string;
  detectedTerm?: string;
  type?: 'obscene' | 'dangerous';
}
