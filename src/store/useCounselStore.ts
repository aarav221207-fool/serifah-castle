import { create } from 'zustand';
import { CounselReview, CounselSynthesis } from '../types/counsel';
import { useTaskStore } from './useTaskStore';
import { useProjectStore } from './useProjectStore';

interface CounselStore {
  activeSynthesis: CounselSynthesis | null;
  history: CounselSynthesis[];
  isAnalyzing: boolean;
  
  // Actions
  evaluatePromptWithCounsel: (prompt: string, promptId?: string) => Promise<CounselSynthesis>;
  setSynthesisFromBuild: (counselData: any, prompt: string, promptId?: string) => CounselSynthesis;
  approvePlanAndDispatchToBuilder: (synthesisId: string) => void;
  clearActiveCounsel: () => void;
}

export const useCounselStore = create<CounselStore>((set, get) => ({
  activeSynthesis: null,
  history: [],
  isAnalyzing: false,

  setSynthesisFromBuild: (counselData: any, prompt: string, promptId?: string) => {
    if (!counselData) return ({} as any);

    const negReview: CounselReview = {
      id: `rev-neg-${Date.now()}`,
      type: 'NEGATIVE',
      modelId: counselData.negative?.model || 'model',
      modelName: counselData.negative?.model || 'Auditor',
      providerName: 'Assigned Provider',
      timestamp: Date.now(),
      summary: counselData.negative?.summary || 'Adversarial risk review completed.',
      points: (counselData.negative?.points || []).map((p: any) => ({
        category: p.category || 'Risk',
        title: p.title || 'Audit Point',
        detail: p.detail || '',
        severity: (p.severityOrImpact as any) || 'high'
      }))
    };

    const posReview: CounselReview = {
      id: `rev-pos-${Date.now()}`,
      type: 'POSITIVE',
      modelId: counselData.positive?.model || 'model',
      modelName: counselData.positive?.model || 'Architect',
      providerName: 'Assigned Provider',
      timestamp: Date.now(),
      summary: counselData.positive?.summary || 'Value identification completed.',
      points: (counselData.positive?.points || []).map((p: any) => ({
        category: p.category || 'Architecture',
        title: p.title || 'Opportunity Point',
        detail: p.detail || '',
        impact: (p.severityOrImpact as any) || 'high'
      }))
    };

    const pracReview: CounselReview = {
      id: `rev-prac-${Date.now()}`,
      type: 'PRACTICAL',
      modelId: counselData.practical?.model || 'model',
      modelName: counselData.practical?.model || 'Pragmatist',
      providerName: 'Assigned Provider',
      timestamp: Date.now(),
      summary: counselData.practical?.summary || 'Feasibility analysis completed.',
      points: (counselData.practical?.points || []).map((p: any) => ({
        category: p.category || 'Feasibility',
        title: p.title || 'Feasibility Point',
        detail: p.detail || '',
        feasibility: (p.severityOrImpact as any) || 'high'
      }))
    };

    const synthesisId = `synth-${Date.now()}`;
    const synthesis: CounselSynthesis = {
      id: synthesisId,
      promptId: promptId || `prompt-${Date.now()}`,
      userPrompt: prompt,
      timestamp: Date.now(),
      status: 'COMPLETED',
      negativeReview: negReview,
      positiveReview: posReview,
      practicalReview: pracReview,
      positivesSummary: posReview.points.map(p => p.title),
      negativesSummary: negReview.points.map(p => p.title),
      practicalRisks: pracReview.points.map(p => p.title),
      conflicts: [],
      recommendations: [posReview.summary, pracReview.summary],
      requiredChanges: negReview.points.map(p => p.detail),
      finalImplementationPlan: (counselData.synthesisPlan || []).map((sp: any, idx: number) => ({
        step: sp.step || idx + 1,
        action: sp.action || 'Execute step',
        targetModule: sp.targetModule || 'src/App.tsx',
        counselOrigin: (sp.counselOrigin as any) || 'SYNTHESIS',
        builderInstructions: sp.builderInstructions || ''
      }))
    };

    set((state) => ({
      activeSynthesis: synthesis,
      history: [synthesis, ...state.history],
      isAnalyzing: false
    }));

    return synthesis;
  },

  evaluatePromptWithCounsel: async (prompt: string, promptId?: string) => {
    set({ isAnalyzing: true });
    try {
      const res = await fetch('/api/ai/counsel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Counsel evaluation failed');
      }

      return get().setSynthesisFromBuild(data.counsel, prompt, promptId);
    } catch (err: any) {
      set({ isAnalyzing: false });
      throw err;
    }
  },

  approvePlanAndDispatchToBuilder: (synthesisId: string) => {
    const { activeSynthesis, history } = get();
    const synth = (activeSynthesis?.id === synthesisId ? activeSynthesis : history.find(h => h.id === synthesisId));
    if (!synth) return;

    const taskStore = useTaskStore.getState();
    const projectStore = useProjectStore.getState();

    // Create real tasks from the Counsel implementation plan
    synth.finalImplementationPlan.forEach((planItem, idx) => {
      taskStore.addTask({
        id: `task-counsel-${Date.now()}-${idx}`,
        title: planItem.action,
        description: planItem.builderInstructions,
        category: planItem.counselOrigin === 'NEGATIVE' ? 'SECURITY' : planItem.counselOrigin === 'PRACTICAL' ? 'PLANNING' : 'CODING',
        dependencies: idx > 0 ? [`task-counsel-${Date.now()}-${idx - 1}`] : [],
        relevantFiles: [planItem.targetModule],
        relevantSkills: ['typescript', 'react'],
        assignedAgentId: 'agent-implementation',
        status: idx === 0 ? 'IN_PROGRESS' : 'PLANNED',
        acceptanceCriteria: ['Implementation satisfies counsel requirements', 'Verified by test runner'],
        proofStatus: 'NONE'
      });
    });

    // Update project memory with accepted counsel findings
    projectStore.updateProject({
      memory: {
        ...projectStore.project.memory,
        designDecisions: [
          ...projectStore.project.memory.designDecisions,
          ...synth.recommendations
        ],
        constraints: [
          ...projectStore.project.memory.constraints,
          ...synth.negativesSummary
        ]
      }
    });
  },

  clearActiveCounsel: () => set({ activeSynthesis: null })
}));
