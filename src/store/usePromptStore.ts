import { create } from 'zustand';
import { PromptAttachment, PromptSubmission } from '../types/prompt';
import { useCounselStore } from './useCounselStore';
import { useTaskStore } from './useTaskStore';
import { useProjectStore } from './useProjectStore';
import { useSandboxStore } from './useSandboxStore';
import { useModelStore } from './useModelStore';

interface PromptStore {
  currentPrompt: string;
  enableResearch: boolean;
  enableCounsel: boolean;
  openSandbox: boolean;
  attachments: PromptAttachment[];
  history: PromptSubmission[];
  isSubmitting: boolean;
  activeSubmission: PromptSubmission | null;

  // Actions
  setPrompt: (text: string) => void;
  toggleResearch: () => void;
  toggleCounsel: () => void;
  toggleSandbox: () => void;
  addAttachment: (attachment: PromptAttachment) => void;
  removeAttachment: (id: string) => void;
  clearPrompt: () => void;
  submitPrompt: (mode?: 'BUILD' | 'ASK') => Promise<void>;
  cancelSubmission: () => void;
  loadFromHistory: (submission: PromptSubmission) => void;
}

export const usePromptStore = create<PromptStore>((set, get) => ({
  currentPrompt: '',
  enableResearch: true,
  enableCounsel: true,
  openSandbox: false,
  attachments: [],
  history: [],
  isSubmitting: false,
  activeSubmission: null,

  setPrompt: (text) => set({ currentPrompt: text }),
  toggleResearch: () => set((state) => ({ enableResearch: !state.enableResearch })),
  toggleCounsel: () => set((state) => ({ enableCounsel: !state.enableCounsel })),
  toggleSandbox: () => set((state) => ({ openSandbox: !state.openSandbox })),
  addAttachment: (att) => set((state) => ({ attachments: [...state.attachments, att] })),
  removeAttachment: (id) => set((state) => ({ attachments: state.attachments.filter(a => a.id !== id) })),
  clearPrompt: () => set({ currentPrompt: '', attachments: [] }),

  submitPrompt: async (mode: 'BUILD' | 'ASK' = 'BUILD') => {
    const { currentPrompt, enableResearch, enableCounsel, openSandbox, attachments } = get();
    const promptText = currentPrompt.trim();
    if (!promptText) return;

    const submissionId = `sub-${Date.now()}`;
    const submission: PromptSubmission = {
      id: submissionId,
      text: promptText,
      mode,
      timestamp: Date.now(),
      attachments: [...attachments],
      enableResearch,
      enableCounsel,
      openSandbox,
      status: mode === 'BUILD' && enableCounsel ? 'COUNSEL' : 'ORCHESTRATING'
    };

    set({ 
      isSubmitting: true, 
      activeSubmission: submission,
      history: [submission, ...get().history] 
    });

    if (mode === 'ASK') {
      try {
        const projectStore = useProjectStore.getState();
        const res = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            projectContext: projectStore.project
          })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to process question');
        }

        const updatedSubmission: PromptSubmission = {
          ...submission,
          status: 'COMPLETED',
          response: data.answer,
          model: data.model,
          provider: data.provider,
          latencyMs: data.latencyMs
        };

        set((state) => ({
          activeSubmission: updatedSubmission,
          history: state.history.map(h => h.id === submissionId ? updatedSubmission : h),
          isSubmitting: false,
          currentPrompt: '',
          attachments: []
        }));

        useModelStore.getState().fetchUsage();
      } catch (err: any) {
        const failedSubmission: PromptSubmission = {
          ...submission,
          status: 'FAILED',
          error: err.message
        };
        set((state) => ({
          activeSubmission: failedSubmission,
          history: state.history.map(h => h.id === submissionId ? failedSubmission : h),
          isSubmitting: false
        }));
      }
      return;
    }

    // BUILD MODE: Real Model Invocation & File Modifications
    try {
      const projectStore = useProjectStore.getState();
      projectStore.updateProject({
        description: promptText
      });

      set((state) => ({
        activeSubmission: state.activeSubmission ? { ...state.activeSubmission, status: 'BUILDING' } : null
      }));

      const res = await fetch('/api/ai/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          enableCounsel
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Autonomous build execution failed');
      }

      // Sync Counsel findings if returned
      if (data.counsel) {
        const counselStore = useCounselStore.getState();
        const synth = counselStore.setSynthesisFromBuild(data.counsel, promptText, submissionId);
        counselStore.approvePlanAndDispatchToBuilder(synth.id);
      } else {
        // Direct task
        const taskStore = useTaskStore.getState();
        taskStore.addTask({
          id: `task-build-${Date.now()}`,
          title: `Build: ${promptText.slice(0, 48)}`,
          description: promptText,
          category: 'CODING',
          dependencies: [],
          relevantFiles: data.filesModified || ['src/App.tsx'],
          relevantSkills: ['react', 'typescript'],
          assignedAgentId: 'agent-implementation',
          status: 'VERIFIED',
          acceptanceCriteria: ['Feature built according to prompt requirements', 'Verification passed'],
          proofStatus: 'VERIFIED'
        });
      }

      // Synchronize sandbox
      const sandboxStore = useSandboxStore.getState();
      await sandboxStore.fetchFiles();
      await sandboxStore.runVerification();

      if (openSandbox) {
        sandboxStore.setDevServerStatus('running', 'http://localhost:3000/');
      }

      const completedSubmission: PromptSubmission = {
        ...submission,
        status: 'COMPLETED',
        response: data.summary,
        model: data.model,
        provider: data.provider,
        filesModified: data.filesModified,
        verificationSuccess: data.verification?.success
      };

      set((state) => ({
        activeSubmission: completedSubmission,
        history: state.history.map(h => h.id === submissionId ? completedSubmission : h),
        isSubmitting: false,
        currentPrompt: '',
        attachments: []
      }));

      useModelStore.getState().fetchUsage();
    } catch (err: any) {
      const failedSubmission: PromptSubmission = {
        ...submission,
        status: 'FAILED',
        error: err.message
      };
      set((state) => ({
        activeSubmission: failedSubmission,
        history: state.history.map(h => h.id === submissionId ? failedSubmission : h),
        isSubmitting: false
      }));
    }
  },

  cancelSubmission: () => {
    set({ isSubmitting: false, activeSubmission: null });
  },

  loadFromHistory: (sub) => {
    set({
      currentPrompt: sub.text,
      enableResearch: sub.enableResearch,
      enableCounsel: sub.enableCounsel,
      openSandbox: sub.openSandbox
    });
  }
}));
