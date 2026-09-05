import { create } from 'zustand';
import { Skill } from '../types/skills';

interface SkillStore {
  skills: Skill[];
  isLearning: boolean;
  learnSkill: (url: string) => Promise<void>;
  removeSkill: (id: string) => void;
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
    },
    {
      id: 'skill-framer',
      name: 'Framer Motion',
      description: 'Advanced declarative animations for React applications.',
      conceptsLearned: ['spring physics', 'layout animations', 'gestures'],
      version: '11.0.0',
      source: 'https://github.com/framer/motion',
      status: 'LEARNING',
      usageCount: 0
    }
  ],
  learnSkill: async (url: string) => {
    set({ isLearning: true });
    // Simulate learning process
    await new Promise(r => setTimeout(r, 2000));
    
    const newSkill: Skill = {
      id: `skill-${Date.now()}`,
      name: 'Extracted Knowledge',
      description: `Automatically extracted patterns from ${url}`,
      conceptsLearned: ['analyzed components', 'api structure'],
      version: '1.0.0',
      source: url,
      status: 'VALIDATED',
      usageCount: 0
    };
    
    set((state) => ({ 
      skills: [newSkill, ...state.skills],
      isLearning: false 
    }));
  },
  removeSkill: (id) => set((state) => ({
    skills: state.skills.filter(s => s.id !== id)
  }))
}));
