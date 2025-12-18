import * as vscode from 'vscode';
import { GitService } from './services/gitService';
import { registerCreateBranchCommand } from './commands/createBranch';
import { registerSmartCommitCommand } from './commands/smartCommit';
import { registerQuickMergeCommand } from './commands/quickMerge';
import { registerSwitchBranchCommand } from './commands/switchBranch';
import { registerSyncBranchCommand } from './commands/syncBranch';
import { registerViewHistoryCommand } from './commands/viewHistory';
import { registerStashCommands } from './commands/stashCommands';

let gitService: GitService | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('WL Git Helper is now active!');

  gitService = new GitService();

  // Check if this is a git repository
  const isGitRepo = await gitService.isGitRepo();
  if (!isGitRepo) {
    console.log('Not a git repository, WL Git Helper features disabled');
    return;
  }

  // Get current branch info
  const currentBranch = await gitService.getCurrentBranch();

  vscode.window.showInformationMessage(
    `WL Git Helper active on branch: ${currentBranch}`
  );

  // Register all commands
  registerCreateBranchCommand(context, gitService);
  registerSmartCommitCommand(context, gitService);
  registerQuickMergeCommand(context, gitService);
  registerSwitchBranchCommand(context, gitService);
  registerSyncBranchCommand(context, gitService);
  registerViewHistoryCommand(context, gitService);
  registerStashCommands(context, gitService);

  // Create status bar item showing current branch
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'wl-git.switchBranch';
  statusBarItem.tooltip = 'Click to switch branch';
  context.subscriptions.push(statusBarItem);

  // Update status bar
  const updateStatusBar = async (): Promise<void> => {
    const branch = await gitService!.getCurrentBranch();
    statusBarItem.text = `$(git-branch) ${branch}`;
    statusBarItem.show();
  };

  await updateStatusBar();

  // Watch for git changes to update status bar
  const gitWatcher = vscode.workspace.createFileSystemWatcher('**/.git/HEAD');
  gitWatcher.onDidChange(updateStatusBar);
  gitWatcher.onDidCreate(updateStatusBar);
  context.subscriptions.push(gitWatcher);
}

export function deactivate(): void {
  // Cleanup if needed
}
