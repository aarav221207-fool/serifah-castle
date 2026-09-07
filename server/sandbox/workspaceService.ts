import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { exec, spawn, ChildProcess } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export interface CommandExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface RuntimeStatus {
  status: 'stopped' | 'starting' | 'running' | 'error';
  port?: number;
  url: string;
  lastBuildTime?: number;
  logs: string[];
  error?: string;
}

export class WorkspaceService {
  private workspaceDir: string;
  private runtimeStatus: RuntimeStatus = {
    status: 'stopped',
    url: '/workspace-preview/',
    logs: []
  };

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  getWorkspaceDir(): string {
    return this.workspaceDir;
  }

  async initializeWorkspace(): Promise<void> {
    await fs.mkdir(this.workspaceDir, { recursive: true });
    await fs.mkdir(path.join(this.workspaceDir, 'src'), { recursive: true });

    // 1. Ensure package.json exists in workspace
    const pkgPath = path.join(this.workspaceDir, 'package.json');
    if (!fsSync.existsSync(pkgPath)) {
      const pkgContent = {
        name: 'agent-workspace-app',
        private: true,
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          check: 'tsc --noEmit'
        },
        dependencies: {
          react: '^19.0.1',
          'react-dom': '^19.0.1',
          'lucide-react': '^0.546.0'
        }
      };
      await fs.writeFile(pkgPath, JSON.stringify(pkgContent, null, 2), 'utf-8');
    }

    // 2. Symlink node_modules from container root if not present
    const nodeModulesPath = path.join(this.workspaceDir, 'node_modules');
    const rootNodeModules = path.join(process.cwd(), 'node_modules');
    if (!fsSync.existsSync(nodeModulesPath) && fsSync.existsSync(rootNodeModules)) {
      try {
        await fs.symlink(rootNodeModules, nodeModulesPath, 'dir');
      } catch (err: any) {
        // Fallback or ignore if symlink failed
        console.warn('[WorkspaceService] node_modules symlink warning:', err.message);
      }
    }

