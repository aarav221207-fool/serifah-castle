export type TaskStatus = 'PLANNED' | 'IN_PROGRESS' | 'FAILED' | 'REPAIRING' | 'VERIFIED' | 'BLOCKED';

export type TaskCategory = 
  | 'ARCHITECTURE' 
  | 'CODING' 
  | 'DEBUGGING' 
  | 'RESEARCH' 
  | 'UI_UX' 
  | 'VISION' 
  | 'SECURITY' 
  | 'TESTING' 
  | 'DOCUMENTATION' 
  | 'SEO' 
  | 'PLANNING' 
  | 'CODE_REVIEW' 
  | 'GENERAL';

export interface TaskProof {
  id: string;
  taskId: string;
  evidence: string;
  timestamp: number;
  verifiedBy: string; // Agent ID
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  dependencies: string[]; // Task IDs
  relevantFiles: string[];
  relevantSkills: string[];
  assignedAgentId?: string;
  status: TaskStatus;
  acceptanceCriteria: string[];
  proofStatus: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  proof?: TaskProof;
}
