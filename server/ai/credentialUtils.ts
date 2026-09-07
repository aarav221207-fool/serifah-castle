import { ProviderError } from './errors';

export interface CredentialValidationResult {
  valid: boolean;
  normalized: string;
  error?: ProviderError;
}

export interface CredentialDiagnostics {
  length: number;
  firstCodePoint: number | null;
  lastCodePoint: number | null;
  hasIllegalUnicode: boolean;
}

/**
 * Normalizes an API credential by stripping:
 * - markdown formatting / code fences (``` ... ```)
 * - surrounding quotes ('...', "...", `...`)
 * - leading bullet characters (•, ●, ○, ‣, *, -)
 * - zero-width characters (\u200B, \u200C, \u200D, \uFEFF)
 * - leading and trailing whitespace / newlines
 * 
 * Does NOT corrupt valid characters in legitimate keys.
 */
export function normalizeCredential(raw: string | undefined | null): string {
  if (typeof raw !== 'string') return '';

  let str = raw.trim();

  // Strip markdown code fences if pasted: ```...``` or ```bash ... ```
  if (str.startsWith('```')) {
    str = str.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Strip wrapping quotes
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'")) ||
    (str.startsWith('`') && str.endsWith('`'))
  ) {
    str = str.slice(1, -1).trim();
  }

  // Strip leading list / bullet markers: •, ●, ○, ‣, *, -
  // U+2022 = •, U+25CF = ●, U+25CB = ○, U+2023 = ‣
  str = str.replace(/^[\u2022\u25CF\u25CB\u2023\*\-]\s*/, '');

  // Strip zero-width and invisible unicode characters
  str = str.replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, '');

  return str.trim();
}

/**
 * Returns safe diagnostics about the credential WITHOUT logging or revealing secrets.
 */
export function getCredentialDiagnostics(normalized: string): CredentialDiagnostics {
  if (!normalized) {
    return {
      length: 0,
      firstCodePoint: null,
      lastCodePoint: null,
      hasIllegalUnicode: false
    };
  }

  const length = normalized.length;
  const firstCodePoint = normalized.charCodeAt(0);
  const lastCodePoint = normalized.charCodeAt(length - 1);
  let hasIllegalUnicode = false;

  for (let i = 0; i < length; i++) {
    if (normalized.charCodeAt(i) > 127) {
      hasIllegalUnicode = true;
      break;
    }
  }

  return {
    length,
    firstCodePoint,
    lastCodePoint,
    hasIllegalUnicode
  };
}

/**
 * Strictly validates that the credential is valid ASCII (safe for HTTP headers/ByteString).
 * Rejects illegal Unicode characters BEFORE they reach HTTP header construction or SDK.
 */
export function validateCredential(
  rawKey: string | undefined | null,
  provider = 'Gemini'
): CredentialValidationResult {
  const normalized = normalizeCredential(rawKey);

  if (!normalized) {
    return {
      valid: false,
      normalized: '',
      error: new ProviderError({
        code: 'INVALID_API_KEY',
        provider,
        stage: 'REQUEST_CONSTRUCTION',
        retryable: false,
        message: `API credential for ${provider} is missing or empty.`
      })
    };
  }

  // Check if it's a masked credential placeholder (e.g. •••••••• or contains •)
  if (normalized.includes('•') || normalized.includes('\u2022')) {
    const charIndex = normalized.indexOf('•') !== -1 ? normalized.indexOf('•') : normalized.indexOf('\u2022');
    return {
      valid: false,
      normalized: '',
      error: new ProviderError({
        code: 'INVALID_HEADER_VALUE',
        provider,
        stage: 'REQUEST_CONSTRUCTION',
        retryable: false,
        character: 'U+2022',
        codePoint: 8226,
        characterIndex: charIndex,
        message: `Provider: ${provider}, Stage: REQUEST_CONSTRUCTION, Error: INVALID_HEADER_VALUE, Character: U+2022, Code point: 8226, Retryable: false`
      })
    };
  }

  // Check all character code points (must be standard ASCII <= 127)
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (code > 127) {
      const hex = 'U+' + code.toString(16).toUpperCase().padStart(4, '0');
      return {
        valid: false,
        normalized: '',
        error: new ProviderError({
          code: 'INVALID_HEADER_VALUE',
          provider,
          stage: 'REQUEST_CONSTRUCTION',
          retryable: false,
          character: hex,
          codePoint: code,
          characterIndex: i,
          message: `Provider: ${provider}, Stage: REQUEST_CONSTRUCTION, Error: INVALID_HEADER_VALUE, Character: ${hex}, Code point: ${code}, Retryable: false`
        })
      };
    }
  }

  // Check minimum reasonable length for standard API keys
  if (normalized.length < 8) {
    return {
      valid: false,
      normalized: '',
      error: new ProviderError({
        code: 'INVALID_API_KEY',
        provider,
        stage: 'REQUEST_CONSTRUCTION',
        retryable: false,
        message: `API credential for ${provider} is too short to be valid.`
      })
    };
  }

  return {
    valid: true,
    normalized
  };
}
