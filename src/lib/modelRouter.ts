import { Model, ModelCapabilities } from '../types/models';
import { Task } from '../types/tasks';

export interface RouteDecision {
  selectedModelId: string;
  reasoning: string;
  requiredCapabilities: Partial<ModelCapabilities>;
  rejectedModels: { id: string; reason: string }[];
  estimatedCost: number;
}

export class ModelRouter {
  private models: Model[];

  constructor(availableModels: Model[]) {
    this.models = availableModels.filter(m => m.enabled && m.isAvailable);
  }

  routeTask(task: Task): RouteDecision {
    const required = this.determineRequiredCapabilities(task);
    const rejected: { id: string; reason: string }[] = [];
    
    // Filter by capabilities
    const candidates = this.models.filter(m => {
      const caps = m.capabilities;
      const isCapable = 
        caps.coding >= (required.coding || 0) &&
        caps.reasoning >= (required.reasoning || 0) &&
        (required.vision ? (caps.visualReasoning >= 7 || caps.vision) : true) &&
        (required.tools ? (caps.toolCalling || caps.tools) : true);
      
      if (!isCapable) {
        rejected.push({ id: m.id, reason: 'Lacks required capabilities for this task category.' });
      }
      return isCapable;
    });

    if (candidates.length === 0) {
      // Fallback to first available model if strict match not found
      if (this.models.length > 0) {
        return {
          selectedModelId: this.models[0].id,
          reasoning: `Fallback: Selected ${this.models[0].displayName} as best available model.`,
          requiredCapabilities: required,
          rejectedModels: rejected,
          estimatedCost: 0.01
        };
      }
      throw new Error('No available models in registry.');
    }

    // Sort by capability/cost tradeoff
    candidates.sort((a, b) => {
      if (task.category === 'ARCHITECTURE' || task.category === 'SECURITY') {
        return b.capabilities.reasoning - a.capabilities.reasoning;
      }
      return (a.capabilities.costPer1MTokens || 1) - (b.capabilities.costPer1MTokens || 1);
    });

    const selected = candidates[0];

    return {
      selectedModelId: selected.id,
      reasoning: `Selected ${selected.displayName} based on task requirements and optimal capability mapping.`,
      requiredCapabilities: required,
      rejectedModels: rejected,
      estimatedCost: (selected.capabilities.costPer1MTokens || 1) * 0.005
    };
  }

  private determineRequiredCapabilities(task: Task) {
    const req = {
      coding: 5,
      reasoning: 5,
      vision: false,
      tools: true
    };

    switch (task.category) {
      case 'ARCHITECTURE':
        req.reasoning = 9;
        req.coding = 7;
        break;
      case 'CODING':
        req.coding = 8;
        req.reasoning = 7;
        break;
      case 'VISION':
      case 'UI_UX':
        req.vision = true;
        req.reasoning = 6;
        break;
      case 'SECURITY':
        req.reasoning = 9;
        req.coding = 9;
        break;
    }
    
    return req;
  }
}
