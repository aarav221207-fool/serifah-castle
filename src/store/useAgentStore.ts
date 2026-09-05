import { create } from 'zustand';
import { Agent } from '../types/agents';

interface AgentStore {
  agents: Agent[];
  activeAgentId: string | null;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  setActiveAgent: (id: string | null) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [
    {
      id: 'agent-architect',
      name: 'Master Architect',
      description: 'Creates implementation blueprints and architecture designs.',
      role: 'MASTER_ARCHITECT_AGENT',
      allowedTools: ['read_file', 'list_dir', 'web_search'],
      preferredModelCapabilities: { reasoning: 9, coding: 8 },
      maximumAutonomy: 8,
      status: 'IDLE'
    },
    {
      id: 'agent-director',
      name: 'Engineering Director',
      description: 'Converts blueprints into execution graphs and delegates tasks.',
      role: 'ENGINEERING_DIRECTOR_AGENT',
      allowedTools: ['create_task', 'assign_task'],
      preferredModelCapabilities: { reasoning: 8, coding: 8 },
      maximumAutonomy: 9,
      status: 'IDLE'
    },
    {
      id: 'agent-implementation',
      name: 'Implementation Agent',
      description: 'Writes code to satisfy task requirements.',
      role: 'IMPLEMENTATION_AGENT',
      allowedTools: ['read_file', 'write_file', 'run_command'],
      preferredModelCapabilities: { coding: 9, tools: true },
      maximumAutonomy: 6,
      status: 'IDLE'
    }
  ],
  activeAgentId: null,
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
  updateAgent: (id, updates) => set((state) => ({
    agents: state.agents.map(a => a.id === id ? { ...a, ...updates } : a)
  })),
  setActiveAgent: (id) => set({ activeAgentId: id })
}));
