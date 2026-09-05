import React from 'react';
import { useAgentStore } from '../../store/useAgentStore';
import { Network, Cpu, Shield, Wrench } from 'lucide-react';

export function AgentsPage() {
  const { agents } = useAgentStore();

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Runtime</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage specialized autonomous agents and their capabilities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 overflow-auto pb-6">
        {agents.map(agent => (
          <div key={agent.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 bg-white dark:bg-zinc-900 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">{agent.name}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{agent.role.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                agent.status === 'IDLE' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' :
                agent.status === 'WORKING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {agent.status}
              </span>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 flex-1">
              {agent.description}
            </p>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1.5 mb-2">
                  <Wrench className="w-3.5 h-3.5" /> Allowed Tools
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {agent.allowedTools.map(tool => (
                    <span key={tool} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1.5 mb-2">
                  <Cpu className="w-3.5 h-3.5" /> Model Requirements
                </h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(agent.preferredModelCapabilities).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="text-zinc-500 capitalize">{key}:</span>
                      <span className="font-medium">{val.toString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Autonomy Level
                  </h4>
                  <span className="text-xs font-mono text-zinc-500">{agent.maximumAutonomy}/10</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(agent.maximumAutonomy / 10) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
