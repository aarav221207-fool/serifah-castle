export type ProviderErrorCode =
  | 'MODEL_NOT_FOUND'
  | 'INVALID_API_KEY'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'PROVIDER_UNAVAILABLE'
  | 'MALFORMED_REQUEST'
  | 'INVALID_HEADER_VALUE'
  | 'CONFIGURATION_ERROR';

export interface ProviderErrorDetails {
  code: ProviderErrorCode;
  message: string;
  provider: string;
  stage: 'REQUEST_CONSTRUCTION' | 'PREFLIGHT' | 'AUTHENTICATION' | 'DISCOVERY' | 'RUNTIME' | 'RESPONSE_PARSING';
  retryable: boolean;
  httpStatus?: number;
  character?: string;
  codePoint?: number;
  characterIndex?: number;
}

export class ProviderError extends Error {
  public details: ProviderErrorDetails;

  constructor(details: ProviderErrorDetails) {
    super(details.message);
    this.name = 'ProviderError';
    this.details = details;
    Object.setPrototypeOf(this, ProviderError.prototype);
  }

  toJSON(): ProviderErrorDetails {
    return this.details;
  }
}

/**
 * Classifies any raw runtime error into a safe, structured ProviderError
 * WITHOUT exposing secrets or credentials in logs/messages.
 */
export function classifyProviderError(
  err: any,
  provider: string,
  stage: ProviderErrorDetails['stage'] = 'RUNTIME'
): ProviderError {
  if (err instanceof ProviderError) {
    return err;
  }

  const rawMsg = String(err?.message || err || '');
  const httpStatus = err?.status || err?.statusCode;

  // 1. ByteString / Illegal Unicode Error (e.g. U+2022 / code point 8226)
  const byteStringMatch = rawMsg.match(/character at index (\d+) has a value of (\d+)/i);
  if (byteStringMatch || rawMsg.includes('ByteString') || rawMsg.includes('8226')) {
    const charIndex = byteStringMatch ? parseInt(byteStringMatch[1], 10) : 0;
    const codePoint = byteStringMatch ? parseInt(byteStringMatch[2], 10) : 8226;
    const charHex = 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0');
    return new ProviderError({
      code: 'INVALID_HEADER_VALUE',
      provider,
      stage: 'REQUEST_CONSTRUCTION',
      retryable: false,
      character: charHex,
      codePoint,
      characterIndex: charIndex,
      message: `Provider: ${provider}, Stage: REQUEST_CONSTRUCTION, Error: INVALID_HEADER_VALUE, Character: ${charHex}, Code point: ${codePoint}, Retryable: false`
    });
  }

  // 2. Authentication / Invalid API Key
  if (
    httpStatus === 401 ||
    rawMsg.includes('API_KEY_INVALID') ||
    rawMsg.includes('API key not valid') ||
    rawMsg.includes('Unauthorized') ||
    rawMsg.includes('invalid_api_key') ||
    rawMsg.includes('unauthenticated')
  ) {
    return new ProviderError({
      code: 'AUTHENTICATION_FAILED',
      provider,
      stage: 'AUTHENTICATION',
      retryable: false,
      httpStatus: 401,
      message: `Authentication failed for ${provider}: Invalid or rejected API credential.`
    });
  }

  // 3. Model Not Found (404)
  if (
    httpStatus === 404 ||
    rawMsg.includes('MODEL_NOT_FOUND') ||
    rawMsg.includes('not found') ||
    rawMsg.includes('models/')
  ) {
    return new ProviderError({
      code: 'MODEL_NOT_FOUND',
      provider,
      stage,
      retryable: false,
      httpStatus: 404,
      message: `Model not found or unsupported on provider ${provider}.`
    });
  }

  // 4. Rate Limiting vs Quota Exhaustion (429 / RESOURCE_EXHAUSTED)
  if (
    httpStatus === 429 ||
    rawMsg.includes('RESOURCE_EXHAUSTED') ||
    rawMsg.includes('429') ||
    rawMsg.includes('quota') ||
    rawMsg.includes('rate limit')
  ) {
    const isQuota =
      rawMsg.includes('quota') ||
      rawMsg.includes('RESOURCE_EXHAUSTED') ||
      rawMsg.includes('billing') ||
      rawMsg.includes('credit') ||
      rawMsg.includes('limit exceeded for metric');

    if (isQuota) {
      return new ProviderError({
        code: 'QUOTA_EXCEEDED',
        provider,
        stage,
        retryable: false,
        httpStatus: 429,
        message: `${provider} quota exceeded or resource exhausted.`
      });
    }

    return new ProviderError({
      code: 'RATE_LIMITED',
      provider,
      stage,
      retryable: true,
      httpStatus: 429,
      message: `${provider} request rate limit reached. Backing off before retry.`
    });
  }

  // 5. Network / Timeout
  if (
    rawMsg.includes('fetch failed') ||
    rawMsg.includes('ECONNREFUSED') ||
    rawMsg.includes('ETIMEDOUT') ||
    rawMsg.includes('ENOTFOUND') ||
    rawMsg.includes('network') ||
    rawMsg.includes('timed out')
  ) {
    return new ProviderError({
      code: 'NETWORK_ERROR',
      provider,
      stage,
      retryable: true,
      message: `Network connectivity failure communicating with ${provider}.`
    });
  }

  // 6. Provider Unavailable (502, 503, 504)
  if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504 || rawMsg.includes('UNAVAILABLE')) {
    return new ProviderError({
      code: 'PROVIDER_UNAVAILABLE',
      provider,
      stage,
      retryable: true,
      httpStatus,
      message: `${provider} service is temporarily unavailable.`
    });
  }

  // 7. Malformed / Invalid Request
  if (httpStatus === 400 || rawMsg.includes('INVALID_ARGUMENT') || rawMsg.includes('bad request')) {
    return new ProviderError({
      code: 'INVALID_REQUEST',
      provider,
      stage,
      retryable: false,
      httpStatus: 400,
      message: `Malformed request payload sent to ${provider}.`
    });
  }

  // Default: configuration or runtime error
  return new ProviderError({
    code: 'CONFIGURATION_ERROR',
    provider,
    stage,
    retryable: false,
    message: `${provider} runtime error: ${rawMsg.slice(0, 200)}`
  });
}
