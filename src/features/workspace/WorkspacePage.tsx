import React, { useState, useEffect } from 'react';
import { PromptComposer } from './PromptComposer';
import { SandboxContent } from '../sandbox/SandboxPage';
import { ActivityStream } from './ActivityStream';
import { useProjectStore } from '../../store/useProjectStore';
import { usePromptStore } from '../../store/usePromptStore';
import { useSandboxStore } from '../../store/useSandboxStore';
import { 
  Cpu, 
  Terminal, 
  FolderCode, 
  ShieldCheck, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Play,
  RotateCcw,
  Activity,
  Box
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function WorkspacePage() {
  const project = useProjectStore((s) => s.project);
  const { openSandbox, toggleSandbox } = usePromptStore();
  const [orchestratorState, setOrchestratorState] = useState<string>('IDLE');
  const [activeTab, setActiveTab] = useState<'none' | 'sandbox' | 'activity'>('none');

  useEffect(() => {
    // Poll orchestrator state periodically
    const checkState = async () => {
      try {
        const res = await fetch('/api/orchestrator/state');
        if (res.ok) {
          const data = await res.json();
          setOrchestratorState(data.state || 'IDLE');
        }
      } catch {
        // Quiet fallback
      }
    };
    checkState();
    const interval = setInterval(checkState, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto space-y-6 pb-12 overflow-y-auto px-2 sm:px-4">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
              AGENT_OS WORKSTATION
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
              {project?.name || 'Active Project'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            What do you want to build?
          </h1>
        </div>

        {/* Live Orchestrator State Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm text-xs">
            <span className={cn(
              "w-2 h-2 rounded-full",
              orchestratorState === 'IMPLEMENTATION' || orchestratorState === 'TESTING' ? "bg-blue-500 animate-ping" :
              orchestratorState === 'REPAIR' ? "bg-amber-500 animate-pulse" :
              orchestratorState === 'VERIFICATION' || orchestratorState === 'RELEASE' ? "bg-emerald-500" :
              "bg-zinc-400"
            )} />
            <span className="font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
              ORCHESTRATOR: {orchestratorState}
            </span>
          </div>
        </div>
      </div>

      {/* Dominant Large Prompt Composer */}
      <div className="w-full">
        <PromptComposer />
      </div>

      {/* Workspace Quick-Access Secondary Section (Collapsible / Non-intrusive) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'sandbox' ? 'none' : 'sandbox')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                activeTab === 'sandbox'
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Sandbox & DevServer</span>
              {activeTab === 'sandbox' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'activity' ? 'none' : 'activity')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                activeTab === 'activity'
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Activity Log</span>
              {activeTab === 'activity' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
            Workspace: .agent_workspace (Git tracking active)
          </span>
        </div>

        {/* Dynamic Expandable Drawer */}
        {activeTab === 'sandbox' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm h-[520px] transition-all">
            <SandboxContent />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm max-h-[400px] overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Live System Log</h3>
            <ActivityStream />
          </div>
        )}
      </div>
    </div>
  );
}
