import React, { useState } from 'react';
import { useSandboxStore } from '../../store/useSandboxStore';
import { useGitHubStore } from '../../store/useGitHubStore';
import { 
  Terminal as TerminalIcon, 
  Folder, 
  File as FileIcon, 
  Play, 
  Square, 
  RotateCcw, 
  Monitor, 
  FileCode2, 
  History,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  ExternalLink,
  Code2,
  ShieldCheck,
  UploadCloud
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FileNode } from '../../types/sandbox';
import { cn } from '../../lib/utils';

export function SandboxContent() {
  const [activeTab, setActiveTab] = useState<'editor' | 'terminal' | 'browser' | 'tests' | 'checkpoints'>('editor');
  
  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sandbox Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Sandbox Environment</h1>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              CORE SYSTEM SERVICE
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Isolated execution container providing virtual FileSystem, ProcessManager, Terminal, and Live DevServer.
          </p>
        </div>

        {/* Global Controls */}
        <DevServerStatusControl />
      </div>

      {/* Main Sandbox Window */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white dark:bg-zinc-950">
        {/* File Explorer Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col">
          <FileExplorerHeader />
          <div className="flex-1 overflow-auto p-2">
            <FileTree />
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar Tabs */}
          <div className="h-11 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center px-3 overflow-x-auto shrink-0">
            <div className="flex gap-1.5 min-w-max">
              <TabButton 
                active={activeTab === 'editor'} 
                onClick={() => setActiveTab('editor')} 
                icon={<FileCode2 className="w-3.5 h-3.5" />} 
                label="Source Editor" 
              />
              <TabButton 
                active={activeTab === 'terminal'} 
                onClick={() => setActiveTab('terminal')} 
                icon={<TerminalIcon className="w-3.5 h-3.5" />} 
                label="Interactive Terminal" 
              />
              <TabButton 
                active={activeTab === 'browser'} 
                onClick={() => setActiveTab('browser')} 
                icon={<Monitor className="w-3.5 h-3.5" />} 
                label="Browser Preview" 
              />
              <TabButton 
                active={activeTab === 'tests'} 
                onClick={() => setActiveTab('tests')} 
                icon={<FlaskConical className="w-3.5 h-3.5" />} 
                label="Test Runner" 
              />
              <TabButton 
                active={activeTab === 'checkpoints'} 
                onClick={() => setActiveTab('checkpoints')} 
                icon={<History className="w-3.5 h-3.5" />} 
                label="Git Checkpoints" 
              />
            </div>
          </div>
          
          {/* Active Tab View */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {activeTab === 'editor' && <InteractiveEditor />}
            {activeTab === 'terminal' && <InteractiveTerminal />}
            {activeTab === 'browser' && <InteractiveBrowserPreview />}
            {activeTab === 'tests' && <InteractiveTestRunner />}
            {activeTab === 'checkpoints' && <InteractiveCheckpoints />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DevServerStatusControl() {
  const devServerStatus = useSandboxStore((s) => s.devServerStatus);
  const devServerUrl = useSandboxStore((s) => s.devServerUrl);
  const restartDevServer = useSandboxStore((s) => s.restartDevServer);
  const setDevServerStatus = useSandboxStore((s) => s.setDevServerStatus);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs">
        <span className={cn(
          "w-2.5 h-2.5 rounded-full",
          devServerStatus === 'running' ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
        )} />
        <span className="font-semibold capitalize text-zinc-700 dark:text-zinc-300">
          DevServer: {devServerStatus}
        </span>
        <span className="font-mono text-zinc-400">({devServerUrl || 'port 3000'})</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => restartDevServer()}
        className="gap-1.5 h-8 text-xs font-medium"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Restart</span>
      </Button>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
        active 
          ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-zinc-700" 
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/40 border border-transparent"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FileExplorerHeader() {
  const { createFile } = useSandboxStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const path = newFileName.startsWith('/') ? newFileName : `/src/${newFileName}`;
    createFile(path, '// New file created in sandbox\n');
    setNewFileName('');
    setIsCreating(false);
  };

  return (
    <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">File Explorer</span>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="p-1 text-zinc-500 hover:text-blue-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
          title="Create New File"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="mt-1 flex gap-1">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="e.g. Component.tsx"
            autoFocus
            className="flex-1 px-2 py-1 text-xs rounded border border-blue-500 bg-white dark:bg-zinc-950 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
          <button type="submit" className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold">
            Add
          </button>
        </form>
      )}
    </div>
  );
}

