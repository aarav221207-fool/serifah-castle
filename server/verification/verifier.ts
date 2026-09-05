import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = util.promisify(exec);

export interface VerificationCheck {
  name: string;
  category: 'TYPESCRIPT' | 'BUILD' | 'TESTS' | 'SECURITY' | 'INTEGRITY' | 'REQUIREMENTS';
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

    // 1. Workspace Integrity & Structure Check
    const integrityStart = Date.now();
    try {
      await fs.access(this.workspaceDir);
      const entries = await fs.readdir(this.workspaceDir);
      const hasFiles = entries.length > 0;
      checks.push({
        name: 'Workspace Filesystem Integrity',
        category: 'INTEGRITY',
        passed: hasFiles,
        error: hasFiles ? undefined : 'Workspace directory is empty',
        durationMs: Date.now() - integrityStart
      });
    } catch (err: any) {
      checks.push({
        name: 'Workspace Filesystem Integrity',
        category: 'INTEGRITY',
        passed: false,
        error: `Failed to access workspace: ${err.message}`,
        durationMs: Date.now() - integrityStart
      });
    }

    // 2. Static Syntax & TypeScript Check
    const tsStart = Date.now();
    try {
      // Check if there is a tsconfig or if files in workspace have valid syntax
      const files = await this.getAllCodeFiles(this.workspaceDir);
      let syntaxError: string | null = null;

      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
          const content = await fs.readFile(file, 'utf-8');
          // Basic AST / unbalanced brace / unclosed string check
          const braceCheck = this.checkBraceBalance(content);
          if (!braceCheck.balanced) {
            syntaxError = `Unbalanced syntax in ${path.relative(this.workspaceDir, file)}: ${braceCheck.error}`;
            break;
          }
        }
      }

      // Also run tsc on project root if applicable
      let rootTsPassed = true;
      let rootTsError = '';
      try {
        await execAsync('npx tsc --noEmit', { cwd: process.cwd(), timeout: 12000 });
      } catch (tsErr: any) {
        rootTsPassed = false;
        rootTsError = tsErr.stdout || tsErr.stderr || tsErr.message;
      }

      const tsPassed = !syntaxError && rootTsPassed;
      checks.push({
        name: 'TypeScript & Static Syntax Validation',
        category: 'TYPESCRIPT',
        passed: tsPassed,
        error: syntaxError || (rootTsPassed ? undefined : rootTsError.slice(0, 300)),
        durationMs: Date.now() - tsStart
      });
    } catch (err: any) {
      checks.push({
        name: 'TypeScript & Static Syntax Validation',
        category: 'TYPESCRIPT',
        passed: false,
        error: err.message,
        durationMs: Date.now() - tsStart
      });
    }

    // 3. Security Sanity Check
    const secStart = Date.now();
    try {
      const secViolations: string[] = [];
      const codeFiles = await this.getAllCodeFiles(this.workspaceDir);
      
      const SECRET_PATTERNS = [
        /(?:AIza[0-9A-Za-z-_]{35})/g, // Google API key
        /(?:sk-[a-zA-Z0-9]{32,})/g, // OpenAI key
        /(?:ghp_[a-zA-Z0-9]{36})/g, // GitHub token
        /(?:-----BEGIN (?:RSA )?PRIVATE KEY-----)/g // Private key
      ];

      for (const file of codeFiles) {
        const content = await fs.readFile(file, 'utf-8');
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(content)) {
            secViolations.push(`Hardcoded credentials detected in ${path.relative(this.workspaceDir, file)}`);
          }
        }
        if (content.includes('eval(') && !file.includes('node_modules')) {
          secViolations.push(`Unsafe eval() invocation detected in ${path.relative(this.workspaceDir, file)}`);
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

    // 4. Buildability & Package Contract
    const buildStart = Date.now();
    try {
      // Build test of current application
      await execAsync('npm run build', { cwd: process.cwd(), timeout: 35000 });
      checks.push({
        name: 'Production Bundle & Build Contract',
        category: 'BUILD',
        passed: true,
        durationMs: Date.now() - buildStart
      });
    } catch (bErr: any) {
      checks.push({
        name: 'Production Bundle & Build Contract',
        category: 'BUILD',
        passed: false,
        error: (bErr.stdout || bErr.stderr || bErr.message).slice(0, 350),
        durationMs: Date.now() - buildStart
      });
    }

    // 5. Requirements Satisfaction Check
    if (requirementsPrompt) {
      const reqStart = Date.now();
      const filesExist = (filesModified && filesModified.length > 0);
      checks.push({
        name: 'Requirements Deliverable Check',
        category: 'REQUIREMENTS',
        passed: filesExist,
        error: filesExist ? undefined : 'No modified files generated to satisfy requirement',
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
        : `Verification FAILED on ${checks.filter(c => !c.passed).map(c => c.name).join(', ')}.`
    };
  }

  private async getAllCodeFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === '.git' || e.name === 'node_modules') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          const sub = await this.getAllCodeFiles(full);
          results.push(...sub);
        } else {
          results.push(full);
        }
      }
    } catch {
      // Directory may not exist yet
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
          i++; // Skip escaped char
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
