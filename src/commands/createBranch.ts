import * as vscode from 'vscode';
import { GitService } from '../services/gitService';
import { getBranchConfig, formatBranchName } from '../utils/branchUtils';

export async function createBranchCommand(gitService: GitService): Promise<void> {
  const config = getBranchConfig();

  // Step 1: Select branch type
  const branchType = await vscode.window.showQuickPick(config.prefixes, {
    placeHolder: 'Select branch type',
    title: 'WL Git: Create New Branch'
  });

  if (!branchType) return;

  // Step 2: Enter branch name
  const branchName = await vscode.window.showInputBox({
    placeHolder: 'Enter branch name (e.g., UserProfile, WLS-1234)',
    prompt: `Creating ${branchType}/ branch`,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Branch name is required';
      }
      if (value.includes(' ')) {
        return 'Branch name cannot contain spaces';
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return 'Branch name can only contain letters, numbers, underscores, and hyphens';
      }
      return undefined;
    }
  });

  if (!branchName) return;

  // Step 3: Select base branch
  const branches = await gitService.getLocalBranches();
  const baseBranches = config.mainBranches.filter(b => branches.includes(b));

  const baseBranch = await vscode.window.showQuickPick(
    [config.defaultTarget, ...baseBranches.filter(b => b !== config.defaultTarget)],
    {
      placeHolder: 'Select base branch',
      title: 'Create branch from:'
    }
  );

  if (!baseBranch) return;

  // Create the branch
  const fullBranchName = formatBranchName(branchType, branchName);

  // Check if branch already exists
  if (await gitService.branchExists(fullBranchName)) {
    vscode.window.showErrorMessage(`Branch "${fullBranchName}" already exists`);
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Creating branch: ${fullBranchName}`,
      cancellable: false
    },
    async (progress) => {
      progress.report({ message: 'Switching to base branch...' });

      const result = await gitService.createBranch(fullBranchName, baseBranch);

      if (result.success) {
        vscode.window.showInformationMessage(
          `Branch "${fullBranchName}" created from ${baseBranch}`
        );
      } else {
        vscode.window.showErrorMessage(
          `Failed to create branch: ${result.error}`
        );
      }
    }
  );
}

export function registerCreateBranchCommand(
  context: vscode.ExtensionContext,
  gitService: GitService
): void {
  const disposable = vscode.commands.registerCommand(
    'wl-git.createBranch',
    () => createBranchCommand(gitService)
  );
  context.subscriptions.push(disposable);
}
