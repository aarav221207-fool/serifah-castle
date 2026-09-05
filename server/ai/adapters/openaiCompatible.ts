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

export class OpenAICompatibleAdapter implements ProviderAdapter {
  providerId: string;
  type: ProviderType;
  private apiKey: string = '';
  private baseUrl: string = '';
  private customHeaders: Record<string, string> = {};

  constructor(providerId: string, type: ProviderType, config?: ProviderConfig) {
    this.providerId = providerId;
    this.type = type;
    if (config) {
      this.connect(config);
    } else {
      this.baseUrl = this.getDefaultBaseUrl(type);
    }
  }

  private getDefaultBaseUrl(type: ProviderType): string {
    switch (type) {
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      case 'groq':
        return 'https://api.groq.com/openai/v1';
      case 'nvidia':
        return 'https://integrate.api.nvidia.com/v1';
      case 'openai':
        return 'https://api.openai.com/v1';
      default:
        return 'https://api.openai.com/v1';
    }
  }

  async connect(config: ProviderConfig): Promise<boolean> {
    this.apiKey = config.apiKey.trim();
    this.baseUrl = (config.baseUrl?.trim() || this.getDefaultBaseUrl(this.type)).replace(/\/+$/, '');
    this.customHeaders = config.customHeaders || {};
    return Boolean(this.apiKey);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...this.customHeaders
    };
    if (this.type === 'openrouter') {
      headers['HTTP-Referer'] = 'https://ai.studio/build';
      headers['X-Title'] = 'AGENT_OS Workstation';
    }
    return headers;
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    if (!this.apiKey) {
      return { success: false, latencyMs: 0, message: 'API key is missing' };
    }
    const start = Date.now();
    try {
      // First try listing models endpoint with 10s timeout
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
        return { success: true, latencyMs, message: `Connected to ${this.type.toUpperCase()} (${latencyMs}ms)` };
      }

      if (res.status === 401) {
        return { success: false, latencyMs, message: `Authentication Failed: Invalid API key (HTTP 401)` };
      }

      if (res.status === 429) {
        return { success: false, latencyMs, message: `Rate limit or quota exceeded (HTTP 429)` };
      }

      const errText = await res.text().catch(() => '');
      return { success: false, latencyMs, message: `Connection Failed: HTTP ${res.status} ${errText.slice(0, 100)}` };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      return { 
        success: false, 
        latencyMs, 
        message: isTimeout ? `Connection timed out after 10s` : `Network Error: ${err.message}` 
      };
    }
  }

  async listModels(): Promise<DiscoveredModel[]> {
    if (!this.apiKey) return [];
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const rawList: any[] = Array.isArray(data) ? data : data.data || data.models || [];
      const discovered: DiscoveredModel[] = [];

      for (const m of rawList) {
        const id = m.id || m.name;
        if (!id) continue;

        // Context length detection
        const contextWindow = m.context_length || m.context_window || 0;

        discovered.push({
          modelIdentifier: id,
          displayName: m.name || id,
          contextWindow,
          supportsTools: Boolean(m.tools || m.supported_features?.tools || true),
          supportsVision: Boolean(m.vision || m.supported_features?.vision),
          supportsStreaming: true,
          description: m.description || ''
        });
      }

      return discovered;
    } catch (e) {
      console.warn(`Failed to list models from ${this.baseUrl}:`, e);
      return [];
    }
  }

  async getModelMetadata(modelId: string): Promise<ModelMetadata | null> {
    return {
      modelIdentifier: modelId,
      displayName: modelId,
      contextWindow: 0
    };
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const start = Date.now();
    const messages: any[] = [];

    if (request.systemInstruction) {
      messages.push({ role: 'system', content: request.systemInstruction });
    }
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const payload: any = {
      model: request.modelIdentifier,
      messages,
      temperature: request.temperature ?? 0.7
    };
    if (request.maxTokens) {
      payload.max_tokens = request.maxTokens;
    }
    if (request.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error?.message || errJson.message || `HTTP ${res.status}`;
      throw new Error(`[${this.type.toUpperCase()}] API Error (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content || '';
    const usage = data.usage;

    return {
      text,
      inputTokens: usage?.prompt_tokens,
      outputTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
      latencyMs,
      finishReason: choice?.finish_reason || 'stop',
      modelIdentifier: request.modelIdentifier,
      providerId: this.providerId
    };
  }

  async streamGenerate(request: GenerateRequest, onChunk: (text: string) => void): Promise<GenerateResponse> {
    const start = Date.now();
    const messages: any[] = [];

    if (request.systemInstruction) {
      messages.push({ role: 'system', content: request.systemInstruction });
    }
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const payload: any = {
      model: request.modelIdentifier,
      messages,
      temperature: request.temperature ?? 0.7,
      stream: true
    };
    if (request.maxTokens) {
      payload.max_tokens = request.maxTokens;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`[${this.type.toUpperCase()}] Streaming Error (${res.status}): ${errText.slice(0, 150)}`);
    }

    let fullText = '';

    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                onChunk(delta);
              }
            } catch {
              // Ignore partial JSON lines
            }
          }
        }
      }
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
    if (this.type === 'openrouter' && this.apiKey) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: this.getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          const info = data.data;
          const limit = info.limit ?? undefined;
          const usage = info.usage ?? 0;
          let remainingPercent: number | undefined;
          if (limit && limit > 0) {
            remainingPercent = Math.max(0, Math.round(((limit - usage) / limit) * 100));
          }
          return {
            remainingPercent,
            limitMonthlyUsd: limit,
            usedMonthlyUsd: usage,
            status: remainingPercent !== undefined && remainingPercent <= 5 ? 'low' : 'available'
          };
        }
      } catch (e) {
        // Quota unknown
      }
    }
    return { status: 'unknown' };
  }
}
