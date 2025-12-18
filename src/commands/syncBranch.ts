import * as vscode from 'vscode';
import { GitService } from '../services/gitService';

export async function syncBranchCommand(gitService: GitService): Promise<void> {
  const currentBranch = await gitService.getCurrentBranch();

  // Check for uncommitted changes
  const hasChanges = await gitService.hasChanges();
  if (hasChanges) {
    const choice = await vscode.window.showWarningMessage(
      'You have uncommitted changes. What would you like to do?',
      'Stash & Sync',
      'Cancel'
    );

    if (choice !== 'Stash & Sync') return;
    await gitService.stash('Auto-stash before sync');
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Syncing ${currentBranch}`,
      cancellable: false
    },
    async (progress) => {
      try {
        // Fetch
        progress.report({ message: 'Fetching...' });
        await gitService.fetch();

        // Pull
        progress.report({ message: 'Pulling changes...' });
        const pullResult = await gitService.pull();

        if (!pullResult.success && pullResult.error?.includes('CONFLICT')) {
          vscode.window.showWarningMessage(
            'Merge conflicts detected during pull. Please resolve them.',
            'Open Source Control'
          ).then(choice => {
            if (choice === 'Open Source Control') {
              vscode.commands.executeCommand('workbench.view.scm');
            }
          });
          return;
        }

        // Push
        progress.report({ message: 'Pushing changes...' });
        const pushResult = await gitService.push(true);

        if (pushResult.success) {
          vscode.window.showInformationMessage(`${currentBranch} synced with remote`);
        } else if (pushResult.error?.includes('no upstream')) {
          // No upstream set, push with -u
          const setUpstream = await gitService.push(true);
          if (setUpstream.success) {
            vscode.window.showInformationMessage(`${currentBranch} pushed and tracking set`);
          } else {
            throw new Error(setUpstream.error);
          }
        } else {
          throw new Error(pushResult.error);
        }

        // Pop stash if we stashed
        if (hasChanges) {
          await gitService.stashPop();
        }

      } catch (error) {
        vscode.window.showErrorMessage(
          `Sync failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

export function registerSyncBranchCommand(
  context: vscode.ExtensionContext,
  gitService: GitService
): void {
  const disposable = vscode.commands.registerCommand(
    'wl-git.syncBranch',
    () => syncBranchCommand(gitService)
  );
  context.subscriptions.push(disposable);
}
