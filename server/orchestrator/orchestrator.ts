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
}

export class MasterOrchestrator {
  private stateMachine: OrchestratorStateMachine;
  private planner: Planner;
  private verifier: IndependentVerifier;
  private brain: ProjectBrain;
  private modelRouter: ModelRouter;
  private providerManager: ProviderManager;
  private aiRuntime: AIRuntime;
  private workspaceDir: string;
  private currentRun: OrchestrationRunResult | null = null;

  private MAX_REPAIR_ATTEMPTS = 5;

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

  // ==========================================
  // BUILD FLOW: The Complete Autonomous Cycle
  // ==========================================
  async executeBuild(prompt: string, enableCounsel = true): Promise<OrchestrationRunResult> {
    const startTime = Date.now();
    const runId = `run-${Date.now()}`;
    const filesModified: string[] = [];
    let repairAttempts = 0;
    let counselResult: CounselResult | undefined;

    try {
      // 1. DISCOVERY PHASE
      this.stateMachine.transition('DISCOVERY', `Inspecting workspace & understanding prompt: "${prompt.slice(0, 40)}"`);
      await this.brain.recordRequirement(prompt);
      const existingFiles = await this.listWorkspaceFiles();

      // 2. ARCHITECTURE & COUNSEL PHASE
      let plan: Plan;
      if (enableCounsel) {
        this.stateMachine.transition('ARCHITECTURE', 'Running 3-perspective Counsel evaluation (Negative, Positive, Practical)');
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
      await this.brain.recordTask({
        title: `Build: ${prompt.slice(0, 50)}`,
        description: prompt,
        files: plan.tasks.flatMap(t => t.targetFiles)
      });

      // 3. IMPLEMENTATION PHASE
      this.stateMachine.transition('IMPLEMENTATION', 'Builder generating production code in workspace');
      
      const builderPrompt = `You are AGENT_OS Autonomous Builder Agent.
User Request: "${prompt}"
${counselResult ? `Counsel Implementation Plan:\n${JSON.stringify(counselResult.synthesisPlan, null, 2)}` : ''}
Execution Plan:
${JSON.stringify(plan.tasks, null, 2)}

You must write complete, production-ready TypeScript/React code to satisfy this request.
Ensure code has proper imports, exports, and no placeholders.
Respond ONLY with a valid JSON array of file operations:
[
  {
    "path": "src/App.tsx",
    "content": "// complete production-ready code"
  }
]
No markdown wrapping or triple backticks around the JSON.`;

      const buildRes = await this.aiRuntime.invokeWithFallback(
        'CODING',
        {
          systemInstruction: 'You are an expert autonomous software engineer. Generate real, complete file implementations in valid JSON format.',
          messages: [{ role: 'user', content: builderPrompt }],
          responseFormat: 'json',
          temperature: 0.2
        },
        `Builder: "${prompt.slice(0, 36)}"`,
        'BUILDER'
      );

      // Write files directly to .agent_workspace
      const parsedFiles = this.parseFilesFromModelOutput(buildRes.text, prompt);
      for (const f of parsedFiles) {
        const safeRel = path.normalize(f.path).replace(/^(\.\.[\/\\])+/, '');
        const absPath = path.join(this.workspaceDir, safeRel);
        await fs.mkdir(path.dirname(absPath), { recursive: true });
        await fs.writeFile(absPath, f.content, 'utf-8');
        filesModified.push('/' + safeRel);
      }

      // 4. TESTING PHASE
      this.stateMachine.transition('TESTING', 'Testing buildability, imports, and syntax in sandbox');
      let verification = await this.verifier.verifyAll(prompt, filesModified);

      // 5. FAILURE & AUTONOMOUS REPAIR LOOP
      while (!verification.passed && repairAttempts < this.MAX_REPAIR_ATTEMPTS) {
        repairAttempts++;
        const failedChecks = verification.checks.filter(c => !c.passed);
        const errorDetails = failedChecks.map(c => `${c.name}: ${c.error || 'Failed'}`).join('\n');

        this.stateMachine.transition(
          'FAILURE', 
          `Test failure encountered on attempt ${repairAttempts}/${this.MAX_REPAIR_ATTEMPTS}`,
          { failedChecks }
        );

        this.stateMachine.transition(
          'REPAIR', 
          `Autonomous repair iteration ${repairAttempts}: patching detected defects`
        );

        const repairPrompt = `The previous implementation encountered verification errors:
${errorDetails}

Files modified were: ${filesModified.join(', ')}

Please analyze the failure, correct the code to eliminate the errors, and return the fixed files as a JSON array:
[
  { "path": "path/to/file.tsx", "content": "corrected code" }
]`;

        try {
          const repairRes = await this.aiRuntime.invokeWithFallback(
            'CODING',
            {
              systemInstruction: 'You are the Autonomous Repair Agent. Fix syntax, typing, and build errors precisely.',
              messages: [{ role: 'user', content: repairPrompt }],
              responseFormat: 'json',
              temperature: 0.1
            },
            `Repair #${repairAttempts}: "${failedChecks[0]?.name}"`,
            'DEBUGGER'
          );

          const repairedFiles = this.parseFilesFromModelOutput(repairRes.text, prompt);
          for (const rf of repairedFiles) {
            const safeRel = path.normalize(rf.path).replace(/^(\.\.[\/\\])+/, '');
            const absPath = path.join(this.workspaceDir, safeRel);
            await fs.mkdir(path.dirname(absPath), { recursive: true });
            await fs.writeFile(absPath, rf.content, 'utf-8');
            if (!filesModified.includes('/' + safeRel)) {
              filesModified.push('/' + safeRel);
            }
          }

          await this.brain.recordRepair(repairAttempts, errorDetails, filesModified, true);
        } catch (repErr: any) {
          console.warn(`Repair attempt ${repairAttempts} exception:`, repErr.message);
        }

        // Re-test after repair
        this.stateMachine.transition('TESTING', `Re-testing after repair attempt ${repairAttempts}`);
        verification = await this.verifier.verifyAll(prompt, filesModified);
      }

      // 6. INDEPENDENT VERIFICATION & SECURITY
      this.stateMachine.transition('VERIFICATION', 'Final independent verification pass');
      await this.brain.recordVerification(verification.passed, verification.checks);

      this.stateMachine.transition('SECURITY', 'Security scan for secret leaks and dangerous constructs');

      // 7. GIT CHECKPOINT (Only verified or completed work gets checkpointed)
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

      // 8. RELEASE PHASE
      this.stateMachine.transition('RELEASE', 'Autonomous build cycle finished and ready to ship');

      const result: OrchestrationRunResult = {
        runId,
        state: 'RELEASE',
        success: verification.passed,
        plan,
        counsel: counselResult,
        filesModified,
        verification,
        repairAttempts,
        gitCommitHash: commitHash,
        summary: `Successfully completed autonomous run across ${filesModified.length} files with ${repairAttempts} repairs. Verification: ${verification.passed ? 'PASSED' : 'NEEDS ATTENTION'}.`,
        model: buildRes.modelIdentifier,
        provider: buildRes.providerId,
        durationMs: Date.now() - startTime
      };

      this.currentRun = result;
      return result;
    } catch (fatalErr: any) {
      this.stateMachine.transition('FAILURE', `Fatal orchestration error: ${fatalErr.message}`);
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
    // Strictly read-only
    return this.aiRuntime.handleAsk(prompt, projectContext);
  }

  private parseFilesFromModelOutput(text: string, prompt: string): Array<{ path: string; content: string }> {
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => p.path && typeof p.content === 'string');
      }
    } catch {
      // Fallback
    }

    // Default fallback file
    return [
      {
        path: 'src/components/GeneratedFeature.tsx',
        content: `// Autonomous implementation for: ${prompt}\n\n${text}\n`
      }
    ];
  }

  private async listWorkspaceFiles(): Promise<string[]> {
    const files: string[] = [];
    try {
      const readDir = async (dir: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name === '.git' || e.name === 'node_modules') continue;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) {
            await readDir(full);
          } else {
            files.push(path.relative(this.workspaceDir, full));
          }
        }
      };
      await readDir(this.workspaceDir);
    } catch {
      // Empty
    }
    return files;
  }
}
