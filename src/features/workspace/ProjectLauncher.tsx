import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Terminal, Github, Code2, FolderGit2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GithubConnectionModal } from '../../components/github/GithubConnectionModal';
import { useGitHubStore } from '../../store/useGitHubStore';

export function ProjectLauncher() {
  const { createProject } = useProjectStore();
  const { isConnected } = useGitHubStore();
  const [mode, setMode] = useState<'launcher' | 'new'>('launcher');
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  
  // Form State
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<'sandbox' | 'local' | 'github'>('sandbox');
  const [githubAction, setGithubAction] = useState<'none' | 'connect'>('none');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    createProject(projectName, description, location, githubAction);
  };

  if (mode === 'launcher') {
    return (
      <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-8">
          
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
              <Terminal className="w-8 h-8 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                AGENT_OS
              </h1>
              <p className="text-sm font-medium text-zinc-500 mt-2 uppercase tracking-widest">
                Autonomous Software Engineering Workstation
              </p>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <Button 
              onClick={() => setMode('new')}
              size="lg" 
              className="w-full justify-start py-6 text-base font-semibold shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mr-4">
                <Code2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col items-start">
                <span>+ NEW PROJECT</span>
                <span className="text-xs font-normal text-zinc-500">Create an empty workstation</span>
              </div>
            </Button>
            
            <Button 
              disabled
              size="lg" 
              className="w-full justify-start py-6 text-base font-semibold shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-70"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center mr-4">
                <FolderGit2 className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />
              </div>
              <div className="flex flex-col items-start">
                <span>OPEN EXISTING PROJECT</span>
                <span className="text-xs font-normal text-zinc-400 dark:text-zinc-600">Select a local directory</span>
              </div>
            </Button>
            
            <Button 
              onClick={() => setIsGithubModalOpen(true)}
              size="lg" 
              className="w-full justify-start py-6 text-base font-semibold shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center mr-4">
                <Github className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              </div>
              <div className="flex flex-col items-start">
                <span>{isConnected ? 'GITHUB CONNECTED' : 'CONNECT GITHUB'}</span>
                <span className="text-xs font-normal text-zinc-500">{isConnected ? 'Ready to clone repositories' : 'Authenticate to sync projects'}</span>
              </div>
            </Button>
          </div>
          
        </div>
      </div>
      {isGithubModalOpen && <GithubConnectionModal onClose={() => setIsGithubModalOpen(false)} />}
      </>
    );
  }

  return (
    <>
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-xl w-full">
        
        <button 
          onClick={() => setMode('launcher')}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8 flex items-center gap-2 transition-colors"
        >
          &larr; Back to launcher
        </button>
        
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Create New Project</h2>
            <p className="text-sm text-zinc-500">Initialize a new autonomous workstation environment.</p>
          </div>
          
          <form onSubmit={handleCreate} className="p-6 space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Project Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. Landslide Intelligence"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Optional description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Briefly describe the purpose of this project..."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Project location</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setLocation('sandbox')}
                  className={`px-4 py-3 border rounded-xl text-sm font-medium transition-all ${
                    location === 'sandbox' 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400 shadow-sm' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                  }`}
                >
                  Sandbox
                </button>
                <button type="button" disabled className="px-4 py-3 border rounded-xl text-sm font-medium bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-70">
                  Local
                </button>
                <button type="button" disabled className="px-4 py-3 border rounded-xl text-sm font-medium bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-70">
                  GitHub
                </button>
              </div>
            </div>
            
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">GitHub</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGithubAction('none')}
                  className={`px-4 py-3 border rounded-xl text-sm font-medium transition-all ${
                    githubAction === 'none' 
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                  }`}
                >
                  Don't connect yet
                </button>
                <button type="button" disabled className="px-4 py-3 border rounded-xl text-sm font-medium bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-70 flex items-center justify-center gap-2">
                  <Github className="w-4 h-4" />
                  Connect repository
                </button>
              </div>
            </div>
            
            <div className="pt-6">
              <Button 
                type="submit" 
                disabled={!projectName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm shadow-md"
              >
                CREATE PROJECT
              </Button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
    {isGithubModalOpen && <GithubConnectionModal onClose={() => setIsGithubModalOpen(false)} />}
    </>
  );
}
