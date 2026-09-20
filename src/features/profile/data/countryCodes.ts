export interface CountryCode {
  name: string;
  code: string;
  iso: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  // Países prioritarios (Hispanoamérica y principales)
  { name: 'Venezuela', code: '+58', iso: 'VE', flag: '🇻🇪' },
  { name: 'Colombia', code: '+57', iso: 'CO', flag: '🇨🇴' },
  { name: 'España', code: '+34', iso: 'ES', flag: '🇪🇸' },
  { name: 'México', code: '+52', iso: 'MX', flag: '🇲🇽' },
  { name: 'Argentina', code: '+54', iso: 'AR', flag: '🇦🇷' },
  { name: 'Chile', code: '+56', iso: 'CL', flag: '🇨🇱' },
  { name: 'Perú', code: '+51', iso: 'PE', flag: '🇵🇪' },
  { name: 'Estados Unidos', code: '+1', iso: 'US', flag: '🇺🇸' },
  { name: 'Canadá', code: '+1', iso: 'CA', flag: '🇨🇦' },
  { name: 'Ecuador', code: '+593', iso: 'EC', flag: '🇪🇨' },
  { name: 'Panamá', code: '+507', iso: 'PA', flag: '🇵🇦' },
  { name: 'Costa Rica', code: '+506', iso: 'CR', flag: '🇨🇷' },
  { name: 'República Dominicana', code: '+1', iso: 'DO', flag: '🇩🇴' },
  { name: 'Uruguay', code: '+598', iso: 'UY', flag: '🇺🇾' },
  { name: 'Bolivia', code: '+591', iso: 'BO', flag: '🇧🇴' },
  { name: 'Paraguay', code: '+595', iso: 'PY', flag: '🇵🇾' },
  { name: 'Guatemala', code: '+502', iso: 'GT', flag: '🇬🇹' },
  { name: 'Honduras', code: '+504', iso: 'HN', flag: '🇭🇳' },
  { name: 'El Salvador', code: '+503', iso: 'SV', flag: '🇸🇻' },
  { name: 'Nicaragua', code: '+505', iso: 'NI', flag: '🇳🇮' },
  { name: 'Cuba', code: '+53', iso: 'CU', flag: '🇨🇺' },
  { name: 'Puerto Rico', code: '+1', iso: 'PR', flag: '🇵🇷' },
  { name: 'Brasil', code: '+55', iso: 'BR', flag: '🇧🇷' },
  // Europa y resto del mundo
  { name: 'Portugal', code: '+351', iso: 'PT', flag: '🇵🇹' },
  { name: 'Italia', code: '+39', iso: 'IT', flag: '🇮🇹' },
  { name: 'Francia', code: '+33', iso: 'FR', flag: '🇫🇷' },
  { name: 'Alemania', code: '+49', iso: 'DE', flag: '🇩🇪' },
  { name: 'Reino Unido', code: '+44', iso: 'GB', flag: '🇬🇧' },
  { name: 'Países Bajos', code: '+31', iso: 'NL', flag: '🇳🇱' },
  { name: 'Suiza', code: '+41', iso: 'CH', flag: '🇨🇭' },
  { name: 'Bélgica', code: '+32', iso: 'BE', flag: '🇧🇪' },
  { name: 'Irlanda', code: '+353', iso: 'IE', flag: '🇮🇪' },
  { name: 'Suecia', code: '+46', iso: 'SE', flag: '🇸🇪' },
  { name: 'Noruega', code: '+47', iso: 'NO', flag: '🇳🇴' },
  { name: 'Polonia', code: '+48', iso: 'PL', flag: '🇵🇱' },
  { name: 'Australia', code: '+61', iso: 'AU', flag: '🇦🇺' },
  { name: 'Nueva Zelanda', code: '+64', iso: 'NZ', flag: '🇳🇿' },
  { name: 'Japón', code: '+81', iso: 'JP', flag: '🇯🇵' },
  { name: 'China', code: '+86', iso: 'CN', flag: '🇨🇳' },
  { name: 'Corea del Sur', code: '+82', iso: 'KR', flag: '🇰🇷' },
  { name: 'India', code: '+91', iso: 'IN', flag: '🇮🇳' },
];

export const DEFAULT_COUNTRY_CODE = '+58';

export const VALID_PREFIXES = new Set(COUNTRY_CODES.map((c) => c.code));
