import { create } from 'zustand';
import { 
  Model, 
  ModelProvider, 
  ModelRole, 
  ModelRoutingScore, 
  RoleAssignment, 
  ModelUsageRecord,
  ProviderType
} from '../types/models';

interface ModelStore {
  providers: ModelProvider[];
  models: Model[];
  roleAssignments: Record<ModelRole, RoleAssignment>;
  usageRecords: ModelUsageRecord[];
  isLoading: boolean;
  
  // Real Provider operations
  fetchProviders: () => Promise<void>;
  addProvider: (provider: { id: string; name: string; type: ProviderType; apiKey: string; baseUrl?: string }) => Promise<boolean>;
  updateProvider: (id: string, updates: Partial<ModelProvider>) => void;
  deleteProvider: (id: string) => Promise<void>;
  testConnection: (providerId: string) => Promise<{ success: boolean; latency: number; message: string }>;
  discoverModels: (providerId: string) => Promise<{ success: boolean; count: number; models: any[] }>;
  
  // Real Model operations
  fetchModels: () => Promise<void>;
  addManualModel: (providerId: string, modelIdentifier: string, displayName?: string) => Promise<void>;
  updateModel: (id: string, updates: Partial<Model>) => void;
  deleteModel: (id: string) => void;
  
  // Routing & Auto-assignment
  calculateScore: (model: Model, role: ModelRole, provider?: ModelProvider) => ModelRoutingScore;
  runAutoAssignment: () => void;
  overrideRoleAssignment: (role: ModelRole, modelId: string) => void;
  
  // Usage tracking
  fetchUsage: () => Promise<void>;
  recordInvocation: (record: Omit<ModelUsageRecord, 'id' | 'timestamp'>) => void;
}

const ROLES: ModelRole[] = [
  'ARCHITECT',
  'BUILDER',
  'RESEARCHER',
  'UI_UX_ANALYST',
  'VISION_ANALYST',
  'SECURITY_ANALYST',
  'TESTER',
  'DEBUGGER',
  'COUNSEL_POSITIVE',
  'COUNSEL_NEGATIVE',
  'COUNSEL_PRACTICAL',
  'FINAL_JUDGE'
];

