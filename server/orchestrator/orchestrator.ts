import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { OrchestratorStateMachine, OrchestratorState } from './stateMachine';
import { Planner, Plan } from './planner';
import { IndependentVerifier, VerificationReport } from '../verification/verifier';
import { ProjectBrain } from '../brain/projectBrain';
import { ModelRouter } from '../ai/modelRouter';
import { ProviderManager } from '../ai/providerManager';
import { AIRuntime, CounselResult } from '../ai/runtime';
import { ProviderPreflight, PreflightCheckResult } from '../ai/preflight';
import { WorkspaceService } from '../sandbox/workspaceService';
import { activityLogger } from './activityLog';

const execAsync = util.promisify(exec);

export interface OrchestrationRunResult {
  runId: string;
  state: OrchestratorState;
  success: boolean;
  plan?: Plan;
  counsel?: CounselResult;
  filesModified: string[];
  verification: VerificationReport;
  repairAttempts: number;
  gitCommitHash?: string;
  summary: string;
  error?: string;
  model: string;
  provider: string;
  durationMs: number;
  runtimeUrl?: string;
}

export class MasterOrchestrator {
  private stateMachine: OrchestratorStateMachine;
  private planner: Planner;
  private verifier: IndependentVerifier;
  private brain: ProjectBrain;
  private modelRouter: ModelRouter;
  private providerManager: ProviderManager;
  private aiRuntime: AIRuntime;
  private preflight: ProviderPreflight;
  private workspaceService: WorkspaceService;
  private workspaceDir: string;
  private currentRun: OrchestrationRunResult | null = null;

  private MAX_REPAIR_ATTEMPTS = 3;

  constructor(
    providerManager: ProviderManager,
    modelRouter: ModelRouter,
    aiRuntime: AIRuntime,
    brain: ProjectBrain,
    workspaceDir: string
  ) {
    this.providerManager = providerManager;
    this.modelRouter = modelRouter;
    this.aiRuntime = aiRuntime;
    this.brain = brain;
    this.workspaceDir = workspaceDir;
    this.stateMachine = new OrchestratorStateMachine('IDLE');
    this.planner = new Planner();
    this.verifier = new IndependentVerifier(workspaceDir);
    this.preflight = new ProviderPreflight(providerManager, modelRouter);
    this.workspaceService = new WorkspaceService(workspaceDir);
  }

  getState(): OrchestratorState {
    return this.stateMachine.getCurrentState();
  }

  getCurrentRun(): OrchestrationRunResult | null {
    return this.currentRun;
  }

  getTransitionHistory() {
    return this.stateMachine.getHistory();
  }

  getWorkspaceService(): WorkspaceService {
    return this.workspaceService;
  }

