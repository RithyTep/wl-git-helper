import * as vscode from 'vscode';
import { GitService } from '../services/gitService';

export async function stashChangesCommand(gitService: GitService): Promise<void> {
  const hasChanges = await gitService.hasChanges();

  if (!hasChanges) {
    vscode.window.showInformationMessage('No changes to stash');
    return;
  }

  const message = await vscode.window.showInputBox({
    placeHolder: 'Enter stash message (optional)',
    prompt: 'Describe what you\'re stashing'
  });

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Stashing changes...',
      cancellable: false
    },
    async () => {
      const result = await gitService.stash(message);

      if (result.success) {
        vscode.window.showInformationMessage(
          message ? `Stashed: ${message}` : 'Changes stashed'
        );
      } else {
        vscode.window.showErrorMessage(`Stash failed: ${result.error}`);
      }
    }
  );
}

export async function popStashCommand(gitService: GitService): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Popping stash...',
      cancellable: false
    },
    async () => {
      const result = await gitService.stashPop();

      if (result.success) {
        vscode.window.showInformationMessage('Stash applied and removed');
      } else {
        if (result.error?.includes('No stash entries')) {
          vscode.window.showInformationMessage('No stash entries to pop');
        } else {
          vscode.window.showErrorMessage(`Pop stash failed: ${result.error}`);
        }
      }
    }
  );
}

export function registerStashCommands(
  context: vscode.ExtensionContext,
  gitService: GitService
): void {
  const stashDisposable = vscode.commands.registerCommand(
    'wl-git.stashChanges',
    () => stashChangesCommand(gitService)
  );

  const popDisposable = vscode.commands.registerCommand(
    'wl-git.popStash',
    () => popStashCommand(gitService)
  );

  context.subscriptions.push(stashDisposable, popDisposable);
}
