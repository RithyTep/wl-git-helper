import * as vscode from 'vscode';

export interface BranchConfig {
  prefixes: string[];
  mainBranches: string[];
  defaultTarget: string;
}

export function getBranchConfig(): BranchConfig {
  const config = vscode.workspace.getConfiguration('wl-git');
  return {
    prefixes: config.get<string[]>('branchPrefixes') || ['Feature', 'Support', 'Bugfix', 'Hotfix', 'Test'],
    mainBranches: config.get<string[]>('mainBranches') || ['staging', 'demo', 'production'],
    defaultTarget: config.get<string>('defaultTargetBranch') || 'staging'
  };
}

export function extractBranchType(branchName: string): string {
  // Extract prefix from branch name like "Feature/Something" -> "Feature"
  const match = branchName.match(/^([^/]+)\//);
  return match ? match[1] : '';
}

export function extractBranchDescription(branchName: string): string {
  // Extract description from branch name like "Feature/Something" -> "Something"
  const match = branchName.match(/^[^/]+\/(.+)$/);
  return match ? match[1] : branchName;
}

export function formatBranchName(prefix: string, name: string): string {
  // Convert name to PascalCase and remove special chars
  const formatted = name
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  return `${prefix}/${formatted}`;
}

export function isMainBranch(branchName: string): boolean {
  const config = getBranchConfig();
  return config.mainBranches.includes(branchName);
}

export function getNextMergeBranch(currentBranch: string): string | undefined {
  const config = getBranchConfig();
  const mainBranches = config.mainBranches;

  // If on a feature/support branch, merge to staging
  if (!isMainBranch(currentBranch)) {
    return mainBranches[0]; // staging
  }

  // staging -> demo -> production
  const currentIndex = mainBranches.indexOf(currentBranch);
  if (currentIndex >= 0 && currentIndex < mainBranches.length - 1) {
    return mainBranches[currentIndex + 1];
  }

  return undefined;
}

export function suggestCommitPrefix(branchName: string): string {
  // Extract the feature/support name for commit prefix
  // "Feature/UserProfile" -> "[UserProfile]"
  // "Support/WLS-1234" -> "[Support]"

  const branchType = extractBranchType(branchName);
  const description = extractBranchDescription(branchName);

  if (branchType === 'Support') {
    // Check if description looks like a ticket number
    if (description.match(/^[A-Z]+-\d+/i)) {
      return `[Support] ${description}`;
    }
    return '[Support]';
  }

  if (branchType && description) {
    return `[${description}]`;
  }

  return '';
}
