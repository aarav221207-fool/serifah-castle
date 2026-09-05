export interface PromptAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  contentSnippet?: string;
}

export interface PromptSubmission {
  id: string;
  text: string;
  mode: 'BUILD' | 'ASK';
  timestamp: number;
  attachments: PromptAttachment[];
  enableResearch: boolean;
  enableCounsel: boolean;
  openSandbox: boolean;
  targetRole?: string;
  status: 'QUEUED' | 'COUNSEL' | 'ORCHESTRATING' | 'BUILDING' | 'VERIFYING' | 'COMPLETED' | 'FAILED';
  synthesisId?: string;
  response?: string;
  error?: string;
  model?: string;
  provider?: string;
  latencyMs?: number;
  filesModified?: string[];
  verificationSuccess?: boolean;
}
