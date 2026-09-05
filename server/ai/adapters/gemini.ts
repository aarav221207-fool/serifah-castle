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

export class GeminiAdapter implements ProviderAdapter {
  providerId: string;
  type: ProviderType = 'gemini';
  private apiKey: string = '';
  private ai: GoogleGenAI | null = null;

  constructor(providerId: string, config?: ProviderConfig) {
    this.providerId = providerId;
    if (config) {
      this.connect(config);
    }
  }

  async connect(config: ProviderConfig): Promise<boolean> {
    this.apiKey = config.apiKey.trim();
    if (!this.apiKey) return false;
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    return true;
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    if (!this.apiKey) {
      return { success: false, latencyMs: 0, message: 'API key is missing' };
    }
    const start = Date.now();
    try {
      const ai = this.ai || new GoogleGenAI({ apiKey: this.apiKey });
      // Minimal light probe with 10s timeout
      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'ping',
          config: { maxOutputTokens: 5 }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connection timed out after 10s')), 10000))
      ]);
      const latencyMs = Date.now() - start;
      if (response && response.text) {
        return { success: true, latencyMs, message: `Connected to Google Gemini (${latencyMs}ms)` };
      }
      return { success: true, latencyMs, message: `Connected to Google Gemini (${latencyMs}ms)` };
    } catch (err: any) {
      // If gemini-2.5-flash failed, try a models.list call
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
        const latencyMs = Date.now() - start;
        if (listRes.ok) {
          return { success: true, latencyMs, message: `Connected to Google Gemini (${latencyMs}ms)` };
        }
        const errJson = await listRes.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${listRes.status}`;
        return { success: false, latencyMs, message: `Gemini Connection Failed: ${msg}` };
      } catch (listErr: any) {
        const latencyMs = Date.now() - start;
        return { success: false, latencyMs, message: `Gemini Connection Error: ${err.message}` };
      }
    }
  }

  async listModels(): Promise<DiscoveredModel[]> {
    if (!this.apiKey) return [];
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const rawModels: any[] = data.models || [];
      const discovered: DiscoveredModel[] = [];

      for (const m of rawModels) {
        const id = m.name?.replace('models/', '') || '';
        // Only include generateContent capable Gemini models
        const methods: string[] = m.supportedGenerationMethods || [];
        if (!methods.includes('generateContent') || !id.toLowerCase().includes('gemini')) {
          continue;
        }

        discovered.push({
          modelIdentifier: id,
          displayName: m.displayName || id,
          contextWindow: m.inputTokenLimit || 1048576,
          supportsTools: true,
          supportsVision: true,
          supportsStreaming: true,
          description: m.description || ''
        });
      }

      if (discovered.length > 0) {
        return discovered;
      }
    } catch (e) {
      console.warn('Gemini models listing failed, falling back to known models:', e);
    }

    // Default known verified Gemini models
    return [
      {
        modelIdentifier: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        description: 'Ultra-fast multimodal model for general tasks and coding'
      },
      {
        modelIdentifier: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        description: 'Advanced reasoning, deep coding, and complex analysis'
      },
      {
        modelIdentifier: 'gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        contextWindow: 1048576,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        description: 'High-speed 2.0 generation model'
      }
    ];
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
    const ai = this.ai || new GoogleGenAI({ apiKey: this.apiKey });
    const start = Date.now();

    // Prepare contents
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

    const response = await ai.models.generateContent({
      model: request.modelIdentifier || 'gemini-2.5-flash',
      contents,
      config
    });

    const latencyMs = Date.now() - start;
    const text = response.text || '';
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
  }

  async streamGenerate(request: GenerateRequest, onChunk: (text: string) => void): Promise<GenerateResponse> {
    const ai = this.ai || new GoogleGenAI({ apiKey: this.apiKey });
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

    const stream = await ai.models.generateContentStream({
      model: request.modelIdentifier || 'gemini-2.5-flash',
      contents,
      config
    });

    let fullText = '';
    for await (const chunk of stream) {
      const piece = chunk.text || '';
      fullText += piece;
      onChunk(piece);
    }

    const latencyMs = Date.now() - start;
    return {
      text: fullText,
      latencyMs,
      modelIdentifier: request.modelIdentifier,
      providerId: this.providerId
    };
  }

  async getQuota(): Promise<ProviderQuota | null> {
    return {
      status: 'available'
    };
  }
}
