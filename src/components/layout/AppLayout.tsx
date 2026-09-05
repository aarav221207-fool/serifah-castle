import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  Cpu, 
  Network, 
  BookOpen, 
  CheckSquare, 
  ShieldCheck, 
  Rocket, 
  Search, 
  TerminalSquare, 
  Activity, 
  Box,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  GitBranch,
  Play,
  Wrench,
  ExternalLink,
  Github,
  FolderCode
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSandboxStore } from '../../store/useSandboxStore';
import { useGitHubStore } from '../../store/useGitHubStore';
import { useRepairStore } from '../../store/useRepairStore';
import { useModelStore } from '../../store/useModelStore';
import { useProjectStore } from '../../store/useProjectStore';
import { GithubConnectionModal } from '../github/GithubConnectionModal';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'PROJECT',
    items: [
      { name: 'Workspace', path: '/', icon: LayoutDashboard },
      { name: 'Activity', path: '/activity', icon: Activity },
      { name: 'Files', path: '/files', icon: FolderCode },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { name: 'Models', path: '/models', icon: Cpu },
      { name: 'Skills', path: '/skills', icon: TerminalSquare },
    ]
  },
  {
    title: 'SHIP',
    items: [
      { name: 'Git', path: '/git', icon: GitBranch },
      { name: 'Deploy', path: '/deploy', icon: Rocket },
    ]
  },
  {
    title: 'CONFIG',
    items: [
      { name: 'Settings', path: '/settings', icon: Settings },
    ]
  }
];

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const devServerStatus = useSandboxStore((s) => s.devServerStatus);
  const devServerUrl = useSandboxStore((s) => s.devServerUrl);
  const { currentBranch, isConnected, username, selectedRepo } = useGitHubStore();
  const failures = useRepairStore((s) => s.failures);
  const repairHistory = useRepairStore((s) => s.repairHistory);
  const roleAssignments = useModelStore((s) => s.roleAssignments);
  const project = useProjectStore((s) => s.project);
  const closeProject = useProjectStore((s) => s.closeProject);

  const activeRoleCount = Object.keys(roleAssignments).length;
  const unresolvedFailures = failures.filter(f => !f.handled).length;

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden font-sans">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-zinc-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop Collapsible + Mobile Off-Canvas Drawer) */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-zinc-900 text-zinc-300 border-r border-zinc-800 transition-all duration-200 ease-in-out select-none",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Cpu className="w-4 h-4 text-blue-400" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs tracking-wider text-zinc-100 flex items-center gap-1.5">
                  AGENT_OS
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">v0.2</span>
                </span>
                <span className="text-[10px] text-zinc-400 truncate">Autonomous Workstation</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items grouped by Section */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navSections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {(!isCollapsed || isMobileOpen) && sec.title && (
                <div className="px-2.5 py-1 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                  {sec.title}
                </div>
              )}
              {sec.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    title={isCollapsed && !isMobileOpen ? item.name : undefined}
                    className={cn(
                      "flex items-center gap-3 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all group relative",
                      isActive
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold"
                        : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100 border border-transparent"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-blue-400" : "text-zinc-400 group-hover:text-zinc-200")} />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate flex-1 tracking-wide">{item.name}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* System Telemetry in Sidebar Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/50">
          {(!isCollapsed || isMobileOpen) ? (
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", devServerStatus === 'running' ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                  DevServer :3000
                </span>
                <span className="font-mono text-[10px] text-zinc-400 uppercase">{devServerStatus}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
                  Branch
                </span>
                <span className="font-mono text-[10px] text-zinc-300 truncate max-w-[90px]">{currentBranch}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title="Dev Server Online">
              <span className={cn("w-2.5 h-2.5 rounded-full", devServerStatus === 'running' ? "bg-emerald-500" : "bg-amber-500")} />
            </div>
          )}
        </div>
      </aside>

        {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Control Bar */}
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between px-3 md:px-6 bg-white dark:bg-zinc-950 flex-shrink-0 z-10">
          {/* Left: Mobile Toggle & Breadcrumb */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-xs md:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                AGENT_OS
              </span>
              <span className="hidden sm:inline text-zinc-400 dark:text-zinc-600">/</span>
              <span className="hidden sm:inline text-xs text-zinc-500 dark:text-zinc-400 truncate font-mono">
                {project?.name || 'Project'}
              </span>
              <button
                onClick={() => closeProject()}
                title="Switch or close project"
                className="hidden sm:inline-flex items-center text-[10px] uppercase font-mono tracking-wider text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Switch
              </button>
            </div>
          </div>

          {/* Right: Essential Tools */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button
              onClick={() => navigate('/sandbox')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <Box className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sandbox</span>
            </button>
            
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="hidden xs:flex flex-col items-end mr-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider leading-none mb-1">GitHub</span>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-none">{selectedRepo ? selectedRepo.name : username}</span>
                </div>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{currentBranch}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsGithubModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 shadow-sm transition-opacity"
              >
                <Github className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Connect GitHub</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-3 sm:p-5 md:p-6">
          <Outlet />
        </main>
      </div>

      {isGithubModalOpen && <GithubConnectionModal onClose={() => setIsGithubModalOpen(false)} />}
    </div>
  );
}
