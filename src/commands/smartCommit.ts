import * as vscode from 'vscode';
import { GitService } from '../services/gitService';
import { suggestCommitPrefix } from '../utils/branchUtils';
import { getCommitMessageTemplates } from '../utils/messageFormatter';

export async function smartCommitCommand(gitService: GitService): Promise<void> {
  // Check for changes
  const hasChanges = await gitService.hasChanges();
  if (!hasChanges) {
    vscode.window.showInformationMessage('No changes to commit');
    return;
  }

  const status = await gitService.getStatus();
  const currentBranch = await gitService.getCurrentBranch();

  // Show status summary
  const statusItems: vscode.QuickPickItem[] = [];

  if (status.staged.length > 0) {
    statusItems.push({
      label: '$(check) Staged',
      description: `${status.staged.length} file(s)`,
      detail: status.staged.slice(0, 5).join(', ') + (status.staged.length > 5 ? '...' : '')
    });
  }

  if (status.unstaged.length > 0) {
    statusItems.push({
      label: '$(edit) Modified',
      description: `${status.unstaged.length} file(s)`,
      detail: status.unstaged.slice(0, 5).join(', ') + (status.unstaged.length > 5 ? '...' : '')
    });
  }

  if (status.untracked.length > 0) {
    statusItems.push({
      label: '$(new-file) Untracked',
      description: `${status.untracked.length} file(s)`,
      detail: status.untracked.slice(0, 5).join(', ') + (status.untracked.length > 5 ? '...' : '')
    });
  }

  // Step 1: Choose what to stage
  const stageOption = await vscode.window.showQuickPick(
    [
      { label: '$(check-all) Stage All Changes', value: 'all' },
      { label: '$(checklist) Keep Current Staging', value: 'keep' }
    ],
    {
      placeHolder: 'What to commit?',
      title: `WL Git: Smart Commit (${currentBranch})`
    }
  );

  if (!stageOption) return;

  if (stageOption.value === 'all') {
    await gitService.stageAll();
  }

  // Step 2: Get commit message with suggestions
  const prefix = suggestCommitPrefix(currentBranch);
  const templates = getCommitMessageTemplates(currentBranch);

  // Show quick pick with templates
  const templateItems: vscode.QuickPickItem[] = templates.map(t => ({
    label: t,
    description: 'Template'
  }));
  templateItems.push({ label: '$(edit) Custom Message...', description: '' });

  const templateChoice = await vscode.window.showQuickPick(templateItems, {
    placeHolder: 'Select commit message template or enter custom',
    title: 'Commit Message'
  });

  if (!templateChoice) return;

  let commitMessage = '';

  if (templateChoice.label === '$(edit) Custom Message...') {
    // Custom input
    commitMessage = await vscode.window.showInputBox({
      placeHolder: 'Enter commit message',
      prompt: prefix ? `Suggested prefix: ${prefix}` : 'Enter your commit message',
      value: prefix ? `${prefix} ` : '',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Commit message is required';
        }
        return undefined;
      }
    }) || '';
  } else {
    // Complete the template
    const completion = await vscode.window.showInputBox({
      placeHolder: 'Complete the commit message',
      prompt: `${templateChoice.label}...`,
      value: templateChoice.label
    });
    commitMessage = completion || '';
  }

  if (!commitMessage) return;

  // Step 3: Commit
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Committing changes...',
      cancellable: false
    },
    async (progress) => {
      const result = await gitService.commit(commitMessage);

      if (result.success) {
        // Ask about pushing
        const pushChoice = await vscode.window.showInformationMessage(
          `Committed: ${commitMessage}`,
          'Push to Remote',
          'Done'
        );

        if (pushChoice === 'Push to Remote') {
          progress.report({ message: 'Pushing to remote...' });
          const pushResult = await gitService.push(true);
          if (pushResult.success) {
            vscode.window.showInformationMessage('Pushed to remote successfully');
          } else {
            vscode.window.showErrorMessage(`Push failed: ${pushResult.error}`);
          }
        }
      } else {
        vscode.window.showErrorMessage(`Commit failed: ${result.error}`);
      }
    }
  );
}

export function registerSmartCommitCommand(
  context: vscode.ExtensionContext,
  gitService: GitService
): void {
  const disposable = vscode.commands.registerCommand(
    'wl-git.commit',
    () => smartCommitCommand(gitService)
  );
  context.subscriptions.push(disposable);
}
