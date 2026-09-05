import { create } from 'zustand';
import { Project } from '../types/project';
import { useSandboxStore } from './useSandboxStore';

interface ProjectStore {
  project: Project | null;
  updateProject: (updates: Partial<Project>) => void;
  createProject: (name: string, description: string, location: string, githubAction: string) => void;
  closeProject: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  project: null,
  updateProject: (updates) => set((state) => ({
    project: state.project ? { ...state.project, ...updates } : null
  })),
  closeProject: () => set({ project: null }),
  createProject: (name, description, location, githubAction) => {
    // 1. Initialize Workspace on server
    fetch('/api/workspace/init', { method: 'POST' }).catch(e => console.error(e));

    // 2. Initialize Sandbox state
    const sandbox = useSandboxStore.getState();
    sandbox.createCheckpoint(`chore: project ${name} created`, description || 'Initial workstation state');

    // 3. Set Project Brain state
    set(() => ({
      project: {
        id: `proj-${Date.now()}`,
        name,
        description: description || 'New software project in AGENT_OS workstation',
        phase: 'INITIALIZATION',
        checkpoints: [],
        memory: {
          architecture: 'Modular Full-Stack Workstation Architecture',
          technologyChoices: ['TypeScript', 'React 19', 'TailwindCSS', 'Express Backend'],
          designDecisions: ['Dual-mode Prompt Composer (BUILD / ASK)', 'Internal 3-Agent Counsel', 'Defensive Error Boundaries'],
          constraints: ['Never push unverified code', 'Real execution environment only'],
          knownBugs: []
        }
      }
    }));
  }
}));
