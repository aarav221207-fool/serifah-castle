export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  content?: string;
  isModified?: boolean;
  size?: number;
  updatedAt?: number;
}

export interface Process {
  id: string;
  command: string;
  args?: string[];
  status: 'running' | 'completed' | 'failed' | 'stopped';
  exitCode?: number;
  stdout: string[];
  stderr: string[];
  startTime: number;
  endTime?: number;
}

export interface TestResult {
  id: string;
  name: string;
  suite: string;
  status: 'PASS' | 'FAIL' | 'SKIPPED' | 'RUNNING';
  durationMs: number;
  errorMessage?: string;
  failureLocation?: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  gitCommitHash: string;
  author: string;
  branch: string;
  modifiedFiles: string[];
  snapshotTree?: FileNode[];
}

export interface ConsoleEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'log';
  message: string;
  source?: string;
}

export interface VerificationState {
  isVerified: boolean;
  lintPassed: boolean;
  testsPassed: boolean;
  buildPassed: boolean;
  lastChecked?: number;
  error?: string;
}

export interface SandboxState {
  isReady: boolean;
  fileTree: FileNode[];
  processes: Process[];
  activeProcessId?: string;
  devServerStatus: 'offline' | 'starting' | 'running' | 'error';
  devServerUrl?: string;
  activeFile?: string;
  tests: TestResult[];
  checkpoints: Checkpoint[];
  consoleLogs: ConsoleEntry[];
  currentBranch: string;
  verification: VerificationState;
}
