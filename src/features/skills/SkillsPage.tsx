import React, { useState } from 'react';
import { useSkillStore } from '../../store/useSkillStore';
import { TerminalSquare, BookOpen, CheckCircle2, ShieldAlert, Package, Loader2, BookMarked, Globe, Link as LinkIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export function SkillsPage() {
  const { skills, learnSkill, isLearning } = useSkillStore();
  const [skillUrl, setSkillUrl] = useState('');

  const handleLearn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillUrl.trim() || isLearning) return;
    await learnSkill(skillUrl.trim());
    setSkillUrl('');
  };

  return (
    <div className="flex flex-col h-full space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="text-center py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
          Skill Memory & Learning
        </h1>
        <p className="text-sm text-zinc-500 max-w-2xl mx-auto">
          Provide GitHub repositories, documentation sites, or local references. The system will extract knowledge, patterns, and APIs to automatically apply when relevant.
        </p>
      </div>

      {/* Learn a New Skill Input */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-md p-6 max-w-2xl mx-auto w-full transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <div className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300 mb-4">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <span>Learn a New Skill</span>
        </div>
        <form onSubmit={handleLearn} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={skillUrl}
              onChange={(e) => setSkillUrl(e.target.value)}
              placeholder="Paste GitHub repository, website, or documentation URL..."
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none"
              disabled={isLearning}
            />
          </div>
          <Button 
            type="submit" 
            disabled={!skillUrl.trim() || isLearning}
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5"
          >
            {isLearning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Learning...</span>
              </>
            ) : (
              <>
                <span>Learn Skill</span>
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Learned Skills Registry */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <BookMarked className="w-4 h-4" />
            Learned Skills
          </h2>
          <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
            {skills.length} Total
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map(skill => (
            <div key={skill.id} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900 shadow-sm flex flex-col hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{skill.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border",
                      skill.status === 'VALIDATED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' :
                      skill.status === 'LEARNING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-800 animate-pulse' :
                      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                    )}>
                      {skill.status}
                    </span>
                    {skill.usageCount !== undefined && (
                      <span className="text-[10px] text-zinc-500 font-mono">Used in {skill.usageCount} projects</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                {skill.description}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {skill.conceptsLearned.map(c => (
                  <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {c}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                <span className="flex items-center gap-1 font-mono truncate max-w-[250px]" title={skill.source}>
                  <LinkIcon className="w-3 h-3" /> {skill.source}
                </span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                  v{skill.version}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
