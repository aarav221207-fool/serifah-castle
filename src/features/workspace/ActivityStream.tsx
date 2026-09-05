import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useRepairStore } from '../../store/useRepairStore';
import { 
  CheckCircle2, 
  Circle, 
  Cpu, 
  Terminal,
  Activity,
  AlertTriangle,
  Play
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function ActivityStream() {
  const { tasks } = useTaskStore();
  const { repairHistory } = useRepairStore();

  // Sort and merge tasks/repairs (mock activity stream generation)
  const activities = [
    ...tasks.map(t => ({
      type: t.status === 'VERIFIED' ? 'success' : t.status === 'IN_PROGRESS' ? 'running' : 'pending',
      message: `${t.status === 'VERIFIED' ? 'Completed' : t.status === 'IN_PROGRESS' ? 'Executing' : 'Queued'}: ${t.title}`,
      time: '1m ago'
    })),
    ...repairHistory.map(r => ({
      type: 'repair',
      message: `Autonomous Repair: ${r.title}`,
      time: '3m ago'
    }))
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col h-[400px]">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shrink-0">
        <Activity className="w-4 h-4 text-zinc-500" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Live Activity Stream</h2>
      </div>
      
      <div className="p-3 overflow-y-auto space-y-3 flex-1 font-mono text-xs">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600 gap-2 font-sans">
            <Activity className="w-8 h-8 opacity-50" />
            <p>System is idle. Awaiting requests...</p>
          </div>
        ) : (
          activities.map((act, i) => (
            <div key={i} className="flex gap-3 text-zinc-700 dark:text-zinc-300">
              <div className="shrink-0 pt-0.5">
                {act.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                {act.type === 'running' && <Play className="w-3.5 h-3.5 text-blue-500 animate-pulse" />}
                {act.type === 'pending' && <Circle className="w-3.5 h-3.5 text-zinc-400" />}
                {act.type === 'info' && <Terminal className="w-3.5 h-3.5 text-zinc-500" />}
                {act.type === 'repair' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <span className={cn(
                  "mr-2",
                  act.type === 'repair' && "text-amber-600 dark:text-amber-400 font-semibold"
                )}>{act.message}</span>
              </div>
              <div className="text-[10px] text-zinc-400 shrink-0 text-right w-12">{act.time}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
