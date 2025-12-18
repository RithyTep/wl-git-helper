import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export class GitService {
  private workspaceRoot: string;

  constructor() {
    const folders = vscode.workspace.workspaceFolders;
    this.workspaceRoot = folders?.[0]?.uri.fsPath || '';
  }

  private async runGitCommand(command: string): Promise<GitResult> {
    try {
      const { stdout, stderr } = await execAsync(`git ${command}`, {
        cwd: this.workspaceRoot,
        maxBuffer: 10 * 1024 * 1024
      });
      return { success: true, output: stdout.trim(), error: stderr.trim() };
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      return {
        success: false,
        output: err.stdout || '',
        error: err.stderr || err.message || 'Unknown error'
      };
    }
  }

  async getCurrentBranch(): Promise<string> {
    const result = await this.runGitCommand('branch --show-current');
    return result.success ? result.output : '';
  }

  async getAllBranches(): Promise<BranchInfo[]> {
    const result = await this.runGitCommand('branch -a');
    if (!result.success) return [];

    const branches: BranchInfo[] = [];
    const lines = result.output.split('\n').filter(l => l.trim());

    for (const line of lines) {
      const isCurrent = line.startsWith('*');
      const name = line.replace(/^\*?\s*/, '').trim();
      const isRemote = name.startsWith('remotes/');

      if (!name.includes('HEAD ->')) {
        branches.push({
          name: isRemote ? name.replace('remotes/origin/', '') : name,
          isCurrent,
          isRemote
        });
      }
    }

    // Remove duplicates (local and remote with same name)
    const uniqueBranches = new Map<string, BranchInfo>();
    for (const branch of branches) {
      const existing = uniqueBranches.get(branch.name);
      if (!existing || branch.isCurrent) {
        uniqueBranches.set(branch.name, branch);
      }
    }

    return Array.from(uniqueBranches.values());
  }

  async getLocalBranches(): Promise<string[]> {
    const result = await this.runGitCommand('branch --format="%(refname:short)"');
    if (!result.success) return [];
    return result.output.split('\n').filter(l => l.trim()).map(l => l.replace(/"/g, ''));
  }

  async createBranch(branchName: string, baseBranch?: string): Promise<GitResult> {
    if (baseBranch) {
      const checkoutResult = await this.runGitCommand(`checkout ${baseBranch}`);
      if (!checkoutResult.success) return checkoutResult;

      await this.runGitCommand('pull');
    }
    return this.runGitCommand(`checkout -b ${branchName}`);
  }

  async checkoutBranch(branchName: string): Promise<GitResult> {
    return this.runGitCommand(`checkout ${branchName}`);
  }

  async getStatus(): Promise<{ staged: string[]; unstaged: string[]; untracked: string[] }> {
    const result = await this.runGitCommand('status --porcelain');
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    if (!result.success) return { staged, unstaged, untracked };

    const lines = result.output.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const file = line.substring(3);

      if (indexStatus === '?' && workTreeStatus === '?') {
        untracked.push(file);
      } else if (indexStatus !== ' ' && indexStatus !== '?') {
        staged.push(file);
      } else if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
        unstaged.push(file);
      }
    }

    return { staged, unstaged, untracked };
  }

  async hasChanges(): Promise<boolean> {
    const status = await this.getStatus();
    return status.staged.length > 0 || status.unstaged.length > 0 || status.untracked.length > 0;
  }

  async stageAll(): Promise<GitResult> {
    return this.runGitCommand('add -A');
  }

  async stageFiles(files: string[]): Promise<GitResult> {
    const escapedFiles = files.map(f => `"${f}"`).join(' ');
    return this.runGitCommand(`add ${escapedFiles}`);
  }

  async commit(message: string): Promise<GitResult> {
    const escapedMessage = message.replace(/"/g, '\\"');
    return this.runGitCommand(`commit -m "${escapedMessage}"`);
  }

  async push(setBranch?: boolean): Promise<GitResult> {
    const branch = await this.getCurrentBranch();
    if (setBranch) {
      return this.runGitCommand(`push -u origin ${branch}`);
    }
    return this.runGitCommand('push');
  }

  async pull(): Promise<GitResult> {
    return this.runGitCommand('pull');
  }

  async merge(branchName: string): Promise<GitResult> {
    return this.runGitCommand(`merge ${branchName}`);
  }

  async stash(message?: string): Promise<GitResult> {
    if (message) {
      return this.runGitCommand(`stash push -m "${message}"`);
    }
    return this.runGitCommand('stash');
  }

  async stashPop(): Promise<GitResult> {
    return this.runGitCommand('stash pop');
  }

  async getRecentCommits(count: number = 10): Promise<CommitInfo[]> {
    const result = await this.runGitCommand(
      `log -${count} --format="%H|%h|%s|%an|%ar"`
    );
    if (!result.success) return [];

    return result.output.split('\n').filter(l => l.trim()).map(line => {
      const [hash, shortHash, message, author, date] = line.split('|');
      return { hash, shortHash, message, author, date };
    });
  }

  async isGitRepo(): Promise<boolean> {
    const result = await this.runGitCommand('rev-parse --is-inside-work-tree');
    return result.success && result.output === 'true';
  }

  async fetch(): Promise<GitResult> {
    return this.runGitCommand('fetch --all');
  }

  async branchExists(branchName: string): Promise<boolean> {
    const branches = await this.getLocalBranches();
    return branches.includes(branchName);
  }

  async getRemoteUrl(): Promise<string> {
    const result = await this.runGitCommand('remote get-url origin');
    return result.success ? result.output : '';
  }
}
