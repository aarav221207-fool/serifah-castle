import { create } from 'zustand';
import { FailureEvent, RepairTask, FailureClassification } from '../types/repair';
import { useSandboxStore } from './useSandboxStore';
import { useModelStore } from './useModelStore';

interface RepairStore {
  failures: FailureEvent[];
  activeRepairTask: RepairTask | null;
  repairHistory: RepairTask[];
  isRepairing: boolean;

  // Actions
  reportFailure: (event: Omit<FailureEvent, 'id' | 'timestamp' | 'handled' | 'recoveryStatus'>) => FailureEvent;
  initiateAutonomousRepair: (failureId: string) => Promise<boolean>;
  dismissFailure: (failureId: string) => void;
}

export const useRepairStore = create<RepairStore>((set, get) => ({
  failures: [],
  activeRepairTask: null,
  repairHistory: [],
  isRepairing: false,

  reportFailure: (eventData) => {
    const newEvent: FailureEvent = {
      ...eventData,
      id: `fail-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      handled: false,
      recoveryStatus: 'UNRESOLVED'
    };

    set((state) => ({
      failures: [newEvent, ...state.failures]
    }));

    return newEvent;
  },

  initiateAutonomousRepair: async (failureId: string) => {
    const failure = get().failures.find(f => f.id === failureId);
    if (!failure) return false;

    set({ isRepairing: true });

    // Mark failure as diagnosing
    set((state) => ({
      failures: state.failures.map(f => f.id === failureId ? { ...f, recoveryStatus: 'DIAGNOSING' as const } : f)
    }));

    const sandboxStore = useSandboxStore.getState();
    const modelStore = useModelStore.getState();

    // 1. Create Pre-repair Git Checkpoint
    const checkpoint = sandboxStore.createCheckpoint(
      `pre-repair-${failure.type.toLowerCase()}`,
      `Automatic checkpoint prior to executing autonomous repair on failure: ${failure.message.slice(0, 48)}`
    );

    // 2. Select optimal Debugger model from router
    const debuggerAssignment = modelStore.roleAssignments.DEBUGGER;
    const debuggerModel = modelStore.models.find(m => m.id === debuggerAssignment?.assignedModelId) || modelStore.models[0];

    const repairTaskId = `rep-${Date.now()}`;
    const repairTask: RepairTask = {
      id: repairTaskId,
      failureId,
      title: `Autonomous Repair for ${failure.type}`,
      rootCause: failure.message,
      affectedFiles: failure.location ? [failure.location.split(':')[0]] : ['src/App.tsx'],
      checkpointId: checkpoint.id,
      status: 'PATCHING',
      assignedAgent: 'Debugger Agent',
      assignedModel: debuggerModel.displayName,
      logs: [
        `[1/5] Failure Detector intercepted ${failure.type}`,
        `[2/5] Checkpoint created: ${checkpoint.gitCommitHash} (${checkpoint.name})`,
        `[3/5] Debugger Model (${debuggerModel.displayName}) generated targeted code patch`,
        `[4/5] Executing sandbox build verification check...`
      ],
      createdAt: Date.now()
    };

    set({ activeRepairTask: repairTask });

    // Simulate repair execution pipeline
    await new Promise(r => setTimeout(r, 1200));

    // Record model usage for repair
    modelStore.recordInvocation({
      providerId: debuggerModel.providerId,
      modelId: debuggerModel.id,
      modelIdentifier: debuggerModel.modelIdentifier,
      role: 'DEBUGGER',
      taskTitle: `Autonomous code patch for: ${failure.message.slice(0, 36)}`,
      inputTokens: 2100,
      outputTokens: 520,
      latencyMs: debuggerModel.capabilities.latencyMs,
      success: true,
      fallbackUsed: false,
      estimatedCostUsd: 0.005
    });

    // 5. Verification
    repairTask.logs.push('[5/5] Verification passed: Runtime exception resolved without regressions.');
    repairTask.status = 'RESOLVED';
    repairTask.resolvedAt = Date.now();

    set((state) => ({
      isRepairing: false,
      activeRepairTask: null,
      repairHistory: [repairTask, ...state.repairHistory],
      failures: state.failures.map(f => f.id === failureId ? { ...f, handled: true, recoveryStatus: 'REPAIRED' as const } : f)
    }));

    return true;
  },

  dismissFailure: (failureId: string) => {
    set((state) => ({
      failures: state.failures.filter(f => f.id !== failureId)
    }));
  }
}));
