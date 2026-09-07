import { create } from 'zustand';
import { 
  FileNode, 
  Process, 
  TestResult, 
  Checkpoint, 
  ConsoleEntry, 
  SandboxState 
} from '../types/sandbox';

interface SandboxStore extends SandboxState {
  // FileSystem
  fetchFiles: () => Promise<void>;
  isLoadingFiles: boolean;
  activeFileContent: string;
  loadFileContent: (path: string) => Promise<string>;
  saveFileContent: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => string | undefined;
  writeFile: (path: string, content: string) => void;
  createFile: (path: string, content?: string) => void;
  deleteFile: (path: string) => void;
  patchFile: (path: string, search: string, replace: string) => boolean;
  setActiveFile: (path: string | undefined) => void;
  
  // ProcessManager & Terminal
  executeTerminalCommand: (rawCommand: string) => void;
  startProcess: (command: string) => string;
  stopProcess: (id: string) => void;
  clearTerminal: () => void;
  
  // DevServer
  setDevServerStatus: (status: SandboxState['devServerStatus'], url?: string) => void;
  restartDevServer: () => Promise<void>;
  
  // Browser Preview & Console
  browserUrl: string;
  setBrowserUrl: (url: string) => void;
  reloadBrowser: () => void;
  addConsoleEntry: (level: ConsoleEntry['level'], message: string, source?: string) => void;
  clearConsole: () => void;
  
  // TestRunner & Verification
  runTests: () => Promise<TestResult[]>;
  runVerification: () => Promise<boolean>;
  
  // CheckpointManager
  fetchCheckpoints: () => Promise<void>;
  createCheckpoint: (name: string, description: string) => Checkpoint;
  restoreCheckpoint: (id: string) => boolean;
}

const initialFiles: FileNode[] = [];
const initialTests: TestResult[] = [];
const initialCheckpoints: Checkpoint[] = [];

// Helper to find file node in tree
function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

// Helper to update file node content
function updateNodeContent(nodes: FileNode[], path: string, content: string): FileNode[] {
  return nodes.map(node => {
    if (node.path === path) {
      return { ...node, content, isModified: true, size: content.length, updatedAt: Date.now() };
    }
    if (node.children) {
      return { ...node, children: updateNodeContent(node.children, path, content) };
    }
    return node;
  });
}

// Helper to remove node
function removeNodeByPath(nodes: FileNode[], path: string): FileNode[] {
  return nodes
    .filter(node => node.path !== path)
    .map(node => node.children ? { ...node, children: removeNodeByPath(node.children, path) } : node);
}

