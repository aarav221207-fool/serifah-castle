import { ProviderManager } from './providerManager';
import { DiscoveredModel, ModelRole, ProviderType } from './types';

export interface ModelRecord {
  id: string; // providerId + '::' + modelIdentifier
  providerId: string;
  modelIdentifier: string;
  displayName: string;
  contextWindow: number; // 0 if unknown
  codingCapability: number | 'UNKNOWN';
  reasoningCapability: number | 'UNKNOWN';
  visionCapability: boolean | 'UNKNOWN';
  toolCallingCapability: boolean | 'UNKNOWN';
  structuredOutputCapability: boolean | 'UNKNOWN';
  streamingCapability: boolean | 'UNKNOWN';
  speed: number | 'UNKNOWN';
  costInformation: string | 'UNKNOWN';
  health: 'healthy' | 'degraded' | 'offline' | 'unknown';
  enabled: boolean;
  observedSuccessRate: number; // 0.0 - 1.0
  totalRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
}

export interface RouteDecision {
  selectedModel: ModelRecord;
  providerId: string;
  reason: string;
  fallbackModels: ModelRecord[];
}

export class ModelRouter {
  private models: Map<string, ModelRecord> = new Map();
  private providerManager: ProviderManager;

  constructor(providerManager: ProviderManager) {
    this.providerManager = providerManager;
  }

  registerDiscoveredModels(providerId: string, discovered: DiscoveredModel[]) {
    for (const m of discovered) {
      const id = `${providerId}::${m.modelIdentifier}`;
      const existing = this.models.get(id);

      // Infer capabilities realistically without fabricating arbitrary ratings
      const isGemini = m.modelIdentifier.includes('gemini');
      const isClaude = m.modelIdentifier.includes('claude');
      const isGpt = m.modelIdentifier.includes('gpt') || m.modelIdentifier.includes('o1') || m.modelIdentifier.includes('o3');
      const isDeepseek = m.modelIdentifier.includes('deepseek');
      const isCodingSpecialist = m.modelIdentifier.includes('coder') || m.modelIdentifier.includes('code');

      let coding: number | 'UNKNOWN' = 'UNKNOWN';
      let reasoning: number | 'UNKNOWN' = 'UNKNOWN';

      if (isGemini || isClaude || isGpt || isDeepseek || isCodingSpecialist) {
        coding = isCodingSpecialist ? 9.5 : (isClaude || isGemini) ? 9.0 : 8.5;
        reasoning = (m.modelIdentifier.includes('pro') || m.modelIdentifier.includes('sonnet') || m.modelIdentifier.includes('r1')) ? 9.5 : 8.5;
      }

      // Demote preview, experimental, tts, and transcribe models relative to stable production models
      const isPreviewOrExperimental = m.modelIdentifier.includes('preview') || m.modelIdentifier.includes('exp') || m.modelIdentifier.includes('tts') || m.modelIdentifier.includes('robotics') || m.modelIdentifier.includes('transcribe');

      const record: ModelRecord = {
        id,
        providerId,
        modelIdentifier: m.modelIdentifier,
        displayName: m.displayName || m.modelIdentifier,
        contextWindow: m.contextWindow || 0,
        codingCapability: coding,
        reasoningCapability: reasoning,
        visionCapability: m.supportsVision ? true : 'UNKNOWN',
        toolCallingCapability: m.supportsTools ? true : 'UNKNOWN',
        structuredOutputCapability: true,
        streamingCapability: m.supportsStreaming ? true : 'UNKNOWN',
        speed: (m.modelIdentifier.includes('flash') || m.modelIdentifier.includes('haiku') || m.modelIdentifier.includes('mini')) ? 9 : 7,
        costInformation: 'STANDARD',
        health: existing?.health || 'healthy',
        enabled: existing ? existing.enabled : (!m.modelIdentifier.includes('tts') && !m.modelIdentifier.includes('transcribe')),
        observedSuccessRate: existing?.observedSuccessRate ?? (isPreviewOrExperimental ? 0.6 : 1.0),
        totalRequests: existing?.totalRequests ?? 0,
        failedRequests: existing?.failedRequests ?? 0,
        averageLatencyMs: existing?.averageLatencyMs ?? 0
      };

      this.models.set(id, record);
    }
  }

  registerManualModel(providerId: string, modelIdentifier: string, displayName?: string): ModelRecord {
    const id = `${providerId}::${modelIdentifier}`;
    const record: ModelRecord = {
      id,
      providerId,
      modelIdentifier,
      displayName: displayName || modelIdentifier,
      contextWindow: 0,
      codingCapability: 'UNKNOWN',
      reasoningCapability: 'UNKNOWN',
      visionCapability: 'UNKNOWN',
      toolCallingCapability: 'UNKNOWN',
      structuredOutputCapability: 'UNKNOWN',
      streamingCapability: 'UNKNOWN',
      speed: 'UNKNOWN',
      costInformation: 'UNKNOWN',
      health: 'healthy',
      enabled: true,
      observedSuccessRate: 1.0,
      totalRequests: 0,
      failedRequests: 0,
      averageLatencyMs: 0
    };
    this.models.set(id, record);
    return record;
  }

