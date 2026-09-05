import React, { useState, useEffect } from 'react';
import { Github, Key, Loader2, X, GitBranch, Database } from 'lucide-react';
import { useGitHubStore } from '../../store/useGitHubStore';
import { Button } from '../ui/Button';

interface Props {
  onClose: () => void;
}

export function GithubConnectionModal({ onClose }: Props) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [repos, setRepos] = useState<any[]>([]);
  const { isConnected, connectGitHub, isSyncing, fetchRepositories, selectRepo } = useGitHubStore();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    
    setError('');
    const success = await connectGitHub(token.trim());
    if (success) {
      loadRepos();
    } else {
      setError('Invalid or expired Personal Access Token.');
    }
  };

  const loadRepos = async () => {
    const data = await fetchRepositories();
    setRepos(data);
  };

  useEffect(() => {
    if (isConnected && repos.length === 0) {
      loadRepos();
    }
  }, [isConnected]);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Github className="w-5 h-5" />
            <h2 className="font-bold">{isConnected ? 'Select Repository' : 'Connect GitHub'}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isConnected ? (
          <form onSubmit={handleConnect} className="p-6 space-y-6">
            <div className="space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Provide a GitHub Personal Access Token with <strong>repo</strong> permissions.
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Personal Access Token
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="ghp_..."
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    autoFocus
                  />
                </div>
                {error && <p className="text-xs font-medium text-red-500 mt-1">{error}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!token.trim() || isSyncing} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 min-w-[100px]">
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
              Select a repository to connect to this project.
            </p>
            {repos.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {repos.map(repo => (
                  <button
                    key={repo.id}
                    onClick={() => {
                      selectRepo(repo);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                        {repo.name}
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                        <GitBranch className="w-3 h-3" />
                        {repo.defaultBranch}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
