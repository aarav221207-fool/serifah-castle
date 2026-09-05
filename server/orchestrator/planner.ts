export interface PlannedTask {
  id: string;
  step: number;
  title: string;
  description: string;
  targetFiles: string[];
  role: 'BUILDER' | 'DESIGNER' | 'DEBUGGER' | 'VERIFIER';
  acceptanceCriteria: string[];
}

export interface Plan {
  id: string;
  prompt: string;
  summary: string;
  tasks: PlannedTask[];
  timestamp: number;
}

export class Planner {
  generatePlan(prompt: string, workspaceFiles: string[], counselSynthesis?: any): Plan {
    const planId = `plan-${Date.now()}`;
    const normalizedPrompt = prompt.trim();

    // Determine target files based on prompt keywords
    const targetFiles: string[] = [];
    if (normalizedPrompt.toLowerCase().includes('calculator')) {
      targetFiles.push('src/components/Calculator.tsx');
    }
    if (normalizedPrompt.toLowerCase().includes('landing') || normalizedPrompt.toLowerCase().includes('page')) {
      targetFiles.push('src/components/LandingView.tsx');
    }
    if (targetFiles.length === 0) {
      targetFiles.push('src/components/FeatureModule.tsx');
    }
    targetFiles.push('src/App.tsx');

    const tasks: PlannedTask[] = [
      {
        id: `${planId}-step-1`,
        step: 1,
        title: `Design Architecture & Foundations`,
        description: `Establish data models, state management, and props contracts for: ${normalizedPrompt.slice(0, 50)}`,
        targetFiles: ['src/types.ts', ...targetFiles.slice(0, 1)],
        role: 'BUILDER',
        acceptanceCriteria: ['Strong TypeScript type definitions', 'Clean interface boundaries']
      },
      {
        id: `${planId}-step-2`,
        step: 2,
        title: `Implement Core Components`,
        description: `Construct interactive UI and stateful logic to satisfy user specifications.`,
        targetFiles,
        role: 'BUILDER',
        acceptanceCriteria: ['Fully interactive and responsive UI', 'Complete event handling']
      },
      {
        id: `${planId}-step-3`,
        step: 3,
        title: `Integrate and Wire Main Entrypoint`,
        description: `Connect newly built components into main workspace layout with responsive shell.`,
        targetFiles: ['src/App.tsx'],
        role: 'BUILDER',
        acceptanceCriteria: ['Proper component integration', 'Zero unhandled runtime errors']
      }
    ];

    return {
      id: planId,
      prompt: normalizedPrompt,
      summary: `Autonomous plan for "${normalizedPrompt.slice(0, 48)}": 3-stage execution loop across ${targetFiles.length} modules.`,
      tasks,
      timestamp: Date.now()
    };
  }
}