    // 3. Ensure tsconfig.json exists
    const tsconfigPath = path.join(this.workspaceDir, 'tsconfig.json');
    if (!fsSync.existsSync(tsconfigPath)) {
      const tsconfigContent = {
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: false,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: false,
          noUnusedLocals: false,
          noUnusedParameters: false,
          noFallthroughCasesInSwitch: true
        },
        include: ['src']
      };
      await fs.writeFile(tsconfigPath, JSON.stringify(tsconfigContent, null, 2), 'utf-8');
    }

    // 4. Ensure vite.config.ts exists with base: '/workspace-preview/'
    const viteConfigPath = path.join(this.workspaceDir, 'vite.config.ts');
    if (!fsSync.existsSync(viteConfigPath)) {
      const viteConfigContent = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/workspace-preview/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
`;
      await fs.writeFile(viteConfigPath, viteConfigContent, 'utf-8');
    }

    // 5. Ensure index.html exists
    const indexHtmlPath = path.join(this.workspaceDir, 'index.html');
    if (!fsSync.existsSync(indexHtmlPath)) {
      const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AGENT_OS Workspace App</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-zinc-50 text-zinc-900 m-0 p-0 antialiased font-sans">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
      await fs.writeFile(indexHtmlPath, indexHtml, 'utf-8');
    }

    // 6. Ensure src/main.tsx exists
    const mainTsxPath = path.join(this.workspaceDir, 'src', 'main.tsx');
    if (!fsSync.existsSync(mainTsxPath)) {
      const mainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
      await fs.writeFile(mainTsxPath, mainTsx, 'utf-8');
    }

    // 7. Ensure src/App.tsx exists initially
    const appTsxPath = path.join(this.workspaceDir, 'src', 'App.tsx');
    if (!fsSync.existsSync(appTsxPath)) {
      const initialApp = `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-6">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md text-center border border-zinc-200">
        <h1 className="text-xl font-bold text-zinc-900 mb-2">AGENT_OS Workspace</h1>
        <p className="text-zinc-600 text-sm">Waiting for builder agent instruction...</p>
      </div>
    </div>
  );
}
`;
      await fs.writeFile(appTsxPath, initialApp, 'utf-8');
    }
  }

  // --- Filesystem Operations ---
  async listFiles(): Promise<string[]> {
    const files: string[] = [];
    const readDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === '.git' || e.name === 'node_modules' || e.name === 'dist') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          await readDir(full);
        } else {
          files.push(path.relative(this.workspaceDir, full));
        }
      }
    };
    try {
      await readDir(this.workspaceDir);
    } catch {
      // Empty
    }
    return files;
  }

  async readFile(relPath: string): Promise<string> {
    const safeRel = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const absPath = path.join(this.workspaceDir, safeRel);
    return fs.readFile(absPath, 'utf-8');
  }

  async writeFile(relPath: string, content: string): Promise<void> {
    const safeRel = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const absPath = path.join(this.workspaceDir, safeRel);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, content, 'utf-8');
  }

  async deleteFile(relPath: string): Promise<boolean> {
    const safeRel = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const absPath = path.join(this.workspaceDir, safeRel);
    try {
      await fs.unlink(absPath);
      return true;
    } catch {
      return false;
    }
  }

  async verifyFilesExist(relPaths: string[]): Promise<{ allExist: boolean; missing: string[]; empty: string[] }> {
    const missing: string[] = [];
    const empty: string[] = [];

    for (const p of relPaths) {
      const safeRel = path.normalize(p).replace(/^(\.\.[\/\\])+/, '');
      const absPath = path.join(this.workspaceDir, safeRel);
      try {
        const stat = await fs.stat(absPath);
        if (stat.size === 0) {
          empty.push(safeRel);
        }
      } catch {
        missing.push(safeRel);
      }
    }

    return {
      allExist: missing.length === 0 && empty.length === 0,
      missing,
      empty
    };
  }

  // --- Real Command Execution ---
  async executeCommand(command: string, timeoutMs = 30000): Promise<CommandExecutionResult> {
    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workspaceDir,
        timeout: timeoutMs
      });
      return {
        command,
        exitCode: 0,
        stdout: stdout || '',
        stderr: stderr || '',
        durationMs: Date.now() - start,
        timedOut: false
      };
    } catch (err: any) {
      return {
        command,
        exitCode: typeof err.code === 'number' ? err.code : 1,
        stdout: err.stdout || '',
        stderr: err.stderr || err.message || '',
        durationMs: Date.now() - start,
        timedOut: err.killed && err.signal === 'SIGTERM'
      };
    }
  }

  // --- Real Build Execution (Phase 11) ---
  async buildProject(): Promise<CommandExecutionResult> {
    this.addLog(`Starting real build: npx vite build`);
    const res = await this.executeCommand('npx vite build', 45000);
    if (res.exitCode === 0) {
      this.runtimeStatus.lastBuildTime = Date.now();
      this.runtimeStatus.status = 'running';
      this.addLog(`Build passed successfully in ${res.durationMs}ms`);
    } else {
      this.runtimeStatus.status = 'error';
      this.runtimeStatus.error = res.stderr || res.stdout;
      this.addLog(`Build failed with exit code ${res.exitCode}: ${res.stderr || res.stdout}`);
    }
    return res;
  }

  // --- Real Runtime Management (Phase 12) ---
  async startRuntime(): Promise<RuntimeStatus> {
    this.runtimeStatus.status = 'starting';
    this.addLog('Initiating runtime startup...');
    const buildRes = await this.buildProject();
    if (buildRes.exitCode === 0) {
      this.runtimeStatus.status = 'running';
      this.runtimeStatus.url = '/workspace-preview/';
      this.runtimeStatus.error = undefined;
      this.addLog('Runtime successfully serving on /workspace-preview/');
    } else {
      this.runtimeStatus.status = 'error';
      this.runtimeStatus.error = buildRes.stderr || 'Build failed during startup';
      this.addLog(`Runtime startup error: ${this.runtimeStatus.error}`);
    }
    return this.getRuntimeStatus();
  }

  stopRuntime(): RuntimeStatus {
    this.runtimeStatus.status = 'stopped';
    this.addLog('Runtime stopped');
    return this.getRuntimeStatus();
  }

  restartRuntime(): Promise<RuntimeStatus> {
    this.stopRuntime();
    return this.startRuntime();
  }

  getRuntimeStatus(): RuntimeStatus {
    return { ...this.runtimeStatus };
  }

  private addLog(msg: string) {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    this.runtimeStatus.logs.push(entry);
    if (this.runtimeStatus.logs.length > 200) {
      this.runtimeStatus.logs.shift();
    }
  }
}
