import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileText, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  FileCode2,
  Code2
} from 'lucide-react';
import { useSandboxStore } from '../../store/useSandboxStore';
import { FileNode } from '../../types/sandbox';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';

export function FilesPage() {
  const { 
    fileTree, 
    activeFile, 
    activeFileContent, 
    isLoadingFiles, 
    fetchFiles, 
    loadFileContent, 
    saveFileContent, 
    createFile, 
    deleteFile 
  } = useSandboxStore();

  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    setEditorContent(activeFileContent);
  }, [activeFileContent]);

  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    await saveFileContent(activeFile, editorContent);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const path = newFileName.startsWith('/') ? newFileName : `/src/${newFileName}`;
    createFile(path, '// File created in workspace\n');
    setNewFileName('');
    setIsCreating(false);
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isSelected = activeFile === node.path;

    return (
      <div key={node.path}>
        <div 
          className={cn(
            "flex items-center justify-between py-1.5 px-2 text-xs rounded-md cursor-pointer group transition-colors",
            isSelected && node.type === 'file'
              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium" 
              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          )}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => {
            if (node.type === 'file') {
              loadFileContent(node.path);
            }
          }}
        >
          <div className="flex items-center gap-2 truncate">
            {node.type === 'directory' ? (
              <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            ) : (
              <FileCode2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </div>

          {node.type === 'file' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete ${node.name}?`)) {
                  deleteFile(node.path);
                }
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-opacity"
              title="Delete File"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {node.children && node.children.length > 0 && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Project Files</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Real disk files inside .agent_workspace</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchFiles()}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoadingFiles && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <Button 
            size="sm" 
            onClick={() => setIsCreating(!isCreating)}
            className="gap-1.5 h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New File</span>
          </Button>
        </div>
      </div>

      {/* Main Files View */}
      <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col md:flex-row shadow-sm min-h-[500px]">
        {/* Left: Tree */}
        <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50 dark:bg-zinc-950/40">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[11px] font-semibold uppercase text-zinc-400">
            Explorer (.agent_workspace)
          </div>

          {isCreating && (
            <form onSubmit={handleCreate} className="p-2 border-b border-zinc-200 dark:border-zinc-800 flex gap-1">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. Button.tsx"
                autoFocus
                className="flex-1 px-2 py-1 text-xs rounded border border-blue-500 bg-white dark:bg-zinc-900 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
              <button type="submit" className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold">
                Add
              </button>
            </form>
          )}

          <div className="flex-1 overflow-y-auto p-2">
            {fileTree.length === 0 ? (
              <div className="p-4 text-center text-zinc-400 text-xs">No files in workspace</div>
            ) : (
              fileTree.map(node => renderNode(node))
            )}
          </div>
        </div>

        {/* Right: Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900">
          {activeFile ? (
            <>
              <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 bg-zinc-50/50 dark:bg-zinc-900/50">
                <span className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {activeFile}
                </span>

                <div className="flex items-center gap-2">
                  {saveSuccess && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-7 text-xs gap-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </Button>
                </div>
              </div>

              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="flex-1 p-4 font-mono text-xs bg-transparent text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none leading-relaxed overflow-auto selection:bg-blue-500/20"
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
              <Code2 className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-xs font-medium">Select a file from the explorer to view or edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
