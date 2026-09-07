import { GoogleGenAI } from '@google/genai';
import { 
  ProviderAdapter, 
  ProviderConfig, 
  ProviderType, 
  DiscoveredModel, 
  ModelMetadata, 
  GenerateRequest, 
  GenerateResponse, 
  ProviderQuota 
} from '../types';
import { validateCredential } from '../credentialUtils';
import { classifyProviderError, ProviderError } from '../errors';

export class GeminiAdapter implements ProviderAdapter {
  providerId: string;
  type: ProviderType = 'gemini';
  private apiKey: string = '';
  private ai: GoogleGenAI | null = null;
  private connectionError: ProviderError | null = null;

  constructor(providerId: string, config?: ProviderConfig) {
    this.providerId = providerId;
    if (config) {
      this.connect(config);
    }
  }

  async connect(config: ProviderConfig): Promise<boolean> {
    const validation = validateCredential(config.apiKey, 'Gemini');
    if (!validation.valid) {
      this.apiKey = '';
      this.ai = null;
      this.connectionError = validation.error || null;
      console.warn(`[GeminiAdapter] Credential validation failed: ${validation.error?.message}`);
      return false;
    }

    this.apiKey = validation.normalized;
    this.connectionError = null;

    try {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
      return true;
    } catch (err: any) {
      this.connectionError = classifyProviderError(err, 'Gemini', 'REQUEST_CONSTRUCTION');
      this.ai = null;
      return false;
    }
  }

