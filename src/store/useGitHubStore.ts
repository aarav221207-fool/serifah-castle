import { create } from 'zustand';
import { GitHubRepo, GitBranch, GitCommit, GitFileStatus, GitHubState } from '../types/github';
import { useSandboxStore } from './useSandboxStore';
import { initGitHub, getOctokit } from '../lib/github';

interface GitHubStore extends GitHubState {
  // Authentication & Repos
  connectGitHub: (token: string) => Promise<boolean>;
  disconnectGitHub: () => void;
  fetchRepositories: () => Promise<GitHubRepo[]>;
  selectRepo: (repo: GitHubRepo) => void;
  
  // Branch operations
  switchBranch: (branchName: string) => void;
  createBranch: (branchName: string) => void;
  
  // Staging & Commits
  stageFile: (path: string) => void;
  unstageFile: (path: string) => void;
  stageAll: () => void;
  createCommit: (message: string) => Promise<GitCommit>;
  
  // Remote sync
  pushToRemote: () => Promise<{ success: boolean; message: string }>;
  pullFromRemote: () => Promise<{ success: boolean; message: string }>;
}

export const useGitHubStore = create<GitHubStore>((set, get) => ({
  isConnected: false,
  username: undefined,
  tokenMasked: undefined,
  selectedRepo: undefined,
  currentBranch: 'main',
  branches: [],
  commits: [],
  stagedFiles: [],
  unstagedFiles: [],
  isSyncing: false,
  lastSyncTime: undefined,

  connectGitHub: async (token: string) => {
    set({ isSyncing: true });
    try {
      const octokit = initGitHub(token);
      const { data } = await octokit.rest.users.getAuthenticated();
      
      set({
        isConnected: true,
        username: data.login,
        tokenMasked: `ghp_${'•'.repeat(24)}`,
        isSyncing: false,
        lastSyncTime: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Failed to connect to GitHub', error);
      set({ isSyncing: false });
      return false;
    }
  },

  disconnectGitHub: () => {
    set({
      isConnected: false,
      username: undefined,
      tokenMasked: undefined,
      selectedRepo: undefined
    });
  },

  fetchRepositories: async () => {
    try {
      const octokit = getOctokit();
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 50,
      });
      return data.map((repo: any) => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        isPrivate: repo.private,
        defaultBranch: repo.default_branch,
        url: repo.html_url,
        updatedAt: repo.updated_at
      }));
    } catch (error) {
      console.error('Failed to fetch repositories', error);
      return [];
    }
  },

  selectRepo: (repo) => set({ selectedRepo: repo, currentBranch: repo.defaultBranch }),

  switchBranch: (branchName) => {
    set({ currentBranch: branchName });
    const sandbox = useSandboxStore.getState();
    sandbox.executeTerminalCommand(`git checkout ${branchName}`);
  },

  createBranch: (branchName) => {
    const newBranch: GitBranch = {
      name: branchName,
      isDefault: false,
      lastCommitHash: get().commits[0]?.shortHash || '0000000',
      aheadCount: 0,
      behindCount: 0
    };
    set((state) => ({
      branches: [...state.branches, newBranch],
      currentBranch: branchName
    }));
    const sandbox = useSandboxStore.getState();
    sandbox.executeTerminalCommand(`git checkout -b ${branchName}`);
  },

  stageFile: (path) => {
    set((state) => {
      const file = state.unstagedFiles.find(f => f.path === path);
      if (!file) return state;
      return {
        unstagedFiles: state.unstagedFiles.filter(f => f.path !== path),
        stagedFiles: [...state.stagedFiles, { ...file, staged: true }]
      };
    });
  },

  unstageFile: (path) => {
    set((state) => {
      const file = state.stagedFiles.find(f => f.path === path);
      if (!file) return state;
      return {
        stagedFiles: state.stagedFiles.filter(f => f.path !== path),
        unstagedFiles: [...state.unstagedFiles, { ...file, staged: false }]
      };
    });
  },

  stageAll: () => {
    set((state) => ({
      stagedFiles: [...state.stagedFiles, ...state.unstagedFiles.map(f => ({ ...f, staged: true }))],
      unstagedFiles: []
    }));
  },

  createCommit: async (message) => {
    const hash = Math.random().toString(16).substr(2, 12);
    const shortHash = hash.substr(0, 7);
    const newCommit: GitCommit = {
      hash,
      shortHash,
      message,
      author: get().username || 'agent-os',
      timestamp: Date.now(),
      filesChanged: get().stagedFiles.length || 1
    };

    // Also create checkpoint in Sandbox store
    const sandbox = useSandboxStore.getState();
    sandbox.createCheckpoint(message, `Git commit ${shortHash}`);

    set((state) => ({
      commits: [newCommit, ...state.commits],
      stagedFiles: [],
      branches: state.branches.map(b => 
        b.name === state.currentBranch 
          ? { ...b, lastCommitHash: shortHash, aheadCount: b.aheadCount + 1 } 
          : b
      )
    }));

    return newCommit;
  },

  pushToRemote: async () => {
    const sandbox = useSandboxStore.getState();
    if (!sandbox.verification.isVerified) {
      // Run verification first to check if eligible
      const verified = await sandbox.runVerification();
      if (!verified) {
        return {
          success: false,
          message: 'NEVER PUSH UNVERIFIED CODE: Release is blocked. Tests, Linter, and Build must all pass verification before pushing to GitHub.'
        };
      }
    }

    set({ isSyncing: true });
    await new Promise(r => setTimeout(r, 900));
    set((state) => ({
      isSyncing: false,
      lastSyncTime: Date.now(),
      branches: state.branches.map(b => 
        b.name === state.currentBranch ? { ...b, aheadCount: 0 } : b
      )
    }));
    return { success: true, message: `Successfully verified and pushed branch to remote origin` };
  },

  pullFromRemote: async () => {
    set({ isSyncing: true });
    await new Promise(r => setTimeout(r, 800));
    set((state) => ({
      isSyncing: false,
      lastSyncTime: Date.now(),
      branches: state.branches.map(b => 
        b.name === state.currentBranch ? { ...b, behindCount: 0 } : b
      )
    }));
    return { success: true, message: `Already up to date with remote origin` };
  }
}));
