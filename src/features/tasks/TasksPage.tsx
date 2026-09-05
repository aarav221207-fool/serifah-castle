import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAgentStore } from '../../store/useAgentStore';
import { CheckSquare, Circle, Cpu, CheckCircle2, ShieldAlert } from 'lucide-react';

export function TasksPage() {
  const { tasks } = useTaskStore();
  const { agents } = useAgentStore();

  return (
    <div className="flex flex-col h-full space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task & Execution Timeline</h1>
          <p className="text-sm text-zinc-500 mt-1">Review the execution graph, task statuses, and assigned agents.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 uppercase border-b border-zinc-200 dark:border-zinc-800 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {tasks.map(task => {
              const agent = agents.find(a => a.id === task.assignedAgentId);
              return (
                <tr key={task.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-4 w-12">
                    {task.status === 'VERIFIED' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
                     task.status === 'IN_PROGRESS' ? <Cpu className="w-5 h-5 text-blue-500 animate-pulse" /> :
                     <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</div>
                    <div className="text-xs text-zinc-500 mt-1">{task.description}</div>
                    
                    {task.dependencies.length > 0 && (
                      <div className="mt-2 text-[10px] text-zinc-500 font-mono">
                        Requires: {task.dependencies.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {task.category}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {agent ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Cpu className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{agent.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {task.proofStatus === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Proven
                      </span>
                    ) : task.proofStatus === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        <ShieldAlert className="w-3.5 h-3.5" /> Pending
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">No proof</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
