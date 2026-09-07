export type OrchestratorState = 
  | 'IDLE'
  | 'PREFLIGHT'
  | 'DISCOVERY'
  | 'ARCHITECTURE'
  | 'IMPLEMENTATION'
  | 'TESTING'
  | 'FAILURE'
  | 'REPAIR'
  | 'VERIFICATION'
  | 'SECURITY'
  | 'RELEASE';

export interface StateTransitionEvent {
  from: OrchestratorState;
  to: OrchestratorState;
  timestamp: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export class OrchestratorStateMachine {
  private currentState: OrchestratorState = 'IDLE';
  private history: StateTransitionEvent[] = [];

  constructor(initialState: OrchestratorState = 'IDLE') {
    this.currentState = initialState;
    this.history.push({
      from: 'IDLE',
      to: initialState,
      timestamp: Date.now(),
      reason: 'State machine initialized'
    });
  }

  getCurrentState(): OrchestratorState {
    return this.currentState;
  }

  getHistory(): StateTransitionEvent[] {
    return [...this.history];
  }

  transition(nextState: OrchestratorState, reason?: string, metadata?: Record<string, any>): void {
    const previous = this.currentState;
    this.currentState = nextState;
    const event: StateTransitionEvent = {
      from: previous,
      to: nextState,
      timestamp: Date.now(),
      reason,
      metadata
    };
    this.history.push(event);
    console.log(`[OrchestratorStateMachine] ${previous} -> ${nextState} (${reason || 'no reason'})`);
  }

  canTransitionTo(target: OrchestratorState): boolean {
    const validTransitions: Record<OrchestratorState, OrchestratorState[]> = {
      IDLE: ['PREFLIGHT', 'DISCOVERY', 'ARCHITECTURE', 'IMPLEMENTATION'],
      PREFLIGHT: ['DISCOVERY', 'ARCHITECTURE', 'IMPLEMENTATION', 'FAILURE'],
      DISCOVERY: ['ARCHITECTURE', 'IMPLEMENTATION', 'FAILURE'],
      ARCHITECTURE: ['IMPLEMENTATION', 'FAILURE'],
      IMPLEMENTATION: ['TESTING', 'FAILURE', 'REPAIR'],
      TESTING: ['VERIFICATION', 'FAILURE', 'REPAIR'],
      FAILURE: ['REPAIR', 'IDLE', 'PREFLIGHT'],
      REPAIR: ['TESTING', 'IMPLEMENTATION', 'FAILURE'],
      VERIFICATION: ['SECURITY', 'REPAIR', 'FAILURE'],
      SECURITY: ['RELEASE', 'REPAIR', 'FAILURE'],
      RELEASE: ['IDLE']
    };

    return validTransitions[this.currentState]?.includes(target) ?? false;
  }

  reset(): void {
    this.transition('IDLE', 'State machine reset');
  }
}
