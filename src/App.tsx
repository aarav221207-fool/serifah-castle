import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { WorkspacePage } from './features/workspace/WorkspacePage';
import { ProjectLauncher } from './features/workspace/ProjectLauncher';
import { ModelsPage } from './features/models/ModelsPage';
import { SkillsPage } from './features/skills/SkillsPage';
import { SandboxContent } from './features/sandbox/SandboxPage';
import { ActivityPage } from './features/activity/ActivityPage';
import { FilesPage } from './features/workspace/FilesPage';
import { GitPage } from './features/ship/GitPage';
import { DeployPage } from './features/ship/DeployPage';
import { useProjectStore } from './store/useProjectStore';
import { ErrorBoundary } from './components/ErrorBoundary';

function SettingsView() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Workstation Settings</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Global configuration, storage paths, and integration keys</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Workspace Sandbox Directory
          </label>
          <input
            type="text"
            readOnly
            value=".agent_workspace"
            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Project Brain Persistence Path
          </label>
          <input
            type="text"
            readOnly
            value=".agent_brain"
            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Security Sandbox Status
          </label>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
            Path traversal protections and credential sanitization active on all terminal execution bounds.
          </div>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { project } = useProjectStore();

  if (!project) {
    return <ProjectLauncher />;
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<WorkspacePage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="git" element={<GitPage />} />
        <Route path="deploy" element={<DeployPage />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="sandbox" element={
          <div className="h-full p-2 sm:p-6">
            <SandboxContent />
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
