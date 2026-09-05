export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  timestamp: number;
  filesChanged: number;
}

export interface GitBranch {
  name: string;
  isDefault: boolean;
  lastCommitHash: string;
  aheadCount: number;
  behindCount: number;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked';
  staged: boolean;
}

export interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  url: string;
  updatedAt: string;
}

export interface GitHubState {
  isConnected: boolean;
  username?: string;
  tokenMasked?: string;
  selectedRepo?: GitHubRepo;
  currentBranch: string;
  branches: GitBranch[];
  commits: GitCommit[];
  stagedFiles: GitFileStatus[];
  unstagedFiles: GitFileStatus[];
  isSyncing: boolean;
  lastSyncTime?: number;
}
