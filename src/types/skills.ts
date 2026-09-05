export interface Skill {
  id: string;
  name: string;
  description: string;
  conceptsLearned: string[];
  version: string;
  source: string;
  status: 'LEARNING' | 'REVIEW' | 'VALIDATED' | 'REJECTED' | 'UPDATE_AVAILABLE';
  usageCount?: number;
}
