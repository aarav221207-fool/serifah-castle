import React, { useState, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Search, 
  ShieldAlert, 
  Box, 
  Paperclip, 
  X, 
  History, 
  Trash2, 
  Loader2,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Cpu,
  CornerDownRight
} from 'lucide-react';
import { usePromptStore } from '../../store/usePromptStore';
import { useCounselStore } from '../../store/useCounselStore';
import { useModelStore } from '../../store/useModelStore';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';

export function PromptComposer() {
  const {
    currentPrompt,
    setPrompt,
    enableResearch,
    enableCounsel,
    openSandbox,
    toggleResearch,
    toggleCounsel,
    toggleSandbox,
    attachments,
    addAttachment,
    removeAttachment,
    clearPrompt,
    submitPrompt,
    isSubmitting,
    activeSubmission,
    history,
    loadFromHistory
  } = usePromptStore();

  const activeSynthesis = useCounselStore((s) => s.activeSynthesis);
  const isCounselAnalyzing = useCounselStore((s) => s.isAnalyzing);
  const providers = useModelStore((s) => s.providers);

  const [showHistory, setShowHistory] = useState(false);
  const [showResponse, setShowResponse] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'BUILD' | 'ASK'>('BUILD');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      addAttachment({
        id: `att-${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type || 'text/plain'
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPrompt.trim() || isSubmitting) return;
    setShowResponse(true);
    await submitPrompt(mode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Zero Providers Advisory Banner */}
      {providers.length === 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>No AI provider connected. Go to <strong>Models</strong> to add an API key.</span>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-md overflow-hidden transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        {/* Composer Top Header Bar */}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex bg-zinc-200/50 dark:bg-zinc-800 rounded p-1">
            <button 
              type="button"
              onClick={() => setMode('BUILD')}
              className={cn(
                "px-3 py-1 rounded text-xs font-bold transition-all",
                mode === 'BUILD' ? "bg-white dark:bg-zinc-950 shadow-sm text-blue-600 dark:text-blue-400" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              BUILD
            </button>
            <button 
              type="button"
              onClick={() => setMode('ASK')}
              className={cn(
                "px-3 py-1 rounded text-xs font-bold transition-all",
                mode === 'ASK' ? "bg-white dark:bg-zinc-950 shadow-sm text-purple-600 dark:text-purple-400" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              ASK
            </button>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                  showHistory 
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" 
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <History className="w-3.5 h-3.5" />
                <span>Prompt History ({history.length})</span>
              </button>
            )}

            {currentPrompt && (
              <button
                onClick={clearPrompt}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1"
                title="Clear current prompt"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* History Drawer */}
        {showHistory && (
          <div className="p-3 bg-zinc-100/70 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 max-h-48 overflow-y-auto space-y-1.5">
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-1">
              Recent Submissions
            </div>
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  loadFromHistory(item);
                  setShowHistory(false);
                }}
                className="w-full text-left p-2 rounded bg-white dark:bg-zinc-900 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-zinc-200 dark:border-zinc-800 text-xs transition-colors flex items-start justify-between gap-3 group"
              >
                <span className="text-zinc-700 dark:text-zinc-300 line-clamp-1 font-mono">
                  [{item.mode}] {item.text}
                </span>
                <span className="text-[10px] text-zinc-400 flex-shrink-0">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main Multiline Input Area */}
        <div className="p-4">
          <textarea
            value={currentPrompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'BUILD' ? "Describe what you want to build or modify (e.g. 'Build a real-time system monitor component')..." : "Ask a question about the project architecture, dependencies, or code..."}
            rows={3}
            className="w-full resize-y min-h-[80px] max-h-[260px] bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none leading-relaxed"
          />

          {/* Attachment Chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              {attachments.map((att) => (
                <span 
                  key={att.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span className="max-w-[140px] truncate">{att.name}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">({Math.round(att.size / 1024)}kb)</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="hover:text-red-500 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Toolbar & Mode Switches */}
        <div className="px-4 py-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              multiple 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Attach requirements spec or reference files"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Attach Spec</span>
            </button>

            <button
              type="button"
              onClick={toggleResearch}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                enableResearch
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800/60"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
              title="Enable Technical & Architectural Analysis"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Research</span>
            </button>

            {mode === 'BUILD' && (
              <button
                type="button"
                onClick={toggleCounsel}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                  enableCounsel
                    ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800/60"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
                title="Run 3 independent evaluations: Negative, Positive, and Practical"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Triple Counsel AI</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleSandbox}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                openSandbox
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
              title="Auto-boot local dev server & workspace"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Sandbox</span>
            </button>
          </div>

          {/* Right: Submit Button */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!currentPrompt.trim() || isSubmitting}
              className={cn(
                "gap-2 px-6 py-2 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-colors",
                mode === 'BUILD' ? "bg-blue-600 hover:bg-blue-500" : "bg-purple-600 hover:bg-purple-500"
              )}
            >
              {isSubmitting || isCounselAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>EXECUTING...</span>
                </>
              ) : (
                <>
                  <span>{mode}</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Real-time Status Banner */}
        {(isSubmitting || isCounselAnalyzing) && (
          <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                {mode === 'BUILD' ? 'Counsel evaluating -> Builder executing file changes...' : 'Routing query to active AI model...'}
              </span>
            </span>
            <span className="font-mono text-[10px]">LIVE RUNTIME</span>
          </div>
        )}
      </div>

      {/* Latest Real AI Response Card */}
      {activeSubmission && showResponse && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded font-bold text-[10px]",
                activeSubmission.mode === 'BUILD' 
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                  : "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
              )}>
                {activeSubmission.mode} MODE
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-semibold",
                activeSubmission.status === 'COMPLETED' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                activeSubmission.status === 'FAILED' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              )}>
                {activeSubmission.status}
              </span>
              {activeSubmission.model && (
                <span className="text-zinc-500 font-mono text-[11px] flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  <span>{activeSubmission.model}</span>
                </span>
              )}
              {activeSubmission.latencyMs && (
                <span className="text-zinc-400 font-mono text-[10px]">
                  ({activeSubmission.latencyMs}ms)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowResponse(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeSubmission.error ? (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>Execution Failed</span>
              </div>
              <p className="font-mono">{activeSubmission.error}</p>
            </div>
          ) : activeSubmission.response ? (
            <div className="space-y-3">
              <div className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {activeSubmission.response}
              </div>

              {activeSubmission.filesModified && activeSubmission.filesModified.length > 0 && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Files Modified in Workspace ({activeSubmission.filesModified.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSubmission.filesModified.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px] rounded border border-zinc-200 dark:border-zinc-700">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-zinc-400 italic py-2">
              Processing request...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
