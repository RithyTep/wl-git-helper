import * as vscode from 'vscode';
import { GitService } from '../services/gitService';
import { getBranchConfig, extractBranchType } from '../utils/branchUtils';

export async function switchBranchCommand(gitService: GitService): Promise<void> {
  const branches = await gitService.getAllBranches();
  const currentBranch = await gitService.getCurrentBranch();
  const config = getBranchConfig();

  // Group branches by type
  const mainBranches: vscode.QuickPickItem[] = [];
  const featureBranches: vscode.QuickPickItem[] = [];
  const supportBranches: vscode.QuickPickItem[] = [];
  const otherBranches: vscode.QuickPickItem[] = [];

  for (const branch of branches) {
    if (branch.name === currentBranch) continue;

    const item: vscode.QuickPickItem = {
      label: branch.name,
      description: branch.isRemote ? '(remote)' : '',
      detail: branch.isCurrent ? 'Current branch' : undefined
    };

    if (config.mainBranches.includes(branch.name)) {
      item.label = `$(git-branch) ${branch.name}`;
      mainBranches.push(item);
    } else {
      const branchType = extractBranchType(branch.name);
      if (branchType === 'Feature') {
        item.label = `$(rocket) ${branch.name}`;
        featureBranches.push(item);
      } else if (branchType === 'Support' || branchType === 'Bugfix' || branchType === 'Hotfix') {
        item.label = `$(tools) ${branch.name}`;
        supportBranches.push(item);
      } else {
        otherBranches.push(item);
      }
    }
  }

  // Combine with separators
  const allItems: vscode.QuickPickItem[] = [];

  if (mainBranches.length > 0) {
    allItems.push({ label: 'Main Branches', kind: vscode.QuickPickItemKind.Separator });
    allItems.push(...mainBranches);
  }

  if (featureBranches.length > 0) {
    allItems.push({ label: 'Feature Branches', kind: vscode.QuickPickItemKind.Separator });
    allItems.push(...featureBranches);
  }

  if (supportBranches.length > 0) {
    allItems.push({ label: 'Support / Bugfix', kind: vscode.QuickPickItemKind.Separator });
    allItems.push(...supportBranches);
  }

  if (otherBranches.length > 0) {
    allItems.push({ label: 'Other', kind: vscode.QuickPickItemKind.Separator });
    allItems.push(...otherBranches);
  }

  const selected = await vscode.window.showQuickPick(allItems, {
    placeHolder: `Current: ${currentBranch}`,
    title: 'WL Git: Switch Branch',
    matchOnDescription: true
  });

  if (!selected) return;

  // Extract branch name (remove icon prefix)
  const branchName = selected.label.replace(/^\$\([^)]+\)\s*/, '');

  // Check for uncommitted changes
  const hasChanges = await gitService.hasChanges();
  if (hasChanges) {
    const choice = await vscode.window.showWarningMessage(
      'You have uncommitted changes',
      'Stash & Switch',
      'Switch Anyway',
      'Cancel'
    );

    if (choice === 'Cancel') return;
    if (choice === 'Stash & Switch') {
      await gitService.stash(`Auto-stash before switching to ${branchName}`);
    }
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Switching to ${branchName}...`,
      cancellable: false
    },
    async () => {
      const result = await gitService.checkoutBranch(branchName);

      if (result.success) {
        vscode.window.showInformationMessage(`Switched to ${branchName}`);
      } else {
        vscode.window.showErrorMessage(`Failed to switch: ${result.error}`);
      }
    }
  );
}

export function registerSwitchBranchCommand(
  context: vscode.ExtensionContext,
  gitService: GitService
): void {
  const disposable = vscode.commands.registerCommand(
    'wl-git.switchBranch',
    () => switchBranchCommand(gitService)
  );
  context.subscriptions.push(disposable);
}
