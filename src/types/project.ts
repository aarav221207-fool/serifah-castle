export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  source: string;
  status: 'AVAILABLE' | 'INSTALLED' | 'ERROR';
}

export interface ProjectCheckpoint {
  id: string;
  timestamp: number;
  message: string;
  branch: string;
}

export interface ProjectMemory {
  architecture: string;
  technologyChoices: string[];
  designDecisions: string[];
  constraints: string[];
  knownBugs: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  phase: string;
  checkpoints: ProjectCheckpoint[];
  memory: ProjectMemory;
}