function computeAllAssignments(models: Model[], providers: ModelProvider[]): Record<ModelRole, RoleAssignment> {
  const result: Partial<Record<ModelRole, RoleAssignment>> = {};
  const activeModels = models.filter(m => m.enabled && m.isAvailable);

  for (const role of ROLES) {
    if (activeModels.length === 0) {
      result[role] = {
        role,
        assignedModelId: '',
        score: 0,
        reason: 'No connected AI provider or active model available.',
        status: 'FAILED',
        updatedAt: Date.now()
      };
      continue;
    }

    if (activeModels.length === 1) {
      // Single model setup: use for all roles
      result[role] = {
        role,
        assignedModelId: activeModels[0].id,
        score: 1.0,
        reason: `Single active model assigned: ${activeModels[0].displayName}`,
        status: 'ACTIVE',
        updatedAt: Date.now()
      };
      continue;
    }

    // Multiple models: select best match
    const scored = activeModels.map(m => {
      let score = 50;
      if (role === 'BUILDER' || role === 'DEBUGGER') {
        score += (m.capabilities.coding || 7) * 5;
      } else if (role === 'RESEARCHER' || role === 'ARCHITECT') {
        score += (m.capabilities.reasoning || 7) * 5;
      } else if (role.startsWith('COUNSEL')) {
        score += (m.capabilities.reasoning || 7) * 4;
      } else if (role === 'TESTER') {
        score += (m.capabilities.speed || 7) * 4;
      }
      return { m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].m;
    const fallback = scored[1]?.m;

    result[role] = {
      role,
      assignedModelId: best.id,
      fallbackModelId: fallback?.id,
      score: Math.min(1.0, scored[0].score / 100),
      reason: `Automated match for ${role}`,
      status: 'ACTIVE',
      updatedAt: Date.now()
    };
  }

  return result as Record<ModelRole, RoleAssignment>;
}

export const useModelStore = create<ModelStore>((set, get) => ({
  providers: [],
  models: [],
  roleAssignments: computeAllAssignments([], []),
  usageRecords: [],
  isLoading: false,

  fetchProviders: async () => {
    try {
      const res = await fetch('/api/ai/providers');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.providers)) {
        const providers: ModelProvider[] = data.providers.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          baseUrl: p.baseUrl || '',
          apiKey: p.keyMasked || '',
          enabled: p.enabled,
          health: p.health || 'unknown',
          lastTested: p.lastTested,
          lastError: p.lastError
        }));

        set((state) => ({
          providers,
          roleAssignments: computeAllAssignments(state.models, providers)
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch providers:', e);
    }
  },

  fetchModels: async () => {
    try {
      const res = await fetch('/api/ai/models');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        const models: Model[] = data.models.map((m: any) => ({
          id: m.id,
          providerId: m.providerId,
          modelIdentifier: m.modelIdentifier,
          displayName: m.displayName,
          contextWindow: m.contextWindow || 0,
          capabilities: {
            coding: typeof m.codingCapability === 'number' ? m.codingCapability : 7,
            reasoning: typeof m.reasoningCapability === 'number' ? m.reasoningCapability : 7,
            planning: 7,
            visualReasoning: m.visionCapability ? 8 : 5,
            uiUxAbility: 7,
            researchAbility: 7,
            toolCalling: Boolean(m.toolCallingCapability),
            structuredOutput: Boolean(m.structuredOutputCapability),
            speed: typeof m.speed === 'number' ? m.speed : 7,
            latencyMs: m.averageLatencyMs || 500,
            costPer1MTokens: 1.0,
            reliability: m.observedSuccessRate || 1.0,
            contextWindow: m.contextWindow || 0
          },
          priority: 1,
          fallbackPriority: 2,
          enabled: m.enabled,
          isAvailable: m.health !== 'offline',
          activeWorkloads: 0,
          totalRequests: m.totalRequests || 0,
          failedRequests: m.failedRequests || 0,
          observedSuccessRate: m.observedSuccessRate ?? 1.0
        }));

        set((state) => ({
          models,
          roleAssignments: computeAllAssignments(models, state.providers)
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch models:', e);
    }
  },

  fetchUsage: async () => {
    try {
      const res = await fetch('/api/ai/usage');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.usage)) {
        set({ usageRecords: data.usage });
      }
    } catch (e) {
      console.warn('Failed to fetch usage:', e);
    }
  },

  addProvider: async (config) => {
    try {
      set({ isLoading: true });
      const res = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add provider');
      }

      await get().fetchProviders();
      await get().fetchModels();
      set({ isLoading: false });
      return true;
    } catch (e: any) {
      set({ isLoading: false });
      throw e;
    }
  },

  updateProvider: (id, updates) => {
    set((state) => ({
      providers: state.providers.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  },

  deleteProvider: async (id) => {
    try {
      await fetch(`/api/ai/providers/${id}`, { method: 'DELETE' });
      await get().fetchProviders();
      await get().fetchModels();
    } catch (e) {
      console.warn('Delete provider error:', e);
    }
  },

  testConnection: async (providerId) => {
    try {
      const res = await fetch(`/api/ai/providers/${providerId}/test`, { method: 'POST' });
      const data = await res.json();
      await get().fetchProviders();
      return {
        success: Boolean(data.success),
        latency: data.latencyMs || 0,
        message: data.message || (data.success ? 'Connected' : 'Connection failed')
      };
    } catch (err: any) {
      return {
        success: false,
        latency: 0,
        message: `Network Error: ${err.message}`
      };
    }
  },

  discoverModels: async (providerId) => {
    try {
      const res = await fetch(`/api/ai/providers/${providerId}/discover`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await get().fetchModels();
        return { success: true, count: data.count || 0, models: data.models || [] };
      }
      return { success: false, count: 0, models: [] };
    } catch (err: any) {
      return { success: false, count: 0, models: [] };
    }
  },

  addManualModel: async (providerId, modelIdentifier, displayName) => {
    try {
      await fetch('/api/ai/models/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, modelIdentifier, displayName })
      });
      await get().fetchModels();
    } catch (e) {
      console.warn('Add manual model error:', e);
    }
  },

  updateModel: (id, updates) => {
    set((state) => {
      const updated = state.models.map(m => m.id === id ? { ...m, ...updates } : m);
      return {
        models: updated,
        roleAssignments: computeAllAssignments(updated, state.providers)
      };
    });
  },

  deleteModel: (id) => {
    set((state) => {
      const updated = state.models.filter(m => m.id !== id);
      return {
        models: updated,
        roleAssignments: computeAllAssignments(updated, state.providers)
      };
    });
  },

  calculateScore: (model, role) => {
    return {
      modelId: model.id,
      role,
      score: 85,
      breakdown: {
        capabilityFit: 9,
        reliability: model.observedSuccessRate,
        healthScore: model.isAvailable ? 1 : 0,
        quotaFactor: 1,
        contextFit: 1,
        costPenalty: 0,
        latencyPenalty: 0
      },
      selectionReason: `Active model matched for ${role}`
    };
  },

  runAutoAssignment: () => {
    set((state) => ({
      roleAssignments: computeAllAssignments(state.models, state.providers)
    }));
  },

  overrideRoleAssignment: (role, modelId) => {
    set((state) => ({
      roleAssignments: {
        ...state.roleAssignments,
        [role]: {
          role,
          assignedModelId: modelId,
          score: 1.0,
          reason: 'Manual user override',
          status: 'ACTIVE',
          updatedAt: Date.now()
        }
      }
    }));
  },

  recordInvocation: (record) => {
    const newRecord: ModelUsageRecord = {
      ...record,
      id: `inv-${Date.now()}`,
      timestamp: Date.now()
    };
    set((state) => ({
      usageRecords: [newRecord, ...state.usageRecords.slice(0, 99)]
    }));
  }
}));

// Auto-trigger fetch on load
if (typeof window !== 'undefined') {
  useModelStore.getState().fetchProviders();
  useModelStore.getState().fetchModels();
  useModelStore.getState().fetchUsage();
}
