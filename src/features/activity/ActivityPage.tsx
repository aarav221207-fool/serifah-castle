import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useRepairStore } from '../../store/useRepairStore';
import { 
  CheckCircle2, 
  Circle, 
  Play,
  Terminal,
  Activity,
  AlertTriangle,
  FolderGit2
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function ActivityPage() {
  const { tasks } = useTaskStore();
  const { repairHistory } = useRepairStore();

  const activities = [
    ...tasks.map(t => ({
      type: t.status === 'VERIFIED' ? 'success' : t.status === 'IN_PROGRESS' ? 'running' : 'pending',
      title: `Task: ${t.title}`,
      message: `${t.status === 'VERIFIED' ? 'Verified implementation' : t.status === 'IN_PROGRESS' ? 'Executing in sandbox' : 'Queued for execution'}.`,
      time: '5 mins ago',
      id: t.id
    })),
    ...repairHistory.map(r => ({
      type: 'repair',
      title: 'Autonomous Repair',
      message: `Detected and patched: ${r.title}`,
      time: '2 mins ago',
      id: r.id
    }))
  ];

  return (
    <div className="flex flex-col h-full space-y-8 max-w-4xl mx-auto pb-12">
      <div className="text-center py-6 sm:py-10 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
          Global Activity Stream
        </h1>
        <p className="text-sm text-zinc-500">
          A combined log of all orchestrator decisions, model outputs, verification runs, and sandbox repairs.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 sm:p-6 min-h-[300px]">
        {activities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-12">
            <Activity className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No activity yet</p>
            <p className="text-xs text-zinc-500 mt-1">Submit a prompt to start tracking activity.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activities.map((act) => (
               <div key={act.id} className="flex gap-4 group">
                 <div className="shrink-0 flex flex-col items-center">
                   <div className={cn(
                     "w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-zinc-900 z-10",
                     act.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                     act.type === 'running' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
                     act.type === 'pending' ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400' :
                     act.type === 'repair' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                     'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400'
                   )}>
                      {act.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                      {act.type === 'running' && <Play className="w-4 h-4" />}
                      {act.type === 'pending' && <Circle className="w-4 h-4" />}
                      {act.type === 'info' && <Terminal className="w-4 h-4" />}
                      {act.type === 'repair' && <AlertTriangle className="w-4 h-4" />}
                   </div>
                   <div className="w-px h-full bg-zinc-200 dark:bg-zinc-800 -my-2 group-last:hidden"></div>
                 </div>
                 
                 <div className="flex-1 pb-6 group-last:pb-0 min-w-0">
                   <div className="flex items-center justify-between mb-1">
                     <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate pr-4">{act.title}</h3>
                     <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap shrink-0">{act.time}</span>
                   </div>
                   <p className="text-sm text-zinc-600 dark:text-zinc-400 break-words">{act.message}</p>
                   
                   {act.type === 'repair' && (
                     <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono text-zinc-500 flex items-center gap-2">
                       <Activity className="w-3.5 h-3.5" />
                       <span>Analyzed trace, generated patch, re-ran tests.</span>
                     </div>
                   )}
                   {act.type === 'success' && (
                     <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono text-zinc-500 flex items-center gap-2">
                       <FolderGit2 className="w-3.5 h-3.5" />
                       <span>Committed to local workspace.</span>
                     </div>
                   )}
                 </div>
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
