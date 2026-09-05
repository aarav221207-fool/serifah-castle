import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  Clock, 
  FolderGit2,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useSandboxStore } from '../../store/useSandboxStore';
import { cn } from '../../lib/utils';

export function GitPage() {
  const { checkpoints, fetchCheckpoints, createCheckpoint, restoreCheckpoint } = useSandboxStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    await createCheckpoint(name.trim(), desc.trim());
    setName('');
    setDesc('');
    setIsCreating(false);
  };

  const handleRestore = async (hash: string) => {
    if (!confirm(`Restore workspace to checkpoint ${hash}? Any uncommitted changes will be replaced.`)) return;
    setIsRestoring(hash);
    await restoreCheckpoint(hash);
    setIsRestoring(null);
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-500" />
            <span>Git Checkpoints</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Real Git repository checkpoints tracking autonomous changes</p>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchCheckpoints()}
          className="gap-1.5 h-8 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Create Checkpoint Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Create Manual Checkpoint</h2>
        <form onSubmit={handleCreateCheckpoint} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Checkpoint title (e.g. 'feat: user auth')"
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Description (optional)"
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
            />
            <Button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>{isCreating ? 'Saving...' : 'Checkpoint'}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Checkpoints History */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 font-mono text-xs font-semibold text-zinc-500 uppercase">
          Commit History ({checkpoints.length})
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {checkpoints.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              No Git checkpoints recorded yet. Workstation initializes a checkpoint automatically on every build.
            </div>
          ) : (
            checkpoints.map((cp) => (
              <div key={cp.id} className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md border border-blue-200 dark:border-blue-800/50 shrink-0 mt-0.5">
                    <GitCommit className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {cp.name}
                      </span>
                      <span className="px-1.5 py-0.5 font-mono text-[10px] rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                        {cp.gitCommitHash || cp.id.slice(0, 7)}
                      </span>
                    </div>
                    {cp.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{cp.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(cp.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(cp.gitCommitHash || cp.id)}
                  disabled={isRestoring === (cp.gitCommitHash || cp.id)}
                  className="h-8 text-xs gap-1 shrink-0 text-zinc-700 dark:text-zinc-300"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isRestoring === (cp.gitCommitHash || cp.id) ? 'Restoring...' : 'Restore'}</span>
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