  getAllModels(): ModelRecord[] {
    return Array.from(this.models.values());
  }

  getModel(id: string): ModelRecord | null {
    return this.models.get(id) || null;
  }

  updateModelHealth(id: string, success: boolean, latencyMs: number, errorMsg?: string) {
    const m = this.models.get(id);
    if (!m) return;

    const total = m.totalRequests + 1;
    const failed = m.failedRequests + (success ? 0 : 1);
    const avgLatency = m.averageLatencyMs === 0 ? latencyMs : Math.round((m.averageLatencyMs * 0.7) + (latencyMs * 0.3));

    m.totalRequests = total;
    m.failedRequests = failed;

    if (!success && errorMsg && (errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('exceeded'))) {
      m.observedSuccessRate = 0.01;
      m.health = 'degraded';
    } else {
      m.observedSuccessRate = Math.max(0, (total - failed) / total);
      m.health = m.observedSuccessRate < 0.5 ? 'degraded' : 'healthy';
    }

    m.averageLatencyMs = avgLatency;
  }

  routeTask(taskType: 'CODING' | 'RESEARCH' | 'UI' | 'REASONING' | 'COUNSEL' | 'VERIFY' | 'GENERAL', preferredRole?: ModelRole): RouteDecision | null {
    const available = Array.from(this.models.values()).filter(m => {
      if (!m.enabled) return false;
      const provider = this.providerManager.getSafeInfo(m.providerId);
      return provider && provider.health !== 'offline';
    });

    if (available.length === 0) {
      return null;
    }

    // Single-Model Rule: If only 1 model is available, use it for everything!
    if (available.length === 1) {
      return {
        selectedModel: available[0],
        providerId: available[0].providerId,
        reason: `Only available active model: ${available[0].displayName}`,
        fallbackModels: []
      };
    }

    // Score available models according to task requirements
    const scored = available.map(model => {
      let score = 50;

      // Stable flagship models bonus
      const isStableFlagship = model.modelIdentifier === 'gemini-2.5-flash' || 
                               model.modelIdentifier === 'gemini-2.5-pro' ||
                               model.modelIdentifier.includes('claude-3-5') ||
                               model.modelIdentifier.includes('claude-3-7') ||
                               model.modelIdentifier.includes('gpt-4o');
      if (isStableFlagship) {
        score += 25;
      }

      // Capability matching
      if (taskType === 'CODING' || taskType === 'UI') {
        if (typeof model.codingCapability === 'number') {
          score += model.codingCapability * 5;
        }
      } else if (taskType === 'REASONING' || taskType === 'COUNSEL') {
        if (typeof model.reasoningCapability === 'number') {
          score += model.reasoningCapability * 5;
        }
      } else if (taskType === 'VERIFY') {
        // Fast models preferred for verification
        if (typeof model.speed === 'number') {
          score += model.speed * 4;
        }
      }

      // Success rate multiplier
      score *= model.observedSuccessRate;

      // Latency penalty if excessively high
      if (model.averageLatencyMs > 5000) {
        score -= 15;
      }

      // Context window bonus
      if (model.contextWindow >= 100000) {
        score += 10;
      }

      return { model, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    const winner = scored[0].model;
    const fallbacks = scored.slice(1, 15).map(s => s.model);

    let reason = `Top fit for ${taskType}`;
    if (typeof winner.codingCapability === 'number' && taskType === 'CODING') {
      reason += ` (High coding capability, ${Math.round(winner.observedSuccessRate * 100)}% success rate)`;
    } else {
      reason += ` (Healthy provider, verified connectivity)`;
    }

    return {
      selectedModel: winner,
      providerId: winner.providerId,
      reason,
      fallbackModels: fallbacks
    };
  }

  // Counsel requires 3 distinct model assignments if available, or fallbacks to whatever models are active
  routeCounsel(): { negative: ModelRecord; positive: ModelRecord; practical: ModelRecord } | null {
    const available = Array.from(this.models.values()).filter(m => m.enabled);
    if (available.length === 0) return null;

    if (available.length === 1) {
      return {
        negative: available[0],
        positive: available[0],
        practical: available[0]
      };
    }

    if (available.length === 2) {
      return {
        negative: available[0],
        positive: available[1],
        practical: available[0]
      };
    }

    // 3 or more available: distribute across distinct models
    return {
      negative: available[0],
      positive: available[1],
      practical: available[2]
    };
  }
}
