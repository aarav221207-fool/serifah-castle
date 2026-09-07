import { create } from 'zustand';
import { Skill } from '../types/skills';

interface SkillStore {
  skills: Skill[];
  isLearning: boolean;
  fetchSkills: () => Promise<void>;
  learnSkill: (url: string) => Promise<void>;
  removeSkill: (id: string) => Promise<void>;
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  isLearning: false,
  skills: [
    {
      id: 'skill-reactbits',
      name: 'ReactBits UI',
      description: 'Component patterns, animations, interaction patterns, and reusable UI techniques.',
      conceptsLearned: ['component patterns', 'animation patterns', 'styling approaches'],
      version: '1.0.0',
      source: 'https://reactbits.dev',
      status: 'VALIDATED',
      usageCount: 7
    },
    {
      id: 'skill-github-workflow',
      name: 'GitHub Engineering Workflow',
      description: 'Git workflows, repository operations, branching strategies, and CI/CD pipelines.',
      conceptsLearned: ['git workflows', 'repository operations'],
      version: '2.1.0',
      source: 'https://docs.github.com',
      status: 'VALIDATED',
      usageCount: 12
    }
  ],
  fetchSkills: async () => {
    try {
      const res = await fetch('/api/skills');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.skills) && data.skills.length > 0) {
        set({
          skills: data.skills.map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description || s.content,
            conceptsLearned: ['production patterns', 'engineering rules'],
            version: '1.0.0',
            source: 'agent-skills',
            status: 'VALIDATED',
            usageCount: 1
          }))
        });
      }
    } catch (e) {
      console.warn('Failed to fetch skills:', e);
    }
  },
  learnSkill: async (url: string) => {
    set({ isLearning: true });
    try {
      const skillName = url.replace(/^https?:\/\//, '').split('/')[0] || 'Learned Skill';
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: skillName,
          description: `Extracted patterns and guidelines from ${url}`,
          content: `Guidelines extracted from ${url}. Ensure code conforms to these architectural standards.`
        })
      });
      const data = await res.json();
      if (data.skill) {
        const s = data.skill;
        set((state) => ({
          skills: [{
            id: s.id,
            name: s.name,
            description: s.description,
            conceptsLearned: ['analyzed patterns', 'api structure'],
            version: '1.0.0',
            source: url,
            status: 'VALIDATED',
            usageCount: 0
          }, ...state.skills.filter(existing => existing.id !== s.id)],
          isLearning: false
        }));
        return;
      }
    } catch (e) {
      console.warn('Learn skill network error:', e);
    }
    set({ isLearning: false });
  },
  removeSkill: async (id: string) => {
    try {
      await fetch(`/api/skills/${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    set((state) => ({
      skills: state.skills.filter(s => s.id !== id)
    }));
  }
}));
