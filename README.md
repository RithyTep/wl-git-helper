# WL Git Helper

> Git workflow automation for WL projects. Branch naming, smart commits, and merge flow - all in one click.

## Features

### 1. Create Branch (Cmd+Shift+B)
Follows WL naming convention automatically.

```
Feature/UserProfile
Support/WLS-1234
Bugfix/LoginIssue
Hotfix/CriticalFix
```

### 2. Smart Commit (Cmd+Shift+G)
Auto-generates commit message prefix based on branch.

```
[UserProfile] Add new feature
[Support] WLS-1234 fix bug
[Bugfix] Resolve login issue
```

### 3. Quick Merge
Follows WL workflow: `Feature → staging → demo → production`

- Auto-suggests next merge target
- Handles conflicts gracefully
- Option to continue merging through the pipeline

### 4. Switch Branch (Cmd+Shift+S)
Organized branch picker with categories:
- Main Branches (staging, demo, production)
- Feature Branches
- Support / Bugfix
- Other

### 5. Sync Branch
Pull + Push in one command. Handles upstream setup automatically.

### 6. View History
Browse recent commits with quick actions:
- Copy commit hash
- View commit details

### 7. Stash Commands
Quick stash and pop with optional messages.

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| WL Git: Create Branch | `Cmd+Shift+B` | Create new branch with naming convention |
| WL Git: Smart Commit | `Cmd+Shift+G` | Commit with auto-generated message |
| WL Git: Switch Branch | `Cmd+Shift+S` | Quick branch switcher |
| WL Git: Quick Merge | - | Merge following workflow |
| WL Git: Sync Branch | - | Pull & Push |
| WL Git: View History | - | Browse commits |
| WL Git: Stash Changes | - | Stash current changes |
| WL Git: Pop Stash | - | Apply and remove stash |

## WL Git Workflow

```
Feature/Something
       │
       ▼
    staging ──────► demo ──────► production
       │              │              │
    (develop)     (testing)     (live)
```

## Branch Naming

| Type | Example | Use Case |
|------|---------|----------|
| Feature | `Feature/UserProfile` | New features |
| Support | `Support/WLS-1234` | Support tickets |
| Bugfix | `Bugfix/LoginIssue` | Bug fixes |
| Hotfix | `Hotfix/CriticalFix` | Urgent fixes |
| Test | `Test/E2ESetup` | Testing work |

## Commit Message Format

```
[BranchDescription] What you did

Examples:
[UserProfile] Add avatar upload
[Support] WLS-1234 fix export bug
[Bugfix] Resolve null pointer exception
```

## Settings

```json
{
  "wl-git.branchPrefixes": ["Feature", "Support", "Bugfix", "Hotfix", "Test"],
  "wl-git.mainBranches": ["staging", "demo", "production"],
  "wl-git.defaultTargetBranch": "staging"
}
```

## Pro Tips

- Status bar shows current branch - click to switch
- Smart Commit suggests templates based on branch type
- Quick Merge auto-suggests next target in workflow
- Uncommitted changes? Extension handles stashing for you

## Requirements

- VS Code 1.85+
- Git installed and in PATH
- Project with `.git` directory

---

## Changelog

### v1.0.0
- Initial release
- Create Branch with naming convention
- Smart Commit with message templates
- Quick Merge following workflow
- Switch Branch with categories
- Sync Branch (Pull + Push)
- View History with actions
- Stash Commands
- Status bar branch indicator

---

Made with coffee by [@rithytep](https://github.com/rithytep)
