import fs from 'fs/promises';
import path from 'path';

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  currentPhase: string;
  requirements: string[];
  architectureDecisions: Array<{ id: string; decision: string; rationale: string; timestamp: number }>;
  constraints: string[];
  skillsUsed: string[];
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REPAIRING';
    files: string[];
    createdAt: number;
    updatedAt: number;
  }>;
  verificationRuns: Array<{
    id: string;
    passed: boolean;
    timestamp: number;
    checks: Array<{ name: string; passed: boolean; details?: string }>;
  }>;
  repairs: Array<{
    id: string;
    attempt: number;
    error: string;
    filesModified: string[];
    fixed: boolean;
    timestamp: number;
  }>;
  checkpoints: Array<{
    hash: string;
    message: string;
    timestamp: number;
  }>;
}

export class ProjectBrain {
  private storageDir: string;
  private currentProject: ProjectRecord | null = null;

  constructor(workspaceDir: string) {
    this.storageDir = path.join(process.cwd(), '.agent_brain');
    this.init().catch(console.error);
  }

  private async init() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      const files = await fs.readdir(this.storageDir);
      const projFiles = files.filter(f => f.endsWith('.json'));
      if (projFiles.length > 0) {
        // Load the latest modified project record
        const latest = projFiles[0];
        const raw = await fs.readFile(path.join(this.storageDir, latest), 'utf-8');
        this.currentProject = JSON.parse(raw);
      } else {
        // Create default project record
        await this.createOrLoadProject('default-proj', 'Autonomous Workstation Project', 'Default initialized workspace project');
      }
    } catch (e) {
      console.warn('ProjectBrain initialization error:', e);
    }
  }

  async createOrLoadProject(id: string, name: string, description: string): Promise<ProjectRecord> {
    const filePath = path.join(this.storageDir, `${id}.json`);
    try {
      const existing = await fs.readFile(filePath, 'utf-8');
      this.currentProject = JSON.parse(existing);
      return this.currentProject!;
    } catch {
      const newProj: ProjectRecord = {
        id,
        name,
        description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        currentPhase: 'INITIALIZATION',
        requirements: [],
        architectureDecisions: [
          {
            id: `dec-${Date.now()}-1`,
            decision: 'Autonomous Vertical Slice Execution',
            rationale: 'Execute full Discovery -> Architecture -> Implementation -> Verification cycle',
            timestamp: Date.now()
          }
        ],
        constraints: ['Never push unverified code', 'Deterministic process sandbox boundary'],
        skillsUsed: ['TypeScript', 'React', 'Node.js'],
        tasks: [],
        verificationRuns: [],
        repairs: [],
        checkpoints: []
      };
      await this.save(newProj);
      this.currentProject = newProj;
      return newProj;
    }
  }

  async save(project?: ProjectRecord): Promise<void> {
    const target = project || this.currentProject;
    if (!target) return;
    target.updatedAt = Date.now();
    await fs.mkdir(this.storageDir, { recursive: true });
    const filePath = path.join(this.storageDir, `${target.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(target, null, 2), 'utf-8');
  }

  getCurrentProject(): ProjectRecord | null {
    return this.currentProject;
  }

  async recordRequirement(req: string): Promise<void> {
    if (!this.currentProject) return;
    if (!this.currentProject.requirements.includes(req)) {
      this.currentProject.requirements.push(req);
      await this.save();
    }
  }

  async recordArchitectureDecision(decision: string, rationale: string): Promise<void> {
    if (!this.currentProject) return;
    this.currentProject.architectureDecisions.push({
      id: `dec-${Date.now()}`,
      decision,
      rationale,
      timestamp: Date.now()
    });
    await this.save();
  }

  async recordTask(task: { title: string; description: string; files: string[] }): Promise<string> {
    if (!this.currentProject) return `t-${Date.now()}`;
    const id = `task-${Date.now()}`;
    this.currentProject.tasks.push({
      id,
      title: task.title,
      description: task.description,
      status: 'IN_PROGRESS',
      files: task.files,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await this.save();
    return id;
  }

  async updateTaskStatus(id: string, status: 'COMPLETED' | 'FAILED' | 'REPAIRING'): Promise<void> {
    if (!this.currentProject) return;
    const t = this.currentProject.tasks.find(x => x.id === id);
    if (t) {
      t.status = status;
      t.updatedAt = Date.now();
      await this.save();
    }
  }

  async recordVerification(passed: boolean, checks: Array<{ name: string; passed: boolean; details?: string }>): Promise<void> {
    if (!this.currentProject) return;
    this.currentProject.verificationRuns.unshift({
      id: `vr-${Date.now()}`,
      passed,
      timestamp: Date.now(),
      checks
    });
    // Keep last 25 runs
    if (this.currentProject.verificationRuns.length > 25) {
      this.currentProject.verificationRuns = this.currentProject.verificationRuns.slice(0, 25);
    }
    await this.save();
  }

  async recordRepair(attempt: number, error: string, filesModified: string[], fixed: boolean): Promise<void> {
    if (!this.currentProject) return;
    this.currentProject.repairs.unshift({
      id: `rep-${Date.now()}`,
      attempt,
      error,
      filesModified,
      fixed,
      timestamp: Date.now()
    });
    await this.save();
  }

  async recordCheckpoint(hash: string, message: string): Promise<void> {
    if (!this.currentProject) return;
    this.currentProject.checkpoints.unshift({
      hash,
      message,
      timestamp: Date.now()
    });
    await this.save();
  }
}
