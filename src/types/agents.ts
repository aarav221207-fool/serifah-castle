import { ModelCapabilities } from './models';

export type AgentRole = 
  | 'IDEATION_AGENT'
  | 'UI_UX_RESEARCH_AGENT'
  | 'TECH_RESEARCH_AGENT'
  | 'MASTER_ARCHITECT_AGENT'
  | 'ENGINEERING_DIRECTOR_AGENT'
  | 'IMPLEMENTATION_AGENT'
  | 'PROOF_CHECKER_AGENT'
  | 'SECURITY_AGENT'
  | 'GROWTH_SEO_AGENT'
  | 'DEPLOYMENT_AGENT'
  | 'FINAL_RELEASE_AGENT';

export interface Agent {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  allowedTools: string[];
  preferredModelCapabilities: Partial<ModelCapabilities>;
  maximumAutonomy: number; // 1-10
  status: 'IDLE' | 'WORKING' | 'ERROR';
}
