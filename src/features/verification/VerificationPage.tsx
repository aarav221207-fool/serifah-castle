import React, { useState } from 'react';
import { useRepairStore } from '../../store/useRepairStore';
import { 
  Activity, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RotateCcw, 
  Terminal, 
  Play, 
  Loader2,
  Bug
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export function VerificationPage() {
  const { 
    failures, 
    activeRepairTask, 
    repairHistory, 
    isRepairing, 
    initiateAutonomousRepair, 
    reportFailure, 
    dismissFailure 
  } = useRepairStore();

  const [simulatedErrorName, setSimulatedErrorName] = useState('TypeError: Cannot read properties of undefined (reading \'id\')');

  const handleSimulateFailure = () => {
    reportFailure({
      type: 'RUNTIME_EXCEPTION',
      message: simulatedErrorName,
      location: 'src/features/telemetry/LiveMetricsCard.tsx:42',
      componentStack: 'in LiveMetricsCard (at TelemetryGrid.tsx:84)\nin TelemetryGrid (at WorkspacePage.tsx:120)'
    });
  };

  const unresolved = failures.filter(f => !f.handled);

  return (
    <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Verification & Failure Recovery Engine</h1>
            <span className={cn(
              "text-[10px] font-mono font-medium px-2 py-0.5 rounded border",
              unresolved.length > 0 
                ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800 animate-pulse" 
                : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
            )}>
              {unresolved.length > 0 ? `${unresolved.length} UNRESOLVED DEFECTS` : 'SYSTEM INTEGRITY: NOMINAL'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Interception pipeline for runtime crashes, missing imports, and automated multi-agent repair loops.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSimulateFailure}
            className="gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Simulate Runtime Defect</span>
          </Button>
        </div>
      </div>

      {/* Active Autonomous Repair Status Banner */}
      {isRepairing && activeRepairTask && (
        <div className="p-4 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
              <span className="font-bold text-xs text-purple-900 dark:text-purple-300">
                AUTONOMOUS REPAIR LOOP IN PROGRESS
              </span>
            </div>
            <span className="text-xs font-mono text-purple-600 dark:text-purple-400">
              Assigned: {activeRepairTask.assignedAgent} ({activeRepairTask.assignedModel})
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-purple-200 dark:border-purple-900 text-xs font-mono text-zinc-700 dark:text-zinc-300 space-y-1">
            {activeRepairTask.logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Intercepted Failures Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Intercepted Failures & Runtime Exceptions ({failures.length})
          </h2>
        </div>

        {failures.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            Zero intercepted runtime failures. Clean execution telemetry.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {failures.map((fail) => (
              <div key={fail.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase",
                      fail.recoveryStatus === 'REPAIRED' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                      fail.recoveryStatus === 'DIAGNOSING' ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400" :
                      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    )}>
                      {fail.type}
                    </span>
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 font-mono">
                      {fail.message}
                    </span>
                  </div>

                  {fail.location && (
                    <div className="text-[11px] font-mono text-zinc-500">
                      Location: {fail.location}
                    </div>
                  )}

                  {fail.componentStack && (
                    <div className="text-[10px] font-mono text-zinc-400 max-w-2xl truncate">
                      Stack: {fail.componentStack}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {fail.recoveryStatus === 'UNRESOLVED' && (
                    <Button
                      size="sm"
                      onClick={() => initiateAutonomousRepair(fail.id)}
                      disabled={isRepairing}
                      className="gap-1.5 h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Initiate Autonomous Repair</span>
                    </Button>
                  )}

                  {fail.recoveryStatus === 'REPAIRED' && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified Repaired</span>
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissFailure(fail.id)}
                    className="h-8 text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Autonomous Repair History */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Autonomous Repair Audit Log ({repairHistory.length} Patches)
          </h2>
        </div>

        <div className="p-4 space-y-4">
          {repairHistory.map((task) => (
            <div 
              key={task.id}
              className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{task.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold">
                    {task.status}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {new Date(task.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <strong>Root Cause:</strong> {task.rootCause}
              </p>

              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <span>Affected:</span>
                {task.affectedFiles.map((f, i) => (
                  <span key={i} className="px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {f}
                  </span>
                ))}
                <span>• Checkpoint: {task.checkpointId}</span>
              </div>

              <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-zinc-300 font-mono text-[11px] space-y-1">
                {task.logs.map((log, li) => (
                  <div key={li} className="text-emerald-400">{log}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
