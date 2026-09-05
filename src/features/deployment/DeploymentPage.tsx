import React, { useState } from 'react';
import { useGitHubStore } from '../../store/useGitHubStore';
import { 
  GitBranch as GitBranchIcon, 
  GitCommit as GitCommitIcon, 
  UploadCloud, 
  DownloadCloud, 
  Plus, 
  Check, 
  CheckCircle2, 
  Rocket, 
  RefreshCw,
  FolderGit2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export function DeploymentPage() {
  const {
    selectedRepo,
    isConnected,
    username,
    tokenMasked,
    branches,
    currentBranch,
    commits,
    stagedFiles,
    unstagedFiles,
    isSyncing,
    lastSyncTime,
    createBranch,
    switchBranch,
    stageFile,
    unstageFile,
    stageAll,
    createCommit,
    pushToRemote,
    pullFromRemote
  } = useGitHubStore();

  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim() || stagedFiles.length === 0) return;
    await createCommit(commitMessage.trim());
    setCommitMessage('');
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    createBranch(newBranchName.trim());
    setNewBranchName('');
    setShowBranchModal(false);
  };

  const handleShipWorkflow = async () => {
    setIsShipping(true);
    stageAll();
    await createCommit('chore: automated ship release build');
    const res = await pushToRemote();
    setIsShipping(false);
    setDeploySuccess(true);
    setSyncFeedback(res.message);
    setTimeout(() => {
      setDeploySuccess(false);
      setSyncFeedback(null);
    }, 5000);
  };

  const handlePull = async () => {
    const res = await pullFromRemote();
    setSyncFeedback(res.message);
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handlePush = async () => {
    const res = await pushToRemote();
    setSyncFeedback(res.message);
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  return (
    <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Ship & GitHub Deployment Station</h1>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
              GIT VIRTUAL ENGINE
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Stage changes, manage branches, author atomic commits, and push production builds to remote repositories.
          </p>
        </div>

        {/* Global Ship Action Button */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleShipWorkflow}
            disabled={isShipping}
            className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isShipping ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : deploySuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Rocket className="w-3.5 h-3.5" />
            )}
            <span>{isShipping ? 'Shipping to Production...' : deploySuccess ? 'Shipped Successfully!' : 'Automated Ship Workflow'}</span>
          </Button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-500" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Grid: Repository & Branch Control + Git Staging / Commit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Repository Info & Branches */}
        <div className="space-y-6">
          {/* Repo Info Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Connected Repository</span>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono font-bold",
                isConnected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-zinc-200 text-zinc-600"
              )}>
                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
              <FolderGit2 className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="truncate">{selectedRepo?.fullName || 'No repository selected'}</span>
            </div>

            <div className="text-xs text-zinc-500 space-y-1 pt-1 border-t border-zinc-200 dark:border-zinc-800 font-mono text-[11px]">
              <div>Default Branch: {selectedRepo?.defaultBranch || 'main'}</div>
              <div>User: {username || 'agent-operator'}</div>
              <div>Token: {tokenMasked || 'Not configured'}</div>
              {lastSyncTime && (
                <div>Last Synced: {new Date(lastSyncTime).toLocaleTimeString()}</div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePull}
                disabled={isSyncing}
                className="gap-1.5 flex-1 text-xs"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Pull</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePush}
                disabled={isSyncing}
                className="gap-1.5 flex-1 text-xs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Push</span>
              </Button>
            </div>
          </div>

          {/* Branch Manager */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Branch</span>
              <button
                onClick={() => setShowBranchModal(!showBranchModal)}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Branch</span>
              </button>
            </div>

            {showBranchModal && (
              <form onSubmit={handleCreateBranch} className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. feat/counsel-triple-synthesis"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono focus:outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowBranchModal(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="text-xs bg-blue-600 text-white">
                    Create
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-1">
              {branches.map((b) => (
                <button
                  key={b.name}
                  onClick={() => switchBranch(b.name)}
                  className={cn(
                    "w-full text-left p-2 rounded-md font-mono text-xs flex items-center justify-between transition-colors",
                    b.name === currentBranch
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GitBranchIcon className="w-3.5 h-3.5" />
                    <span>{b.name}</span>
                  </div>
                  {b.name === currentBranch && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Working Tree Staging & Commit Log */}
        <div className="lg:col-span-2 space-y-6">
          {/* Staging & Commit Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Working Tree Changes
              </span>
              <button
                onClick={stageAll}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Stage All Files
              </button>
            </div>

            {/* Staged Files */}
            <div>
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Staged Changes ({stagedFiles.length})</span>
              </div>
              {stagedFiles.length === 0 ? (
                <div className="text-xs text-zinc-400 italic p-2 bg-zinc-50 dark:bg-zinc-950 rounded">
                  No files staged for commit.
                </div>
              ) : (
                <div className="space-y-1">
                  {stagedFiles.map((file) => (
                    <div key={file.path} className="p-2 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs font-mono flex items-center justify-between">
                      <span className="text-zinc-800 dark:text-zinc-200">{file.path}</span>
                      <button onClick={() => unstageFile(file.path)} className="text-[11px] text-zinc-500 hover:text-red-500">
                        Unstage
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unstaged Files */}
            {unstagedFiles.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-zinc-500 mb-1.5">
                  Unstaged Modified Files ({unstagedFiles.length})
                </div>
                <div className="space-y-1">
                  {unstagedFiles.map((file) => (
                    <div key={file.path} className="p-2 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono flex items-center justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">{file.path}</span>
                      <button onClick={() => stageFile(file.path)} className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                        Stage
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commit Form */}
            <form onSubmit={handleCommit} className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message (e.g. feat: integrate multi-agent autonomous repair)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-zinc-400 font-mono">
                  Author: {username || 'agent-operator'} &lt;bot@agentos.internal&gt;
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={stagedFiles.length === 0 || !commitMessage.trim()}
                  className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  <GitCommitIcon className="w-3.5 h-3.5" />
                  <span>Commit Staged</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Commit History */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Commit History on {currentBranch} ({commits.length})
              </h3>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {commits.map((c) => (
                <div key={c.hash} className="p-3.5 text-xs space-y-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{c.message}</span>
                    <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                      {c.shortHash}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>{c.author}</span>
                    <span>{new Date(c.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
