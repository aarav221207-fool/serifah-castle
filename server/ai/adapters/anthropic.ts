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

export class AnthropicAdapter implements ProviderAdapter {
  providerId: string;
  type: ProviderType = 'anthropic';
  private apiKey: string = '';
  private baseUrl: string = 'https://api.anthropic.com/v1';

  constructor(providerId: string, config?: ProviderConfig) {
    this.providerId = providerId;
    if (config) {
      this.connect(config);
    }
  }

  async connect(config: ProviderConfig): Promise<boolean> {
    this.apiKey = config.apiKey.trim();
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.trim().replace(/\/+$/, '');
    }
    return Boolean(this.apiKey);
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    if (!this.apiKey) {
      return { success: false, latencyMs: 0, message: 'API key is missing' };
    }
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;

      if (res.ok) {
        return { success: true, latencyMs, message: `Connected to Anthropic (${latencyMs}ms)` };
      }

      if (res.status === 401) {
        return { success: false, latencyMs, message: 'Authentication Failed: Invalid Anthropic API key' };
      }

      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error?.message || `HTTP ${res.status}`;
      return { success: false, latencyMs, message: `Anthropic Connection Failed: ${msg}` };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return { success: false, latencyMs, message: `Anthropic Network Error: ${err.message}` };
    }
  }

  async listModels(): Promise<DiscoveredModel[]> {
    if (!this.apiKey) return [];
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const rawList: any[] = data.data || [];
        return rawList.map(m => ({
          modelIdentifier: m.id,
          displayName: m.display_name || m.id,
          contextWindow: 200000,
          supportsTools: true,
          supportsVision: true,
          supportsStreaming: true,
          description: m.description || ''
        }));
      }
    } catch (e) {
      console.warn('Anthropic models list error, fallback to standard models:', e);
    }

    return [
      {
        modelIdentifier: 'claude-3-7-sonnet-20250219',
        displayName: 'Claude 3.7 Sonnet',
        contextWindow: 200000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        description: 'Advanced hybrid reasoning and high capability coding'
      },
      {
        modelIdentifier: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        description: 'Industry-leading coding and reasoning model'
      },
      {
        modelIdentifier: 'claude-3-5-haiku-20241022',
        displayName: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        supportsTools: true,
        supportsVision: true,
        supportsStreaming: true,
        description: 'Ultra-fast low latency agentic model'
      }
    ];
  }

  async getModelMetadata(modelId: string): Promise<ModelMetadata | null> {
    return {
      modelIdentifier: modelId,
      displayName: modelId,
      contextWindow: 200000
    };
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const start = Date.now();
    const messages = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const payload: any = {
      model: request.modelIdentifier || 'claude-3-5-haiku-20241022',
      max_tokens: request.maxTokens || 4096,
      messages
    };

    if (request.systemInstruction) {
      payload.system = request.systemInstruction;
    }
    if (request.temperature !== undefined) {
      payload.temperature = request.temperature;
    }

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error?.message || `HTTP ${res.status}`;
      throw new Error(`[Anthropic] Error (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const usage = data.usage;

    return {
      text,
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens,
      totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
      latencyMs,
      finishReason: data.stop_reason || 'end_turn',
      modelIdentifier: request.modelIdentifier,
      providerId: this.providerId
    };
  }

  async streamGenerate(request: GenerateRequest, onChunk: (text: string) => void): Promise<GenerateResponse> {
    // Standard generate fallback or stream implementation
    const response = await this.generate(request);
    onChunk(response.text);
    return response;
  }

  async getQuota(): Promise<ProviderQuota | null> {
    return { status: 'unknown' };
  }
}