  private getClient(): GoogleGenAI {
    if (this.connectionError) {
      throw this.connectionError;
    }
    if (!this.ai || !this.apiKey) {
      throw new ProviderError({
        code: 'INVALID_API_KEY',
        provider: 'Gemini',
        stage: 'REQUEST_CONSTRUCTION',
        retryable: false,
        message: 'Gemini provider is not connected with a valid API key.'
      });
    }
    return this.ai;
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string; error?: ProviderError }> {
    const start = Date.now();

    if (this.connectionError) {
      return {
        success: false,
        latencyMs: 0,
        message: this.connectionError.message,
        error: this.connectionError
      };
    }

    let client: GoogleGenAI;
    try {
      client = this.getClient();
    } catch (err: any) {
      const pErr = classifyProviderError(err, 'Gemini', 'AUTHENTICATION');
      return { success: false, latencyMs: 0, message: pErr.message, error: pErr };
    }

    try {
      // Minimal test probe to verify credential and model availability
      const response = await Promise.race([
        client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'Reply with exactly: PROVIDER_OK',
          config: { 
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 100 
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timed out after 10s')), 10000)
        )
      ]);

      const latencyMs = Date.now() - start;
      const text = response?.text?.trim() || 
        response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').filter(Boolean).join('') || '';

      if (text.includes('PROVIDER_OK') || text.length > 0) {
        return {
          success: true,
          latencyMs,
          message: `Connected to Google Gemini (${latencyMs}ms)`
        };
      }

      return {
        success: true,
        latencyMs,
        message: `Connected to Google Gemini (${latencyMs}ms)`
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const pErr = classifyProviderError(err, 'Gemini', 'AUTHENTICATION');
      return {
        success: false,
        latencyMs,
        message: pErr.message,
        error: pErr
      };
    }
  }

  async listModels(): Promise<DiscoveredModel[]> {
    let client: GoogleGenAI;
    try {
      client = this.getClient();
    } catch {
      return [];
    }

    try {
      const response = await client.models.list();
      const discovered: DiscoveredModel[] = [];

      for await (const m of response) {
        const id = (m.name || '').replace('models/', '').trim();
        if (!id || !id.toLowerCase().includes('gemini')) continue;

        // Verify that model supports generateContent
        const actions: string[] = (m as any).supportedActions || (m as any).supportedGenerationMethods || [];
        const canGenerate = actions.length === 0 || actions.includes('generateContent');
        if (!canGenerate) continue;

        // Skip non-general models (live speech, robotics, tts, vision-only embeddings)
        if (
          id.includes('tts') ||
          id.includes('transcribe') ||
          id.includes('embedding') ||
          id.includes('robotics') ||
          id.includes('native-audio') ||
          id.includes('live-translate')
        ) {
          continue;
        }

        const inputLimit = (m as any).inputTokenLimit || 1048576;

        discovered.push({
          modelIdentifier: id,
          displayName: m.displayName || id,
          contextWindow: inputLimit,
          supportsTools: true,
          supportsVision: true,
          supportsStreaming: true,
          description: m.description || `Discovered Google Gemini model: ${id}`
        });
      }

      return discovered;
    } catch (err: any) {
      const pErr = classifyProviderError(err, 'Gemini', 'DISCOVERY');
      console.warn(`[GeminiAdapter] Model discovery error:`, pErr.message);
      throw pErr;
    }
  }

  async getModelMetadata(modelId: string): Promise<ModelMetadata | null> {
    return {
      modelIdentifier: modelId,
      displayName: modelId,
      contextWindow: 1048576,
      maxOutputTokens: 8192
    };
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const client = this.getClient();
    const start = Date.now();

    const contents: any[] = [];
    for (const msg of request.messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const config: any = {};
    if (request.systemInstruction) {
      config.systemInstruction = request.systemInstruction;
    }
    if (request.temperature !== undefined) {
      config.temperature = request.temperature;
    }
    if (request.maxTokens !== undefined) {
      config.maxOutputTokens = request.maxTokens;
    }
    if (request.responseFormat === 'json') {
      config.responseMimeType = 'application/json';
    }
    if (request.maxTokens && request.maxTokens < 300) {
      config.thinkingConfig = { thinkingBudget: 0 };
    }

    try {
      const response = await client.models.generateContent({
        model: request.modelIdentifier || 'gemini-2.5-flash',
        contents,
        config
      });

      const latencyMs = Date.now() - start;
      let text = response.text || '';
      if (!text && response.candidates?.[0]?.content?.parts) {
        text = response.candidates[0].content.parts
          .map((p: any) => p.text || '')
          .filter(Boolean)
          .join('');
      }
      const usage = (response as any).usageMetadata;

      return {
        text,
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        totalTokens: usage?.totalTokenCount,
        latencyMs,
        finishReason: response.candidates?.[0]?.finishReason || 'STOP',
        modelIdentifier: request.modelIdentifier,
        providerId: this.providerId
      };
    } catch (err: any) {
      throw classifyProviderError(err, 'Gemini', 'RUNTIME');
    }
  }

  async streamGenerate(request: GenerateRequest, onChunk: (text: string) => void): Promise<GenerateResponse> {
    const client = this.getClient();
    const start = Date.now();

    const contents: any[] = [];
    for (const msg of request.messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const config: any = {};
    if (request.systemInstruction) {
      config.systemInstruction = request.systemInstruction;
    }
    if (request.temperature !== undefined) {
      config.temperature = request.temperature;
    }
    if (request.maxTokens !== undefined) {
      config.maxOutputTokens = request.maxTokens;
    }
    if (request.responseFormat === 'json') {
      config.responseMimeType = 'application/json';
    }
    if (request.maxTokens && request.maxTokens < 300) {
      config.thinkingConfig = { thinkingBudget: 0 };
    }

    try {
      const stream = await client.models.generateContentStream({
        model: request.modelIdentifier || 'gemini-2.5-flash',
        contents,
        config
      });

      let fullText = '';
      for await (const chunk of stream) {
        const piece = chunk.text || 
          chunk.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').filter(Boolean).join('') || '';
        fullText += piece;
        if (piece) onChunk(piece);
      }

      const latencyMs = Date.now() - start;
      return {
        text: fullText,
        latencyMs,
        modelIdentifier: request.modelIdentifier,
        providerId: this.providerId
      };
    } catch (err: any) {
      throw classifyProviderError(err, 'Gemini', 'RUNTIME');
    }
  }

  async getQuota(): Promise<ProviderQuota | null> {
    return {
      status: 'available'
    };
  }
}