export const useSandboxStore = create<SandboxStore>((set, get) => ({
  isReady: true,
  fileTree: initialFiles,
  processes: [
    {
      id: 'proc-dev',
      command: 'npm run dev',
      status: 'running',
      stdout: [
        '$ npm run dev',
        '> agent-os@0.1.0 dev',
        '> vite --port=3000 --host=0.0.0.0',
        'VITE v6.2.3  ready in 142 ms',
        '➜  Local:   http://localhost:3000/',
        '➜  Network: http://0.0.0.0:3000/'
      ],
      stderr: [],
      startTime: Date.now() - 1000 * 60 * 15
    }
  ],
  activeProcessId: 'proc-dev',
  devServerStatus: 'running',
  devServerUrl: 'http://localhost:3000/',
  activeFile: '/src/App.tsx',
  activeFileContent: '',
  isLoadingFiles: false,
  tests: initialTests,
  checkpoints: initialCheckpoints,
  consoleLogs: [
    { id: 'log-1', timestamp: Date.now() - 1000 * 60 * 14, level: 'info', message: '[Vite] Application connected and mounted to DOM.', source: 'main.tsx' },
    { id: 'log-2', timestamp: Date.now() - 1000 * 60 * 10, level: 'log', message: '[AgentOS] System services ready. Subsystems: FileSystem, ModelRouter, Counsel, FailureDetector.', source: 'useSandboxStore.ts' }
  ],
  currentBranch: 'main',
  browserUrl: 'http://localhost:3000/',
  verification: {
    isVerified: false,
    lintPassed: false,
    testsPassed: false,
    buildPassed: false
  },

  // FileSystem
  fetchFiles: async () => {
    try {
      set({ isLoadingFiles: true });
      const res = await fetch('/api/workspace/files');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.files)) {
        set({ fileTree: data.files });
      }
    } catch (e) {
      console.warn('Failed to fetch workspace files:', e);
    } finally {
      set({ isLoadingFiles: false });
    }
  },

  loadFileContent: async (path: string) => {
    set({ activeFile: path });
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        const content = data.content ?? '';
        set({ activeFileContent: content });
        return content;
      }
    } catch (e) {
      console.warn('Failed to load file content:', e);
    }
    const localContent = get().readFile(path) || '';
    set({ activeFileContent: localContent });
    return localContent;
  },

  saveFileContent: async (path: string, content: string) => {
    get().writeFile(path, content);
    set({ activeFileContent: content });
  },

  fetchCheckpoints: async () => {
    try {
      const res = await fetch('/api/workspace/git/checkpoints');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.checkpoints)) {
          set({ checkpoints: data.checkpoints });
        }
      }
    } catch (e) {
      console.warn('Failed to fetch git checkpoints:', e);
    }
  },

  readFile: (path) => {
    const node = findNodeByPath(get().fileTree, path);
    return node?.content;
  },

  writeFile: (path, content) => {
    set((state) => ({
      fileTree: updateNodeContent(state.fileTree, path, content)
    }));
    // Sync to real server
    fetch('/api/workspace/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    }).catch(err => console.error('Failed to sync file write:', err));
  },

  createFile: (path, content = '') => {
    set((state) => {
      const parts = path.split('/').filter(Boolean);
      const fileName = parts[parts.length - 1] || 'new_file';
      const newNode: FileNode = {
        name: fileName,
        type: 'file',
        path,
        content,
        size: content.length,
        updatedAt: Date.now(),
        isModified: true
      };
      return {
        fileTree: [...state.fileTree, newNode],
        activeFile: path
      };
    });
    // Sync to real server
    fetch('/api/workspace/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    }).catch(err => console.error('Failed to sync file create:', err));
  },

  deleteFile: (path) => {
    set((state) => ({
      fileTree: removeNodeByPath(state.fileTree, path),
      activeFile: state.activeFile === path ? undefined : state.activeFile
    }));
    // Sync to real server
    fetch(`/api/workspace/file?path=${encodeURIComponent(path)}`, {
      method: 'DELETE'
    }).catch(err => console.error('Failed to sync file delete:', err));
  },

  patchFile: (path, search, replace) => {
    const current = get().readFile(path);
    if (!current || !current.includes(search)) return false;
    const updated = current.replace(search, replace);
    get().writeFile(path, updated);
    return true;
  },

  setActiveFile: (path) => set({ activeFile: path }),

  // ProcessManager & Terminal
  executeTerminalCommand: async (rawCommand) => {
    const cmd = rawCommand.trim();
    if (!cmd) return;

    const procId = get().activeProcessId || 'proc-dev';

    if (cmd === 'clear') {
      get().clearTerminal();
      return;
    }

    set((state) => ({
      processes: state.processes.map(p => 
        p.id === procId ? { ...p, stdout: [...p.stdout, `$ ${cmd}`] } : p
      )
    }));

    try {
      const res = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      const outputLines: string[] = [];
      if (data.stdout) {
        outputLines.push(...data.stdout.split('\n'));
      }
      if (data.stderr) {
        outputLines.push(...data.stderr.split('\n').map((l: string) => `[stderr] ${l}`));
      }
      if (outputLines.length === 0 && data.success) {
        outputLines.push('(Command completed with no output)');
      }
      set((state) => ({
        processes: state.processes.map(p => 
          p.id === procId ? { ...p, stdout: [...p.stdout, ...outputLines.filter(Boolean)] } : p
        )
      }));
    } catch (err: any) {
      set((state) => ({
        processes: state.processes.map(p => 
          p.id === procId ? { ...p, stdout: [...p.stdout, `[ERROR] ${err.message}`] } : p
        )
      }));
    }
  },

  startProcess: (command) => {
    const id = `proc-${Date.now()}`;
    const newProc: Process = {
      id,
      command,
      status: 'running',
      stdout: [`$ ${command}`, `Process started [PID ${Math.floor(1000 + Math.random() * 9000)}]`],
      stderr: [],
      startTime: Date.now()
    };
    set((state) => ({
      processes: [...state.processes, newProc],
      activeProcessId: id
    }));
    return id;
  },

  stopProcess: (id) => {
    set((state) => ({
      processes: state.processes.map(p => 
        p.id === id ? { ...p, status: 'stopped', endTime: Date.now() } : p
      )
    }));
  },

  clearTerminal: () => {
    const procId = get().activeProcessId;
    set((state) => ({
      processes: state.processes.map(p => 
        p.id === procId ? { ...p, stdout: [] } : p
      )
    }));
  },

  setDevServerStatus: (status, url) => {
    set({ devServerStatus: status, devServerUrl: url });
  },

  restartDevServer: async () => {
    set({ devServerStatus: 'starting' });
    await new Promise(r => setTimeout(r, 600));
    set({ devServerStatus: 'running', devServerUrl: 'http://localhost:3000/' });
    get().addConsoleEntry('info', 'Dev server restarted on port 3000.', 'Vite');
  },

  setBrowserUrl: (url) => set({ browserUrl: url }),

  reloadBrowser: () => {
    get().addConsoleEntry('info', `Reloading ${get().browserUrl}`, 'BrowserPreview');
  },

  addConsoleEntry: (level, message, source = 'app') => {
    const entry: ConsoleEntry = {
      id: `cons-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      level,
      message,
      source
    };
    set((state) => ({
      consoleLogs: [entry, ...state.consoleLogs.slice(0, 199)]
    }));
  },

  clearConsole: () => set({ consoleLogs: [] }),

  runTests: async () => {
    try {
      const res = await fetch('/api/workspace/verify', { method: 'POST' });
      const data = await res.json();
      const rawChecks = data.checks || data.report?.checks || data.tests || [];
      const testList = rawChecks.map((t: any, idx: number) => ({
        id: t.id || `check-${idx}`,
        name: t.name,
        suite: t.category || t.suite || 'Independent Gate',
        status: (t.passed !== undefined ? (t.passed ? 'PASS' : 'FAIL') : t.status) as 'PASS' | 'FAIL',
        durationMs: t.durationMs || 0,
        errorMessage: t.error
      }));
      set({
        tests: testList,
        verification: {
          isVerified: Boolean(data.success),
          lintPassed: Boolean(data.report?.checks?.find((c: any) => c.category === 'TYPESCRIPT')?.passed ?? data.lintPassed),
          testsPassed: Boolean(data.success),
          buildPassed: Boolean(data.report?.checks?.find((c: any) => c.category === 'BUILD')?.passed ?? data.buildPassed),
          lastChecked: Date.now(),
          error: data.summary || data.lintError || data.buildError
        }
      });
      return testList;
    } catch (err: any) {
      const failed = [{
        id: 't-err',
        name: 'Verification Server Error',
        suite: 'Runner',
        status: 'FAIL' as const,
        durationMs: 0,
        errorMessage: err.message
      }];
      set({
        tests: failed,
        verification: {
          isVerified: false,
          lintPassed: false,
          testsPassed: false,
          buildPassed: false,
          lastChecked: Date.now(),
          error: err.message
        }
      });
      return failed;
    }
  },

  runVerification: async () => {
    await get().runTests();
    return get().verification.isVerified;
  },

  createCheckpoint: (name, description) => {
    const tempId = `chk-${Date.now()}`;
    const newChk: Checkpoint = {
      id: tempId,
      name,
      description,
      timestamp: Date.now(),
      gitCommitHash: 'pending...',
      author: 'agent-os',
      branch: get().currentBranch,
      modifiedFiles: []
    };
    set((state) => ({
      checkpoints: [newChk, ...state.checkpoints]
    }));

    // Trigger real git commit
    fetch('/api/workspace/git/checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    })
      .then(res => res.json())
      .then(data => {
        if (data.hash) {
          set((state) => ({
            checkpoints: state.checkpoints.map(c => 
              c.id === tempId ? { ...c, id: data.hash, gitCommitHash: data.hash } : c
            )
          }));
        }
      })
      .catch(err => console.error('Git checkpoint failed:', err));

    return newChk;
  },

  restoreCheckpoint: (id) => {
    const chk = get().checkpoints.find(c => c.id === id);
    if (!chk) return false;
    const hash = chk.gitCommitHash;
    if (hash && hash !== 'pending...') {
      fetch('/api/workspace/git/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            get().executeTerminalCommand(`echo Switched to checkpoint ${hash}`);
          }
        })
        .catch(err => console.error('Git restore failed:', err));
    }
    return true;
  }
}));
