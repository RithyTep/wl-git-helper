import * as vscode from 'vscode';
import { GitService } from '../services/gitService';

export async function viewHistoryCommand(gitService: GitService): Promise<void> {
  const commits = await gitService.getRecentCommits(20);
  const currentBranch = await gitService.getCurrentBranch();

  if (commits.length === 0) {
    vscode.window.showInformationMessage('No commits found');
    return;
  }

  const items: vscode.QuickPickItem[] = commits.map(commit => ({
    label: commit.message,
    description: commit.shortHash,
    detail: `${commit.author} • ${commit.date}`
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: `Recent commits on ${currentBranch}`,
    title: 'WL Git: Commit History',
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (!selected) return;

  // Show options for selected commit
  const action = await vscode.window.showQuickPick(
    [
      { label: '$(copy) Copy Commit Hash', value: 'copy' },
      { label: '$(eye) View in Terminal', value: 'view' },
      { label: '$(discard) Done', value: 'done' }
    ],
    {
      placeHolder: `${selected.description}: ${selected.label}`,
      title: 'Commit Actions'
    }
  );

  if (!action) return;

  const commitHash = commits.find(c => c.shortHash === selected.description)?.hash || '';

  switch (action.value) {
    case 'copy':
      await vscode.env.clipboard.writeText(commitHash);
      vscode.window.showInformationMessage(`Copied: ${selected.description}`);
      break;
    case 'view':
      const terminal = vscode.window.createTerminal('Git Show');
      terminal.show();
      terminal.sendText(`git show ${commitHash}`);
      break;
  }
}

export function registerViewHistoryCommand(
  context: vscode.ExtensionContext,
  gitService: GitService
): void {
  const disposable = vscode.commands.registerCommand(
    'wl-git.viewHistory',
    () => viewHistoryCommand(gitService)
  );
  context.subscriptions.push(disposable);
}