  // ==========================================
  // BUILD FLOW: The Complete Autonomous Cycle
  // ==========================================
  async executeBuild(prompt: string, enableCounsel = false): Promise<OrchestrationRunResult> {
    const startTime = Date.now();
    const runId = `run-${Date.now()}`;
    const filesModified: string[] = [];
    let repairAttempts = 0;
    let counselResult: CounselResult | undefined;

    activityLogger.log(runId, 'REQUEST_RECEIVED', `Build request received: "${prompt}"`, 'info');

    try {
      // 0. PREFLIGHT CHECK (Phase 7)
      this.stateMachine.transition('PREFLIGHT', 'Checking provider credentials, formatting, and model health');
      activityLogger.log(runId, 'PREFLIGHT_STARTED', 'Running provider preflight check...', 'info');

      const preflightResult = await this.preflight.runPreflight();
      if (!preflightResult.passed) {
        const errorMsg = preflightResult.error?.message || 'Provider preflight checks failed';
        activityLogger.log(runId, 'PREFLIGHT_FAILED', errorMsg, 'error', { error: preflightResult.error?.details });
        this.stateMachine.transition('FAILURE', `Preflight failed: ${errorMsg}`);

        const failResult: OrchestrationRunResult = {
          runId,
          state: 'FAILURE',
          success: false,
          filesModified: [],
          verification: {
            passed: false,
            timestamp: Date.now(),
            checks: [{
              name: 'Provider Preflight Check',
              category: 'INTEGRITY',
              passed: false,
              error: errorMsg,
              durationMs: Date.now() - startTime
            }],
            summary: errorMsg
          },
          repairAttempts: 0,
          summary: `Preflight failed: ${errorMsg}`,
          error: errorMsg,
          model: 'none',
          provider: preflightResult.providerId || 'none',
          durationMs: Date.now() - startTime
        };
        this.currentRun = failResult;
        return failResult;
      }

      activityLogger.log(runId, 'PREFLIGHT_PASSED', `Preflight passed on model: ${preflightResult.selectedModel}`, 'success');

      // 1. WORKSPACE INITIALIZATION & DISCOVERY PHASE
      await this.workspaceService.initializeWorkspace();
      this.stateMachine.transition('DISCOVERY', `Inspecting workspace & understanding prompt: "${prompt.slice(0, 40)}"`);
      await this.brain.recordRequirement(prompt);
      
      const existingFiles = await this.workspaceService.listFiles();
      let existingAppContext = '';
      try {
        if (existingFiles.includes('src/App.tsx')) {
          existingAppContext = await this.workspaceService.readFile('src/App.tsx');
        }
      } catch {
        // No existing app
      }

      // 2. ARCHITECTURE & COUNSEL PHASE (Phase 16 - Optional & Non-Blocking)
      let plan: Plan;
      if (enableCounsel) {
        this.stateMachine.transition('ARCHITECTURE', 'Running Counsel evaluation');
        try {
          counselResult = await this.aiRuntime.runCounsel(prompt);
          await this.brain.recordArchitectureDecision(
            `Counsel synthesis for ${prompt.slice(0, 36)}`,
            counselResult.practical.summary
          );
        } catch (cErr: any) {
          console.warn('Counsel evaluation warning:', cErr.message);
        }
      } else {
        this.stateMachine.transition('ARCHITECTURE', 'Generating direct execution plan');
      }

      plan = this.planner.generatePlan(prompt, existingFiles, counselResult);
      activityLogger.log(runId, 'TASK_PLANNED', `Planned ${plan.tasks.length} tasks for execution`, 'info');

      await this.brain.recordTask({
        title: `Build: ${prompt.slice(0, 50)}`,
        description: prompt,
        files: plan.tasks.flatMap(t => t.targetFiles)
      });

      // 3. IMPLEMENTATION PHASE (Phase 8 & 9)
      this.stateMachine.transition('IMPLEMENTATION', 'Builder generating production code in workspace');
      activityLogger.log(runId, 'BUILDER_STARTED', 'BuilderAgent generating code...', 'info');

      const builderPrompt = `You are AGENT_OS Autonomous Builder Agent.
User Request: "${prompt}"

Target Application Workspace: React 19 + TypeScript + Vite.
Existing src/App.tsx code:
${existingAppContext ? `\`\`\`tsx\n${existingAppContext}\n\`\`\`` : '(none, fresh project)'}

Requirements:
1. Write complete, functional, production-ready React component code.
2. Must include all requested UI, handlers, mathematical operations, state, and clear buttons.
3. Use Tailwind CSS classes for modern styling.
4. Do NOT leave any placeholders, ellipses (...), or TODO comments.
5. Provide the implementation for "src/App.tsx" (and any helper modules if needed).

Respond ONLY with a valid JSON array of file operations, with NO markdown fences:
[
  {
    "path": "src/App.tsx",
    "content": "// complete production-ready React code"
  }
]`;

      const buildRes = await this.aiRuntime.invokeWithFallback(
        'CODING',
        {
          systemInstruction: 'You are an expert autonomous software engineer. Generate real, complete file implementations in valid JSON array format without code fences.',
          messages: [{ role: 'user', content: builderPrompt }],
          responseFormat: 'json',
          temperature: 0.2
        },
        `Builder: "${prompt.slice(0, 36)}"`,
        'BUILDER'
      );

      // Parse and write files directly to workspace
      const parsedFiles = this.parseFilesFromModelOutput(buildRes.text);
      if (parsedFiles.length === 0) {
        throw new Error('BuilderAgent failed to generate any valid files from model output.');
      }

      for (const f of parsedFiles) {
        const safeRel = path.normalize(f.path).replace(/^(\.\.[\/\\])+/, '').replace(/^\/+/, '');
        await this.workspaceService.writeFile(safeRel, f.content);
        if (!filesModified.includes('/' + safeRel)) {
          filesModified.push('/' + safeRel);
        }
      }

      // Read back verify from disk
      const readBack = await this.workspaceService.verifyFilesExist(filesModified);
      if (!readBack.allExist) {
        throw new Error(`Files written to workspace failed disk verification: ${readBack.missing.concat(readBack.empty).join(', ')}`);
      }

      activityLogger.log(runId, 'FILES_WRITTEN', `Wrote ${filesModified.length} files to workspace`, 'success', { files: filesModified });
      activityLogger.log(runId, 'BUILDER_COMPLETED', 'BuilderAgent successfully authored files', 'success');

      // 4. TESTING PHASE & REAL BUILD (Phase 11)
      this.stateMachine.transition('TESTING', 'Testing buildability, imports, and syntax in sandbox');
      activityLogger.log(runId, 'BUILD_STARTED', 'Executing real build test in sandbox...', 'info');

      let verification = await this.verifier.verifyAll(prompt, filesModified);

      // 5. AUTONOMOUS REPAIR LOOP (Phase 14)
      while (!verification.passed && repairAttempts < this.MAX_REPAIR_ATTEMPTS) {
        repairAttempts++;
        const failedChecks = verification.checks.filter(c => !c.passed);
        const errorDetails = failedChecks.map(c => `[${c.name}] ${c.error || 'Failed'}`).join('\n');

        activityLogger.log(runId, 'BUILD_FAILED', `Verification failed on attempt ${repairAttempts}: ${failedChecks.map(c => c.name).join(', ')}`, 'warn');

        this.stateMachine.transition(
          'FAILURE', 
          `Test failure encountered on attempt ${repairAttempts}/${this.MAX_REPAIR_ATTEMPTS}`,
          { failedChecks }
        );

        this.stateMachine.transition(
          'REPAIR', 
          `Autonomous repair iteration ${repairAttempts}: patching detected defects`
        );
        activityLogger.log(runId, 'REPAIR_STARTED', `Repair attempt ${repairAttempts} started`, 'info');

        // Read current files to provide to repair agent
        let currentCodeContext = '';
        for (const fm of filesModified) {
          try {
            const rel = fm.replace(/^\/+/, '');
            const content = await this.workspaceService.readFile(rel);
            currentCodeContext += `File ${rel}:\n\`\`\`tsx\n${content}\n\`\`\`\n\n`;
          } catch {
            // ignore
          }
        }

        const repairPrompt = `The previous implementation encountered build/verification errors:
${errorDetails}

Current Workspace Files:
${currentCodeContext}

Please analyze the failure, correct the code to eliminate all errors and satisfy: "${prompt}".
Respond ONLY with a valid JSON array of corrected files:
[
  { "path": "src/App.tsx", "content": "corrected code" }
]`;

        try {
          const repairRes = await this.aiRuntime.invokeWithFallback(
            'CODING',
            {
              systemInstruction: 'You are the Autonomous Repair Agent. Fix syntax, typing, imports, and build errors precisely. Output a valid JSON array without markdown fences.',
              messages: [{ role: 'user', content: repairPrompt }],
              responseFormat: 'json',
              temperature: 0.1
            },
            `Repair #${repairAttempts}: "${failedChecks[0]?.name}"`,
            'DEBUGGER'
          );

          const repairedFiles = this.parseFilesFromModelOutput(repairRes.text);
          for (const rf of repairedFiles) {
            const safeRel = path.normalize(rf.path).replace(/^(\.\.[\/\\])+/, '').replace(/^\/+/, '');
            await this.workspaceService.writeFile(safeRel, rf.content);
            if (!filesModified.includes('/' + safeRel)) {
              filesModified.push('/' + safeRel);
            }
          }

          activityLogger.log(runId, 'REPAIR_COMPLETED', `Patched files on attempt ${repairAttempts}`, 'info');
          await this.brain.recordRepair(repairAttempts, errorDetails, filesModified, true);
        } catch (repErr: any) {
          console.warn(`Repair attempt ${repairAttempts} exception:`, repErr.message);
        }

        // Re-test after repair
        this.stateMachine.transition('TESTING', `Re-testing after repair attempt ${repairAttempts}`);
        verification = await this.verifier.verifyAll(prompt, filesModified);
      }

      // 6. INDEPENDENT VERIFICATION & SECURITY (Phase 13 & 15)
      this.stateMachine.transition('VERIFICATION', 'Final independent verification pass');
      activityLogger.log(runId, 'VERIFICATION_STARTED', 'Running final verification gate...', 'info');

      await this.brain.recordVerification(verification.passed, verification.checks);

      // STRICT GATE: If verification failed, NEVER advance to RELEASE!
      if (!verification.passed) {
        const failedChecks = verification.checks.filter(c => !c.passed);
        const failMsg = `Verification failed: ${failedChecks.map(c => c.name + ': ' + c.error).join('; ')}`;
        activityLogger.log(runId, 'VERIFICATION_FAILED', failMsg, 'error');
        activityLogger.log(runId, 'RELEASE_BLOCKED', 'Release blocked due to unverified code', 'error');

        this.stateMachine.transition('FAILURE', failMsg);

        const failResult: OrchestrationRunResult = {
          runId,
          state: 'FAILURE',
          success: false,
          plan,
          counsel: counselResult,
          filesModified,
          verification,
          repairAttempts,
          summary: `Build failed independent verification: ${failMsg}`,
          error: failMsg,
          model: buildRes.modelIdentifier,
          provider: buildRes.providerId,
          durationMs: Date.now() - startTime
        };
        this.currentRun = failResult;
        return failResult;
      }

      activityLogger.log(runId, 'VERIFICATION_PASSED', 'All verification gates passed', 'success');

      // 7. SECURITY & RUNTIME STARTUP (Phase 12)
      this.stateMachine.transition('SECURITY', 'Security scan for secret leaks and dangerous constructs');
      
      // Start runtime preview
      activityLogger.log(runId, 'RUNTIME_STARTED', 'Starting live workspace runtime preview...', 'info');
      const runtimeStatus = await this.workspaceService.startRuntime();

      // 8. GIT CHECKPOINT
      let commitHash = '';
      try {
        await execAsync('git add -A', { cwd: this.workspaceDir });
        const commitMsg = `feat(orchestrator): ${prompt.slice(0, 48).replace(/"/g, '\\"')}`;
        await execAsync(`git commit -m "${commitMsg}" --allow-empty`, { cwd: this.workspaceDir });
        const { stdout } = await execAsync('git rev-parse --short HEAD', { cwd: this.workspaceDir });
        commitHash = stdout.trim();
        await this.brain.recordCheckpoint(commitHash, commitMsg);
      } catch (gitErr: any) {
        console.warn('Git commit in workspace:', gitErr.message);
      }

      // 9. RELEASE PHASE - ONLY reached when verified!
      this.stateMachine.transition('RELEASE', 'Autonomous build cycle finished and ready to ship');
      activityLogger.log(runId, 'RELEASE_READY', 'Project successfully verified, built, and released!', 'success');

      const result: OrchestrationRunResult = {
        runId,
        state: 'RELEASE',
        success: true,
        plan,
        counsel: counselResult,
        filesModified,
        verification,
        repairAttempts,
        gitCommitHash: commitHash,
        summary: `Successfully built and independently verified application across ${filesModified.length} files with ${repairAttempts} repairs.`,
        model: buildRes.modelIdentifier,
        provider: buildRes.providerId,
        durationMs: Date.now() - startTime,
        runtimeUrl: runtimeStatus.url
      };

      this.currentRun = result;
      return result;
    } catch (fatalErr: any) {
      this.stateMachine.transition('FAILURE', `Fatal orchestration error: ${fatalErr.message}`);
      activityLogger.log(runId, 'BUILD_FAILED', fatalErr.message, 'error');

      const failResult: OrchestrationRunResult = {
        runId,
        state: 'FAILURE',
        success: false,
        filesModified,
        verification: {
          passed: false,
          timestamp: Date.now(),
          checks: [{ name: 'Orchestration Execution', category: 'INTEGRITY', passed: false, error: fatalErr.message, durationMs: 0 }],
          summary: fatalErr.message
        },
        repairAttempts,
        summary: `Orchestration run failed: ${fatalErr.message}`,
        error: fatalErr.message,
        model: 'unknown',
        provider: 'unknown',
        durationMs: Date.now() - startTime
      };
      this.currentRun = failResult;
      return failResult;
    }
  }

  // ==========================================
  // ASK FLOW: Read-Only, Zero Workspace Writes
  // ==========================================
  async executeAsk(prompt: string, projectContext?: any): Promise<{ answer: string; model: string; provider: string; latencyMs: number }> {
    return this.aiRuntime.handleAsk(prompt, projectContext);
  }

  private parseFilesFromModelOutput(text: string): Array<{ path: string; content: string }> {
    try {
      // Find JSON array in text
      const trimmed = text.trim();
      let jsonString = trimmed;

      // Extract JSON if wrapped in markdown
      const match = trimmed.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        jsonString = match[0];
      } else if (trimmed.startsWith('```')) {
        jsonString = trimmed.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => p.path && typeof p.content === 'string' && p.content.trim().length > 0);
      }
    } catch {
      // If direct parsing failed, attempt extraction of single file
      const matchSingle = text.match(/\{\s*"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([\s\S]+)"\s*\}/);
      if (matchSingle) {
        try {
          const parsedSingle = JSON.parse(matchSingle[0]);
          return [{ path: parsedSingle.path, content: parsedSingle.content }];
        } catch {
          // ignore
        }
      }
    }

    return [];
  }
}
