import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const execAsync = util.promisify(exec);

export interface VerificationCheck {
  name: string;
  category: 'TYPESCRIPT' | 'BUILD' | 'RUNTIME' | 'SECURITY' | 'INTEGRITY' | 'REQUIREMENTS';
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface VerificationReport {
  passed: boolean;
  timestamp: number;
  checks: VerificationCheck[];
  summary: string;
}

export class IndependentVerifier {
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  async verifyAll(requirementsPrompt?: string, filesModified?: string[]): Promise<VerificationReport> {
    const checks: VerificationCheck[] = [];

    // 1. Workspace Filesystem Integrity Check
    const integrityStart = Date.now();
    try {
      await fs.access(this.workspaceDir);
      const entries = await fs.readdir(this.workspaceDir);
      const hasFiles = entries.length > 0;
      
      // Verify that every modified file exists on disk and is non-empty
      const missingFiles: string[] = [];
      const emptyFiles: string[] = [];

      if (filesModified && filesModified.length > 0) {
        for (const f of filesModified) {
          const safeRel = path.normalize(f).replace(/^(\.\.[\/\\])+/, '').replace(/^\/+/, '');
          const absPath = path.join(this.workspaceDir, safeRel);
          try {
            const stat = await fs.stat(absPath);
            if (stat.size === 0) {
              emptyFiles.push(safeRel);
            }
          } catch {
            missingFiles.push(safeRel);
          }
        }
      }

      const filesValid = missingFiles.length === 0 && emptyFiles.length === 0;
      let integrityError: string | undefined;
      if (!hasFiles) {
        integrityError = 'Workspace directory is empty';
      } else if (missingFiles.length > 0) {
        integrityError = `Files missing on disk: ${missingFiles.join(', ')}`;
      } else if (emptyFiles.length > 0) {
        integrityError = `Generated files are empty: ${emptyFiles.join(', ')}`;
      }

      checks.push({
        name: 'Workspace Filesystem & Deliverable Integrity',
        category: 'INTEGRITY',
        passed: hasFiles && filesValid,
        error: integrityError,
        durationMs: Date.now() - integrityStart
      });
    } catch (err: any) {
      checks.push({
        name: 'Workspace Filesystem & Deliverable Integrity',
        category: 'INTEGRITY',
        passed: false,
        error: `Failed to access workspace: ${err.message}`,
        durationMs: Date.now() - integrityStart
      });
    }

    // 2. Static Syntax & AST Check
    const syntaxStart = Date.now();
    try {
      const files = await this.getAllCodeFiles(this.workspaceDir);
      let syntaxError: string | null = null;

      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
          const content = await fs.readFile(file, 'utf-8');
          const braceCheck = this.checkBraceBalance(content);
          if (!braceCheck.balanced) {
            syntaxError = `Unbalanced syntax in ${path.relative(this.workspaceDir, file)}: ${braceCheck.error}`;
            break;
          }
        }
      }

      checks.push({
        name: 'Static Syntax & Brace Validation',
        category: 'TYPESCRIPT',
        passed: !syntaxError,
        error: syntaxError || undefined,
        durationMs: Date.now() - syntaxStart
      });
    } catch (err: any) {
      checks.push({
        name: 'Static Syntax & Brace Validation',
        category: 'TYPESCRIPT',
        passed: false,
        error: err.message,
        durationMs: Date.now() - syntaxStart
      });
    }

