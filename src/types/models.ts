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

export interface ModelCapabilityProfile {
  coding: number; // 1-10
  reasoning: number; // 1-10
  planning: number; // 1-10
  visualReasoning: number; // 1-10
  uiUxAbility: number; // 1-10
  researchAbility: number; // 1-10
  toolCalling: boolean;
  structuredOutput: boolean;
  speed: number; // 1-10 (10 = fastest)
  latencyMs: number; // typical latency
  costPer1MTokens: number; // estimated USD cost per 1M blended tokens
  reliability: number; // 0-1 (e.g. 0.99)
  contextWindow: number;
  
  // Convenience aliases for backward compatibility
  vision?: boolean;
  tools?: boolean;
  streaming?: boolean;
}

export type ModelCapabilities = ModelCapabilityProfile;

export interface ModelProvider {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string; // Stored securely in client memory/backend proxy
  orgId?: string;
  customHeaders?: Record<string, string>;
  enabled: boolean;
  health: 'healthy' | 'degraded' | 'offline' | 'unknown';
  lastTested?: number;
  lastError?: string;
  requestLimitRpm?: number;
  tokenLimitTpm?: number;
  remainingQuotaPercent?: number; // 0-100
}

export interface Model {
  id: string;
  providerId: string;
  modelIdentifier: string;
  displayName: string;
  contextWindow: number;
  capabilities: ModelCapabilityProfile;
  priority: number;
  fallbackPriority: number;
  costRating?: number; // 1-5 backward compatibility
  speedRating?: number; // 1-5 backward compatibility
  enabled: boolean;
  isAvailable: boolean;
  activeWorkloads: number;
  totalRequests: number;
  failedRequests: number;
  observedSuccessRate: number; // 0-1
}

export interface ModelRoutingScore {
  modelId: string;
  role: ModelRole;
  score: number; // 0-100
  breakdown: {
    capabilityFit: number;
    reliability: number;
    healthScore: number;
    quotaFactor: number;
    contextFit: number;
    costPenalty: number;
    latencyPenalty: number;
  };
  selectionReason: string;
}

export interface RoleAssignment {
  role: ModelRole;
  assignedModelId: string;
  fallbackModelId?: string;
  score: number;
  reason: string;
  status: 'ACTIVE' | 'QUEUED' | 'COMPLETED' | 'FAILED' | 'FALLBACK';
  updatedAt: number;
}

export interface ModelUsageRecord {
  id: string;
  timestamp: number;
  providerId: string;
  modelId: string;
  modelIdentifier: string;
  role: ModelRole;
  taskTitle: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  fallbackUsed: boolean;
  estimatedCostUsd: number;
  errorMessage?: string;
}
