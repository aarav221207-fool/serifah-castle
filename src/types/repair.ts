export type FailureClassification =
  | 'TYPESCRIPT_ERROR'
  | 'BUILD_FAILURE'
  | 'RUNTIME_EXCEPTION'
  | 'REACT_CRASH'
  | 'CONSOLE_ERROR'
  | 'TEST_FAILURE'
  | 'MISSING_IMPORT'
  | 'UNDEFINED_VARIABLE';

export interface FailureEvent {
  id: string;
  timestamp: number;
  type: FailureClassification;
  message: string;
  location?: string;
  componentStack?: string;
  handled: boolean;
  recoveryStatus: 'UNRESOLVED' | 'DIAGNOSING' | 'REPAIR_IN_PROGRESS' | 'REPAIRED' | 'FAILED';
}

export interface RepairTask {
  id: string;
  failureId: string;
  title: string;
  rootCause: string;
  affectedFiles: string[];
  checkpointId: string;
  status: 'PENDING' | 'ANALYZING' | 'PATCHING' | 'COMPILING' | 'TESTING' | 'RESOLVED' | 'FAILED';
  assignedAgent: string;
  assignedModel: string;
  logs: string[];
  createdAt: number;
  resolvedAt?: number;
}