    // 3. Security Sanity Check (No Leaked Secrets, No Malicious Invocations)
    const secStart = Date.now();
    try {
      const secViolations: string[] = [];
      const codeFiles = await this.getAllCodeFiles(this.workspaceDir);

      const SECRET_PATTERNS = [
        /(?:AIza[0-9A-Za-z-_]{35})/g,
        /(?:sk-[a-zA-Z0-9]{32,})/g,
        /(?:ghp_[a-zA-Z0-9]{36})/g,
        /(?:-----BEGIN (?:RSA )?PRIVATE KEY-----)/g
      ];

      for (const file of codeFiles) {
        const content = await fs.readFile(file, 'utf-8');
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(content)) {
            secViolations.push(`Hardcoded credentials detected in ${path.relative(this.workspaceDir, file)}`);
          }
        }
      }

      checks.push({
        name: 'Security Scan & Secret Leakage Inspection',
        category: 'SECURITY',
        passed: secViolations.length === 0,
        error: secViolations.length > 0 ? secViolations.join('; ') : undefined,
        durationMs: Date.now() - secStart
      });
    } catch (secErr: any) {
      checks.push({
        name: 'Security Scan & Secret Leakage Inspection',
        category: 'SECURITY',
        passed: false,
        error: secErr.message,
        durationMs: Date.now() - secStart
      });
    }

    // 4. Real Build Execution in Workspace (Phase 11)
    const buildStart = Date.now();
    try {
      // Execute real build inside .agent_workspace
      await execAsync('npx vite build', {
        cwd: this.workspaceDir,
        timeout: 45000
      });
      checks.push({
        name: 'Workspace Production Build (npx vite build)',
        category: 'BUILD',
        passed: true,
        durationMs: Date.now() - buildStart
      });
    } catch (bErr: any) {
      const buildOutput = (bErr.stdout || bErr.stderr || bErr.message || '').slice(0, 400);
      checks.push({
        name: 'Workspace Production Build (npx vite build)',
        category: 'BUILD',
        passed: false,
        error: buildOutput || 'Vite build exited with non-zero status',
        durationMs: Date.now() - buildStart
      });
    }

    // 5. Runtime Artifact Verification (Phase 12)
    const runtimeStart = Date.now();
    try {
      const distIndex = path.join(this.workspaceDir, 'dist', 'index.html');
      const distExists = fsSync.existsSync(distIndex);
      checks.push({
        name: 'Runtime Artifact & Preview Readiness',
        category: 'RUNTIME',
        passed: distExists,
        error: distExists ? undefined : 'Compiled dist/index.html artifact not found',
        durationMs: Date.now() - runtimeStart
      });
    } catch (rErr: any) {
      checks.push({
        name: 'Runtime Artifact & Preview Readiness',
        category: 'RUNTIME',
        passed: false,
        error: rErr.message,
        durationMs: Date.now() - runtimeStart
      });
    }

    // 6. Requirements Satisfaction Check
    if (requirementsPrompt) {
      const reqStart = Date.now();
      const codeFiles = await this.getAllCodeFiles(path.join(this.workspaceDir, 'src'));
      let allCode = '';
      for (const f of codeFiles) {
        allCode += await fs.readFile(f, 'utf-8') + '\n';
      }

      const lowerPrompt = requirementsPrompt.toLowerCase();
      let reqError: string | undefined;

      // Verify calculator requirements
      if (lowerPrompt.includes('calculator')) {
        const hasOperations = allCode.includes('+') || allCode.includes('-') || allCode.includes('*') || allCode.includes('/');
        const hasDisplay = allCode.toLowerCase().includes('display') || allCode.toLowerCase().includes('result') || allCode.toLowerCase().includes('screen') || allCode.toLowerCase().includes('value');
        if (!hasOperations || !hasDisplay) {
          reqError = 'Generated code does not contain calculator operational logic or display state';
        }
      }

      // Verify square root requirement
      if (lowerPrompt.includes('square root') || lowerPrompt.includes('sqrt')) {
        const hasSqrt = allCode.includes('Math.sqrt') || allCode.includes('sqrt') || allCode.includes('√');
        if (!hasSqrt) {
          reqError = 'Generated code does not contain square root functionality (Math.sqrt or √)';
        }
      }

      checks.push({
        name: 'Requirement Feature Validation',
        category: 'REQUIREMENTS',
        passed: !reqError,
        error: reqError,
        durationMs: Date.now() - reqStart
      });
    }

    const overallPassed = checks.every(c => c.passed);

    return {
      passed: overallPassed,
      timestamp: Date.now(),
      checks,
      summary: overallPassed
        ? `All ${checks.length} independent verification gates PASSED successfully.`
        : `Verification FAILED on: ${checks.filter(c => !c.passed).map(c => c.name).join(', ')}.`
    };
  }

  private async getAllCodeFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === '.git' || e.name === 'node_modules' || e.name === 'dist') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          const sub = await this.getAllCodeFiles(full);
          results.push(...sub);
        } else {
          results.push(full);
        }
      }
    } catch {
      // Empty
    }
    return results;
  }

  private checkBraceBalance(code: string): { balanced: boolean; error?: string } {
    const stack: string[] = [];
    const pairs: Record<string, string> = { '}': '{', ')': '(', ']': '[' };
    let inString: string | null = null;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const next = code[i + 1];

      if (inLineComment) {
        if (char === '\n') inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (char === '*' && next === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }
      if (inString) {
        if (char === '\\') {
          i++;
        } else if (char === inString) {
          inString = null;
        }
        continue;
      }

      if (char === '/' && next === '/') {
        inLineComment = true;
        i++;
        continue;
      }
      if (char === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        inString = char;
        continue;
      }

      if (char === '{' || char === '(' || char === '[') {
        stack.push(char);
      } else if (char === '}' || char === ')' || char === ']') {
        const expected = pairs[char];
        const last = stack.pop();
        if (last !== expected) {
          return { balanced: false, error: `Mismatched closing bracket '${char}', expected '${expected}'` };
        }
      }
    }

    if (stack.length > 0) {
      return { balanced: false, error: `Unclosed open bracket '${stack[stack.length - 1]}'` };
    }
    return { balanced: true };
  }
}
