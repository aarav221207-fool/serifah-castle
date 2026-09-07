import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

export interface GlobalSkill {
  id: string;
  name: string;
  description: string;
  content: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export class SkillManager {
  private storeFile: string;
  private skills: Map<string, GlobalSkill> = new Map();

  constructor(storageDir = path.join(process.cwd(), '.agent_skills')) {
    this.storeFile = path.join(storageDir, 'skills.json');
    this.init().catch(console.error);
  }

  private async init() {
    try {
      const dir = path.dirname(this.storeFile);
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      if (fsSync.existsSync(this.storeFile)) {
        const raw = await fs.readFile(this.storeFile, 'utf-8');
        const list: GlobalSkill[] = JSON.parse(raw);
        for (const s of list) {
          this.skills.set(s.id, s);
        }
      } else {
        // Seed initial default skill
        const defaultSkill: GlobalSkill = {
          id: 'clean-react-craftsmanship',
          name: 'Clean React Craftsmanship',
          description: 'Best practices for high-craft React 19 UI with Tailwind and TypeScript',
          content: 'Always prefer semantic HTML, accessible ARIA attributes, robust state management, responsive styling, and complete zero-placeholder implementations.',
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        this.skills.set(defaultSkill.id, defaultSkill);
        await this.save();
      }
    } catch (err: any) {
      console.warn('[SkillManager] Initialization error:', err.message);
    }
  }

  private async save() {
    try {
      const list = Array.from(this.skills.values());
      await fs.writeFile(this.storeFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[SkillManager] Save failed:', err.message);
    }
  }

  getAllSkills(): GlobalSkill[] {
    return Array.from(this.skills.values());
  }

  getSkill(id: string): GlobalSkill | null {
    return this.skills.get(id) || null;
  }

  async createOrUpdateSkill(data: Partial<GlobalSkill> & { name: string; content: string }): Promise<GlobalSkill> {
    const id = data.id || `skill-${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const existing = this.skills.get(id);

    const skill: GlobalSkill = {
      id,
      name: data.name,
      description: data.description || '',
      content: data.content,
      enabled: data.enabled ?? existing?.enabled ?? true,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    this.skills.set(id, skill);
    await this.save();
    return skill;
  }

  async deleteSkill(id: string): Promise<boolean> {
    const deleted = this.skills.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  getSystemPromptInjection(): string {
    const enabled = Array.from(this.skills.values()).filter(s => s.enabled);
    if (enabled.length === 0) return '';
    return '\n\nGlobal Skills & Engineering Guidelines:\n' +
      enabled.map(s => `[Skill: ${s.name}]\n${s.content}`).join('\n\n');
  }
}

export const skillManager = new SkillManager();
