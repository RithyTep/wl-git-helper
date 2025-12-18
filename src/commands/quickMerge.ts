import * as vscode from 'vscode';
import { GitService } from '../services/gitService';
import { getBranchConfig, getNextMergeBranch, isMainBranch } from '../utils/branchUtils';

export async function quickMergeCommand(gitService: GitService): Promise<void> {
  const currentBranch = await gitService.getCurrentBranch();
  const config = getBranchConfig();

  // Check for uncommitted changes
  const hasChanges = await gitService.hasChanges();
  if (hasChanges) {
    const choice = await vscode.window.showWarningMessage(
      'You have uncommitted changes. Stash them before merging?',
      'Stash & Continue',
      'Cancel'
    );

    if (choice === 'Stash & Continue') {
      await gitService.stash();
    } else {
      return;
    }
  }

  // Suggest next merge target based on workflow
  const suggestedTarget = getNextMergeBranch(currentBranch);
  const allBranches = await gitService.getLocalBranches();

  // Build target options
  const targetOptions: vscode.QuickPickItem[] = [];

  if (suggestedTarget) {
    targetOptions.push({
      label: `$(arrow-right) ${suggestedTarget}`,
      description: 'Recommended',
      detail: `Merge ${currentBranch} into ${suggestedTarget}`
    });
  }

  // Add main branches
  for (const branch of config.mainBranches) {
    if (branch !== currentBranch && branch !== suggestedTarget) {
      targetOptions.push({
        label: branch,
        description: 'Main branch'
      });
    }
  }

  // Add other branches
  for (const branch of allBranches) {
    if (!config.mainBranches.includes(branch) && branch !== currentBranch) {
      targetOptions.push({
        label: branch,
        description: 'Feature branch'
      });
    }
  }

  const targetChoice = await vscode.window.showQuickPick(targetOptions, {
    placeHolder: 'Select target branch to merge into',
    title: `WL Git: Merge ${currentBranch}`
  });

  if (!targetChoice) return;

  const targetBranch = targetChoice.label.replace('$(arrow-right) ', '');

  // Confirm merge
  const confirm = await vscode.window.showWarningMessage(
    `Merge "${currentBranch}" into "${targetBranch}"?`,
    { modal: true },
    'Merge'
  );

  if (confirm !== 'Merge') return;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Merging into ${targetBranch}`,
      cancellable: false
    },
    async (progress) => {
      try {
        // Fetch latest
        progress.report({ message: 'Fetching latest...' });
        await gitService.fetch();

        // Checkout target branch
        progress.report({ message: `Switching to ${targetBranch}...` });
        const checkoutResult = await gitService.checkoutBranch(targetBranch);
        if (!checkoutResult.success) {
          throw new Error(`Failed to checkout ${targetBranch}: ${checkoutResult.error}`);
        }

        // Pull latest
        progress.report({ message: 'Pulling latest changes...' });
        await gitService.pull();

        // Merge
        progress.report({ message: `Merging ${currentBranch}...` });
        const mergeResult = await gitService.merge(currentBranch);

        if (!mergeResult.success) {
          if (mergeResult.error?.includes('CONFLICT')) {
            vscode.window.showWarningMessage(
              'Merge conflicts detected. Please resolve them manually.',
              'Open Source Control'
            ).then(choice => {
              if (choice === 'Open Source Control') {
                vscode.commands.executeCommand('workbench.view.scm');
              }
            });
            return;
          }
          throw new Error(`Merge failed: ${mergeResult.error}`);
        }

        // Ask about pushing
        const pushChoice = await vscode.window.showInformationMessage(
          `Successfully merged ${currentBranch} into ${targetBranch}`,
          'Push to Remote',
          'Done'
        );

        if (pushChoice === 'Push to Remote') {
          progress.report({ message: 'Pushing...' });
          const pushResult = await gitService.push();
          if (pushResult.success) {
            vscode.window.showInformationMessage('Pushed to remote');

            // Ask about continuing to next branch in workflow
            if (isMainBranch(targetBranch)) {
              const nextBranch = getNextMergeBranch(targetBranch);
              if (nextBranch) {
                const continueChoice = await vscode.window.showInformationMessage(
                  `Continue merging to ${nextBranch}?`,
                  'Yes',
                  'No'
                );
                if (continueChoice === 'Yes') {
                  // Recursively merge to next branch
                  await quickMergeCommand(gitService);
                }
              }
            }
          } else {
            vscode.window.showErrorMessage(`Push failed: ${pushResult.error}`);
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Merge failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

export function registerQuickMergeCommand(
  context: vscode.ExtensionContext,
  gitService: GitService
): void {
  const disposable = vscode.commands.registerCommand(
    'wl-git.quickMerge',
    () => quickMergeCommand(gitService)
  );
  context.subscriptions.push(disposable);
}
