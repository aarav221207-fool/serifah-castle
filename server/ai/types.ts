export type ProviderType = 
  | 'gemini' 
  | 'openrouter' 
  | 'nvidia' 
  | 'openai' 
  | 'anthropic' 
  | 'groq' 
  | 'custom';

export type ModelRole = 
  | 'ARCHITECT'
  | 'BUILDER'
  | 'RESEARCHER'
  | 'UI_UX_ANALYST'
  | 'VISION_ANALYST'
  | 'SECURITY_ANALYST'
  | 'TESTER'
  | 'DEBUGGER'
  | 'COUNSEL_POSITIVE'
  | 'COUNSEL_NEGATIVE'
  | 'COUNSEL_PRACTICAL'
  | 'FINAL_JUDGE';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl?: string;
  apiKey: string;
  orgId?: string;
  customHeaders?: Record<string, string>;
  enabled: boolean;
}

export interface DiscoveredModel {
  modelIdentifier: string;
  displayName: string;
  contextWindow: number; // or 0 if unknown
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  description?: string;
}

export interface ModelMetadata {
  modelIdentifier: string;
  displayName: string;
  contextWindow: number;
  inputCostPer1MTokens?: number;
  outputCostPer1MTokens?: number;
  maxOutputTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateRequest {
  modelIdentifier: string;
  systemInstruction?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface GenerateResponse {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  finishReason?: string;
  modelIdentifier: string;
  providerId: string;
}

export interface ProviderQuota {
  remainingPercent?: number;
  limitMonthlyUsd?: number;
  usedMonthlyUsd?: number;
  status: 'available' | 'low' | 'exhausted' | 'unknown';
}

export interface ProviderUsage {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface ProviderAdapter {
  providerId: string;
  type: ProviderType;
  connect(config: ProviderConfig): Promise<boolean>;
  testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }>;
  listModels(): Promise<DiscoveredModel[]>;
  getModelMetadata(modelId: string): Promise<ModelMetadata | null>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  streamGenerate(request: GenerateRequest, onChunk: (text: string) => void): Promise<GenerateResponse>;
  getQuota(): Promise<ProviderQuota | null>;
}