function FileTree() {
  const { fileTree, activeFile, setActiveFile, deleteFile } = useSandboxStore();

  const renderNode = (node: FileNode, depth = 0) => {
    const isSelected = activeFile === node.path;

    return (
      <div key={node.path}>
        <div 
          className={cn(
            "flex items-center justify-between py-1 px-2 text-xs rounded-md cursor-pointer group transition-colors",
            isSelected && node.type === 'file'
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" 
              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
          )}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => node.type === 'file' && setActiveFile(node.path)}
        >
          <div className="flex items-center gap-2 truncate">
            {node.type === 'directory' ? (
              <Folder className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <FileIcon className="w-3.5 h-3.5 text-blue-500/70" />
            )}
            <span className="truncate font-mono">{node.name}</span>
          </div>

          {node.type === 'file' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteFile(node.path);
              }}
              className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 p-0.5"
              title="Delete File"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        {node.type === 'directory' && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return <div className="space-y-0.5">{fileTree.map(node => renderNode(node))}</div>;
}

function InteractiveEditor() {
  const { activeFile, readFile, writeFile } = useSandboxStore();
  const fileContent = activeFile ? readFile(activeFile) ?? '' : '';
  const [localContent, setLocalContent] = useState(fileContent);
  const [isSaved, setIsSaved] = useState(true);

  React.useEffect(() => {
    setLocalContent(fileContent);
    setIsSaved(true);
  }, [activeFile, fileContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContent(e.target.value);
    setIsSaved(false);
  };

  const handleSave = () => {
    if (!activeFile) return;
    writeFile(activeFile, localContent);
    setIsSaved(true);
  };

  if (!activeFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8 text-center">
        <FileCode2 className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
        <p className="text-sm font-medium">Select a source file from the explorer to view and edit.</p>
        <p className="text-xs text-zinc-500 mt-1">Changes are live in the virtual FileSystem.</p>
      </div>
    );
  }

  const lines = localContent.split('\n');

  return (
    <div className="flex flex-col h-full bg-[#18181b] text-zinc-200 font-mono text-xs">
      {/* File Action Toolbar */}
      <div className="h-9 px-4 border-b border-zinc-800 bg-[#121214] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">{activeFile}</span>
          {!isSaved && (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaved}
            className={cn(
              "gap-1.5 h-7 px-2.5 text-xs font-medium",
              isSaved ? "opacity-50" : "bg-blue-600 hover:bg-blue-500 text-white"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Saved' : 'Save File'}</span>
          </Button>
        </div>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className="flex-1 flex overflow-auto">
        {/* Line Numbers */}
        <div className="py-3 px-2.5 select-none text-zinc-600 text-right font-mono text-xs bg-[#121214]/60 border-r border-zinc-800/80 shrink-0 min-w-[42px]">
          {lines.map((_, i) => (
            <div key={i} className="leading-5">{i + 1}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          value={localContent}
          onChange={handleChange}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
              e.preventDefault();
              handleSave();
            }
          }}
          spellCheck={false}
          className="flex-1 p-3 bg-transparent text-zinc-200 font-mono text-xs leading-5 resize-none focus:outline-none whitespace-pre"
        />
      </div>
    </div>
  );
}

function InteractiveTerminal() {
  const { processes, activeProcessId, executeTerminalCommand, clearTerminal, restartDevServer } = useSandboxStore();
  const currentProcess = processes.find(p => p.id === activeProcessId) || processes[0];
  const [commandInput, setCommandInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    executeTerminalCommand(commandInput.trim());
    setCommandInput('');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 font-mono text-xs">
      {/* Terminal Toolbar */}
      <div className="h-9 px-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-zinc-300 font-semibold">Sandbox Terminal Session</span>
          <span className="text-[10px] text-zinc-500">(type 'help' for command manual)</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => executeTerminalCommand('npm test')} className="h-7 text-xs text-zinc-400 hover:text-white">
            Run Tests
          </Button>
          <Button variant="ghost" size="sm" onClick={() => executeTerminalCommand('npm run build')} className="h-7 text-xs text-zinc-400 hover:text-white">
            Build
          </Button>
          <Button variant="ghost" size="sm" onClick={() => restartDevServer()} className="h-7 text-xs text-zinc-400 hover:text-white">
            Restart Dev
          </Button>
          <Button variant="ghost" size="sm" onClick={clearTerminal} className="h-7 text-xs text-zinc-400 hover:text-white">
            Clear
          </Button>
        </div>
      </div>

      {/* Stdout Output Area */}
      <div className="flex-1 p-4 overflow-auto text-zinc-300 space-y-1">
        {currentProcess?.stdout.map((line, idx) => (
          <div 
            key={idx} 
            className={cn(
              "leading-5 whitespace-pre-wrap",
              line.startsWith('$') ? "text-emerald-400 font-bold" :
              line.includes('✓') || line.includes('PASS') ? "text-emerald-400" :
              line.includes('error') || line.includes('FAIL') ? "text-red-400" :
              line.includes('ready in') ? "text-blue-400" : "text-zinc-400"
            )}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Interactive Command Input Form */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
        <span className="text-emerald-400 font-bold pl-2">$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Enter command (e.g. ls, cat package.json, npm test, git status)..."
          className="flex-1 bg-transparent text-zinc-200 font-mono text-xs focus:outline-none"
        />
        <Button type="submit" size="sm" className="h-7 px-3 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
          Execute
        </Button>
      </form>
    </div>
  );
}

function InteractiveBrowserPreview() {
  const { browserUrl, devServerStatus, consoleLogs, addConsoleEntry, clearConsole, reloadBrowser } = useSandboxStore();
  const [subTab, setSubTab] = useState<'preview' | 'console'>('preview');

  return (
    <div className="flex flex-col h-full bg-zinc-100 dark:bg-zinc-900">
      {/* Address Bar */}
      <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-3 shrink-0 bg-white dark:bg-zinc-950">
        <button 
          onClick={reloadBrowser} 
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          title="Reload preview"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
          <span>{browserUrl}</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            HTTP 200 OK
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSubTab('preview')}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded transition-colors",
              subTab === 'preview' ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
            )}
          >
            Viewport
          </button>
          <button
            onClick={() => setSubTab('console')}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5",
              subTab === 'console' ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
            )}
          >
            <span>Console</span>
            <span className="text-[10px] px-1 rounded bg-zinc-300 dark:bg-zinc-700">{consoleLogs.length}</span>
          </button>
        </div>
      </div>

      {/* Subtab View */}
      {subTab === 'preview' ? (
        <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 flex flex-col relative overflow-hidden">
          <iframe
            key={browserUrl}
            src="/workspace-preview/"
            title="Workspace Runtime Preview"
            className="w-full h-full border-0 bg-white dark:bg-zinc-900"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      ) : (
        <div className="flex-1 bg-zinc-950 p-4 font-mono text-xs overflow-auto flex flex-col">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-zinc-800 text-zinc-500">
            <span>Browser Developer Console Logs</span>
            <button onClick={clearConsole} className="hover:text-zinc-300">Clear</button>
          </div>
          <div className="space-y-1.5 flex-1 overflow-auto">
            {consoleLogs.map((log) => (
              <div 
                key={log.id} 
                className={cn(
                  "p-2 rounded border leading-relaxed flex items-start justify-between gap-2",
                  log.level === 'error' ? "bg-red-950/20 border-red-900/40 text-red-300" :
                  log.level === 'warn' ? "bg-amber-950/20 border-amber-900/40 text-amber-300" :
                  "bg-zinc-900/40 border-zinc-800/60 text-zinc-300"
                )}
              >
                <span>{log.message}</span>
                <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                  {log.source && `[${log.source}] `}
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InteractiveTestRunner() {
  const { tests, runTests } = useSandboxStore();
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    await runTests();
    setIsRunning(false);
  };

  const passCount = tests.filter(t => t.status === 'PASS').length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Automated Sandbox Test Harness
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              {passCount} / {tests.length} PASSING
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Executes unit and integration test fixtures against current sandbox state.
          </p>
        </div>

        <Button
          onClick={handleRun}
          disabled={isRunning}
          className="gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isRunning ? 'Running Test Suites...' : 'Run All Tests'}</span>
        </Button>
      </div>

      <div className="space-y-3">
        {tests.map((test) => (
          <div
            key={test.id}
            className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{test.name}</div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">{test.suite}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] font-mono text-zinc-500">{test.durationMs}ms</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                {test.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InteractiveCheckpoints() {
  const { checkpoints, createCheckpoint, restoreCheckpoint, currentBranch, verification, runVerification } = useSandboxStore();
  const { pushToRemote, isConnected } = useGitHubStore();
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [newCheckpointDesc, setNewCheckpointDesc] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointName.trim()) return;
    createCheckpoint(newCheckpointName.trim(), newCheckpointDesc.trim() || 'Manual checkpoint');
    setNewCheckpointName('');
    setNewCheckpointDesc('');
    setShowModal(false);
  };

  const handlePushToGitHub = async () => {
    setIsPushing(true);
    setPushStatusMessage(null);
    try {
      const result = await pushToRemote();
      setPushStatusMessage(result.message);
    } catch (err: any) {
      setPushStatusMessage(err.message || 'Push failed');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 p-6 overflow-auto">
      {/* Verification Gate */}
      <div className="mb-6 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck className={cn("w-4 h-4", verification.isVerified ? "text-emerald-500" : "text-amber-500")} />
              <span>Release Verification Gate</span>
              <span className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase",
                verification.isVerified ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
              )}>
                {verification.isVerified ? "VERIFIED — READY TO SHIP" : "UNVERIFIED — RELEASE LOCKED"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Strict Engineering Rule: NEVER PUSH UNVERIFIED CODE. All tests, linter checks, and builds must pass before release.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => runVerification()}
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Run Verification</span>
            </Button>
            <Button
              disabled={!verification.isVerified || isPushing}
              onClick={handlePushToGitHub}
              size="sm"
              className={cn(
                "text-xs font-semibold gap-1.5 text-white transition-colors",
                verification.isVerified ? "bg-emerald-600 hover:bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-60"
              )}
            >
              <UploadCloud className="w-3 h-3" />
              <span>{isPushing ? "Pushing..." : "Push to GitHub"}</span>
            </Button>
          </div>
        </div>

        {pushStatusMessage && (
          <div className="mb-2 p-2 rounded text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono">
            {pushStatusMessage}
          </div>
        )}

        {/* Verification Check Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs font-mono">
          <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500">LINTER & TYPES</span>
            <span className={cn("font-bold text-[11px]", verification.lintPassed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
              {verification.lintPassed ? "PASS" : "PENDING"}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500">TEST SUITE</span>
            <span className={cn("font-bold text-[11px]", verification.testsPassed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
              {verification.testsPassed ? "PASS" : "PENDING"}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500">PRODUCTION BUILD</span>
            <span className={cn("font-bold text-[11px]", verification.buildPassed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
              {verification.buildPassed ? "PASS" : "PENDING"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Git Checkpoints & Rollbacks
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
              Branch: {currentBranch}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Immutable file snapshots taken automatically before code mutations and repairs.
          </p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="gap-2 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Checkpoint</span>
        </Button>
      </div>

      {/* Checkpoint Creation Modal */}
      {showModal && (
        <div className="mb-6 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/10">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Take Snapshot Checkpoint</div>
            <input
              type="text"
              value={newCheckpointName}
              onChange={(e) => setNewCheckpointName(e.target.value)}
              placeholder="Checkpoint Tag (e.g. pre-refactor-api-gateway)"
              className="w-full px-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
            <input
              type="text"
              value={newCheckpointDesc}
              onChange={(e) => setNewCheckpointDesc(e.target.value)}
              placeholder="Description (e.g. Stable state prior to modifying modelRouter)"
              className="w-full px-3 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs bg-blue-600 hover:bg-blue-500 text-white">
                Save Checkpoint
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Checkpoint List */}
      <div className="space-y-3">
        {checkpoints.map((chk) => (
          <div 
            key={chk.id}
            className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                  {chk.gitCommitHash}
                </span>
                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                  {chk.name}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">
                {new Date(chk.timestamp).toLocaleString()}
              </span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
              {chk.description}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                <span>Files:</span>
                {chk.modifiedFiles.map((f, i) => (
                  <span key={i} className="font-mono px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {f}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => restoreCheckpoint(chk.id)}
                  className="h-7 text-xs font-medium"
                >
                  Rollback to Checkpoint
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
