export type ExecutionEventType =
  | 'REQUEST_RECEIVED'
  | 'PREFLIGHT_STARTED'
  | 'PREFLIGHT_PASSED'
  | 'PREFLIGHT_FAILED'
  | 'MODEL_DISCOVERY_STARTED'
  | 'MODEL_DISCOVERY_COMPLETED'
  | 'TASK_PLANNED'
  | 'BUILDER_STARTED'
  | 'BUILDER_COMPLETED'
  | 'FILES_WRITTEN'
  | 'BUILD_STARTED'
  | 'BUILD_PASSED'
  | 'BUILD_FAILED'
  | 'REPAIR_STARTED'
  | 'REPAIR_COMPLETED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'RUNTIME_STARTED'
  | 'RUNTIME_FAILED'
  | 'RELEASE_READY'
  | 'RELEASE_BLOCKED';

export interface ExecutionEvent {
  id: string;
  runId: string;
  timestamp: number;
  type: ExecutionEventType;
  message: string;
  details?: Record<string, any>;
  level: 'info' | 'warn' | 'error' | 'success';
}

export class ExecutionActivityLogger {
  private events: ExecutionEvent[] = [];
  private static instance: ExecutionActivityLogger;

  static getInstance(): ExecutionActivityLogger {
    if (!ExecutionActivityLogger.instance) {
      ExecutionActivityLogger.instance = new ExecutionActivityLogger();
    }
    return ExecutionActivityLogger.instance;
  }

  log(
    runId: string,
    type: ExecutionEventType,
    message: string,
    level: ExecutionEvent['level'] = 'info',
    details?: Record<string, any>
  ): ExecutionEvent {
    const event: ExecutionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      runId,
      timestamp: Date.now(),
      type,
      message,
      level,
      details
    };
    this.events.push(event);
    console.log(`[ACTIVITY ${type}] ${message}`);
    return event;
  }

  getEvents(runId?: string): ExecutionEvent[] {
    if (runId) {
      return this.events.filter(e => e.runId === runId);
    }
    return [...this.events].reverse();
  }

  clear() {
    this.events = [];
  }
}

export const activityLogger = ExecutionActivityLogger.getInstance();
