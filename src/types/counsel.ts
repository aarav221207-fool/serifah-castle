import { ModelRole } from './models';

export interface CounselReview {
  id: string;
  type: 'NEGATIVE' | 'POSITIVE' | 'PRACTICAL';
  modelId: string;
  modelName: string;
  providerName: string;
  timestamp: number;
  summary: string;
  points: {
    category: string;
    title: string;
    detail: string;
    severity?: 'critical' | 'high' | 'medium' | 'low'; // for negative
    impact?: 'high' | 'transformational' | 'incremental'; // for positive
    feasibility?: 'high' | 'medium' | 'risky'; // for practical
  }[];
}

export interface CounselSynthesis {
  id: string;
  promptId: string;
  userPrompt: string;
  timestamp: number;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  negativeReview?: CounselReview;
  positiveReview?: CounselReview;
  practicalReview?: CounselReview;
  positivesSummary: string[];
  negativesSummary: string[];
  practicalRisks: string[];
  conflicts: {
    issue: string;
    counselAPerspective: string;
    counselBPerspective: string;
    resolution: string;
    agreementStatus: 'AGREE' | 'DISAGREE' | 'UNCERTAIN';
  }[];
  recommendations: string[];
  requiredChanges: string[];
  finalImplementationPlan: {
    step: number;
    action: string;
    targetModule: string;
    counselOrigin: 'NEGATIVE' | 'POSITIVE' | 'PRACTICAL' | 'SYNTHESIS';
    builderInstructions: string;
  }[];
}
